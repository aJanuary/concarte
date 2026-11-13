import {
  Button,
  Content,
  InlineAlert,
  ListView,
  ListViewItem,
  Text,
} from "@react-spectrum/s2";
import Folder from "@react-spectrum/s2/icons/Folder";
import Add from "@react-spectrum/s2/icons/Add";
import FolderOpen from "@react-spectrum/s2/icons/FolderOpen";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState } from "react";
import type { SessionResponse } from "../shared/api";
import { runMenuAction } from "./native";
import type { MenuAction } from "../shared/native";

export function StartScreen({
  session,
  onChanged,
}: {
  session: SessionResponse;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");

  const run = async (action: MenuAction) => {
    const result = await runMenuAction(action);
    if (result.ok) {
      onChanged();
    } else if (!result.cancelled) {
      setMessage(result.message);
      onChanged();
    }
  };

  useEffect(() => window.concarte?.onMenu((action) => void run(action)));

  return (
    <div
      className={style({
        display: "flex",
        height: "full",
        justifyContent: "center",
        overflow: "auto",
        paddingX: 24,
        paddingY: 64,
        backgroundColor: "layer-1",
        userSelect: "none",
      })}
    >
      <div className={style({ width: "full", maxWidth: 672 })}>
        <h1 className={style({ font: "title-3xl", margin: 0 })}>
          ConCarte
          <span
            className={style({
              marginStart: 8,
              fontWeight: "normal",
              color: "neutral-subdued",
            })}
          >
            editor
          </span>
        </h1>
        <p
          className={style({
            font: "body",
            color: "neutral-subdued",
            marginTop: 12,
          })}
        >
          Create an event, or open a folder that already has one.
        </p>
        <div
          className={style({
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          })}
        >
          <Button
            variant="accent"
            size="XL"
            onPress={() => void run({ type: "new" })}
          >
            <Add />
            <Text>New event</Text>
          </Button>
          <Button
            variant="secondary"
            size="XL"
            onPress={() => void run({ type: "open" })}
          >
            <FolderOpen />
            <Text>Open event</Text>
          </Button>
        </div>
        {message && (
          <div className={style({ marginTop: 24 })}>
            <InlineAlert variant="negative">
              <Content>{message}</Content>
            </InlineAlert>
          </div>
        )}
        {session.recents.length > 0 && (
          <>
            <h2
              className={style({
                font: "detail-sm",
                color: "neutral-subdued",
                textTransform: "uppercase",
                marginTop: 48,
              })}
            >
              Recent
            </h2>
            <ListView
              aria-label="Recent events"
              isQuiet
              items={session.recents.map(describeRecent)}
              onAction={(key) =>
                void run({ type: "open-recent", path: String(key) })
              }
              styles={style({ marginTop: 12 })}
            >
              {(recent) => (
                <ListViewItem id={recent.id} textValue={recent.name}>
                  <Folder />
                  <Text>{recent.name}</Text>
                  <Text slot="description">{recent.detail}</Text>
                </ListViewItem>
              )}
            </ListView>
          </>
        )}
      </div>
    </div>
  );
}

function describeRecent(recent: SessionResponse["recents"][number]) {
  const trimmed = recent.path.replace(/[\\/]+$/, "");
  const cut = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return {
    id: recent.path,
    name: trimmed.slice(cut + 1) || recent.path,
    detail: recent.exists
      ? cut > 0
        ? trimmed.slice(0, cut)
        : ""
      : "Folder is gone",
  };
}
