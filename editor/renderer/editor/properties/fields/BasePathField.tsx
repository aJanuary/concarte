import { useState } from "react";
import { TextField } from "../../../ui/controls";
import { normalizeBasePath } from "../base-path";

export function BasePathField({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  error?: string;
}) {
  // What was typed, which may differ from the saved value by slashes. Shown
  // only while it still means the saved value, so undo and other outside
  // changes replace it.
  const [typed, setTyped] = useState(value ?? "");
  const shown = normalizeBasePath(typed) === value ? typed : (value ?? "");
  return (
    <div onBlur={() => setTyped(value ?? "")}>
      <TextField
        label="Base path"
        hint="Where the site is hosted when not at the root of its domain, such as /myevent for example.com/myevent/. Leave empty for the root. Takes effect the next time Preview starts."
        value={shown}
        onChange={(text) => {
          setTyped(text);
          onChange(normalizeBasePath(text));
        }}
        error={error}
      />
    </div>
  );
}
