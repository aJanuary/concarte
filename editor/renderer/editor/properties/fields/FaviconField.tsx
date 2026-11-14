import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button as S2Button, Content, InlineAlert } from "@react-spectrum/s2";
import { useEffect, useState } from "react";
import type { FaviconResponse } from "../../../../shared/api";
import { concarte, fetchAsset, useMainEvent } from "../../../platform/bridge";
import { RemoveButton } from "../../../ui/controls";
import { fieldStack, helpText, mutedText } from "../../../ui/styles";

const FAVICON_ASSET = "favicon.ico";

/** The favicon is a fixed file in assets/, not part of the config. */
export function FaviconField() {
  // undefined while loading, null when the event has no favicon
  const [preview, setPreview] = useState<string | null | undefined>();
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");

  useMainEvent("assetChanged", (path) => {
    if (path === FAVICON_ASSET) {
      setVersion((v) => v + 1);
    }
  });

  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchAsset(FAVICON_ASSET);
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

  const change = async (request: () => Promise<FaviconResponse>) => {
    setError("");
    try {
      const body = await request();
      if ("cancelled" in body) {
        return;
      }
      if ("error" in body) {
        setError(body.error);
        return;
      }
      // The file watcher also reports the change, but not on every platform
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const hasFavicon = typeof preview === "string";

  return (
    <div className={fieldStack}>
      <div
        className={style({
          display: "flex",
          alignItems: "center",
          gap: 12,
        })}
      >
        {hasFavicon && (
          <img
            src={preview}
            alt="Current favicon"
            className={style({ size: 32, objectFit: "contain" })}
          />
        )}
        {preview === null && <span className={mutedText}>No favicon set</span>}
        <S2Button
          variant="secondary"
          onPress={() => void change(concarte.event.chooseFavicon)}
        >
          {hasFavicon ? "Replace..." : "Choose file..."}
        </S2Button>
        {hasFavicon && (
          <RemoveButton
            onRemove={() =>
              void change(async () => {
                await concarte.event.removeFavicon();
                return { ok: true };
              })
            }
            confirm={{
              title: "Remove the favicon?",
              message: "The file is deleted, so this can't be undone.",
              action: "Remove",
            }}
          >
            Remove
          </RemoveButton>
        )}
      </div>
      <p className={helpText}>
        An ICO file, or a square PNG up to 256×256. It is saved as the
        event&apos;s assets/favicon.ico straight away.
      </p>
      {error && (
        <InlineAlert variant="negative">
          <Content>{error}</Content>
        </InlineAlert>
      )}
    </div>
  );
}
