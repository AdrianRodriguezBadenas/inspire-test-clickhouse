/**
 * The single place domain failures become transport failures.
 *
 * Services and the domain throw plain errors — translating them is this layer's job.
 * Both access routes share the filter on purpose: ANL-02 requires that "a rejected
 * query is rejected identically on every access route", which only holds if one
 * mapping serves both.
 *
 * An unexpected failure never reaches the client: the detail is logged, and the answer
 * is a bare `internal_error` (a store's host, port or SQL is not a client's business).
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { VariantValidationError } from '../analytics/domain/variant-errors';

interface ErrorBody {
  statusCode: number;
  /** A stable, machine-readable code — the action descriptors' error set. */
  code: string;
  message: string;
}

const INTERNAL_ERROR: ErrorBody = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'internal_error',
  message: 'Internal server error',
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.describe(exception);

    // Not `getType<'graphql'>()`: that narrows the return to the literal, which makes
    // this comparison always-true to the compiler and the HTTP branch below unreachable
    // — while both run at runtime, since this filter serves both transports.
    if (host.getType<'graphql' | 'http'>() === 'graphql') {
      // In a GraphQL context there is no response to write to; throwing hands the
      // error to Apollo, which renders it into the `errors` array.
      throw new GraphQLError(body.message, { extensions: { code: body.code } });
    }

    const response = host.switchToHttp().getResponse<{
      status(code: number): { json(body: ErrorBody): unknown };
    }>();
    response.status(body.statusCode).json(body);
  }

  private describe(exception: unknown): ErrorBody {
    if (exception instanceof VariantValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        code: statusCode(status),
        message: firstMessage(exception),
      };
    }

    this.logger.error(
      `Unhandled failure: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return INTERNAL_ERROR;
  }
}

/** `404` → `not_found`, so a framework failure reads like a domain one. */
function statusCode(status: number): string {
  return (HttpStatus[status] ?? 'error').toLowerCase();
}

/**
 * The message of an HTTP exception.
 *
 * A `ValidationPipe` failure carries a list of them (one per broken constraint); the
 * first is the one that describes what to fix.
 */
function firstMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;

  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) return String(message[0]);
  if (typeof message === 'string') return message;

  return exception.message;
}
