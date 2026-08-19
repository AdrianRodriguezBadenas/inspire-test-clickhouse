import { mock } from 'jest-mock-extended';
import { VariantRepository } from './variant.repository';
import type { ClickHouseConnection } from './clickhouse.provider';

/**
 * The schema has to exist before the first request, and nothing was making that happen:
 * `ensureTable` existed and only the e2e harness ever called it. Deployed, the app started
 * cleanly and every query answered 500 with "Unknown table expression identifier
 * 'variant'" — and the platform reported the deploy as successful, because the process was
 * alive. Found by running the production start command locally against an empty database.
 *
 * So the wiring is what these tests hold: the repository creates its table as part of
 * coming up, not as a favour the caller remembers to ask for.
 */
describe('VariantRepository — schema bootstrap', () => {
  it('creates the variant table when the module comes up', async () => {
    const connection = mock<ClickHouseConnection>();
    Object.defineProperty(connection, 'config', { value: { table: 'variant' } });
    const repository = new VariantRepository(connection);

    await repository.onModuleInit();

    expect(connection.command).toHaveBeenCalledTimes(1);
    expect(connection.command).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS variant'),
    );
  });

  it('creates the table the configuration names, not a hardcoded one', async () => {
    const connection = mock<ClickHouseConnection>();
    Object.defineProperty(connection, 'config', { value: { table: 'variant_e2e_42' } });
    const repository = new VariantRepository(connection);

    await repository.onModuleInit();

    expect(connection.command).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS variant_e2e_42'),
    );
  });

  it('fails startup when the store cannot be reached, rather than serving without a table', async () => {
    const connection = mock<ClickHouseConnection>();
    Object.defineProperty(connection, 'config', { value: { table: 'variant' } });
    connection.command.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const repository = new VariantRepository(connection);

    await expect(repository.onModuleInit()).rejects.toThrow('connect ECONNREFUSED');
  });
});
