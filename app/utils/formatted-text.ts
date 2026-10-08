/**
 * Inline formatting for free-text notes (currently torque spec descriptions).
 *
 * The wire format is a tiny markup stored next to the plain text:
 *
 *   **bold**   *italic*   [red]…[/red]   [yellow]…[/yellow]   [blue]…[/blue]
 *   \*  \[  \\   literal characters
 *
 * Both clients (this webapp and the iOS app) parse and serialize it with the
 * same rules, so the shared fixture in `tests/fixtures/formatted-text.json`
 * must pass on both sides:
 *
 * - Unmatched or unknown delimiters render literally, so legacy text such as
 *   "M8*1.25" is unaffected.
 * - Styles may overlap; the result is a flat list of spans, each with its own
 *   attribute set, never a tree.
 * - Serialization is canonical: adjacent spans with identical attributes are
 *   merged, tags open in the order color → bold → italic, and literal `*`,
 *   `[` and `\` are escaped. Round-tripping through either editor therefore
 *   yields byte-identical markup.
 *
 * The plain `description` column is what older iOS builds read and write; the
 * markup is only honoured while stripping it reproduces that plain text (see
 * `resolveFormattedText`). Newlines are ordinary characters inside spans.
 */

export const BRAND_COLORS = ["red", "yellow", "blue"] as const;
export type BrandColor = (typeof BRAND_COLORS)[number];

export interface FormattedSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  color: BrandColor | null;
}

function isBrandColor(value: string): value is BrandColor {
  return (BRAND_COLORS as readonly string[]).includes(value);
}

type Token =
  | { kind: "text"; value: string }
  | { kind: "bold" }
  | { kind: "italic" }
  | { kind: "open"; color: BrandColor }
  | { kind: "close"; color: BrandColor };

const TAG_RE = /^\[(\/?)([a-z]+)\]/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  const flush = () => {
    if (text) {
      tokens.push({ kind: "text", value: text });
      text = "";
    }
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\" && i + 1 < input.length) {
      text += input[i + 1];
      i += 2;
      continue;
    }
    if (ch === "*") {
      flush();
      if (input[i + 1] === "*") {
        tokens.push({ kind: "bold" });
        i += 2;
      } else {
        tokens.push({ kind: "italic" });
        i += 1;
      }
      continue;
    }
    if (ch === "[") {
      const match = TAG_RE.exec(input.slice(i));
      if (match && isBrandColor(match[2])) {
        flush();
        tokens.push(match[1] ? { kind: "close", color: match[2] } : { kind: "open", color: match[2] });
        i += match[0].length;
        continue;
      }
    }
    text += ch;
    i += 1;
  }
  flush();
  return tokens;
}

function literal(token: Token): string {
  switch (token.kind) {
    case "text":
      return token.value;
    case "bold":
      return "**";
    case "italic":
      return "*";
    case "open":
      return `[${token.color}]`;
    case "close":
      return `[/${token.color}]`;
  }
}

/** Parse markup into flat spans. Never throws; garbage renders as text. */
export function parseFormattedText(markup: string): FormattedSpan[] {
  const tokens = tokenize(markup);
  const spans: FormattedSpan[] = [];
  let bold = false;
  let italic = false;
  const colors: BrandColor[] = [];

  const push = (text: string) => {
    if (!text) return;
    const color = colors.length ? colors[colors.length - 1] : null;
    const last = spans[spans.length - 1];
    if (last && last.bold === bold && last.italic === italic && last.color === color) {
      last.text += text;
    } else {
      spans.push({ text, bold, italic, color });
    }
  };

  const hasLater = (from: number, predicate: (t: Token) => boolean) =>
    tokens.slice(from + 1).some(predicate);

  tokens.forEach((token, index) => {
    switch (token.kind) {
      case "text":
        push(token.value);
        break;
      case "bold":
        if (bold) bold = false;
        else if (hasLater(index, (t) => t.kind === "bold")) bold = true;
        else push(literal(token));
        break;
      case "italic":
        if (italic) italic = false;
        else if (hasLater(index, (t) => t.kind === "italic")) italic = true;
        else push(literal(token));
        break;
      case "open":
        if (hasLater(index, (t) => t.kind === "close" && t.color === token.color)) colors.push(token.color);
        else push(literal(token));
        break;
      case "close": {
        const at = colors.lastIndexOf(token.color);
        if (at >= 0) colors.splice(at, 1);
        else push(literal(token));
        break;
      }
    }
  });

  return spans;
}

function escapeText(text: string): string {
  return text.replace(/[\\*[]/g, (c) => `\\${c}`);
}

function normalize(spans: readonly FormattedSpan[]): FormattedSpan[] {
  const out: FormattedSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const last = out[out.length - 1];
    if (last && last.bold === span.bold && last.italic === span.italic && last.color === span.color) {
      last.text += span.text;
    } else {
      out.push({ ...span });
    }
  }
  return out;
}

/**
 * Canonical markup for a span list. Emits style transitions between
 * consecutive spans (closing in the order italic → bold → color, opening in
 * the order color → bold → italic) rather than wrapping each span, so that
 * overlapping styles never produce runs of asterisks the tokenizer would
 * read differently. Returns "" for an empty list.
 */
export function serializeFormattedText(spans: readonly FormattedSpan[]): string {
  let out = "";
  let bold = false;
  let italic = false;
  let color: BrandColor | null = null;

  const transition = (next: { bold: boolean; italic: boolean; color: BrandColor | null }) => {
    if (italic && !next.italic) out += "*";
    if (bold && !next.bold) out += "**";
    if (color && color !== next.color) out += `[/${color}]`;
    if (next.color && color !== next.color) out += `[${next.color}]`;
    if (!bold && next.bold) out += "**";
    if (!italic && next.italic) out += "*";
    ({ bold, italic, color } = next);
  };

  for (const span of normalize(spans)) {
    transition(span);
    out += escapeText(span.text);
  }
  transition({ bold: false, italic: false, color: null });
  return out;
}

export function plainTextOf(spans: readonly FormattedSpan[]): string {
  return spans.map((s) => s.text).join("");
}

export function hasFormatting(spans: readonly FormattedSpan[]): boolean {
  return spans.some((s) => s.bold || s.italic || s.color !== null);
}

/**
 * Spans to display for a record: the markup when it is consistent with the
 * plain description (an older client may have edited the text since), else
 * the plain text as a single unstyled span.
 */
export function resolveFormattedText(
  description: string | null | undefined,
  markup: string | null | undefined,
): FormattedSpan[] {
  const plain = description ?? "";
  if (markup) {
    const spans = parseFormattedText(markup);
    if (plainTextOf(spans) === plain) return spans;
  }
  return plain ? [{ text: plain, bold: false, italic: false, color: null }] : [];
}
