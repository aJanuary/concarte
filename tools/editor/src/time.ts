export function timeAgo(now: number, then: number): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return plural(minutes, "minute");
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return plural(hours, "hour");
  }
  return plural(Math.floor(hours / 24), "day");
}
