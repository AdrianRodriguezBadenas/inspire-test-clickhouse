import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { AppExceptionFilter } from './common/app-exception.filter';

/**
 * Maps class-validator failures to the descriptor's error codes
 * (analytics::variant::create): an absent required field →
 * `missing_required_field`; an enum field with a disallowed value →
 * `invalid_enum_value`; anything else → `validation_error`.
 */
function validationException(errors: ValidationError[]): BadRequestException {
  const fields = errors.map((error) => error.property);

  const hasMissing = errors.some((error) => error.value === undefined);
  const hasBadEnum = errors.some(
    (error) => error.value !== undefined && error.constraints?.isIn !== undefined,
  );

  const code = hasMissing
    ? 'missing_required_field'
    : hasBadEnum
      ? 'invalid_enum_value'
      : 'validation_error';

  const message = hasMissing
    ? `A required field is missing: ${fields.join(', ')}.`
    : hasBadEnum
      ? `Field ${fields.join(', ')} has a value outside its allowed set.`
      : `Invalid request: ${fields.join(', ')}.`;

  return new BadRequestException({ code, message, fields });
}

/**
 * Shared runtime configuration applied to both the real app (main.ts) and the
 * e2e app, so the two never drift.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationException,
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
}
