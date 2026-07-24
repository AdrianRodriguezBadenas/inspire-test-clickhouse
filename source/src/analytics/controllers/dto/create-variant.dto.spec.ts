import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVariantDto } from './create-variant.dto';

const validPayload = (): Record<string, unknown> => ({
  project_id: 42,
  uri: 'urn:variant:1',
  origin: 'GERMLINE',
  type: 'SNV/INDEL',
  collection: 'col-a',
  version_date: '2024-01-01T00:00:00.000Z',
});

describe('CreateVariantDto', () => {
  // ANL-01 AC: a valid record with all required fields passes validation.
  it('passes validation when all required fields are present', async () => {
    // GIVEN
    const dto = plainToInstance(CreateVariantDto, validPayload());

    // WHEN
    const errors = await validate(dto);

    // THEN
    expect(errors).toHaveLength(0);
  });

  // ANL-01 AC: a record missing a required field is rejected, naming the field.
  it('rejects a payload missing a required field', async () => {
    // GIVEN
    const payload = {
      uri: 'urn:variant:1',
      origin: 'GERMLINE',
      type: 'SNV/INDEL',
      collection: 'col-a',
      version_date: '2024-01-01T00:00:00.000Z',
    };
    const dto = plainToInstance(CreateVariantDto, payload);

    // WHEN
    const errors = await validate(dto);

    // THEN
    expect(errors.map((error) => error.property)).toContain('project_id');
  });

  // ANL-01 AC: version_date is required.
  it('rejects a payload missing version_date', async () => {
    // GIVEN
    const payload = {
      project_id: 42,
      uri: 'urn:variant:1',
      origin: 'GERMLINE',
      type: 'SNV/INDEL',
      collection: 'col-a',
    };
    const dto = plainToInstance(CreateVariantDto, payload);

    // WHEN
    const errors = await validate(dto);

    // THEN
    expect(errors.map((error) => error.property)).toContain('version_date');
  });

  // ANL-01 AC: an enumerated field outside its allowed set is rejected.
  it('rejects an origin outside the allowed enum', async () => {
    // GIVEN
    const dto = plainToInstance(CreateVariantDto, {
      ...validPayload(),
      origin: 'BOGUS',
    });

    // WHEN
    const errors = await validate(dto);

    // THEN
    expect(errors.map((error) => error.property)).toContain('origin');
  });
});
