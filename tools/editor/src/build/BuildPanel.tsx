import { useEffect, useRef } from "react";
import type { BuildResponse } from "../../shared/api";
import {
  FolderOpenIcon,
  PlayIcon,
  StopIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid";
import { Button } from "../components/widgets";

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
    <div className="flex items-center gap-2">
      <span className="mr-1 text-slate-500">{TITLES[state.status]}</span>
      {state.status === "running" ? (
        <Button
          label="Stop build"
          title="Stop the running build"
          onClick={onCancel}
        >
          <StopIcon className="size-5" />
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
          <WrenchScrewdriverIcon className="size-5" />
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
        <FolderOpenIcon className="size-5" />
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
        <PlayIcon className="size-5" />
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
    <div className="h-full p-2">
      <pre
        ref={log}
        className="h-full overflow-auto rounded bg-slate-900 p-3 text-xs whitespace-pre-wrap text-slate-100"
      >
        {state.log ||
          (state.status === "idle" ? "No build yet." : "Starting...")}
      </pre>
    </div>
  );
}
