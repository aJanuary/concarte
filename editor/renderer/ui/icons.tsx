import { createIcon } from "@react-spectrum/s2";

// Room pins, drawn from Spectrum's Location icon. Both are kept here rather
// than using Spectrum's own outline so the pair stays matched if the
// library's pin changes.
const PIN_OUTLINE =
  "M10.005 18.583H10c-.557-.001-1.071-.248-1.413-.679C6.688 15.514 3.5 10.98 3.5 7.49c0-3.446 2.916-6.25 6.5-6.25s6.5 2.804 6.5 6.25c0 3.55-3.186 8.052-5.084 10.421-.342.427-.856.672-1.411.672";

/** A room: the pin filled, with its centre dot cut out. */
export const RoomPin = createIcon((props) => (
  <svg viewBox="0 0 20 20" {...props}>
    <path
      fill="var(--iconPrimary, currentColor)"
      fillRule="evenodd"
      d={`${PIN_OUTLINE}ZM10 5.49a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z`}
    />
  </svg>
));

/** A shape not yet assigned to a room: the pin's outline. */
export const UnassignedPin = createIcon((props) => (
  <svg viewBox="0 0 20 20" {...props}>
    <g fill="var(--iconPrimary, currentColor)">
      <path d="M10 9.99c-1.379 0-2.5-1.12-2.5-2.5s1.121-2.5 2.5-2.5 2.5 1.121 2.5 2.5-1.121 2.5-2.5 2.5m0-3.5c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1" />
      <path
        d={`${PIN_OUTLINE}M10 2.74c-2.757 0-5 2.131-5 4.75 0 3.148 3.331 7.68 4.763 9.482.08.1.195.111.24.111h.002c.046 0 .161-.01.24-.11C11.675 15.19 15 10.698 15 7.49c0-2.619-2.243-4.75-5-4.75`}
      />
    </g>
  </svg>
));
