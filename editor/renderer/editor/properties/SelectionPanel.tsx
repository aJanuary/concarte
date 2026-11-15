import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { InlineAlert, Content, Text } from "@react-spectrum/s2";
import Location from "@react-spectrum/s2/icons/Location";
import { useMemo, useState } from "react";
import type { Issue } from "@concarte/core";
import type { MapConfig } from "../../../shared/schema";
import * as ops from "../../document/ops";
import { findNode, type SvgTreeNode } from "../../svg/tree";
import { ActionsMenu } from "../../ui/ActionsMenu";
import { Button } from "../../ui/controls";
import { fieldStack, helpText, mutedText } from "../../ui/styles";
import { mapActions, roomActions } from "../actions";
import { useSession } from "../session";
import { FaviconField } from "./fields/FaviconField";
import { PropertiesPanel } from "./PropertiesPanel";
import {
  configFields,
  fieldContext,
  mapFields,
  renderRegistry,
  roomFields,
  type FieldContext,
} from "./registry";

// Edits to the same fields of the same thing merge into one undo step.
const patchKey = (scope: string, patch: object) =>
  `${scope}:${Object.keys(patch).join(",")}`;

function EventPanel({ ctx }: { ctx: FieldContext }) {
  const { doc, apply, issues } = useSession();
  const { fields, sections } = renderRegistry(
    configFields,
    doc,
    (patch) => apply(ops.updateEvent(patch), patchKey("event", patch)),
    ctx,
    {
      basePath: issues.find(
        (i) => i.severity === "error" && i.field === "basePath",
      )?.message,
    },
  );
  return (
    <PropertiesPanel
      title="Event settings"
      sections={[...sections, { title: "Favicon", content: <FaviconField /> }]}
    >
      {fields}
    </PropertiesPanel>
  );
}

function MapPanel({
  ctx,
  map,
  issues,
}: {
  ctx: FieldContext;
  map: MapConfig;
  /** The issues of the map itself, not of its rooms. */
  issues: Issue[];
}) {
  const { doc, apply } = useSession();
  const isDefault = ops.defaultMapOf(doc) === map;
  const errorFor = (field: Issue["field"]) =>
    issues.find((i) => i.severity === "error" && i.field === field)?.message;
  const { fields, sections } = renderRegistry(
    mapFields,
    map,
    (patch) =>
      apply(ops.updateMap(map.src, patch), patchKey(`map:${map.src}`, patch)),
    ctx,
    { id: errorFor("id"), label: errorFor("label") },
  );

  return (
    <PropertiesPanel
      title={map.label || map.id}
      badge={isDefault ? "Default" : undefined}
      sections={sections}
      actions={
        <ActionsMenu
          label="Map actions"
          actions={mapActions(doc, apply, map)}
        />
      }
    >
      {fields}
    </PropertiesPanel>
  );
}

function UnassignableGroup() {
  return (
    <PropertiesPanel title="Unassignable group">
      <div className={fieldStack + " " + helpText}>
        <p>
          This group can&apos;t be assigned as a room because it has no id. To
          assign it, give the group an id in the SVG.
        </p>
        <p>Shapes inside it can still be assigned individually.</p>
      </div>
    </PropertiesPanel>
  );
}

function NodePanel({
  ctx,
  map,
  node,
  ancestors,
  issues,
}: {
  ctx: FieldContext;
  map: MapConfig;
  node: SvgTreeNode;
  ancestors: SvgTreeNode[];
  issues: Issue[];
}) {
  const { doc, apply } = useSession();
  const [justAssigned, setJustAssigned] = useState(false);
  if (node.id === null) {
    return <UnassignableGroup />;
  }
  const id = node.id;
  const room = ops.findRoom(doc, map.src, id);
  const errorFor = (field: Issue["field"]) =>
    issues.find((i) => i.shape === id && i.field === field)?.message;
  const path = [...ancestors, node]
    .map((n) => (n.id === null ? n.tag : `${n.tag}#${n.id}`))
    .join(" › ");

  if (!room) {
    return (
      <PropertiesPanel title={id} subtitle={path}>
        <div
          className={style({
            display: "flex",
            flexDirection: "column",
            gap: 8,
          })}
        >
          <Button
            onClick={() => {
              setJustAssigned(true);
              apply(ops.addRoom(map.src, id));
            }}
          >
            <Location />
            <Text>Assign as room</Text>
          </Button>
          <p className={helpText}>
            Assigns this shape as a room, with shape &quot;{id}&quot;.
          </p>
        </div>
      </PropertiesPanel>
    );
  }

  const { fields, sections } = renderRegistry(
    roomFields,
    room,
    (patch) =>
      apply(
        ops.updateRoom(map.src, id, patch),
        patchKey(`room:${map.src}:${id}`, patch),
      ),
    ctx,
    {
      id: errorFor("id"),
      label: errorFor("label"),
      link: errorFor("link"),
    },
    justAssigned ? "label" : undefined,
  );
  return (
    <PropertiesPanel
      title={id}
      subtitle={path}
      sections={sections}
      actions={
        <ActionsMenu
          label="Room actions"
          actions={roomActions(apply, map.src, id, room)}
        />
      }
    >
      {errorFor("shape") && (
        <InlineAlert variant="negative">
          <Content>{errorFor("shape")}</Content>
        </InlineAlert>
      )}
      {fields}
    </PropertiesPanel>
  );
}

/** A selected element that the map's SVG doesn't have. */
function MissingNodePanel({ map, id }: { map: MapConfig; id: string }) {
  const { doc, apply, select } = useSession();
  const room = ops.findRoom(doc, map.src, id);
  return (
    <div className={fieldStack + " " + mutedText}>
      <p>
        {room
          ? `Room "${room.label || room.id}" refers to an element with id "${id}", but ${map.src} has no such element. It may have been renamed or removed from the SVG.`
          : `${map.src} has no element with id "${id}".`}
      </p>
      {room && (
        <Button
          onClick={() => {
            apply(ops.removeRoom(map.src, id));
            select({ kind: "map", mapSrc: map.src });
          }}
        >
          Remove room
        </Button>
      )}
    </div>
  );
}

/** The properties of whatever is selected. */
export function SelectionPanel() {
  const { doc, locales, selection, svgs, issues } = useSession();
  const ctx = useMemo(() => fieldContext(doc, locales), [doc, locales]);

  if (selection.kind === "event") {
    return <EventPanel ctx={ctx} />;
  }
  const map = doc.maps.find((m) => m.src === selection.mapSrc)!;
  const mapIssues = issues.filter((i) => i.mapSrc === map.src);
  if (selection.kind === "map") {
    return (
      <MapPanel
        ctx={ctx}
        map={map}
        issues={mapIssues.filter((i) => i.shape === undefined)}
      />
    );
  }
  const tree = svgs.trees[map.src];
  if (!tree) {
    return (
      <p className={mutedText}>
        The SVG for map &quot;{map.label || map.id}&quot; ({map.src}) is still
        loading or could not be read, so its elements can&apos;t be shown.
      </p>
    );
  }
  const found = findNode(tree, selection.key);
  const node = found?.node;
  if (!node) {
    return <MissingNodePanel map={map} id={selection.key} />;
  }
  return (
    <NodePanel
      // Keyed so field state such as a half-typed alias doesn't carry over.
      key={`${map.src}|${node.key}`}
      ctx={ctx}
      map={map}
      node={node}
      ancestors={found.ancestors}
      issues={mapIssues}
    />
  );
}
