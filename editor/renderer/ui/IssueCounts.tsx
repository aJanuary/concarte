import { IconContext } from "@react-spectrum/s2";
import { VisuallyHidden } from "react-aria";
import AlertDiamond from "@react-spectrum/s2/icons/AlertDiamond";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import {
  iconStyle,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import type { Issue } from "@concarte/core";
import { plural } from "./text";

type Severity = Issue["severity"];

const iconStyles = {
  error: {
    S: iconStyle({ size: "S", color: "negative" }),
    M: iconStyle({ color: "negative" }),
  },
  warning: {
    S: iconStyle({ size: "S", color: "notice" }),
    M: iconStyle({ color: "notice" }),
  },
};

/** The icon that marks errors and warnings wherever they are shown. */
export function SeverityIcon({
  severity,
  size = "M",
  label,
}: {
  severity: Severity;
  size?: "S" | "M";
  /** Read out in place of the icon; without one the icon is decorative. */
  label?: string;
}) {
  const Icon = severity === "error" ? AlertDiamond : AlertTriangle;
  return (
    <Icon
      aria-label={label}
      aria-hidden={label === undefined || undefined}
      styles={iconStyles[severity][size]}
    />
  );
}

export function countIssues(issues: Issue[]): Record<Severity, number> {
  const counts = { error: 0, warning: 0 };
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }
  return counts;
}

function IssueCount({
  severity,
  count,
}: {
  severity: Severity;
  count: number;
}) {
  if (count === 0) {
    return null;
  }
  return (
    <span
      className={style({
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
      })}
    >
      <SeverityIcon severity={severity} size="S" />
      <span aria-hidden>{count}</span>
      <VisuallyHidden>{plural(count, severity)}</VisuallyHidden>
    </span>
  );
}

/** Error and warning icons, each with its count; nothing for a zero. */
export function IssueCounts({ issues }: { issues: Issue[] }) {
  const counts = countIssues(issues);
  return (
    // Containers such as Tab and TreeView restyle and reposition icons; an
    // empty context keeps these as they are.
    <IconContext.Provider value={{}}>
      <IssueCount severity="error" count={counts.error} />
      <IssueCount severity="warning" count={counts.warning} />
    </IconContext.Provider>
  );
}
