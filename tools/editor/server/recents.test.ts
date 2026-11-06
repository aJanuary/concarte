import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  addRecent,
  describeRecents,
  readRecents,
  removeRecent,
} from "./recents";

async function file() {
  return join(await mkdtemp(join(tmpdir(), "concarte-recents-")), "r.json");
}

describe("recents", () => {
  it("is empty without a file", async () => {
    expect(readRecents(await file())).toEqual([]);
  });

  it("puts the latest first without duplicates", async () => {
    const f = await file();
    addRecent(f, "/a");
    addRecent(f, "/b");
    expect(addRecent(f, "/a")).toEqual(["/a", "/b"]);
  });

  it("keeps ten", async () => {
    const f = await file();
    for (let i = 0; i < 12; i++) {
      addRecent(f, `/${i}`);
    }
    expect(readRecents(f)).toHaveLength(10);
    expect(readRecents(f)[0]).toBe("/11");
  });

  it("removes and flags missing folders", async () => {
    const f = await file();
    addRecent(f, "/does/not/exist");
    expect(describeRecents(f)).toEqual([
      { path: "/does/not/exist", exists: false },
    ]);
    expect(removeRecent(f, "/does/not/exist")).toEqual([]);
  });
});
