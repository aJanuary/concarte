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
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
  /** Accessible name for buttons whose content is only an icon. */
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
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

/**
 * Shows an asset in the file explorer. Only the app has a file explorer to
 * open, so it renders nothing in a browser.
 */
export function ShowInExplorerButton({ asset }: { asset: string }) {
  if (!window.concarte) {
    return null;
  }
  return (
    <Button
      title="Show this file in your file explorer"
      onClick={() =>
        void fetch(`/api/reveal-asset?path=${encodeURIComponent(asset)}`, {
          method: "POST",
        })
      }
    >
      Show in file explorer
    </Button>
  );
}

const badgeTones = {
  error: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
};

/** Pill showing how many errors or warnings there are; nothing when zero. */
export function CountBadge({
  severity,
  count,
}: {
  severity: "error" | "warning";
  count: number;
}) {
  if (count === 0) {
    return null;
  }
  return (
    <span
      className={
        "shrink-0 rounded-full px-1.5 text-xs leading-5 font-medium " +
        badgeTones[severity]
      }
      aria-label={`${count} ${severity}${count === 1 ? "" : "s"}`}
    >
      {count}
    </span>
  );
}

export function IssueBadges({
  errors,
  warnings,
}: {
  errors: number;
  warnings: number;
}) {
  return (
    <>
      <CountBadge severity="error" count={errors} />
      <CountBadge severity="warning" count={warnings} />
    </>
  );
}
