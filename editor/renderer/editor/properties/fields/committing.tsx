import { Picker, Switch, type Key, type PickerProps } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useCommit } from "../commit";

/** A switch whose changes save immediately. */
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
    <div>
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

/** A single-select Picker whose picks save immediately. */
export function CommittingPicker({
  onChange,
  ...props
}: Omit<PickerProps<object>, "onSelectionChange" | "onChange"> & {
  onChange: (key: Key) => void;
}) {
  const commit = useCommit();
  return (
    <Picker
      {...props}
      onSelectionChange={(key) => {
        if (key !== null) {
          onChange(key);
          commit();
        }
      }}
    />
  );
}
