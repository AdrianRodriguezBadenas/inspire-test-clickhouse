import { mock, MockProxy } from 'jest-mock-extended';
import { NewVariant } from '../domain/variant';
import { VariantRepository } from '../infrastructure/variant.repository';
import { VariantService } from './variant.service';

const newVariant = (overrides: Partial<NewVariant> = {}): NewVariant => ({
  project_id: 42,
  uri: 'urn:variant:1',
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
  ...overrides,
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

  // ANL-01 AC: the storage timestamp is set by the system, not taken from input.
  it('sets created_at itself', async () => {
    // GIVEN
    const input = newVariant();

    // WHEN
    await service.create(input);

    // THEN
    const stored = repository.insert.mock.calls[0][0];
    expect(stored.created_at).toBeInstanceOf(Date);
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
});
