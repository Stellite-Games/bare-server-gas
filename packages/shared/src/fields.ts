/**
 * POST body field-name randomisation.
 *
 * The bare v4 `reassign.headers` concept applied to JSON body fields:
 * canonical field names are replaced with random build-time names so
 * the wire format has no recognisable structure.
 */

export type FieldMap = Record<string, string>;

/**
 * Build a reverse map (obfuscated name -> canonical name).
 */
export function invertFieldMap(map: FieldMap): FieldMap {
  const inv: FieldMap = {};
  for (const [canonical, obfuscated] of Object.entries(map)) {
    inv[obfuscated] = canonical;
  }
  return inv;
}

/**
 * Rename the top-level keys of `obj` using `map` (canonical -> obfuscated).
 * Keys not present in the map are passed through unchanged.
 */
export function mapFields(
  obj: Record<string, unknown>,
  map: FieldMap,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[map[key] ?? key] = value;
  }
  return out;
}

/**
 * Reverse-rename the top-level keys of `obj` (obfuscated -> canonical).
 */
export function unmapFields(
  obj: Record<string, unknown>,
  map: FieldMap,
): Record<string, unknown> {
  return mapFields(obj, invertFieldMap(map));
}
