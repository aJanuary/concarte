import { ActionButton, Text } from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { addMap, newMap } from "../../document/ops";
import { useSession } from "../session";
import { useImportSvg } from "../useImportSvg";

/** Copies an SVG the user picks into the event's assets and adds it as a map. */
export function AddMapButton() {
  const { doc, apply, select } = useSession();
  const { importSvg, dialog } = useImportSvg(
    "Couldn't add the map",
    (asset) => {
      const map = newMap(doc, asset);
      apply(addMap(map));
      select({ kind: "map", mapSrc: map.src });
    },
  );

  return (
    <>
      <ActionButton
        isQuiet
        size="S"
        styles={style({ marginStart: "auto", flexShrink: 0 })}
        onPress={importSvg}
      >
        <Add />
        <Text>Add map...</Text>
      </ActionButton>
      {dialog}
    </>
  );
}
