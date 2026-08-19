import { classifyStoreFailure } from './clickhouse-errors';

/**
 * The shapes below are not invented — they were captured by driving `@clickhouse/client`
 * at a closed port, an unroutable address and a bogus hostname, and reading what it
 * actually throws. Two things that reading changed:
 *
 * - The client LOGS "Caused by: …" but throws the underlying error directly, so the
 *   connectivity code sits at the top level rather than behind `.cause`.
 * - A timeout arrives with **no `code` at all** — only the message `Timeout error.` That
 *   is a driver string and therefore the fragile part of this mapping, which is why it is
 *   pinned by a test rather than trusted.
 */
describe('classifyStoreFailure', () => {
  const withCode = (code: string, message = 'boom'): Error =>
    Object.assign(new Error(message), { code });

  it('reads a refused connection as unreachable', () => {
    expect(classifyStoreFailure(withCode('ECONNREFUSED', 'connect ECONNREFUSED 10.1.2.3:8123')))
      .toBe('unreachable');
  });

  it('reads an unresolvable host as unreachable', () => {
    expect(classifyStoreFailure(withCode('ENOTFOUND', 'getaddrinfo ENOTFOUND store.invalid')))
      .toBe('unreachable');
  });

  it('reads a reset connection as unreachable', () => {
    expect(classifyStoreFailure(withCode('ECONNRESET'))).toBe('unreachable');
  });

  it("reads the driver's own timeout as a timeout, message-only and codeless", () => {
    expect(classifyStoreFailure(new Error('Timeout error.'))).toBe('timeout');
  });

  it('reads a socket timeout code as a timeout', () => {
    expect(classifyStoreFailure(withCode('ETIMEDOUT'))).toBe('timeout');
  });

  it('looks through an AggregateError, which is how a multi-address attempt fails', () => {
    const aggregate = new AggregateError([withCode('ECONNREFUSED')], 'all attempts failed');
    expect(classifyStoreFailure(aggregate)).toBe('unreachable');
  });

  it('looks through a cause chain', () => {
    const wrapped = new Error('HTTP request error', { cause: withCode('ECONNREFUSED') });
    expect(classifyStoreFailure(wrapped)).toBe('unreachable');
  });

  it('does NOT claim a store the server answered from — that fault is ours', () => {
    // "Unknown table expression identifier 'variant'" is ClickHouse ANSWERING with a
    // complaint about our query. We reached it, so this is a 500, not a 502.
    expect(classifyStoreFailure(new Error("Unknown table expression identifier 'variant'")))
      .toBeNull();
  });

  it('claims nothing about a non-error', () => {
    expect(classifyStoreFailure('nope')).toBeNull();
    expect(classifyStoreFailure(undefined)).toBeNull();
  });
});
