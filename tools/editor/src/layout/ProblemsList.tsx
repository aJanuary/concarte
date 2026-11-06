import type { Issue } from "../../../../scripts/lib/validate-config";

export function ProblemsList({
  issues,
  onSelect,
}: {
  issues: Issue[];
  onSelect: (issue: Issue) => void;
}) {
  if (issues.length === 0) {
    return <p className="p-3 text-slate-500">No problems.</p>;
  }
  return (
    <ul className="h-full overflow-auto">
      {issues.map((issue, i) => (
        <li key={i}>
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100"
            onClick={() => onSelect(issue)}
          >
            <span
              className={
                issue.severity === "error" ? "text-red-700" : "text-amber-700"
              }
            >
              {issue.severity === "error" ? "Error" : "Warning"}:
            </span>{" "}
            {issue.message}
          </button>
        </li>
      ))}
    </ul>
  );
}
