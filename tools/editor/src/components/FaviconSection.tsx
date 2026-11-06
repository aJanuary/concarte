import { useCallback, useEffect, useState } from "react";
import { SSE_ASSET_CHANGED, type FaviconResponse } from "../../shared/api";
import { useServerEvents } from "../events";
import { Button, Section } from "./widgets";

const FAVICON_ASSET = "favicon.ico";

/** The favicon is a fixed file in assets/, not part of the config. */
export function FaviconSection() {
  // undefined while loading, null when the event has no favicon
  const [preview, setPreview] = useState<string | null | undefined>();
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");

  useServerEvents(SSE_ASSET_CHANGED, (data) => {
    if (data === FAVICON_ASSET) {
      setVersion((v) => v + 1);
    }
  });

  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/event-assets/${FAVICON_ASSET}`, {
          cache: "no-store",
        });
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setPreview(null);
          return;
        }
        url = URL.createObjectURL(await res.blob());
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setPreview(url);
      } catch {
        if (!cancelled) {
          setPreview(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [version]);

  const request = useCallback(async (init: RequestInit) => {
    setError("");
    try {
      const res = await fetch("/api/favicon", init);
      const body = (await res.json()) as FaviconResponse;
      if ("error" in body) {
        setError(body.error);
        return;
      }
      // The file watcher also reports the change, but not on every platform
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const hasFavicon = typeof preview === "string";

  return (
    <Section title="Favicon">
      <div className="mt-2 flex items-center gap-3">
        {hasFavicon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Current favicon"
            className="size-8 object-contain"
          />
        )}
        {preview === null && (
          <span className="text-slate-500">No favicon set</span>
        )}
        <label className="relative cursor-pointer rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100">
          {hasFavicon ? "Replace..." : "Choose file..."}
          <input
            type="file"
            accept=".ico,.png,image/png,image/x-icon,image/vnd.microsoft.icon"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                void request({ method: "PUT", body: file });
              }
            }}
          />
        </label>
        {hasFavicon && (
          <Button
            danger
            onClick={() => {
              if (window.confirm("Remove the favicon? This can't be undone.")) {
                void request({ method: "DELETE" });
              }
            }}
          >
            Remove
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        An ICO file, or a square PNG up to 256×256. It is saved as the
        event&apos;s assets/favicon.ico straight away.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}
    </Section>
  );
}
