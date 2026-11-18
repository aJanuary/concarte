import { Link } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";
import { concarte } from "../platform/bridge";

const REPOSITORY = "https://github.com/aJanuary/concarte";

const PLATFORMS: Record<string, string> = {
  darwin: "macOS",
  win32: "Windows",
  linux: "Linux",
};

const sectionStyle = style({
  font: "heading-xs",
  marginTop: 24,
  marginBottom: 8,
});

function external(href: string, children: ReactNode) {
  return (
    <Link href={href} target="_blank">
      {children}
    </Link>
  );
}

function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl
      className={style({
        display: "grid",
        gridTemplateColumns: ["auto", "1fr"],
        columnGap: 16,
        rowGap: 4,
        margin: 0,
      })}
    >
      {rows.map(([label, value]) => (
        <div key={label} className={style({ display: "contents" })}>
          <dt className={style({ color: "neutral-subdued" })}>{label}</dt>
          <dd className={style({ margin: 0, userSelect: "text" })}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function commitLink(commit: string | null) {
  if (commit === null) {
    return "Unknown";
  }
  // A dirty build's hash names a commit its contents don't match.
  if (commit.endsWith("-dirty")) {
    return commit;
  }
  return external(`${REPOSITORY}/commit/${commit}`, commit);
}

export function AboutPanel() {
  const build = __BUILD_INFO__;
  const runtime = concarte.runtime;
  return (
    <div className={style({ font: "body" })}>
      <h3
        className={style({ font: "title-lg", marginTop: 0, marginBottom: 4 })}
      >
        ConCarte Editor
      </h3>
      <p className={style({ marginTop: 0 })}>Version {build.version}</p>

      <h4 className={sectionStyle}>Build</h4>
      <Details
        rows={[
          ["Commit", commitLink(build.commit)],
          ["Built", new Date(build.date).toLocaleString()],
          ["Electron", runtime.electron],
          ["Chromium", runtime.chrome],
          ["Node", runtime.node],
          [
            "System",
            `${PLATFORMS[runtime.platform] ?? runtime.platform} (${runtime.arch})`,
          ],
        ]}
      />

      <h4 className={sectionStyle}>Links</h4>
      <Details
        rows={[
          ["Source", external(REPOSITORY, "github.com/aJanuary/concarte")],
          ["Licence", external(`${REPOSITORY}/blob/main/LICENSE`, "MIT")],
        ]}
      />

      <h4 className={sectionStyle}>Credits</h4>
      <p className={style({ margin: 0 })}>
        The app icon is the{" "}
        {external(
          "https://game-icons.net/1x1/delapouite/direction-signs.html",
          "direction signs icon",
        )}{" "}
        by {external("https://delapouite.com/", "Delapouite")}, recoloured, used
        under{" "}
        {external("http://creativecommons.org/licenses/by/3.0/", "CC BY 3.0")}.
      </p>
    </div>
  );
}
