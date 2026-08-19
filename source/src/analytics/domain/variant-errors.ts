/**
 * The declared error set of the variant actions.
 *
 * Codes and operator-facing messages come from the action descriptors
 * (`analytics.variant.create.md` / `analytics.variant.query.md` → ## Errors), except
 * `query_too_complex` — see the note on that member.
 *
 * These are domain errors, not HTTP ones: the layer that owns HTTP translates them
 * (see `AppExceptionFilter`). Nothing here imports a framework.
 */

export enum VariantErrorCode {
  /** A required field is absent from the submitted record. */
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  /** An enumerated field carries a value outside its allowed set. */
  INVALID_ENUM_VALUE = 'invalid_enum_value',
  /** A query condition references a field that is not a known variant column. */
  UNKNOWN_QUERY_FIELD = 'unknown_query_field',
  /** A query condition uses an operator outside the fixed set. */
  UNKNOWN_QUERY_OPERATOR = 'unknown_query_operator',
  /**
   * A query nests deeper, or carries more nodes, than the permitted bound.
   *
   * ANL-02 requires such a query to be "rejected before any data is read" and
   * adr-graphql-query-transport makes depth/complexity caps mandatory, but neither
   * declares this code or the numeric bounds — the code is introduced here and the
   * gap is open against `/inspire_domain` (see `variant-query.limits.ts`).
   */
  QUERY_TOO_COMPLEX = 'query_too_complex',
  /**
   * A query is structurally malformed: a condition node that is not exactly one of
   * `and` / `or` / `not` / a leaf, an operator whose value has the wrong shape, an
   * unusable page size, or an unreadable cursor.
   *
   * Like `query_too_complex`, this code is not declared by the descriptors — the
   * descriptors name only the unknown-field and unknown-operator rejections. Part of
   * the same open `/inspire_domain` gap.
   */
  INVALID_QUERY_CONDITION = 'invalid_query_condition',
}

/**
 * A rejected input. Carries the descriptor's error code so the HTTP layer can map it
 * without inspecting messages.
 */
export class VariantValidationError extends Error {
  constructor(
    readonly code: VariantErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'VariantValidationError';
  }
}

export function missingRequiredField(field: string): VariantValidationError {
  return new VariantValidationError(
    VariantErrorCode.MISSING_REQUIRED_FIELD,
    `A required field is missing: ${field}.`,
  );
}

export function invalidEnumValue(field: string, allowed: readonly string[]): VariantValidationError {
  return new VariantValidationError(
    VariantErrorCode.INVALID_ENUM_VALUE,
    `Field ${field} must be one of: ${allowed.join(', ')}.`,
  );
}

export function unknownQueryField(field: string): VariantValidationError {
  return new VariantValidationError(
    VariantErrorCode.UNKNOWN_QUERY_FIELD,
    `Unknown query field: ${field}.`,
  );
}

export function unknownQueryOperator(op: string): VariantValidationError {
  return new VariantValidationError(
    VariantErrorCode.UNKNOWN_QUERY_OPERATOR,
    `Unsupported operator: ${op}.`,
  );
}

export function queryTooComplex(reason: string): VariantValidationError {
  return new VariantValidationError(VariantErrorCode.QUERY_TOO_COMPLEX, reason);
}

export function invalidQueryCondition(reason: string): VariantValidationError {
  return new VariantValidationError(VariantErrorCode.INVALID_QUERY_CONDITION, reason);
}
