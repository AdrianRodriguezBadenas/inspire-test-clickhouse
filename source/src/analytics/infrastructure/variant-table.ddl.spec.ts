import { VARIANT_TABLE, variantTableDdl } from './variant-table.ddl';
import { VARIANT_FIELD_NAMES, VARIANT_FIELDS } from '../domain/variant-fields';

describe('variantTableDdl', () => {
  it('declares a column for every field in the registry, with its declared type', () => {
    const ddl = variantTableDdl(VARIANT_TABLE);

    for (const field of VARIANT_FIELD_NAMES) {
      expect(ddl).toContain(`  ${field} ${VARIANT_FIELDS[field].chType}`);
    }
  });

  it('declares exactly as many columns as the registry has fields', () => {
    const ddl = variantTableDdl(VARIANT_TABLE);

    const columns = ddl.split('\n').filter((line) => /^ {2}\w+ /.test(line));

    expect(columns).toHaveLength(VARIANT_FIELD_NAMES.length);
  });

  it('stores the table as a plain append-only MergeTree', () => {
    const ddl = variantTableDdl(VARIANT_TABLE);

    expect(ddl).toContain('ENGINE = MergeTree');
    expect(ddl).not.toContain('ReplacingMergeTree');
  });

  it('orders by the natural key with the version last', () => {
    const ddl = variantTableDdl(VARIANT_TABLE);

    expect(ddl).toContain('ORDER BY (project_id, collection, uri, version_date)');
  });

  it('declares no partitioning', () => {
    const ddl = variantTableDdl(VARIANT_TABLE);

    expect(ddl).not.toContain('PARTITION BY');
  });

  it('creates the table only when it is absent', () => {
    const ddl = variantTableDdl(VARIANT_TABLE);

    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS variant');
  });

  it('names the table it is given', () => {
    const ddl = variantTableDdl('variant_e2e');

    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS variant_e2e');
  });
});
