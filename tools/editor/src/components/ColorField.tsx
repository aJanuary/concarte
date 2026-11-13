import { ColorField as S2ColorField, ColorSwatch } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useCommit } from "./widgets";

// <input type="color"> only accepts #rrggbb, so resolve any CSS color through a canvas.
function toHex(value: string): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    return "#000000";
  }
  ctx.fillStyle = "#000000";
  ctx.fillStyle = value;
  const resolved = ctx.fillStyle;
  if (resolved.startsWith("#")) {
    return resolved;
  }
  const m = resolved.match(/\d+/g);
  if (!m) {
    return "#000000";
  }
  return `#${m
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const hex = toHex(value);
  const commit = useCommit();
  return (
    <div className="mt-3 flex items-start gap-2">
      <S2ColorField
        label={label}
        description={hint}
        // Normalised: ColorField can't parse names like "white".
        value={hex}
        onChange={(color) => {
          if (color) {
            onChange(color.toString("hex"));
            commit();
          }
        }}
        styles={style({ flexGrow: 1 })}
      />
      <label className="relative mt-6 shrink-0 cursor-pointer">
        <ColorSwatch color={hex} size="S" />
        <span className="sr-only">Pick {label} color</span>
        <input
          type="color"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
