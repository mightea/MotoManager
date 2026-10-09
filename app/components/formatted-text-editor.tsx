import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Highlighter, Italic } from "lucide-react";
import clsx from "clsx";
import {
  BRAND_COLORS,
  hasFormatting,
  plainTextOf,
  resolveFormattedText,
  serializeFormattedText,
  trimSpans,
  type BrandColor,
} from "~/utils/formatted-text";
import { BRAND_COLOR_MARK, docToSpans, spansToDoc } from "~/utils/formatted-text-prosemirror";
import { BrandColorMark, NoteKeymap } from "~/utils/tiptap-note-extensions";

interface FormattedTextEditorProps {
  /** id of the editable element, for the surrounding `<label htmlFor>`. */
  id: string;
  /** Form field names for the plain text and the markup. */
  name?: string;
  markupName?: string;
  initialDescription?: string | null;
  initialMarkup?: string | null;
  placeholder?: string;
  /** Reports every change, for forms that keep the text in React state. */
  onChange?: (value: FormattedValue) => void;
}

export interface FormattedValue {
  plain: string;
  markup: string;
}

const COLOR_LABEL: Record<BrandColor, string> = {
  red: "Rot (Vermillion)",
  yellow: "Gelb markieren (Sand)",
  blue: "Blau (Ultramarin)",
};

const COLOR_SWATCH: Record<BrandColor, string> = {
  red: "bg-brand-red",
  yellow: "bg-workshop",
  blue: "bg-primary",
};

// Trimmed like the server trims plain text, so markup and description agree.
function valueFrom(editor: Editor): FormattedValue {
  const spans = trimSpans(docToSpans(editor.getJSON()));
  const plain = plainTextOf(spans);
  if (!plain) return { plain: "", markup: "" };
  return { plain, markup: hasFormatting(spans) ? serializeFormattedText(spans) : "" };
}

/**
 * WYSIWYG editor for note markup (bold, italic, three brand colors). Keeps two
 * hidden form fields in sync: the plain text, which is the compatibility
 * surface older clients read, and the canonical markup.
 */
export function FormattedTextEditor({
  id,
  name = "description",
  markupName = "descriptionMarkup",
  initialDescription,
  initialMarkup,
  placeholder = "Optionale Details",
  onChange,
}: FormattedTextEditorProps) {
  const initialSpans = resolveFormattedText(initialDescription, initialMarkup);
  const [value, setValue] = useState<FormattedValue>(() => ({
    plain: plainTextOf(initialSpans),
    markup: hasFormatting(initialSpans) ? serializeFormattedText(initialSpans) : "",
  }));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        trailingNode: false,
        underline: false,
      }),
      BrandColorMark,
      NoteKeymap,
      Placeholder.configure({ placeholder }),
    ],
    content: spansToDoc(initialSpans),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        class:
          "note-editor min-h-[3.25rem] w-full p-3 text-sm text-base-content outline-none dark:text-white",
      },
    },
    onUpdate: ({ editor }) => {
      const next = valueFrom(editor);
      setValue(next);
      onChange?.(next);
    },
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      color: BRAND_COLORS.find((c) => editor?.isActive(BRAND_COLOR_MARK, { color: c })) ?? null,
    }),
  });

  const toggleColor = (color: BrandColor) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (active?.color === color) chain.unsetMark(BRAND_COLOR_MARK).run();
    else chain.setMark(BRAND_COLOR_MARK, { color }).run();
  };

  return (
    <div className="rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-navy-700 dark:bg-navy-900">
      <input type="hidden" name={name} value={value.plain} />
      <input type="hidden" name={markupName} value={value.markup} />

      <div
        role="toolbar"
        aria-label="Formatierung"
        className="flex items-center gap-1 border-b border-base-200 px-2 py-1.5 dark:border-navy-700"
      >
        <ToolbarButton
          label="Fett"
          shortcut="⌘B"
          pressed={active?.bold ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Kursiv"
          shortcut="⌘I"
          pressed={active?.italic ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" aria-hidden="true" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-base-300 dark:bg-navy-700" aria-hidden="true" />
        {BRAND_COLORS.map((color, index) => (
          <ToolbarButton
            key={color}
            label={COLOR_LABEL[color]}
            shortcut={`⌘⇧${index + 1}`}
            pressed={active?.color === color}
            onClick={() => toggleColor(color)}
          >
            {color === "yellow" ? (
              <Highlighter className="h-3.5 w-3.5 text-workshop-ink dark:text-workshop-soft" aria-hidden="true" />
            ) : (
              <span className={clsx("block h-3 w-3 rounded-full", COLOR_SWATCH[color])} aria-hidden="true" />
            )}
          </ToolbarButton>
        ))}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  shortcut: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, shortcut, pressed, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={`${label} (${shortcut})`}
      // Keep the selection in the editor; a focus change would collapse it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={clsx(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
        pressed
          ? "bg-primary/15 text-primary dark:bg-primary-light/20 dark:text-primary-light"
          : "text-base-content/70 hover:bg-base-200 hover:text-base-content dark:text-navy-300 dark:hover:bg-navy-800 dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
