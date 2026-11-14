import { Content, Heading, InlineAlert } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useCallback, useEffect, useState } from "react";
import { Editor } from "../editor/Editor";
import { concarte, type LoadedEvent } from "../platform/bridge";
import { Button, Loading } from "../ui/controls";

type LoadState =
  | { status: "loading" }
  | { status: "failed"; errors: string[] }
  | ({ status: "ready" } & LoadedEvent);

async function load(): Promise<LoadState> {
  try {
    const body = await concarte.event.load();
    if (body.config === null) {
      return { status: "failed", errors: body.errors };
    }
    return { status: "ready", ...body, config: body.config };
  } catch (e) {
    return {
      status: "failed",
      errors: [`The event could not be read: ${(e as Error).message}`],
    };
  }
}

/** Loads the open event, then shows the editor or why it can't. */
export function EventLoader({ onSwitched }: { onSwitched: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void load().then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [generation]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setGeneration((g) => g + 1);
  }, []);

  if (state.status === "loading") {
    return <Loading />;
  }
  if (state.status === "failed") {
    return (
      <div
        className={style({
          marginX: "auto",
          maxWidth: 640,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "start",
          gap: 16,
        })}
      >
        <InlineAlert variant="negative">
          <Heading>The editor can&apos;t open this event</Heading>
          <Content>
            <ul
              className={style({
                margin: 0,
                paddingStart: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              })}
            >
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Content>
        </InlineAlert>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  }
  return (
    <Editor
      // Keyed so a reload starts from the file on disk, without the edits.
      key={generation}
      loaded={state}
      onReload={reload}
      onSwitched={onSwitched}
    />
  );
}
