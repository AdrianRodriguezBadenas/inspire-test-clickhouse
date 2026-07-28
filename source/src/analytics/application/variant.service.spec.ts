import { mock, type MockProxy } from 'jest-mock-extended';
import { VariantService } from './variant.service';
import { VariantRepository } from '../infrastructure/variant.repository';
import { VariantOrigin, VariantType, type Variant, type VariantInput } from '../domain/variant';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../domain/variant-query';
import { encodeCursor } from '../domain/variant-cursor';
import { VariantErrorCode, VariantValidationError } from '../domain/variant-errors';

const INGEST_TIME = new Date('2026-07-28T10:30:00.000Z');
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const aVariantInput = (overrides: Partial<VariantInput> = {}): VariantInput => ({
  project_id: 42,
  collection: 'study-1',
  uri: 'chr1:12345:A:T',
  origin: VariantOrigin.GERMLINE,
  type: VariantType.SNV_INDEL,
  version_date: new Date('2026-07-01T00:00:00.000Z'),
  ...overrides,
});

const aStoredVariant = (overrides: Partial<Variant> = {}): Variant => ({
  ...aVariantInput(),
  id: '11111111-1111-4111-8111-111111111111',
  created_at: INGEST_TIME,
  ...overrides,
});

describe('VariantService', () => {
  let repository: MockProxy<VariantRepository>;
  let service: VariantService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(INGEST_TIME);
    repository = mock<VariantRepository>();
    service = new VariantService(repository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('stores the record and returns the id identifying it', async () => {
      const input = aVariantInput();

      const created = await service.create(input);

      expect(created.id).toMatch(UUID_SHAPE);

      const [persisted] = repository.insert.mock.calls[0];
      expect(persisted.id).toBe(created.id);
    });

    it('persists the whole submitted record alongside the system fields', async () => {
      const input = aVariantInput({ score: 0.42, hpo: ['HP:0001250'] });

      const created = await service.create(input);

      expect(repository.insert).toHaveBeenCalledWith({
        ...input,
        id: created.id,
        created_at: INGEST_TIME,
      });
    });

    it('sets the ingest timestamp itself and keeps the client version_date', async () => {
      const input = aVariantInput({ version_date: new Date('2026-06-15T08:00:00.000Z') });

      await service.create(input);

      const [persisted] = repository.insert.mock.calls[0];
      expect(persisted.created_at).toEqual(INGEST_TIME);
      expect(persisted.version_date).toEqual(new Date('2026-06-15T08:00:00.000Z'));
    });

    it('ignores a client-supplied ingest timestamp', async () => {
      const input = { ...aVariantInput(), created_at: new Date('2020-01-01T00:00:00.000Z') };

      await service.create(input);

      const [persisted] = repository.insert.mock.calls[0];
      expect(persisted.created_at).toEqual(INGEST_TIME);
    });

    it('ignores a client-supplied id', async () => {
      const input = { ...aVariantInput(), id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };

      const created = await service.create(input);

      expect(created.id).not.toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    });

    it('leaves an omitted optional field out of the stored record', async () => {
      const input = aVariantInput();

      await service.create(input);

      const [persisted] = repository.insert.mock.calls[0];
      expect(persisted.score).toBeUndefined();
      expect(persisted.gene_symbol).toBeUndefined();
    });

    it('rejects a record missing a required field without touching the store', async () => {
      const input = { ...aVariantInput(), collection: '' };

      await expect(service.create(input)).rejects.toThrow(
        'A required field is missing: collection.',
      );

      expect(repository.insert).not.toHaveBeenCalled();
    });

    it('rejects a record whose enumerated field is out of range without touching the store', async () => {
      const input = aVariantInput({ type: 'FUSION' as VariantType });

      await expect(service.create(input)).rejects.toThrow(
        'Field type must be one of: SNV/INDEL, SV, CNV.',
      );

      expect(repository.insert).not.toHaveBeenCalled();
    });

    it('generates a different id for each record', async () => {
      const first = await service.create(aVariantInput());
      const second = await service.create(aVariantInput());

      expect(first.id).not.toBe(second.id);
    });
  });

  describe('query', () => {
    it('returns the current variants the store matched', async () => {
      const stored = aStoredVariant();
      repository.findCurrent.mockResolvedValue([stored]);

      const page = await service.query({});

      expect(page).toEqual({ items: [stored], next_cursor: null });
    });

    it('returns an empty page when nothing matches, rather than failing', async () => {
      repository.findCurrent.mockResolvedValue([]);

      const page = await service.query({ where: { field: 'project_id', op: 'eq', value: 999 } });

      expect(page).toEqual({ items: [], next_cursor: null });
    });

    it('asks the store for the default page size when none is given', async () => {
      repository.findCurrent.mockResolvedValue([]);

      await service.query({});

      expect(repository.findCurrent).toHaveBeenCalledWith(
        expect.objectContaining({ limit: DEFAULT_PAGE_SIZE, offset: 0 }),
      );
    });

    it('caps the page size at the maximum', async () => {
      repository.findCurrent.mockResolvedValue([]);

      await service.query({ limit: 5_000 });

      expect(repository.findCurrent).toHaveBeenCalledWith(
        expect.objectContaining({ limit: MAX_PAGE_SIZE }),
      );
    });

    it('hands back a cursor when the store found more rows than the page holds', async () => {
      const overflowing = Array.from({ length: 3 }, (_, index) =>
        aStoredVariant({ uri: `chr1:${index}:A:T` }),
      );
      repository.findCurrent.mockResolvedValue(overflowing);

      const page = await service.query({ limit: 2 });

      expect(page.items).toHaveLength(2);
      expect(page.next_cursor).toBe(encodeCursor(2));
    });

    it('trims the row that only signalled the next page', async () => {
      const overflowing = Array.from({ length: 3 }, (_, index) =>
        aStoredVariant({ uri: `chr1:${index}:A:T` }),
      );
      repository.findCurrent.mockResolvedValue(overflowing);

      const page = await service.query({ limit: 2 });

      expect(page.items.map((item) => item.uri)).toEqual(['chr1:0:A:T', 'chr1:1:A:T']);
    });

    it('advances the cursor from the offset it was given', async () => {
      repository.findCurrent.mockResolvedValue(Array.from({ length: 3 }, () => aStoredVariant()));

      const page = await service.query({ limit: 2, cursor: encodeCursor(10) });

      expect(page.next_cursor).toBe(encodeCursor(12));
    });

    it('reports no further page when the store filled the page exactly', async () => {
      repository.findCurrent.mockResolvedValue(Array.from({ length: 2 }, () => aStoredVariant()));

      const page = await service.query({ limit: 2 });

      expect(page.next_cursor).toBeNull();
    });

    it('rejects a query on an unknown field without touching the store', async () => {
      await expect(
        service.query({ where: { field: 'ghost_field', op: 'eq', value: 1 } }),
      ).rejects.toThrow('Unknown query field: ghost_field.');

      expect(repository.findCurrent).not.toHaveBeenCalled();
    });

    it('rejects an unsupported operator without touching the store', async () => {
      await expect(
        service.query({ where: { field: 'project_id', op: 'regex', value: '.*' } }),
      ).rejects.toThrow('Unsupported operator: regex.');

      expect(repository.findCurrent).not.toHaveBeenCalled();
    });

    it('rejects an over-nested query before any data is read', async () => {
      const overDeep = Array.from({ length: 11 }).reduce<Record<string, unknown>>(
        (inner) => ({ not: inner }),
        { field: 'project_id', op: 'eq', value: 1 },
      );

      const rejection = service.query({ where: overDeep });

      await expect(rejection).rejects.toBeInstanceOf(VariantValidationError);
      await expect(rejection).rejects.toMatchObject({
        code: VariantErrorCode.QUERY_TOO_COMPLEX,
      });
      expect(repository.findCurrent).not.toHaveBeenCalled();
    });
  });
});
