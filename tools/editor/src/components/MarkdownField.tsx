import { markdown } from "@codemirror/lang-markdown";
import { Annotation, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { tidyText } from "../../shared/text";
import { Field } from "./widgets";

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

  return (
    <div
      ref={host}
      className="h-64 overflow-auto rounded-tr rounded-b border border-slate-300 bg-white"
    />
  );
}

export function MarkdownField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  return (
    <Field label={`${label} (markdown)`}>
      {(id) => (
        <div>
          <div role="tablist" className="flex gap-1">
            {(["edit", "preview"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                className={
                  "rounded-t border border-b-0 px-3 py-1 capitalize " +
                  (tab === name
                    ? "border-slate-300 bg-white font-medium text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800")
                }
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {/* Kept mounted while hidden so the editor's cursor and history survive. */}
          <div hidden={tab !== "edit"}>
            <CodeMirror id={id} value={value} onChange={onChange} />
          </div>
          {tab === "preview" && (
            <div
              role="tabpanel"
              className="prose prose-sm h-64 max-w-none overflow-auto rounded-tr rounded-b border border-slate-300 bg-white p-2"
            >
              <Markdown>{tidyText(value)}</Markdown>
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
