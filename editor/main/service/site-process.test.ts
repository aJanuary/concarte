import { execFileSync } from "child_process";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { exitCode, nodeLauncherDir, spawnSiteProcess } from "./site-process";

const site = () => mkdtempSync(join(tmpdir(), "concarte-site-"));

describe.skipIf(process.platform === "win32")("node launcher", () => {
  it("runs the given node, passing arguments through", () => {
    const dir = nodeLauncherDir({
      siteRoot: site(),
      nodePath: process.execPath,
    });
    const output = execFileSync(
      join(dir!, "node"),
      ["-p", "process.argv[1] + process.execPath", "it's here"],
      { encoding: "utf8" },
    );
    expect(output.trim()).toBe(`it's here${process.execPath}`);
  });

  it("survives quotes in the path to node", () => {
    const siteRoot = site();
    const dir = nodeLauncherDir({ siteRoot, nodePath: "/no 'such' node" });
    expect(() => execFileSync(join(dir!, "node"), { stdio: "pipe" })).toThrow(
      /\/no 'such' node/,
    );
  });

  it("is first on the PATH of the site's processes", async () => {
    const options = { siteRoot: site(), nodePath: process.execPath };
    let output = "";
    const child = spawnSiteProcess(
      options,
      ["-p", "process.env.PATH"],
      "/event",
      (text) => (output += text),
    );
    expect(await exitCode(child, () => {})).toBe(0);
    expect(output.startsWith(nodeLauncherDir(options)!)).toBe(true);
  });
});

describe("node launcher on Windows", () => {
  it("is not made", () => {
    const options = { siteRoot: site(), nodePath: process.execPath };
    expect(nodeLauncherDir(options, "win32")).toBeUndefined();
  });
});
