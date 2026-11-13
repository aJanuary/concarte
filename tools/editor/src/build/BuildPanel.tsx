import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useRef } from "react";
import type { BuildResponse } from "../../shared/api";
import FolderOpen from "@react-spectrum/s2/icons/FolderOpen";
import Play from "@react-spectrum/s2/icons/Play";
import StopProcessing from "@react-spectrum/s2/icons/StopProcessing";
import Briefcase from "@react-spectrum/s2/icons/Briefcase";
import { Button, mutedText } from "../components/widgets";

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
      <span className={style({ marginEnd: 4 }) + " " + mutedText}>
        {TITLES[state.status]}
      </span>
      {state.status === "running" ? (
        <Button
          label="Stop build"
          title="Stop the running build"
          onClick={onCancel}
        >
          <StopProcessing />
        </Button>
      ) : (
        <Button
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
        </Button>
      )}
      <Button
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
      </Button>
      <Button
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
      </Button>
    </div>
  );
}

export function BuildLog({ state }: { state: BuildResponse }) {
  const log = useRef<HTMLPreElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [state.log]);

  return (
    <div className={style({ height: "full", padding: 8 })}>
      <pre
        ref={log}
        className={style({
          height: "full",
          overflow: "auto",
          margin: 0,
          padding: 12,
          borderRadius: "default",
          backgroundColor: "layer-2",
          font: "code-xs",
          whiteSpace: "pre-wrap",
        })}
      >
        {state.log ||
          (state.status === "idle" ? "No build yet." : "Starting...")}
      </pre>
    </div>
  );
}
