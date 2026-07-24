import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryValidationError } from '../analytics/domain/variant-query';

/**
 * Shapes every error response as `{ code, message, ... }`.
 *
 * - `HttpException` — passed through with its status; its response object (which
 *   carries the descriptor error `code` for validation failures) is preserved.
 * - Anything else (e.g. a repository failure surfacing as a generic `Error`) — a
 *   clean `500 internal_error`. The cause is logged server-side; the stack is
 *   never leaked to the client.
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string' ? { code: 'error', message: body } : body,
        );
      return;
    }

    // Client query-validation failures → 400 with the descriptor error code.
    if (exception instanceof QueryValidationError) {
      response
        .status(400)
        .json({ code: exception.code, message: exception.message });
      return;
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(500)
      .json({ code: 'internal_error', message: 'An unexpected error occurred.' });
  }
}
