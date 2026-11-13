import { ComboBox, ComboBoxItem, Tag, TagGroup } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, useState } from "react";
import { useCommit } from "./widgets";

const NEW_PREFIX = "new:";

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
  const commit = useCommit();

  const options = useMemo(() => {
    const query = text.trim();
    if (query === "") {
      return [];
    }
    const chosen = new Set(value);
    const lower = query.toLowerCase();
    const matches = [...new Set(suggestions)]
      .filter((s) => !chosen.has(s) && s.toLowerCase().includes(lower))
      .slice(0, 8)
      .map((s) => ({ id: s, label: s }));
    const exact = value.includes(query) || suggestions.includes(query);
    return exact
      ? matches
      : [...matches, { id: NEW_PREFIX + query, label: `Create "${query}"` }];
  }, [text, value, suggestions]);

  const add = (key: string) => {
    const item = key.startsWith(NEW_PREFIX)
      ? key.slice(NEW_PREFIX.length)
      : key;
    if (item !== "" && !value.includes(item)) {
      onChange([...value, item]);
      commit();
    }
    setText("");
  };

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginTop: 12,
      })}
    >
      <TagGroup
        label={label}
        items={value.map((v) => ({ id: v }))}
        onRemove={(keys) => {
          onChange(value.filter((v) => !keys.has(v)));
          commit();
        }}
        renderEmptyState={() => "None"}
      >
        {(item) => <Tag id={item.id}>{item.id}</Tag>}
      </TagGroup>
      <div
        // Half-typed text is dropped: only an explicit Enter or pick adds.
        onBlur={() => setText("")}
        onKeyDownCapture={(e) => {
          const input = e.target as HTMLElement;
          // Enter with no option highlighted takes the top suggestion;
          // ComboBox alone would ignore it.
          if (
            e.key === "Enter" &&
            !input.getAttribute("aria-activedescendant") &&
            options.length > 0
          ) {
            e.preventDefault();
            e.stopPropagation();
            add(options[0].id);
          }
        }}
      >
        <ComboBox
          aria-label={`Add to ${label}`}
          placeholder="Add..."
          description={hint}
          items={options}
          inputValue={text}
          onInputChange={setText}
          // Always empty: a pick is moved into the tag list straight away.
          selectedKey={null}
          onSelectionChange={(key) => {
            if (key !== null) {
              add(String(key));
            }
          }}
          menuTrigger="input"
          styles={style({ width: "full" })}
        >
          {(item) => <ComboBoxItem id={item.id}>{item.label}</ComboBoxItem>}
        </ComboBox>
      </div>
    </div>
  );
}
