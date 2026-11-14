import { ActionMenu, MenuItem, Text } from "@react-spectrum/s2";
import { useState } from "react";
import { ConfirmDialog, type Confirmation } from "./controls";

export type ActionItem = {
  id: string;
  label: string;
  description?: string;
  isDisabled?: boolean;
  onAction: () => void;
  /** Asks in a destructive dialog before acting. */
  confirm?: Confirmation;
};

/** A "more actions" menu. */
export function ActionsMenu({
  label,
  actions,
}: {
  label: string;
  actions: ActionItem[];
}) {
  const [confirming, setConfirming] = useState<ActionItem | null>(null);
  return (
    <>
      <ActionMenu
        aria-label={label}
        isQuiet
        disabledKeys={actions.filter((a) => a.isDisabled).map((a) => a.id)}
        onAction={(key) => {
          const action = actions.find((a) => a.id === key);
          if (action?.confirm) {
            setConfirming(action);
          } else {
            action?.onAction();
          }
        }}
      >
        {actions.map((action) => (
          <MenuItem key={action.id} id={action.id} textValue={action.label}>
            <Text slot="label">{action.label}</Text>
            {action.description && (
              <Text slot="description">{action.description}</Text>
            )}
          </MenuItem>
        ))}
      </ActionMenu>
      <ConfirmDialog
        confirm={confirming?.confirm}
        onConfirm={() => confirming?.onAction()}
        onDismiss={() => setConfirming(null)}
      />
    </>
  );
}
