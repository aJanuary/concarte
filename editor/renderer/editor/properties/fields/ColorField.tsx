import {
  ActionButton,
  ColorArea,
  ColorSlider,
  ColorSwatch,
  DialogTrigger,
  Popover,
  TextField,
  parseColor,
  type Color,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { isHexColor, normalizeHexColor } from "@concarte/core";
import { useState } from "react";
import { useCommit } from "../commit";

const hexOf = (color: Color) => normalizeHexColor(color.toString("hexa"));

/**
 * A theme colour, typed as hex or picked. Typing goes into the document as
 * is, so a mistyped colour shows up as a problem rather than being dropped;
 * it is tidied into its saved form when focus leaves.
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}) {
  const commit = useCommit();
  const valid = isHexColor(value);

  // The picker starts from here while the typed text isn't a colour.
  const [lastValid, setLastValid] = useState(valid ? value : "#000000");
  if (valid && value !== lastValid) {
    setLastValid(value);
  }
  const base = valid ? value : lastValid;

  // Picked in HSB so hue survives dragging through greys, where hex loses it.
  const [picked, setPicked] = useState<Color>(() =>
    parseColor(base).toFormat("hsb"),
  );
  const shown =
    hexOf(picked) === normalizeHexColor(base)
      ? picked
      : parseColor(base).toFormat("hsb");
  const pick = (color: Color) => {
    setPicked(color);
    onChange(hexOf(color) ?? base);
  };

  const [onFocus, setOnFocus] = useState(value);

  return (
    <div className={style({ display: "flex", alignItems: "start", gap: 8 })}>
      <TextField
        label={label}
        description={hint}
        errorMessage={error}
        value={value}
        onChange={onChange}
        onFocus={() => setOnFocus(value)}
        onBlur={() => {
          const normalized = normalizeHexColor(value);
          if (normalized !== undefined && normalized !== value) {
            onChange(normalized);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange(onFocus);
          } else {
            e.continuePropagation();
          }
        }}
        isInvalid={error !== undefined}
        styles={style({ flexGrow: 1 })}
      />
      {/* Pushed down past the field's label to line up with the input. The
          field's hint and error sit below the input, so aligning the row to
          its end would follow them instead. */}
      <div className={style({ marginTop: "[25px]" })}>
        <DialogTrigger>
          <ActionButton aria-label={`Pick ${label} color`}>
            {/* slot="icon" makes the button size and centre it like an icon;
                otherwise it is laid out as text and sits off-centre. */}
            <div
              slot="icon"
              className={style({
                gridArea: "icon",
                display: "flex",
              })}
            >
              <ColorSwatch color={valid ? value : undefined} size="S" />
            </div>
          </ActionButton>
          <Popover>
            <div
              className={style({
                display: "flex",
                flexDirection: "column",
                gap: 16,
              })}
            >
              <ColorArea
                value={shown}
                xChannel="saturation"
                yChannel="brightness"
                onChange={pick}
                onChangeEnd={commit}
              />
              <ColorSlider
                value={shown}
                channel="hue"
                onChange={pick}
                onChangeEnd={commit}
              />
              <ColorSlider
                label="Opacity"
                value={shown}
                channel="alpha"
                onChange={pick}
                onChangeEnd={commit}
              />
            </div>
          </Popover>
        </DialogTrigger>
      </div>
    </div>
  );
}
