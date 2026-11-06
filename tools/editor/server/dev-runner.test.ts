import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { createDevRunner } from "./dev-runner";

const runners: ReturnType<typeof createDevRunner>[] = [];
afterEach(() => Promise.all(runners.splice(0).map((r) => r.stop())));

async function setup(server: string) {
  const site = await mkdtemp(join(tmpdir(), "concarte-site-"));
  await writeFile(join(site, "server.mjs"), server);
  const runner = createDevRunner({
    siteRoot: site,
    nodePath: process.execPath,
    commands: (_site, _event, port) => ({
      once: [],
      long: [["server.mjs", String(port)]],
    }),
  });
  runners.push(runner);
  return runner;
}

const LISTEN = `
  import { createServer } from "http";
  createServer((_, res) => res.end("ok")).listen(Number(process.argv[2]), "127.0.0.1");
`;

describe("dev runner", () => {
  it("starts once and reuses the server for the same event", async () => {
    const runner = await setup(LISTEN);
    const first = await runner.start("/event");
    expect(first.ok).toBe(true);
    const second = await runner.start("/event");
    expect(second).toEqual(first);
    if (first.ok) {
      expect(await (await fetch(first.url)).text()).toBe("ok");
    }
  });

  it("reports a server that exits", async () => {
    const runner = await setup(`console.log("boom"); process.exit(1);`);
    const result = await runner.start("/event");
    expect(result.ok).toBe(false);
    expect(runner.url()).toBeUndefined();
  });

  it("stops the server", async () => {
    const runner = await setup(LISTEN);
    const result = await runner.start("/event");
    await runner.stop();
    expect(runner.url()).toBeUndefined();
    if (result.ok) {
      await expect(fetch(result.url)).rejects.toThrow();
    }
  });
});
