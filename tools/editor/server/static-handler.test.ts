import { mkdtemp, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "http";
import { staticHandler } from "./static-handler";

let current: Server | undefined;
afterEach(() => current?.close());

const server = {
  async start(root: string): Promise<string> {
    current = createServer(staticHandler(root));
    await new Promise<void>((r) => current!.listen(0, "127.0.0.1", r));
    const address = current.address();
    return `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/`;
  },
};

describe("preview server", () => {
  it("serves exported pages without their extension", async () => {
    const root = await mkdtemp(join(tmpdir(), "concarte-preview-"));
    await writeFile(join(root, "index.html"), "home");
    await writeFile(join(root, "about.html"), "about");
    await mkdir(join(root, "map"));
    await writeFile(join(root, "map", "index.html"), "maps");
    await writeFile(join(root, "404.html"), "missing");
    const url = await server.start(root);
    expect(await (await fetch(url)).text()).toBe("home");
    expect(await (await fetch(url + "about")).text()).toBe("about");
    expect(await (await fetch(url + "map")).text()).toBe("maps");
    const missing = await fetch(url + "nope");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("missing");
  });

  it("does not serve files outside the folder", async () => {
    const root = await mkdtemp(join(tmpdir(), "concarte-preview-"));
    const url = await server.start(root);
    const res = await fetch(url + "..%2F..%2Fetc%2Fpasswd");
    expect(res.status).toBe(404);
  });
});
