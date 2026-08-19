/**
 * The opaque pagination cursor.
 *
 * ANL-02 and the query descriptor specify only that the cursor is opaque and that it
 * fetches the next page — the encoding is this layer's choice. It carries the offset
 * into the ordered result set, which keeps paging identical on every access route
 * (a parity criterion of ANL-02) without leaking a row's field values to the client.
 */

/** Encode the offset the next page starts at. */
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), 'utf8').toString('base64url');
}

/** Decode a cursor's offset, or `null` when it was not one we issued. */
export function decodeCursor(cursor: string): number | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    // A client-supplied cursor is untrusted input: unreadable is a rejection, not a
    // crash. The caller turns `null` into the descriptor's validation error.
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const offset = (parsed as { o?: unknown }).o;
  if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) return null;

  return offset;
}
