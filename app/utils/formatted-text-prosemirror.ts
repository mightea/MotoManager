import type { JSONContent } from "@tiptap/core";
import type { BrandColor, FormattedSpan } from "./formatted-text";
import { BRAND_COLORS } from "./formatted-text";

/**
 * Converts between the flat span model and the Tiptap document used by the
 * WYSIWYG editor. The editor schema is one paragraph of text with `bold`,
 * `italic` and `brandColor` marks plus `hardBreak` nodes for newlines.
 */

export const BRAND_COLOR_MARK = "brandColor";

function marksFor(span: FormattedSpan): JSONContent["marks"] {
  const marks: NonNullable<JSONContent["marks"]> = [];
  if (span.bold) marks.push({ type: "bold" });
  if (span.italic) marks.push({ type: "italic" });
  if (span.color) marks.push({ type: BRAND_COLOR_MARK, attrs: { color: span.color } });
  return marks;
}

export function spansToDoc(spans: readonly FormattedSpan[]): JSONContent {
  const content: JSONContent[] = [];
  for (const span of spans) {
    const marks = marksFor(span);
    const withMarks = (node: JSONContent): JSONContent => (marks?.length ? { ...node, marks } : node);
    span.text.split("\n").forEach((line, index) => {
      if (index > 0) content.push(withMarks({ type: "hardBreak" }));
      if (line) content.push(withMarks({ type: "text", text: line }));
    });
  }
  return {
    type: "doc",
    content: [content.length ? { type: "paragraph", content } : { type: "paragraph" }],
  };
}

function spanFromNode(node: JSONContent, text: string): FormattedSpan {
  let bold = false;
  let italic = false;
  let color: BrandColor | null = null;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") bold = true;
    else if (mark.type === "italic") italic = true;
    else if (mark.type === BRAND_COLOR_MARK) {
      const value = mark.attrs?.color;
      if (typeof value === "string" && (BRAND_COLORS as readonly string[]).includes(value)) {
        color = value as BrandColor;
      }
    }
  }
  return { text, bold, italic, color };
}

/** Flattens the document; paragraphs beyond the first become newlines. */
export function docToSpans(doc: JSONContent): FormattedSpan[] {
  const spans: FormattedSpan[] = [];
  const blocks = (doc.content ?? []).filter((b) => b.type === "paragraph");
  blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0) spans.push({ text: "\n", bold: false, italic: false, color: null });
    for (const node of block.content ?? []) {
      if (node.type === "text" && node.text) spans.push(spanFromNode(node, node.text));
      else if (node.type === "hardBreak") spans.push(spanFromNode(node, "\n"));
    }
  });
  return spans;
}
