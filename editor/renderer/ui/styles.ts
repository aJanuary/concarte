import { style } from "@react-spectrum/s2/style" with { type: "macro" };

export const fieldStyle = style({ width: "full" });

/** Stacks fields with the same gap as a Spectrum Form. */
export const fieldStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 24,
});

export const helpText = style({ font: "ui-sm", color: "neutral-subdued" });
export const errorText = style({ font: "ui-sm", color: "negative" });
export const mutedText = style({ font: "ui", color: "neutral-subdued" });
