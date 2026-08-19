/**
 * Emits the start/finish pair for a request, per adr-request-observability-log.
 *
 * Serves both transports for the same reason `AppExceptionFilter` does: the use case is the
 * unit of interest, not the protocol, and the same descriptor is reachable over REST and
 * GraphQL here.
 *
 * **It logs only handlers that declare a use case**, via `@LogsAction('module.entity.action')`.
 * That is a decision, not an omission: the descriptor id is the name the knowledge base gives
 * the use case, and inferring it from a controller and method name would invent a second
 * naming scheme that drifts. It also means `/health` and `/docs` stay out of the stream —
 * they are not use cases, and a readiness probe logging twice a minute is noise that buries
 * the signal.
 */

import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { emitRequestEvent, type RequestShape } from './request-log';
import { VariantValidationError } from '../../analytics/domain/variant-errors';

export const LOGS_ACTION = 'inspire:logs-action';

/** Declare which knowledge-base action a handler realizes. */
export const LogsAction = (action: string): MethodDecorator & ClassDecorator =>
  SetMetadata(LOGS_ACTION, action);

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(LOGS_ACTION, context.getHandler());
    if (action === undefined) return next.handle();

    // Not `getType<'graphql'>()`: narrowing to the literal makes the comparison always-true to
    // the compiler and the other branch unreachable, while both run. Same trap the exception
    // filter documents.
    const transport = context.getType<'graphql' | 'http'>() === 'graphql' ? 'graphql' : 'rest';

    const request = requestOf(context);
    const requestId = inboundRequestId(request) ?? randomUUID();
    setResponseHeader(context, requestId);

    emitRequestEvent({ phase: 'start', action, transport, request_id: requestId });

    const startedAt = Date.now();
    const finish = (outcome: 'ok' | 'error', extra: Partial<{ error_code: string; shape: RequestShape }>): void => {
      emitRequestEvent({
        phase: 'finish',
        action,
        transport,
        request_id: requestId,
        outcome,
        duration_ms: Date.now() - startedAt,
        ...extra,
      });
    };

    return next.handle().pipe(
      tap({
        next: (value) => {
          finish('ok', { shape: shapeOf(request, value) });
        },
        // The error is not handled here, only observed — `tap` re-throws, and translating it
        // stays the exception filter's single job.
        error: (error: unknown) => {
          finish('error', { error_code: declaredCode(error) });
        },
      }),
    );
  }
}

interface MaybeRequest {
  headers?: Record<string, unknown>;
  body?: unknown;
}

/**
 * `getRequest()` is typed as always returning a request and **does not**: in a GraphQL
 * context it returns `undefined`. The type is asserted, not inferred, so
 * `no-unnecessary-condition` reads a guard against it as dead code — which is how removing
 * one turned every GraphQL query into a 500 (`Cannot read properties of undefined`), caught
 * by the parity e2e tests. Annotating the truth satisfies both the linter and the runtime.
 */
function requestOf(context: ExecutionContext): MaybeRequest {
  try {
    return context.switchToHttp().getRequest<MaybeRequest | undefined>() ?? {};
  } catch {
    return {};
  }
}

function inboundRequestId(request: MaybeRequest): string | undefined {
  const raw = request.headers?.[REQUEST_ID_HEADER];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function setResponseHeader(context: ExecutionContext, requestId: string): void {
  try {
    // Same lie as `getRequest`: absent in a GraphQL context, typed as always present.
    const response = context
      .switchToHttp()
      .getResponse<{ setHeader?: (k: string, v: string) => void } | undefined>();
    response?.setHeader?.(REQUEST_ID_HEADER, requestId);
  } catch {
    // Nothing to echo to; the id still pairs the two log lines, which is its main job.
  }
}

/**
 * Counts only — never values. See the ADR: this product stores genetic variants, so a body
 * value in the log stream is a data-protection problem rather than an untidy line.
 *
 * Deliberately generic: top-level field count, the page size asked for, and the rows handed
 * back. A per-use-case summary (how many leaf conditions a query carried, say) belongs to that
 * use case rather than to a cross-cutting interceptor, which would have to know the shape of
 * every request to compute it.
 */
function shapeOf(request: MaybeRequest, response: unknown): RequestShape | undefined {
  const shape: RequestShape = {};
  const body = request.body;

  if (isRecord(body)) {
    shape.fields = Object.keys(body).length;
    if (typeof body.limit === 'number') shape.limit = body.limit;
  }
  if (isRecord(response) && Array.isArray(response.items)) shape.returned = response.items.length;

  return Object.keys(shape).length > 0 ? shape : undefined;
}

/** The stable token the descriptor declares, when the failure is a domain one. */
function declaredCode(error: unknown): string | undefined {
  return error instanceof VariantValidationError ? error.code : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
