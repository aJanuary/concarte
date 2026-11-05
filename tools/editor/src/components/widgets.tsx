import { useId, type ReactNode } from "react";

export const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 focus:border-blue-500 focus:outline-none";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="mt-3">
      <label htmlFor={id} className="mb-1 block font-medium text-slate-700">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  readOnly,
  hint,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (
        <input
          id={id}
          type="text"
          className={
            inputClass + (readOnly ? " bg-slate-100 text-slate-500" : "")
          }
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="mt-3">
      <label className="flex items-center gap-2 font-medium text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        "rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 " +
        (danger
          ? "border-red-300 text-red-700 hover:bg-red-50"
          : "border-slate-300 text-slate-700 hover:bg-slate-100")
      }
    >
      {children}
    </button>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-slate-200 pt-3">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}
