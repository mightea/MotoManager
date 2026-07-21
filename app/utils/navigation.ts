/**
 * Accept only same-origin application paths for post-authentication redirects.
 * Reject protocol-relative URLs, backslashes and control characters before URL
 * normalization so redirects can never leave MotoManager.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  const hasControlCharacter = [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
  if (value.includes("\\") || hasControlCharacter) return fallback;

  try {
    const base = new URL("https://motomanager.invalid");
    const target = new URL(value, base);
    if (target.origin !== base.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
