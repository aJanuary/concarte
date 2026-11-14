import { Content, Heading, InlineAlert } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useCallback, useEffect, useState } from "react";
import type { SessionResponse } from "../../shared/api";
import { concarte } from "../platform/bridge";
import { Loading } from "../ui/controls";
import { EventLoader } from "./EventLoader";
import { StartScreen } from "./StartScreen";

/** Shows the open event's editor, or the start screen when none is open. */
export function App() {
  const [session, setSession] = useState<SessionResponse>();
  const [failure, setFailure] = useState("");
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => {
    concarte.session().then(
      (next) => {
        setSession(next);
        setGeneration((g) => g + 1);
      },
      (e: Error) => setFailure(e.message),
    );
  }, []);
  useEffect(refresh, [refresh]);

  if (failure) {
    return (
      <div className={style({ padding: 16 })}>
        <InlineAlert variant="negative">
          <Heading>The editor could not start</Heading>
          <Content>{failure}</Content>
        </InlineAlert>
      </div>
    );
  }
  if (!session) {
    return <Loading />;
  }
  if (!session.event) {
    return <StartScreen session={session} onChanged={refresh} />;
  }
  return (
    <EventLoader
      // Keyed so opening another event discards everything of the last one.
      key={generation}
      onSwitched={refresh}
    />
  );
}
