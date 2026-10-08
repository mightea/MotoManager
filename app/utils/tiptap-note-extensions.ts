import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { BRAND_COLORS, type BrandColor } from "./formatted-text";
import { BRAND_COLOR_MARK } from "./formatted-text-prosemirror";
import { BRAND_COLOR_CLASS } from "~/components/formatted-text";

function isBrandColor(value: unknown): value is BrandColor {
  return typeof value === "string" && (BRAND_COLORS as readonly string[]).includes(value);
}

/** Inline mark carrying one of the three brand colors. */
export const BrandColorMark = Mark.create({
  name: BRAND_COLOR_MARK,

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-brand-color");
          return isBrandColor(value) ? value : null;
        },
        renderHTML: (attributes: Record<string, unknown>) =>
          isBrandColor(attributes.color)
            ? { "data-brand-color": attributes.color, class: BRAND_COLOR_CLASS[attributes.color] }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-brand-color]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Keeps the note a single paragraph (Enter inserts a line break, matching the
 * iOS editor) and adds color shortcuts next to the built-in Mod-B / Mod-I.
 * Digits rather than letters: Cmd-Shift-R/B are browser shortcuts (hard
 * reload, bookmarks bar) and must not be fought over.
 */
export const NoteKeymap = Extension.create({
  name: "noteKeymap",

  addKeyboardShortcuts() {
    const toggleColor = (color: BrandColor) => () =>
      this.editor.isActive(BRAND_COLOR_MARK, { color })
        ? this.editor.commands.unsetMark(BRAND_COLOR_MARK)
        : this.editor.commands.setMark(BRAND_COLOR_MARK, { color });
    return {
      Enter: () => this.editor.commands.setHardBreak(),
      "Mod-Shift-1": toggleColor("red"),
      "Mod-Shift-2": toggleColor("yellow"),
      "Mod-Shift-3": toggleColor("blue"),
    };
  },
});
