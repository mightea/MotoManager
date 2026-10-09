import { describe, expect, it } from "vitest";
import fixture from "../fixtures/formatted-text.json";
import {
  hasFormatting,
  parseFormattedText,
  plainTextOf,
  resolveFormattedText,
  serializeFormattedText,
  trimSpans,
  type FormattedSpan,
} from "~/utils/formatted-text";
import { docToSpans, spansToDoc } from "~/utils/formatted-text-prosemirror";

type FixtureSpan = [string, string, FormattedSpan["color"]];
interface FixtureCase {
  name: string;
  markup: string;
  spans: FixtureSpan[];
  canonical: string | null;
}

const cases = (fixture as unknown as { cases: FixtureCase[] }).cases;

const toSpans = (rows: FixtureSpan[]): FormattedSpan[] =>
  rows.map(([text, flags, color]) => ({
    text,
    bold: flags.includes("b"),
    italic: flags.includes("i"),
    color,
  }));

describe("parseFormattedText", () => {
  it.each(cases)("$name", ({ markup, spans }) => {
    expect(parseFormattedText(markup)).toEqual(toSpans(spans));
  });
});

describe("serializeFormattedText", () => {
  it.each(cases)("$name is canonical", ({ markup, spans, canonical }) => {
    expect(serializeFormattedText(toSpans(spans))).toBe(canonical ?? markup);
  });

  it.each(cases)("$name round-trips", ({ spans }) => {
    const expected = toSpans(spans);
    expect(parseFormattedText(serializeFormattedText(expected))).toEqual(expected);
  });
});

describe("resolveFormattedText", () => {
  it("uses the markup while it strips to the plain description", () => {
    const spans = resolveFormattedText("Achtung: kalt", "[red]**Achtung:**[/red] kalt");
    expect(hasFormatting(spans)).toBe(true);
    expect(plainTextOf(spans)).toBe("Achtung: kalt");
  });

  it("falls back to the plain text once an older client changed it", () => {
    const spans = resolveFormattedText("Achtung: kalt, 2x", "[red]**Achtung:**[/red] kalt");
    expect(spans).toEqual([{ text: "Achtung: kalt, 2x", bold: false, italic: false, color: null }]);
  });

  it("returns nothing for an empty description", () => {
    expect(resolveFormattedText(null, null)).toEqual([]);
    expect(resolveFormattedText("", "**x**")).toEqual([]);
  });
});

describe("ProseMirror conversion", () => {
  it.each(cases)("$name survives the editor document", ({ spans }) => {
    const expected = toSpans(spans);
    const roundTripped = docToSpans(spansToDoc(expected));
    expect(serializeFormattedText(roundTripped)).toBe(serializeFormattedText(expected));
  });

  it("joins extra paragraphs with newlines", () => {
    const spans = docToSpans({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "bold" }] }] },
        { type: "paragraph", content: [{ type: "text", text: "b" }] },
      ],
    });
    expect(plainTextOf(spans)).toBe("a\nb");
    expect(serializeFormattedText(spans)).toBe("**a**\nb");
  });

  it("drops unknown marks and colors", () => {
    const spans = docToSpans({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "x", marks: [{ type: "underline" }, { type: "brandColor", attrs: { color: "green" } }] },
          ],
        },
      ],
    });
    expect(spans).toEqual([{ text: "x", bold: false, italic: false, color: null }]);
  });
});

describe("trimSpans", () => {
  const span = (text: string, bold = false): FormattedSpan => ({ text, bold, italic: false, color: null });

  it("trims outer whitespace across spans and drops emptied ones", () => {
    expect(trimSpans([span("  "), span(" Achtung", true), span(" kalt \n")])).toEqual([
      span("Achtung", true),
      span(" kalt"),
    ]);
  });

  it("keeps inner whitespace and returns nothing for blank input", () => {
    expect(trimSpans([span("a "), span(" b")])).toEqual([span("a "), span(" b")]);
    expect(trimSpans([span(" \n ")])).toEqual([]);
    expect(trimSpans([])).toEqual([]);
  });

  it("keeps the stored markup consistent with a server-trimmed description", () => {
    const spans = trimSpans([span("  "), span("Achtung ", true), span("kalt  ")]);
    expect(plainTextOf(spans)).toBe("Achtung kalt");
    expect(resolveFormattedText("Achtung kalt", serializeFormattedText(spans))).toEqual(spans);
  });
});
