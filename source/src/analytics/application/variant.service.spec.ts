import { mock, MockProxy } from 'jest-mock-extended';
import { NewVariant, Variant } from '../domain/variant';
import { VariantRepository } from '../infrastructure/variant.repository';
import { VariantService } from './variant.service';

const newVariant = (overrides: Partial<NewVariant> = {}): NewVariant => ({
  project_id: 42,
  uri: 'urn:variant:1',
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
  version_date: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// A stored variant carrying only the required fields (optionals omitted).
const storedVariant = (id: string): Variant => ({
  id,
  project_id: 42,
  created_at: new Date(),
  version_date: '2024-01-01T00:00:00.000Z',
  uri: `urn:variant:${id}`,
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
});

describe('VariantService', () => {
  let repository: MockProxy<VariantRepository>;
  let service: VariantService;

  beforeEach(() => {
    repository = mock<VariantRepository>();
    service = new VariantService(repository);
  });

  // ANL-01 AC: valid record → stored and returns the generated id;
  //            created_at is system-set; the insert adds a new record.
  it('stores the variant and returns its generated id', async () => {
    // GIVEN
    const input = newVariant();

    // WHEN
    const result = await service.create(input);

    // THEN
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);

    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.insert).toHaveBeenCalledWith({
      ...input,
      id: result.id,
      created_at: expect.any(Date),
    });
  });

  // ANL-01 AC: the ingest timestamp is set by the system, not taken from input.
  it('sets created_at itself', async () => {
    // GIVEN
    const input = newVariant();

    // WHEN
    await service.create(input);

    // THEN
    const stored = repository.insert.mock.calls[0][0];
    expect(stored.created_at).toBeInstanceOf(Date);
  });

  // ANL-01 AC: the caller-supplied version_date is stored as given.
  it('keeps the caller-supplied version_date', async () => {
    // GIVEN
    const input = newVariant({ version_date: '2023-06-15T12:00:00.000Z' });

    // WHEN
    await service.create(input);

    // THEN
    const stored = repository.insert.mock.calls[0][0];
    expect(stored.version_date).toBe('2023-06-15T12:00:00.000Z');
  });

  // ANL-01 AC: a record with only the required fields is accepted; optionals empty.
  it('accepts a record carrying only the required fields', async () => {
    // GIVEN
    const input = newVariant();

    // WHEN
    const result = await service.create(input);

    // THEN
    expect(result.id).toBeDefined();

    const stored = repository.insert.mock.calls[0][0];
    expect(stored.score).toBeUndefined();
  });

  // A repository failure surfaces as a wrapped Error carrying the cause.
  it('wraps a repository failure, preserving the cause', async () => {
    // GIVEN
    const dbError = new Error('clickhouse unreachable');
    repository.insert.mockRejectedValue(dbError);

    // WHEN
    const act = service.create(newVariant());

    // THEN
    await expect(act).rejects.toMatchObject({
      message: 'Failed to store variant',
      cause: dbError,
    });
  });

  // ANL-02 AC: default page size is 50; no more results → null cursor.
  it('lists with the default page size and no cursor when results fit one page', async () => {
    // GIVEN
    const rows = [storedVariant('a'), storedVariant('b')];
    repository.queryCurrent.mockResolvedValue(rows);

    // WHEN
    const page = await service.list({ filters: {} });

    // THEN
    expect(page).toEqual({ items: rows, next_cursor: null });

    expect(repository.queryCurrent).toHaveBeenCalledWith({}, 51, 0);
  });

  // ANL-02 AC: when more results remain, a next cursor is returned and the page is
  // trimmed to the requested size.
  it('returns a next cursor when more results remain', async () => {
    // GIVEN — asks for 2, repository yields 3 (limit + 1) signalling more.
    const rows = [storedVariant('a'), storedVariant('b'), storedVariant('c')];
    repository.queryCurrent.mockResolvedValue(rows);

    // WHEN
    const page = await service.list({ filters: {}, limit: 2 });

    // THEN
    expect(page.items).toEqual([rows[0], rows[1]]);
    expect(page.next_cursor).toBe(Buffer.from('2').toString('base64'));

    expect(repository.queryCurrent).toHaveBeenCalledWith({}, 3, 0);
  });

  // ANL-02 AC: the page size is capped at 200.
  it('caps the page size at 200', async () => {
    // GIVEN
    repository.queryCurrent.mockResolvedValue([]);

    // WHEN
    await service.list({ filters: {}, limit: 500 });

    // THEN
    expect(repository.queryCurrent).toHaveBeenCalledWith({}, 201, 0);
  });

  // ANL-02 AC: a cursor resumes from the encoded offset.
  it('resumes from the cursor offset', async () => {
    // GIVEN
    repository.queryCurrent.mockResolvedValue([]);
    const cursor = Buffer.from('2').toString('base64');

    // WHEN
    await service.list({ filters: {}, limit: 2, cursor });

    // THEN
    expect(repository.queryCurrent).toHaveBeenCalledWith({}, 3, 2);
  });
});
