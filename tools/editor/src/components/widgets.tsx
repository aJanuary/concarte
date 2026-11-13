import {
  ActionButton,
  Badge,
  Button as S2Button,
  ProgressCircle,
  Switch,
  TextField as S2TextField,
} from "@react-spectrum/s2";
import FolderOpen from "@react-spectrum/s2/icons/FolderOpen";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { createContext, useContext, type ReactNode } from "react";

/**
 * Saves edits now rather than when focus leaves the field. Fields that change
 * in discrete steps (a pick, a toggle, adding a tag) call it after each
 * change, so nothing is lost if the app closes while they still have focus.
 */
const CommitContext = createContext<() => void>(() => {});
export const CommitProvider = CommitContext.Provider;
export function useCommit() {
  return useContext(CommitContext);
}

export const fieldStyle = style({ width: "full", marginTop: 12 });

export const sectionStyle = style({
  marginTop: 20,
  paddingTop: 12,
  borderWidth: 0,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});
export const groupBox = style({
  marginTop: 8,
  padding: 8,
  borderRadius: "default",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});
export const panelHeading = style({ font: "heading-xs", margin: 0 });
export const sectionHeading = style({ font: "heading-2xs", margin: 0 });
export const helpText = style({ font: "ui-sm", color: "neutral-subdued" });
export const errorText = style({ font: "ui-sm", color: "negative" });
export const mutedText = style({ font: "ui", color: "neutral-subdued" });
export const warningText = style({ font: "ui-sm", color: "notice-900" });

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
    <S2TextField
      label={label}
      value={value}
      onChange={onChange}
      isReadOnly={readOnly}
      description={hint}
      isInvalid={error !== undefined}
      errorMessage={error}
      placeholder={placeholder}
      styles={fieldStyle}
    />
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
  const commit = useCommit();
  return (
    <div className={style({ marginTop: 12 })}>
      <Switch
        isSelected={checked}
        onChange={(selected) => {
          onChange(selected);
          commit();
        }}
        isDisabled={disabled}
        description={hint}
        styles={style({ width: "full" })}
      >
        {label}
      </Switch>
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
  const button = label ? (
    <ActionButton
      aria-label={label}
      isQuiet
      isDisabled={disabled}
      onPress={onClick}
    >
      {children}
    </ActionButton>
  ) : (
    <S2Button
      variant={danger ? "negative" : "secondary"}
      fillStyle={danger ? "fill" : "outline"}
      size="S"
      isDisabled={disabled}
      onPress={onClick}
    >
      {children}
    </S2Button>
  );
  // A native title rather than a Spectrum Tooltip: it must also explain why
  // a button is disabled, and Spectrum tooltips don't show on disabled ones.
  return title ? (
    <span title={title} className={style({ display: "inline-flex" })}>
      {button}
    </span>
  ) : (
    button
  );
}

export function Loading() {
  return (
    <div
      className={style({
        display: "flex",
        height: "full",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      })}
    >
      <ProgressCircle aria-label="Loading" isIndeterminate />
    </div>
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
    <section className={sectionStyle}>
      <h3 className={sectionHeading}>{title}</h3>
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
      label="Show in file explorer"
      title="Show this file in your file explorer"
      onClick={() =>
        void fetch(`/api/reveal-asset?path=${encodeURIComponent(asset)}`, {
          method: "POST",
        })
      }
    >
      <FolderOpen />
    </Button>
  );
}

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
    <Badge
      size="S"
      fillStyle="subtle"
      variant={severity === "error" ? "negative" : "notice"}
      aria-label={`${count} ${severity}${count === 1 ? "" : "s"}`}
    >
      {count}
    </Badge>
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
