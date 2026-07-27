import { mock, MockProxy } from 'jest-mock-extended';
import { VariantService } from '../application/variant.service';
import { Variant } from '../domain/variant';
import { VariantResolver } from './variant.resolver';

const storedVariant = (id: string): Variant => ({
  id,
  project_id: 42,
  created_at: new Date('2024-01-01T00:00:00.000Z'),
  version_date: '2024-01-01T00:00:00.000Z',
  uri: `urn:variant:${id}`,
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
});

describe('VariantResolver', () => {
  let service: MockProxy<VariantService>;
  let resolver: VariantResolver;

  beforeEach(() => {
    service = mock<VariantService>();
    resolver = new VariantResolver(service);
  });

  // ADR adr-graphql-query-transport: the resolver is a thin adapter — it shapes
  // input and output and holds no logic of its own.
  it('passes the query through to the service and returns its page', async () => {
    // GIVEN
    const page = { items: [storedVariant('v-1')], next_cursor: 'next' };
    service.query.mockResolvedValue(page);
    const where = { and: [{ field: 'project_id', op: 'eq', value: 42 }] };

    // WHEN
    const result = await resolver.variants(
      where,
      [{ field: 'uri', dir: 'asc' }],
      10,
      'cursor-1',
    );

    // THEN
    expect(result).toEqual(page);

    expect(service.query).toHaveBeenCalledTimes(1);
    expect(service.query).toHaveBeenCalledWith({
      where,
      order_by: [{ field: 'uri', dir: 'asc' }],
      limit: 10,
      cursor: 'cursor-1',
    });
  });

  // ANL-02 AF-1: no filters supplied → all current variants, paginated.
  it('forwards an empty query when no arguments are supplied', async () => {
    // GIVEN
    service.query.mockResolvedValue({ items: [], next_cursor: null });

    // WHEN
    const result = await resolver.variants();

    // THEN
    expect(result).toEqual({ items: [], next_cursor: null });

    expect(service.query).toHaveBeenCalledWith({
      where: undefined,
      order_by: undefined,
      limit: undefined,
      cursor: undefined,
    });
  });

  // The service owns validation; the resolver must not soften its failures.
  it('propagates a service failure unchanged', async () => {
    // GIVEN
    const failure = new Error('Query condition tree is too deep.');
    service.query.mockRejectedValue(failure);

    // WHEN
    const act = () => resolver.variants();

    // THEN
    await expect(act).rejects.toBe(failure);
  });
});
