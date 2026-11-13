import { markdown } from "@codemirror/lang-markdown";
import { Annotation, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useId, useRef } from "react";
import Markdown from "react-markdown";
import { tidyText } from "../../shared/text";

const external = Annotation.define<boolean>();

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

const editorFrame = style({
  height: 256,
  overflow: "auto",
  borderRadius: "default",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-300",
  backgroundColor: "gray-25",
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
          <div className={"prose prose-sm max-w-none p-2 " + editorFrame}>
            <Markdown>{tidyText(value)}</Markdown>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
