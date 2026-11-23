/** Lowercase, without diacritics, with punctuation collapsed to single spaces. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchTokens(query: string): string[] {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(" ") : [];
}

/**
 * Whether a token occurs in any field. Each field is compared without spaces so
 * "r1250" finds "R 1250 GS", while a token can't match across two fields.
 */
export function tokenMatchesFields(token: string, fields: readonly string[]): boolean {
  return fields.some((field) => normalizeSearchText(field).replace(/ /g, "").includes(token));
}

/** Every query token must appear in the bike's make or model, in any order. */
export function matchesBikeName(bike: { make: string; model: string }, query: string): boolean {
  return searchTokens(query).every((token) => tokenMatchesFields(token, [bike.make, bike.model]));
}
