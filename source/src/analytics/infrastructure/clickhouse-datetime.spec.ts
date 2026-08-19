import { formatClickHouseDateTime, parseClickHouseDateTime } from './clickhouse-datetime';

describe('formatClickHouseDateTime', () => {
  it('renders a date as a millisecond-precision UTC literal', () => {
    const date = new Date('2026-07-28T09:15:42.123Z');

    const formatted = formatClickHouseDateTime(date);

    expect(formatted).toBe('2026-07-28 09:15:42.123');
  });

  it('renders a whole second with explicit zero milliseconds', () => {
    const date = new Date('2026-01-05T00:00:00.000Z');

    const formatted = formatClickHouseDateTime(date);

    expect(formatted).toBe('2026-01-05 00:00:00.000');
  });

  it('renders in UTC regardless of the local timezone', () => {
    const date = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));

    const formatted = formatClickHouseDateTime(date);

    expect(formatted).toBe('2026-12-31 23:59:59.999');
  });
});

describe('parseClickHouseDateTime', () => {
  it('reads a millisecond-precision literal as a UTC instant', () => {
    const parsed = parseClickHouseDateTime('2026-07-28 09:15:42.123');

    expect(parsed.toISOString()).toBe('2026-07-28T09:15:42.123Z');
  });

  it('reads a literal without a fractional part', () => {
    const parsed = parseClickHouseDateTime('2026-07-28 09:15:42');

    expect(parsed.toISOString()).toBe('2026-07-28T09:15:42.000Z');
  });

  it('round-trips a formatted date', () => {
    const date = new Date('2026-03-14T15:09:26.535Z');

    const roundTripped = parseClickHouseDateTime(formatClickHouseDateTime(date));

    expect(roundTripped).toEqual(date);
  });

  it('rejects a literal it cannot read', () => {
    const act = (): Date => parseClickHouseDateTime('not-a-timestamp');

    expect(act).toThrow('Unreadable ClickHouse timestamp: not-a-timestamp');
  });
});
