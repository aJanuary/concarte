import { XMarkIcon } from "@heroicons/react/16/solid";
import { useId, useMemo, useState } from "react";
import { Field } from "./widgets";

export function StringListField({
  label,
  value,
  onChange,
  suggestions,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  hint?: string;
}) {
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();

  const options = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (query === "") {
      return [];
    }
    const chosen = new Set(value);
    const matches = [...new Set(suggestions)]
      .filter((s) => !chosen.has(s) && s.toLowerCase().includes(query))
      .slice(0, 8)
      .map((s) => ({ text: s, isNew: false }));
    const exact =
      value.includes(text.trim()) || suggestions.includes(text.trim());
    return exact ? matches : [...matches, { text: text.trim(), isNew: true }];
  }, [text, value, suggestions]);

  const add = (item: string) => {
    const trimmed = item.trim();
    if (trimmed !== "" && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setText("");
    setHighlight(0);
  };

  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="relative">
          <div className="flex flex-wrap gap-1 rounded border border-slate-300 bg-white p-1 focus-within:border-blue-500">
            {value.map((item) => (
              <span
                key={item}
                className="flex max-w-full items-center gap-1 rounded bg-slate-200 px-1.5 text-slate-800"
              >
                <span className="truncate" title={item}>
                  {item}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  className="text-slate-500 hover:text-slate-900"
                  onClick={() => onChange(value.filter((v) => v !== item))}
                >
                  <XMarkIcon className="size-3" />
                </button>
              </span>
            ))}
            <input
              id={id}
              role="combobox"
              aria-expanded={open && options.length > 0}
              aria-controls={listId}
              className="min-w-24 flex-1 border-0 bg-transparent px-1 py-0.5 focus:outline-none"
              placeholder="add..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setHighlight(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                // Half-typed text is dropped: only an explicit Enter or click adds.
                setOpen(false);
                setText("");
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, options.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  add(options[highlight]?.text ?? text);
                } else if (e.key === "Escape") {
                  setText("");
                } else if (
                  e.key === "Backspace" &&
                  text === "" &&
                  value.length > 0
                ) {
                  onChange(value.slice(0, -1));
                }
              }}
            />
          </div>
          {open && options.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-10 mt-1 w-full rounded border border-slate-300 bg-white shadow"
            >
              {options.map((option, i) => (
                <li
                  key={option.text + option.isNew}
                  role="option"
                  aria-selected={i === highlight}
                  // mousedown, so it lands before the input's blur
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(option.text);
                  }}
                  className={
                    "cursor-pointer px-2 py-1 " +
                    (i === highlight ? "bg-blue-100 " : "") +
                    (option.isNew ? "italic" : "")
                  }
                >
                  {option.isNew ? `Create "${option.text}"` : option.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}
