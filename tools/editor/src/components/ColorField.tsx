import { Field, inputClass } from "./widgets";

// <input type="color"> only accepts #rrggbb, so resolve any CSS color through a canvas.
function toHex(value: string): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    return "#000000";
  }
  ctx.fillStyle = "#000000";
  ctx.fillStyle = value;
  const resolved = ctx.fillStyle;
  if (resolved.startsWith("#")) {
    return resolved;
  }
  const m = resolved.match(/\d+/g);
  if (!m) {
    return "#000000";
  }
  return `#${m
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex items-center gap-2">
          <label
            className="relative size-6 shrink-0 cursor-pointer rounded border border-slate-400"
            style={{ background: value }}
          >
            <span className="sr-only">Pick {label} color</span>
            <input
              type="color"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              value={toHex(value)}
              onChange={(e) => onChange(e.target.value)}
            />
          </label>
          <input
            id={id}
            type="text"
            className={inputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </Field>
  );
}
