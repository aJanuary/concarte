import { mkdtemp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/settings";
import { readSettings, updateSettings } from "./settings";

async function file() {
  return join(await mkdtemp(join(tmpdir(), "concarte-settings-")), "s.json");
}

describe("settings", () => {
  it("defaults without a file", async () => {
    expect(readSettings(await file())).toEqual(DEFAULT_SETTINGS);
  });

  it("defaults when the file is corrupt", async () => {
    const f = await file();
    await writeFile(f, "{not json");
    expect(readSettings(f)).toEqual(DEFAULT_SETTINGS);
  });

  it("replaces invalid values with defaults", async () => {
    const f = await file();
    await writeFile(f, JSON.stringify({ appearance: { theme: "purple" } }));
    expect(readSettings(f).appearance.theme).toBe("system");
  });

  it("saves an update", async () => {
    const f = await file();
    updateSettings(f, { appearance: { theme: "dark" } });
    expect(readSettings(f).appearance.theme).toBe("dark");
  });

  it("ignores invalid updates", async () => {
    const f = await file();
    updateSettings(f, { appearance: { theme: "dark" } });
    updateSettings(f, { appearance: { theme: 3 } });
    expect(readSettings(f).appearance.theme).toBe("dark");
  });

  it("keeps keys it doesn't recognise", async () => {
    const f = await file();
    await writeFile(
      f,
      JSON.stringify({ future: { x: 1 }, appearance: { density: "compact" } }),
    );
    updateSettings(f, { appearance: { theme: "light" } });
    expect(JSON.parse(await readFile(f, "utf8"))).toEqual({
      future: { x: 1 },
      appearance: { density: "compact", theme: "light" },
    });
  });
});
