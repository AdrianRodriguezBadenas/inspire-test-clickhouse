/**
 * Validation of a submitted variant record, per ANL-01 and the create descriptor's
 * Behavior step 1: required fields present, enumerated fields within their allowed
 * values.
 *
 * It lives in the domain rather than in the request DTO on purpose. ANL-01 states
 * these rules "must carry over to the production file-based ingest path" — the
 * bulk-file writer specified in TASK-2mf2yu has no HTTP DTO to borrow them from, so
 * the rules belong where every write path can reach them. The DTO above still owns
 * what is genuinely transport shape: JSON types, coercion and the Swagger surface.
 */

import { VARIANT_REQUIRED_FIELDS, VariantOrigin, VariantType } from './variant';
import { invalidEnumValue, missingRequiredField } from './variant-errors';
import type { VariantInput } from './variant';

/**
 * A record as submitted — before validation, any field may be missing. Validation is
 * what turns one of these into a `VariantInput`, which is why the check below is an
 * assertion: callers get the narrowed type instead of having to assert it themselves.
 */
export type VariantSubmission = Partial<VariantInput>;

/** The enumerated fields and their allowed values, per the entity spec. */
const ENUM_FIELDS = {
  origin: Object.values(VariantOrigin),
  type: Object.values(VariantType),
} as const;

/**
 * Reject a record that cannot be stored.
 *
 * A required field holding an unusable value (null, a blank string, an unparseable
 * date, a non-numeric id) is reported as *missing*: the descriptor declares only
 * `missing_required_field` and `invalid_enum_value`, and from the store's point of
 * view an unusable value is the absence of one. On the HTTP route the request DTO
 * reports the precise type mismatch first, so a client sees the sharper message.
 */
export function validateVariantInput(input: VariantSubmission): asserts input is VariantInput {
  for (const field of VARIANT_REQUIRED_FIELDS) {
    if (!hasUsableValue(input[field], field)) throw missingRequiredField(field);
  }

  for (const [field, value] of [
    ['origin', input.origin],
    ['type', input.type],
  ] as const) {
    const allowed: readonly string[] = ENUM_FIELDS[field];
    if (value === undefined || !allowed.includes(value)) throw invalidEnumValue(field, allowed);
  }
}

function hasUsableValue(value: unknown, field: string): boolean {
  if (value === null || value === undefined) return false;

  // The field-typed rules come first: `project_id: 'forty-two'` is a non-blank string
  // and would pass the generic string check.
  if (field === 'project_id') return typeof value === 'number' && Number.isFinite(value);
  if (field === 'version_date') return value instanceof Date && !Number.isNaN(value.getTime());

  if (typeof value === 'string') return value.trim().length > 0;

  return true;
}
