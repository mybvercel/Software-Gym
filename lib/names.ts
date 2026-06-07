/**
 * Name helpers so that "Benjamín", "Benjamin", "benjamin" and "  BENJAMIN  "
 * are all treated as the same person and stored in one consistent shape.
 */

/**
 * Canonical display form: trims, collapses inner whitespace and Title-Cases
 * each word while preserving accents.
 *   "  benjamín  GARCÍA " -> "Benjamín García"
 *   "BENJAMIN"            -> "Benjamin"
 */
export function cleanDisplayName(raw: string): string {
  if (!raw) return "";
  const lower = raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  // Capitalize the first letter of every word, including after - and '
  return lower.replace(
    /(^|[\s\-'])([\p{L}])/gu,
    (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("es")
  );
}

/**
 * Match form: lowercased, accent-stripped, whitespace-collapsed.
 * Use this to compare two names for "are they the same person".
 *   normalizeForMatch("Benjamín") === normalizeForMatch("benjamin") // true
 */
export function normalizeForMatch(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // strip accents / tildes
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when two names refer to the same person ignoring case/accents/spacing. */
export function sameName(a: string, b: string): boolean {
  return normalizeForMatch(a) === normalizeForMatch(b);
}
