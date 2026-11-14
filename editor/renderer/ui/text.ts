/** A count with its noun: "1 error", "2 errors". */
export const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;
