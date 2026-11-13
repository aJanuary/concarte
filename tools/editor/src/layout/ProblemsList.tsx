import { ListView, ListViewItem, Text } from "@react-spectrum/s2";
import AlertDiamond from "@react-spectrum/s2/icons/AlertDiamond";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import {
  iconStyle,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import type { Issue } from "../../../../scripts/lib/validate-config";
import { mutedText } from "../components/widgets";

export function ProblemsList({
  issues,
  onSelect,
}: {
  issues: Issue[];
  onSelect: (issue: Issue) => void;
}) {
  if (issues.length === 0) {
    return <p className={"p-3 " + mutedText}>No problems.</p>;
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
          {issue.severity === "error" ? (
            <AlertDiamond
              aria-label="Error"
              styles={iconStyle({ color: "negative" })}
            />
          ) : (
            <AlertTriangle
              aria-label="Warning"
              styles={iconStyle({ color: "notice" })}
            />
          )}
          <Text>{issue.message}</Text>
        </ListViewItem>
      )}
    </ListView>
  );
}
