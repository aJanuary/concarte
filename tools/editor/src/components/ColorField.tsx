import { Field, inputClass } from "./widgets";

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
          <span
            className="size-6 shrink-0 rounded border border-slate-400"
            style={{ background: value }}
            aria-hidden
          />
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
