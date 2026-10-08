import { Fragment } from "react";
import type { BrandColor, FormattedSpan } from "~/utils/formatted-text";
import { resolveFormattedText } from "~/utils/formatted-text";

/**
 * Tailwind classes per brand color, shared by the read view and the editor so
 * WYSIWYG really is what you get. Literal strings so Tailwind's scanner sees
 * them. Yellow is a Sand marker highlight rather than text color: Sand on
 * white is far below readable contrast, the tinted background is not.
 */
export const BRAND_COLOR_CLASS: Record<BrandColor, string> = {
  red: "text-brand-red dark:text-brand-red-soft",
  yellow:
    "rounded-[2px] bg-workshop/40 px-0.5 text-inherit [box-decoration-break:clone] dark:bg-workshop/35",
  blue: "text-primary dark:text-primary-light",
};

interface FormattedTextProps {
  /** Plain text as stored; the compatibility surface for older clients. */
  description?: string | null;
  /** Formatted twin; only honoured while it strips to `description`. */
  markup?: string | null;
  /** Pre-resolved spans, for callers that already parsed. */
  spans?: readonly FormattedSpan[];
}

function withLineBreaks(text: string) {
  const parts: React.ReactNode[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    if (offset > 0) parts.push(<br key={`br${offset}`} />);
    parts.push(<Fragment key={`t${offset}`}>{line}</Fragment>);
    offset += line.length + 1;
  }
  return parts;
}

/** Renders note markup as inline elements. Never emits raw HTML. */
export function FormattedText({ description, markup, spans }: FormattedTextProps) {
  const resolved = spans ?? resolveFormattedText(description, markup);
  const nodes: React.ReactNode[] = [];
  let offset = 0;
  for (const span of resolved) {
    let node: React.ReactNode = withLineBreaks(span.text);
    if (span.italic) node = <em>{node}</em>;
    if (span.bold) node = <strong className="font-semibold">{node}</strong>;
    if (span.color) node = <span className={BRAND_COLOR_CLASS[span.color]}>{node}</span>;
    nodes.push(<Fragment key={offset}>{node}</Fragment>);
    offset += span.text.length;
  }
  return <>{nodes}</>;
}
