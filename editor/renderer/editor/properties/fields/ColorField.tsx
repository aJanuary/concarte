import {
  ActionButton,
  ColorArea,
  ColorField as S2ColorField,
  ColorSlider,
  ColorSwatch,
  DialogTrigger,
  Popover,
  parseColor,
  type Color,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useId, useState } from "react";
import { useCommit } from "../commit";
import { helpText } from "../../../ui/styles";

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
  const commit = useCommit();
  // Picked in HSB so hue survives dragging through greys, where hex loses it.
  const [picked, setPicked] = useState<Color>(() =>
    parseColor(value).toFormat("hsb"),
  );
  const shown =
    picked.toString("hex") === value
      ? picked
      : parseColor(value).toFormat("hsb");
  const hintId = useId();
  const pick = (color: Color) => {
    setPicked(color);
    onChange(color.toString("hex"));
  };

  // The hint sits below the row, not in the field, so the picker button
  // lines up with the input rather than the hint.
  return (
    <div
      className={style({ display: "flex", flexDirection: "column", gap: 4 })}
    >
      <div className={style({ display: "flex", alignItems: "end", gap: 8 })}>
        <S2ColorField
          label={label}
          aria-describedby={hint ? hintId : undefined}
          value={value}
          onChange={(color) => {
            if (color) {
              onChange(color.toString("hex"));
              commit();
            }
          }}
          styles={style({ flexGrow: 1 })}
        />
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
              <ColorSwatch color={value} size="S" />
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
            </div>
          </Popover>
        </DialogTrigger>
      </div>
      {hint && (
        <p id={hintId} className={helpText}>
          {hint}
        </p>
      )}
    </div>
  );
}
