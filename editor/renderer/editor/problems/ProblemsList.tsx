import { ListView, ListViewItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { SeverityIcon } from "../../ui/IssueCounts";
import type { Issue } from "@concarte/core";

export function ProblemsList({
  issues,
  onSelect,
}: {
  issues: Issue[];
  onSelect: (issue: Issue) => void;
}) {
  if (issues.length === 0) {
    return (
      <p
        className={style({
          margin: 0,
          padding: 16,
          font: "body-sm",
          color: "neutral-subdued",
        })}
      >
        No problems
      </p>
    );
  }
  return (
    <ListView
      aria-label="Problems"
      isQuiet
      items={issues.map((issue, index) => ({ ...issue, id: index }))}
      onAction={(key) => onSelect(issues[Number(key)])}
      styles={style({ height: "full" })}
    >
      {(issue) => (
        <ListViewItem
          id={issue.id}
          textValue={`${issue.severity}: ${issue.message}`}
        >
          <SeverityIcon
            severity={issue.severity}
            label={issue.severity === "error" ? "Error" : "Warning"}
          />
          <Text>{issue.message}</Text>
        </ListViewItem>
      )}
    </ListView>
  );
}
