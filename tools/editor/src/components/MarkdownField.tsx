import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Annotation, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useId, useRef } from "react";
import Markdown from "react-markdown";
import { tidyText } from "../../shared/text";

const external = Annotation.define<boolean>();

// CodeMirror's built-in theme is light-only. Deriving from the frame's text
// colour keeps the editor in step with the app's light or dark theme.
const followFrameTheme = EditorView.theme({
  "&": { color: "inherit", backgroundColor: "transparent" },
  ".cm-content": { caretColor: "currentColor" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "currentColor" },
  ".cm-gutters": {
    color: "color-mix(in srgb, currentColor 55%, transparent)",
    backgroundColor: "color-mix(in srgb, currentColor 5%, transparent)",
    borderRight: "1px solid color-mix(in srgb, currentColor 15%, transparent)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, currentColor 7%, transparent)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
    {
      backgroundColor: "color-mix(in srgb, Highlight 45%, transparent)",
    },
});

function CodeMirror({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const latest = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    latest.current = value;
  });

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: tidyText(latest.current),
        extensions: [
          basicSetup,
          markdown(),
          followFrameTheme,
          syntaxHighlighting(markdownHighlight),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ id }),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((t) => t.annotation(external))
            ) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => editor.destroy();
  }, [id]);

  // Undo/redo changes the value from outside the editor.
  useEffect(() => {
    const editor = view.current;
    if (!editor) {
      return;
    }
    const shown = editor.state.doc.toString();
    if (shown !== value && shown !== tidyText(value)) {
      editor.dispatch({
        changes: { from: 0, to: shown.length, insert: tidyText(value) },
        annotations: external.of(true),
      });
    }
  }, [value]);

  return <div ref={host} className={editorFrame} />;
}

// Replaces basicSetup's light-only colours. light-dark() works because S2's
// page.css sets color-scheme.
const subdued = "color-mix(in srgb, currentColor 65%, transparent)";
const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "bold" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  {
    tag: [tags.processingInstruction, tags.meta, tags.contentSeparator],
    color: subdued,
  },
  { tag: [tags.link, tags.url], color: "light-dark(#1d4ed8, #93c5fd)" },
  { tag: tags.monospace, color: "light-dark(#9d174d, #f9a8d4)" },
  { tag: tags.quote, color: subdued, fontStyle: "italic" },
]);

const editorFrame = style({
  height: 256,
  overflow: "auto",
  borderRadius: "default",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-300",
  backgroundColor: "gray-25",
  color: "neutral",
});

export function MarkdownField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className={style({ marginTop: 12 })}>
      <label
        htmlFor={id}
        className={style({
          display: "block",
          font: "ui",
          color: "neutral-subdued",
        })}
      >
        {label} (markdown)
      </label>
      <Tabs aria-label={`${label} view`} density="compact">
        <TabList>
          <Tab id="edit">Edit</Tab>
          <Tab id="preview">Preview</Tab>
        </TabList>
        {/* Kept mounted while hidden so the editor's cursor and history survive. */}
        <TabPanel id="edit" shouldForceMount>
          <CodeMirror id={id} value={value} onChange={onChange} />
        </TabPanel>
        <TabPanel id="preview">
          <div className={"markdown-preview " + editorFrame}>
            <Markdown>{tidyText(value)}</Markdown>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
