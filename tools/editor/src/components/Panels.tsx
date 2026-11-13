import { FileTrigger, Button as S2Button, Text } from "@react-spectrum/s2";
import Location from "@react-spectrum/s2/icons/Location";
import { useMemo, useState } from "react";
import type { ImportSvgResponse } from "../../shared/api";
import type { Config, MapConfig } from "../../shared/schema";
import type { SvgTreeNode } from "../../shared/tree";
import type { Issue } from "../../../../scripts/lib/validate-config";
import * as ops from "../doc/ops";
import {
  configFields,
  mapFields,
  renderRegistry,
  roomFields,
  type FieldContext,
} from "../fields/registry";
import { FaviconSection } from "./FaviconSection";
import {
  Button,
  errorText,
  helpText,
  mutedText,
  panelHeading,
  Section,
  sectionStyle,
  warningText,
} from "./widgets";

export type Apply = (edit: ops.Edit, key?: string) => void;

export type Selection =
  | { kind: "event" }
  | { kind: "map"; mapSrc: string }
  | { kind: "addMap" }
  | { kind: "node"; mapSrc: string; key: string };

type Common = { doc: Config; apply: Apply; ctx: FieldContext };

const patchKey = (scope: string, patch: object) =>
  `${scope}:${Object.keys(patch).join(",")}`;

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className={panelHeading}>{children}</h2>;
}

export function EventPanel({ doc, apply, ctx }: Common) {
  return (
    <div>
      <Heading>Event settings</Heading>
      {renderRegistry(
        configFields,
        doc,
        (patch) => apply(ops.updateEvent(patch), patchKey("event", patch)),
        ctx,
      )}
      <FaviconSection />
    </div>
  );
}

export function MapPanel({
  doc,
  apply,
  ctx,
  map,
  issues,
  onRemoved,
}: Common & {
  map: MapConfig;
  issues: Issue[];
  onRemoved: () => void;
}) {
  const index = doc.maps.indexOf(map);
  const isDefault = ops.defaultMapOf(doc) === map;
  const errorFor = (field: Issue["field"]) =>
    issues.find((i) => i.severity === "error" && i.field === field)?.message;

  return (
    <div>
      <Heading>Map settings: {map.label || map.id}</Heading>
      {renderRegistry(
        mapFields,
        map,
        (patch) =>
          apply(
            ops.updateMap(map.src, patch),
            patchKey(`map:${map.src}`, patch),
          ),
        ctx,
        { id: errorFor("id"), label: errorFor("label") },
      )}
      <Section title="Order">
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            disabled={index === 0}
            onClick={() => apply(ops.moveMap(map.src, -1))}
          >
            Move up
          </Button>
          <Button
            disabled={index === doc.maps.length - 1}
            onClick={() => apply(ops.moveMap(map.src, 1))}
          >
            Move down
          </Button>
        </div>
      </Section>
      <Section title="Default map">
        <p className={helpText}>The map shown when no map is chosen.</p>
        <div className="mt-2 flex items-center gap-2">
          <Button
            disabled={isDefault}
            onClick={() => apply(ops.makeDefaultMap(map.src))}
          >
            Make default
          </Button>
          {isDefault && <span className={mutedText}>This is the default</span>}
        </div>
      </Section>
      <div className={sectionStyle}>
        <Button
          danger
          onClick={() => {
            const rooms = map.rooms.length;
            if (
              rooms === 0 ||
              window.confirm(
                `Remove map "${map.label}" and its ${rooms} room${rooms === 1 ? "" : "s"}?`,
              )
            ) {
              apply(ops.removeMap(map.src));
              onRemoved();
            }
          }}
        >
          Remove map
        </Button>
      </div>
    </div>
  );
}

export function AddMapPanel({
  doc,
  apply,
  ctx,
  onAdded,
  onAssetAdded,
}: Common & {
  onAdded: (mapSrc: string) => void;
  onAssetAdded: (asset: string) => void;
}) {
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    setError("");
    try {
      const res = await fetch(
        `/api/assets?name=${encodeURIComponent(file.name)}`,
        { method: "POST", body: file },
      );
      const body = (await res.json()) as ImportSvgResponse;
      if ("error" in body) {
        setError(body.error);
        return;
      }
      onAssetAdded(body.asset);
      const map = ops.newMap(doc, body.asset);
      apply(ops.addMap(map));
      onAdded(map.src);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const used = useMemo(() => {
    const srcs = new Set<string>();
    for (const map of doc.maps) {
      srcs.add(map.src.replace(/^\/+/, ""));
      for (const overlay of map.overlays ?? []) {
        srcs.add(overlay.src.replace(/^\/+/, ""));
      }
    }
    return srcs;
  }, [doc]);
  const available = ctx.assets.filter((asset) => !used.has(asset));

  return (
    <div>
      <Heading>Add map</Heading>
      <div className="mt-3">
        <FileTrigger
          acceptedFileTypes={[".svg", "image/svg+xml"]}
          onSelect={(files) => {
            const file = files?.[0];
            if (file) {
              void upload(file);
            }
          }}
        >
          <S2Button variant="secondary" fillStyle="outline" size="S">
            Import SVG file...
          </S2Button>
        </FileTrigger>
      </div>
      <p className={"mt-1 " + helpText}>
        The file is copied into the event&apos;s assets folder.
      </p>
      {error && (
        <p role="alert" className={"mt-2 " + errorText}>
          {error}
        </p>
      )}
      <p className={"mt-4 " + helpText}>
        Files in assets/ that aren&apos;t already used as a map or overlay.
      </p>
      {available.length === 0 && (
        <p className={"mt-3 " + mutedText}>No unused files.</p>
      )}
      <ul className="mt-3 space-y-2">
        {available.map((asset) => {
          const isSvg = asset.toLowerCase().endsWith(".svg");
          return (
            <li key={asset} className="flex items-center gap-2">
              <span className="flex-1 truncate" title={asset}>
                /{asset}
              </span>
              {isSvg ? (
                <Button
                  onClick={() => {
                    const map = ops.newMap(doc, asset);
                    apply(ops.addMap(map));
                    onAdded(map.src);
                  }}
                >
                  Add as map
                </Button>
              ) : (
                <span className={helpText}>not an SVG</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UnassignableGroup() {
  return (
    <div>
      <Heading>Unassignable group</Heading>
      <div className={"mt-2 space-y-2 " + helpText}>
        <p>
          This group can&apos;t be assigned as a room because it has no id. To
          assign it, give the group an id in the SVG.
        </p>
        <p>Shapes inside it can still be assigned individually.</p>
      </div>
    </div>
  );
}

export function NodePanel({
  doc,
  apply,
  ctx,
  map,
  node,
  issues,
}: Common & {
  map: MapConfig;
  node: SvgTreeNode;
  issues: Issue[];
}) {
  if (node.id === null) {
    return <UnassignableGroup />;
  }
  const id = node.id;
  const room = ops.findRoom(doc, map.src, id);
  const errorFor = (field: Issue["field"]) =>
    issues.find((i) => i.ref === id && i.field === field)?.message;

  const removeRoom = () => {
    if (
      !room ||
      !ops.roomHasData(room) ||
      window.confirm(
        `Remove room "${room.label || room.id}"? The shape stays on the map, but its room details are lost.`,
      )
    ) {
      apply(ops.removeRoom(map.src, id));
    }
  };

  return (
    <div>
      <Heading>
        {node.tag}#{id}
      </Heading>
      {!room && (
        <div className="mt-3">
          <Button onClick={() => apply(ops.addRoom(map.src, id))}>
            <Location />
            <Text>Assign as room</Text>
          </Button>
          <p className={"mt-1 " + helpText}>
            Assigns this shape as a room, with area ref &quot;{id}&quot;.
          </p>
        </div>
      )}
      {room && (
        <>
          {errorFor("area") && (
            <p className={"mt-2 " + warningText}>{errorFor("area")}</p>
          )}
          {renderRegistry(
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
          )}
          <div className={sectionStyle}>
            <Button danger onClick={removeRoom}>
              Remove room
            </Button>
            <p className={"mt-1 " + helpText}>
              The shape stays on the map. Only its room details, such as the
              label and description, are removed.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
