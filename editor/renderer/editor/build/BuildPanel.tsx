import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useRef } from "react";
import type { BuildResponse } from "../../../shared/api";
import FolderOpen from "@react-spectrum/s2/icons/FolderOpen";
import Play from "@react-spectrum/s2/icons/Play";
import StopProcessing from "@react-spectrum/s2/icons/StopProcessing";
import Briefcase from "@react-spectrum/s2/icons/Briefcase";
import { IconButton } from "../../ui/controls";
import { mutedText } from "../../ui/styles";

const TITLES: Record<BuildResponse["status"], string> = {
  idle: "",
  running: "Building...",
  succeeded: "Build finished",
  failed: "Build failed",
  cancelled: "Build cancelled",
};

export function BuildToolbar({
  state,
  noMaps,
  onBuild,
  onCancel,
  onPreview,
  onReveal,
}: {
  state: BuildResponse;
  noMaps: boolean;
  onBuild: () => void;
  onCancel: () => void;
  onPreview: () => void;
  onReveal: () => void;
}) {
  return (
    <div className={style({ display: "flex", alignItems: "center", gap: 8 })}>
      <span className={mutedText}>{TITLES[state.status]}</span>
      {state.status === "running" ? (
        <IconButton
          label="Stop build"
          title="Stop the running build"
          onClick={onCancel}
        >
          <StopProcessing />
        </IconButton>
      ) : (
        <IconButton
          label="Build"
          disabled={noMaps}
          title={
            noMaps
              ? "Add a map before building"
              : "Build the site into the event's dist folder"
          }
          onClick={onBuild}
        >
          <Briefcase />
        </IconButton>
      )}
      <IconButton
        label="Show dist folder"
        disabled={state.freshness === "missing"}
        title={
          state.freshness === "missing"
            ? "Build the event first; there is no dist folder yet"
            : "Show the dist folder in your file manager"
        }
        onClick={onReveal}
      >
        <FolderOpen />
      </IconButton>
      <IconButton
        label="Preview"
        disabled={noMaps}
        title={
          noMaps
            ? "Add a map before previewing"
            : "Run the site's dev server and open it in your browser"
        }
        onClick={onPreview}
      >
        <Play />
      </IconButton>
    </div>
  );
}

export function BuildLog({ state }: { state: BuildResponse }) {
  const log = useRef<HTMLPreElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [state.log]);

  return (
    <pre
      ref={log}
      className={style({
        height: "full",
        overflow: "auto",
        margin: 0,
        padding: 16,
        font: "code-sm",
        whiteSpace: "pre-wrap",
      })}
    >
      {state.log || (state.status === "idle" ? "No build yet." : "Starting...")}
    </pre>
  );
}
