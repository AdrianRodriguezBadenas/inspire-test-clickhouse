import { lastValueFrom, of, throwError } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestLogInterceptor, LOGS_ACTION } from './request-log.interceptor';
import { VariantValidationError, VariantErrorCode } from '../../analytics/domain/variant-errors';

/** A REST ExecutionContext carrying the given headers, capturing response headers set. */
const restContext = (
  headers: Record<string, string>,
  body: unknown,
  setHeaders: Record<string, string>,
): ExecutionContext =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ headers, body }),
      getResponse: () => ({
        setHeader: (k: string, v: string) => {
          setHeaders[k] = v;
        },
      }),
    }),
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
  }) as unknown as ExecutionContext;

const handlerReturning = (value: unknown): CallHandler => ({ handle: () => of(value) });
const handlerThrowing = (error: unknown): CallHandler => ({ handle: () => throwError(() => error) });

describe('RequestLogInterceptor', () => {
  let lines: Record<string, unknown>[];
  let reflector: Reflector;

  beforeEach(() => {
    lines = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown): boolean => {
      lines.push(JSON.parse(String(chunk)) as Record<string, unknown>);
      return true;
    });
    reflector = new Reflector();
    jest.spyOn(reflector, 'get').mockReturnValue('analytics.variant.query');
  });

  afterEach(() => jest.restoreAllMocks());

  it('emits a start line and a finish line, in that order', async () => {
    const set: Record<string, string> = {};
    const interceptor = new RequestLogInterceptor(reflector);

    await lastValueFrom(
      interceptor.intercept(restContext({}, {}, set), handlerReturning({ items: [] })),
    );

    expect(lines.map((l) => l.phase)).toEqual(['start', 'finish']);
  });

  it('pairs the two lines with one correlation id', async () => {
    const set: Record<string, string> = {};
    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(restContext({}, {}, set), handlerReturning({})),
    );

    expect(lines[0].request_id).toBe(lines[1].request_id);
    expect(String(lines[0].request_id)).not.toHaveLength(0);
  });

  it('takes the correlation id from an inbound x-request-id', async () => {
    const set: Record<string, string> = {};
    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(
        restContext({ 'x-request-id': 'from-the-gateway' }, {}, set),
        handlerReturning({}),
      ),
    );

    expect(lines[0].request_id).toBe('from-the-gateway');
  });

  it('generates one when no header arrives, because the value is that it always exists', async () => {
    const set: Record<string, string> = {};
    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(restContext({}, {}, set), handlerReturning({})),
    );

    expect(String(lines[0].request_id)).toMatch(/[0-9a-f-]{8,}/);
  });

  it('echoes the correlation id back, so a caller can quote it', async () => {
    const set: Record<string, string> = {};
    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(
        restContext({ 'x-request-id': 'quote-me' }, {}, set),
        handlerReturning({}),
      ),
    );

    expect(set['x-request-id']).toBe('quote-me');
  });

  it('reports the outcome and a duration on the finish line', async () => {
    const set: Record<string, string> = {};
    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(restContext({}, {}, set), handlerReturning({})),
    );

    expect(lines[1].outcome).toBe('ok');
    expect(typeof lines[1].duration_ms).toBe('number');
  });

  it('reports a failure with the code the descriptor declares, and re-throws', async () => {
    const set: Record<string, string> = {};
    const failure = new VariantValidationError(VariantErrorCode.UNKNOWN_QUERY_FIELD, 'Unknown query field: ghost.');

    await expect(
      lastValueFrom(
        new RequestLogInterceptor(reflector).intercept(restContext({}, {}, set), handlerThrowing(failure)),
      ),
    ).rejects.toBe(failure);

    expect(lines[1]).toMatchObject({ outcome: 'error', error_code: 'unknown_query_field' });
  });

  it('summarizes shape as counts and never as values', async () => {
    const set: Record<string, string> = {};
    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(
        restContext({}, { uri: 'chr1:12345:A:T', project_id: 7, limit: 25 }, set),
        handlerReturning({ items: [{ uri: 'chr1:12345:A:T' }, { uri: 'chr2:1:G:C' }] }),
      ),
    );

    expect(lines[1].shape).toEqual({ fields: 3, limit: 25, returned: 2 });
    expect(JSON.stringify(lines)).not.toContain('chr1');
    expect(JSON.stringify(lines)).not.toContain('chr2');
  });

  it('stays silent for a handler that declares no action', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const set: Record<string, string> = {};

    await lastValueFrom(
      new RequestLogInterceptor(reflector).intercept(restContext({}, {}, set), handlerReturning({})),
    );

    // An undeclared handler is not a use case — /health and /docs must not pretend to be one.
    expect(lines).toHaveLength(0);
  });

  it('exposes the metadata key the decorator writes', () => {
    expect(LOGS_ACTION).toBeTruthy();
  });
});
