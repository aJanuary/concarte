import { join } from "path";
import { describe, expect, it } from "vitest";
import { resolveRequest } from "./protocol";

const uiDir = join("/bundle", "ui");

function resolve(url: string, assets: Record<string, string> = {}) {
  return resolveRequest(url, {
    uiDir,
    resolveAsset: (path) => assets[path],
  });
}

describe("resolveRequest", () => {
  it("serves the UI's index at the root", () => {
    expect(resolve("concarte://app/")).toEqual({
      file: join(uiDir, "index.html"),
      kind: "ui",
    });
  });

  it("serves the UI's files from its folder", () => {
    expect(resolve("concarte://app/assets/index-abc.js")).toEqual({
      file: join(uiDir, "assets", "index-abc.js"),
      kind: "ui",
    });
  });

  it("serves the open event's assets through resolveAsset", () => {
    expect(
      resolve("concarte://app/event-assets/maps/ground.svg", {
        "maps/ground.svg": "/event/assets/maps/ground.svg",
      }),
    ).toEqual({ file: "/event/assets/maps/ground.svg", kind: "event-asset" });
  });

  it("has nothing for a missing asset", () => {
    expect(resolve("concarte://app/event-assets/nope.svg")).toBeUndefined();
  });

  it.each(["concarte://app/..%2F..%2Fetc%2Fpasswd", "concarte://app/%E0%A4%A"])(
    "does not serve files outside the UI's folder: %s",
    (url) => {
      expect(resolve(url)).toBeUndefined();
    },
  );

  it.each(["concarte://elsewhere/index.html", "https://app/index.html"])(
    "ignores other origins: %s",
    (url) => {
      expect(resolve(url)).toBeUndefined();
    },
  );
});
