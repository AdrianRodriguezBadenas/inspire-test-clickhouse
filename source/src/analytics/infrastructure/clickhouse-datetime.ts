/**
 * Conversion between JavaScript dates and ClickHouse `DateTime64(3)` literals.
 *
 * The entity spec declares `created_at` and `version_date` as `DateTime64(3)` with no
 * timezone, so the interpretation is the session's. The client pins that session to
 * UTC (see `clickhouse.provider.ts`) and everything here is UTC too — which is what
 * makes `version_date` comparisons, and therefore "which version is current",
 * independent of where the server or the caller happens to run.
 */

const CLICKHOUSE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/;

/** Render a date as the `YYYY-MM-DD hh:mm:ss.SSS` literal ClickHouse accepts. */
export function formatClickHouseDateTime(date: Date): string {
  const iso = date.toISOString();

  // '2026-07-28T09:15:42.123Z' → '2026-07-28 09:15:42.123'
  return `${iso.slice(0, 10)} ${iso.slice(11, 23)}`;
}

/** Read a ClickHouse timestamp literal as a UTC instant. */
export function parseClickHouseDateTime(literal: string): Date {
  const match = CLICKHOUSE_DATETIME.exec(literal);
  if (match === null) throw new Error(`Unreadable ClickHouse timestamp: ${literal}`);

  const [, year, month, day, hours, minutes, seconds, fraction = '0'] = match;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
      Number(fraction.padEnd(3, '0').slice(0, 3)),
    ),
  );
}
