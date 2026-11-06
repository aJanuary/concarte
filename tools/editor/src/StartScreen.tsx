import { useEffect, useState, type ReactNode } from "react";
import type { SessionResponse } from "../shared/api";
import { runMenuAction } from "./native";
import type { MenuAction } from "../shared/native";

export function StartScreen({
  session,
  onChanged,
}: {
  session: SessionResponse;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");

  const run = async (action: MenuAction) => {
    const result = await runMenuAction(action);
    if (result.ok) {
      onChanged();
    } else if (!result.cancelled) {
      setMessage(result.message);
      onChanged();
    }
  };

  useEffect(() => window.concarte?.onMenu((action) => void run(action)));

  return (
    <div className="flex h-full justify-center overflow-auto border-t border-slate-300 bg-gradient-to-b from-slate-100 to-white px-6 py-16">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          ConCarte
          <span className="ml-2 font-normal text-slate-400">editor</span>
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Create an event, or open a folder that already has one.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ActionCard
            title="New event"
            description="Start from a minimal config in an empty folder."
            onClick={() => void run({ type: "new" })}
            icon={<path d="M12 5v14M5 12h14" />}
          />
          <ActionCard
            title="Open event"
            description="Pick a folder that already has an event config."
            onClick={() => void run({ type: "open" })}
            icon={
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            }
          />
        </div>
        {message && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          >
            {message}
          </p>
        )}
        {session.recents.length > 0 && (
          <>
            <h2 className="mt-12 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Recent
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {session.recents.map((recent) => {
                const trimmed = recent.path.replace(/[\\/]+$/, "");
                const cut = Math.max(
                  trimmed.lastIndexOf("/"),
                  trimmed.lastIndexOf("\\"),
                );
                const name = trimmed.slice(cut + 1) || recent.path;
                const parent = cut > 0 ? trimmed.slice(0, cut) : "";
                return (
                  <li key={recent.path}>
                    <button
                      type="button"
                      className={
                        "flex w-full items-baseline gap-3 px-4 py-3 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none " +
                        (recent.exists ? "" : "opacity-50")
                      }
                      title={
                        recent.exists ? recent.path : "This folder is gone"
                      }
                      onClick={() =>
                        void run({ type: "open-recent", path: recent.path })
                      }
                    >
                      <span className="shrink-0 text-sm font-medium text-slate-900">
                        {name}
                      </span>
                      <span className="min-w-0 truncate text-slate-500">
                        {recent.exists ? parent : "Folder is gone"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-400 hover:shadow-md focus-visible:border-sky-400 focus-visible:outline-none"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 transition group-hover:bg-sky-100">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </span>
      <span className="mt-4 block text-base font-semibold text-slate-900">
        {title}
      </span>
      <span className="mt-1 block text-slate-600">{description}</span>
    </button>
  );
}
