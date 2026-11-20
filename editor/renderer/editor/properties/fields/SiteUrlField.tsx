import { useState } from "react";
import { TextField } from "../../../ui/controls";
import { normalizeSiteUrl } from "../site-url";

export function SiteUrlField({
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
  const shown = normalizeSiteUrl(typed) === value ? typed : (value ?? "");
  return (
    <div onBlur={() => setTyped(value ?? "")}>
      <TextField
        label="Site address"
        hint="Where the site is hosted, such as https://example.com, or https://example.com/myevent when not at the root of its domain. Link previews use the full address. A change to the path takes effect the next time Preview starts."
        value={shown}
        onChange={(text) => {
          setTyped(text);
          onChange(normalizeSiteUrl(text));
        }}
        error={error}
      />
    </div>
  );
}
