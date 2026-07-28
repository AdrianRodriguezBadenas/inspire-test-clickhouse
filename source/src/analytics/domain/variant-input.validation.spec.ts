import { validateVariantInput } from './variant-input.validation';
import { VariantErrorCode, VariantValidationError } from './variant-errors';
import { VariantOrigin, VariantType } from './variant';
import type { VariantInput } from './variant';

const aVariantInput = (overrides: Partial<VariantInput> = {}): VariantInput => ({
  project_id: 42,
  collection: 'study-1',
  uri: 'chr1:12345:A:T',
  origin: VariantOrigin.GERMLINE,
  type: VariantType.SNV_INDEL,
  version_date: new Date('2026-07-01T00:00:00.000Z'),
  ...overrides,
});

/**
 * A record with one field removed. Proving that a *missing* field is rejected means
 * building input the type system forbids, so the cast is the point of the helper.
 */
const withoutField = (field: string): VariantInput => {
  const record: Record<string, unknown> = { ...aVariantInput() };
  delete record[field];
  return record as unknown as VariantInput;
};

const codeOf = (act: () => unknown): VariantErrorCode => {
  try {
    act();
  } catch (error) {
    if (error instanceof VariantValidationError) return error.code;
    throw error;
  }
  throw new Error('expected a VariantValidationError, none was thrown');
};

describe('validateVariantInput', () => {
  it('accepts a record carrying only the required fields', () => {
    const input = aVariantInput();

    const act = (): void => validateVariantInput(input);

    expect(act).not.toThrow();
  });

  it('accepts a record carrying optional fields as well', () => {
    const input = aVariantInput({ score: 0.99, hpo: ['HP:0001250'], gene_symbol: 'BRCA1' });

    const act = (): void => validateVariantInput(input);

    expect(act).not.toThrow();
  });

  it.each([
    ['project_id'],
    ['version_date'],
    ['uri'],
    ['origin'],
    ['type'],
    ['collection'],
  ])('rejects a record missing the required field %s', (field) => {
    const input = withoutField(field);

    const act = (): void => validateVariantInput(input);

    expect(codeOf(act)).toBe(VariantErrorCode.MISSING_REQUIRED_FIELD);
    expect(act).toThrow(`A required field is missing: ${field}.`);
  });

  it('treats an explicitly null required field as missing', () => {
    const input = aVariantInput({ collection: null as unknown as string });

    const act = (): void => validateVariantInput(input);

    expect(act).toThrow('A required field is missing: collection.');
  });

  it('treats an empty required string as missing', () => {
    const input = aVariantInput({ uri: '   ' });

    const act = (): void => validateVariantInput(input);

    expect(act).toThrow('A required field is missing: uri.');
  });

  it('rejects an origin outside its allowed set, naming the allowed values', () => {
    const input = aVariantInput({ origin: 'MOSAIC' as VariantOrigin });

    const act = (): void => validateVariantInput(input);

    expect(codeOf(act)).toBe(VariantErrorCode.INVALID_ENUM_VALUE);
    expect(act).toThrow('Field origin must be one of: GERMLINE, SOMATIC, TRIO, PGx.');
  });

  it('rejects a type outside its allowed set, naming the allowed values', () => {
    const input = aVariantInput({ type: 'FUSION' as VariantType });

    const act = (): void => validateVariantInput(input);

    expect(codeOf(act)).toBe(VariantErrorCode.INVALID_ENUM_VALUE);
    expect(act).toThrow('Field type must be one of: SNV/INDEL, SV, CNV.');
  });

  it('reports the missing field before the invalid enum when both are wrong', () => {
    const input = { ...withoutField('uri'), origin: 'MOSAIC' as VariantOrigin };

    const act = (): void => validateVariantInput(input);

    expect(act).toThrow('A required field is missing: uri.');
  });

  it('rejects a version_date that is not a usable timestamp', () => {
    const input = aVariantInput({ version_date: new Date('nonsense') });

    const act = (): void => validateVariantInput(input);

    expect(codeOf(act)).toBe(VariantErrorCode.MISSING_REQUIRED_FIELD);
    expect(act).toThrow('A required field is missing: version_date.');
  });

  it('rejects a project_id that is not a number', () => {
    const input = aVariantInput({ project_id: 'forty-two' as unknown as number });

    const act = (): void => validateVariantInput(input);

    expect(act).toThrow('A required field is missing: project_id.');
  });
});
