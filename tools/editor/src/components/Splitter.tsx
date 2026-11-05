import { useCallback, useEffect, useState } from "react";

const MIN_WIDTH = 160;
const MIN_REST = 240;
const KEYBOARD_STEP = 20;

function readStored(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= MIN_WIDTH ? value : fallback;
  } catch {
    return fallback;
  }
}

/** A pixel width that persists across reloads. */
export function useStoredWidth(key: string, fallback: number) {
  const [width, setWidth] = useState(() => readStored(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, String(width));
    } catch {
      // Storage can be unavailable; the width just won't persist.
    }
  }, [key, width]);
  return [width, setWidth] as const;
}

/**
 * A draggable handle on the right edge of a column. `otherWidth` is the total
 * width of the fixed columns on the same row, so the flexible column keeps a
 * usable minimum.
 */
export function Splitter({
  label,
  width,
  otherWidth,
  onChange,
}: {
  label: string;
  width: number;
  otherWidth: number;
  onChange: (width: number) => void;
}) {
  const clamp = useCallback(
    (value: number) => {
      const max = Math.max(
        MIN_WIDTH,
        window.innerWidth - otherWidth - MIN_REST,
      );
      return Math.min(max, Math.max(MIN_WIDTH, value));
    },
    [otherWidth],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = width;
    const move = (ev: PointerEvent) =>
      onChange(clamp(startWidth + ev.clientX - startX));
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(clamp(width - KEYBOARD_STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(clamp(width + KEYBOARD_STEP));
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none hover:bg-blue-400/50 focus-visible:bg-blue-400/50 focus-visible:outline-none active:bg-blue-500/60"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
