export function green(text: string): string {
  const supportsColor =
    !process.env.NO_COLOR &&
    (!!process.env.FORCE_COLOR ||
      process.platform === "win32" ||
      (process.stdout.isTTY && process.env.TERM !== "dumb") ||
      !!process.env.CI);
  return supportsColor ? `\x1b[32m${text}\x1b[0m` : text;
}
