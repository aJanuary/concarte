import {
  ActionButton,
  AlertDialog,
  Button as S2Button,
  DialogContainer,
  ProgressCircle,
  TextField as S2TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState, type ReactNode } from "react";
import { fieldStyle } from "./styles";

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** Focus on mount. The error stays hidden until focus first leaves, so a
   * field that starts out empty doesn't open with a complaint. */
  autoFocus?: boolean;
}) {
  const [blurred, setBlurred] = useState(false);
  const shownError = autoFocus && !blurred ? undefined : error;
  return (
    <S2TextField
      label={label}
      value={value}
      onChange={onChange}
      onBlur={() => setBlurred(true)}
      autoFocus={autoFocus}
      description={hint}
      isInvalid={shownError !== undefined}
      errorMessage={shownError}
      styles={fieldStyle}
    />
  );
}

export function Button({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <S2Button variant="secondary" onPress={onClick}>
      {children}
    </S2Button>
  );
}

/** A button whose content is only an icon, explained by a tooltip. */
export function IconButton({
  label,
  title = label,
  onClick,
  disabled,
  quiet = true,
  children,
}: {
  /** The accessible name. */
  label: string;
  /** The tooltip, when it should say more than the label. */
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  quiet?: boolean;
  children: ReactNode;
}) {
  // A native title rather than a Spectrum Tooltip: it must also explain why
  // a button is disabled, and Spectrum tooltips don't show on disabled ones.
  return (
    <span title={title} className={style({ display: "inline-flex" })}>
      <ActionButton
        aria-label={label}
        isQuiet={quiet}
        isDisabled={disabled}
        onPress={onClick}
      >
        {children}
      </ActionButton>
    </span>
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

/** What a destructive action asks before going ahead. */
export type Confirmation = {
  title: string;
  message: ReactNode;
  action: string;
};

/** Asks before a destructive action; open while `confirm` is set. */
export function ConfirmDialog({
  confirm,
  onConfirm,
  onDismiss,
}: {
  confirm: Confirmation | undefined;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <DialogContainer onDismiss={onDismiss}>
      {confirm && (
        <AlertDialog
          title={confirm.title}
          variant="destructive"
          primaryActionLabel={confirm.action}
          cancelLabel="Cancel"
          onPrimaryAction={onConfirm}
        >
          {confirm.message}
        </AlertDialog>
      )}
    </DialogContainer>
  );
}

/** A remove button that asks first. */
export function RemoveButton({
  children,
  onRemove,
  confirm,
}: {
  children: ReactNode;
  onRemove: () => void;
  confirm: Confirmation;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{children}</Button>
      <ConfirmDialog
        confirm={open ? confirm : undefined}
        onConfirm={onRemove}
        onDismiss={() => setOpen(false)}
      />
    </>
  );
}
