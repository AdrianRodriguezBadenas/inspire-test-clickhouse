import { emitRequestEvent, type RequestEvent } from './request-log';

/**
 * The contract these tests hold is the one a log CONSUMER depends on, which is why they
 * assert the parsed line rather than the string: field names, and the absence of anything
 * that was never meant to leave the process.
 *
 * Per adr-request-observability-log: NDJSON on stdout, one object per line, named by the
 * action descriptor id, and never a payload value.
 */
describe('emitRequestEvent', () => {
  let written: string[];

  beforeEach(() => {
    written = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown): boolean => {
      written.push(String(chunk));
      return true;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const parsed = (): Record<string, unknown> => JSON.parse(written[0]) as Record<string, unknown>;

  const anEvent = (over: Partial<RequestEvent> = {}): RequestEvent => ({
    phase: 'start',
    action: 'analytics.variant.query',
    transport: 'rest',
    request_id: 'req-1',
    ...over,
  });

  it('writes exactly one line, terminated by a newline', () => {
    emitRequestEvent(anEvent());

    expect(written).toHaveLength(1);
    expect(written[0].endsWith('\n')).toBe(true);
    expect(written[0].trimEnd()).not.toContain('\n');
  });

  it('is parseable JSON with the consumer-facing field set', () => {
    emitRequestEvent(anEvent());

    expect(Object.keys(parsed()).sort()).toEqual(
      ['action', 'level', 'phase', 'request_id', 'timestamp', 'transport'].sort(),
    );
  });

  it('names the use case by its action descriptor id, not a route', () => {
    emitRequestEvent(anEvent({ action: 'analytics.variant.create' }));

    expect(parsed().action).toBe('analytics.variant.create');
  });

  it('carries duration and outcome on the finish line', () => {
    emitRequestEvent(anEvent({ phase: 'finish', outcome: 'ok', duration_ms: 42, shape: { returned: 7 } }));

    expect(parsed()).toMatchObject({
      phase: 'finish',
      outcome: 'ok',
      duration_ms: 42,
      shape: { returned: 7 },
    });
  });

  it('carries the declared error code when the outcome is an error', () => {
    emitRequestEvent(anEvent({ phase: 'finish', outcome: 'error', error_code: 'unknown_query_field' }));

    expect(parsed()).toMatchObject({ outcome: 'error', error_code: 'unknown_query_field' });
  });

  it('omits absent optional fields rather than writing nulls', () => {
    emitRequestEvent(anEvent());

    expect(Object.keys(parsed())).not.toContain('duration_ms');
    expect(Object.keys(parsed())).not.toContain('error_code');
  });

  it('stamps an ISO timestamp', () => {
    emitRequestEvent(anEvent());

    expect(parsed().timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  // The privacy rule of the ADR, asserted rather than trusted: this product stores genetic
  // variants, so a body value reaching the log stream is a data-protection problem, not an
  // untidy line. The type forbids it; this proves the emitter does too.
  it('writes nothing but the declared fields, even when handed extra keys', () => {
    emitRequestEvent({
      ...anEvent(),
      ...({ body: { uri: 'chr1:12345:A:T', patient_id: 'P-9' } } as unknown as Partial<RequestEvent>),
    });

    expect(written[0]).not.toContain('chr1');
    expect(written[0]).not.toContain('P-9');
    expect(written[0]).not.toContain('patient_id');
  });
});
