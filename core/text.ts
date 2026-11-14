export const dedent = (str: string) => {
  const lines = str.trimEnd().split("\n");
  if (lines.length == 0) {
    return str;
  }
  let firstNonEmptyLine = 0;
  while (
    firstNonEmptyLine < lines.length &&
    lines[firstNonEmptyLine].trim() === ""
  ) {
    firstNonEmptyLine++;
  }
  const indent = lines[firstNonEmptyLine].match(/^\s*/)![0];
  return lines
    .slice(firstNonEmptyLine)
    .map((line) => line.replace(new RegExp("^" + indent), ""))
    .join("\n");
};
