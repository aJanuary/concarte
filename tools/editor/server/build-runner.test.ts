import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import type { BuildState } from "../shared/api";
import { buildFreshness, createBuildRunner } from "./build-runner";

async function setup(script: string) {
  const site = await mkdtemp(join(tmpdir(), "concarte-site-"));
  const event = await mkdtemp(join(tmpdir(), "concarte-event-"));
  await writeFile(join(event, "concarte.json"), "");
  await writeFile(join(site, "step.mjs"), script);
  const states: BuildState[] = [];
  let runner!: ReturnType<typeof createBuildRunner>;
  const done = new Promise<BuildState>((resolve) => {
    runner = createBuildRunner({
      siteRoot: site,
      nodePath: process.execPath,
      commands: () => [{ args: ["step.mjs"] }],
      onChange: (state) => {
        states.push(state);
        if (state.status !== "running") {
          resolve(state);
        }
      },
    });
  });
  return { site, event, runner, done, states };
}

describe("build runner", () => {
  it("copies the output to dist and records the build", async () => {
    const { site, event, runner, done } = await setup(`
      import { mkdirSync, writeFileSync } from "fs";
      console.log("event " + process.env.CONCARTE_EVENT_DIR);
      mkdirSync("out", { recursive: true });
      writeFileSync("out/index.html", "built");
    `);
    expect(runner.start(event)).toBe(true);
    expect((await done).status).toBe("succeeded");
    expect(await readFile(join(event, "dist", "index.html"), "utf8")).toBe(
      "built",
    );
    expect(runner.state().log).toContain(`event ${event}`);
    expect(buildFreshness(event)).toBe("fresh");
    expect(existsSync(join(site, "out"))).toBe(true);
  });

  it("is stale once the config changes", async () => {
    const { event, runner, done } = await setup(`
      import { mkdirSync } from "fs";
      mkdirSync("out", { recursive: true });
    `);
    runner.start(event);
    await done;
    await new Promise((r) => setTimeout(r, 20));
    await writeFile(join(event, "concarte.json"), "// edited");
    expect(buildFreshness(event)).toBe("stale");
  });

  it("keeps the previous dist when the build fails", async () => {
    const { event, runner, done } = await setup(`
      console.error("boom");
      process.exit(1);
    `);
    await mkdir(join(event, "dist"));
    await writeFile(join(event, "dist", "old.html"), "old");
    runner.start(event);
    const state = await done;
    expect(state.status).toBe("failed");
    expect(state.log).toContain("boom");
    expect(existsSync(join(event, "dist", "old.html"))).toBe(true);
  });

  it("can be cancelled", async () => {
    const { event, runner, done } = await setup(`setInterval(() => {}, 1000);`);
    runner.start(event);
    expect(runner.start(event)).toBe(false);
    await new Promise((r) => setTimeout(r, 200));
    runner.cancel();
    expect((await done).status).toBe("cancelled");
  });

  it("reports a missing build", async () => {
    const { event } = await setup("");
    expect(buildFreshness(event)).toBe("missing");
  });
});
