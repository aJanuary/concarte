import FolderOpen from "@react-spectrum/s2/icons/FolderOpen";
import { concarte } from "../../../platform/bridge";
import { IconButton } from "../../../ui/controls";

/** Shows an asset in the file explorer. */
export function ShowInExplorerButton({ asset }: { asset: string }) {
  return (
    <IconButton
      label="Show in file explorer"
      title="Show this file in your file explorer"
      onClick={() => void concarte.event.showAsset(asset)}
    >
      <FolderOpen />
    </IconButton>
  );
}
