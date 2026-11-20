import { describe, expect, it } from "vitest";
import type { Config } from "@concarte/core";
import {
  named,
  previewTitle,
  roomPreviewDescription,
  summary,
  type PageTranslator,
} from "./page-meta";

const messages = {
  title: "{eventName} venue map",
  description: "Interactive map of the {eventName} venue",
  named: "{name} · {title}",
};

const t: PageTranslator = (key, values) =>
  messages[key].replace(/\{(\w+)\}/g, (_, name: string) => values[name]);

function config(maps: number, page?: Config["page"]): Config {
  return {
    eventName: "DemoCon",
    page,
    maps: Array.from({ length: maps }, (_, i) => ({ label: `Floor ${i}` })),
  } as Config;
}

const map = { label: "Ground floor" };
const room = { label: "Main Hall" };

describe("previewTitle", () => {
  it("names the room, not its map", () => {
    expect(previewTitle(config(2), t, map, room)).toBe(
      "Main Hall · DemoCon venue map",
    );
  });

  it("names the map when there are several", () => {
    expect(previewTitle(config(2), t, map)).toBe(
      "Ground floor · DemoCon venue map",
    );
  });

  it("leaves out the map when it's the only one", () => {
    expect(previewTitle(config(1), t, map)).toBe("DemoCon venue map");
    expect(previewTitle(config(1), t, map, room)).toBe(
      "Main Hall · DemoCon venue map",
    );
  });

  it("builds on the event's own title", () => {
    const page = { title: "DemoCon Hotel B map", description: "Hotel B" };
    expect(previewTitle(config(1), t, map, room)).not.toContain("Hotel B");
    expect(previewTitle(config(1, page), t, map, room)).toBe(
      "Main Hall · DemoCon Hotel B map",
    );
    expect(named(config(1, page), t, undefined)).toBe("DemoCon Hotel B map");
  });
});

describe("roomPreviewDescription", () => {
  it("uses the room's description", () => {
    expect(
      roomPreviewDescription(config(1), t, { description: "Seats 600." }),
    ).toBe("Seats 600.");
  });

  it("falls back to the event's description", () => {
    const page = { title: "Hotel B map", description: "Hotel B rooms" };
    expect(roomPreviewDescription(config(1), t, {})).toBe(
      "Interactive map of the DemoCon venue",
    );
    expect(
      roomPreviewDescription(config(1, page), t, { description: "# Hi" }),
    ).toBe("Hotel B rooms");
  });
});

describe("summary", () => {
  it("takes the first paragraph as plain text", () => {
    expect(
      summary(
        "The **largest** room, see [the lifts](/map/g/room/lifts).\n\n# Highlights\nMore",
      ),
    ).toBe("The largest room, see the lifts.");
  });

  it("skips headings and images to the first paragraph with text", () => {
    expect(
      summary("# Opening hours\n\n![Plan](/plan.png)\n\nOpen 9am\\\nto 5pm"),
    ).toBe("Open 9am to 5pm");
  });

  it("has nothing for markdown without a paragraph", () => {
    expect(summary("# Only a heading")).toBeUndefined();
  });

  it("cuts long text at a word", () => {
    const text = summary(`${"word ".repeat(60)}end.`)!;
    expect(text.length).toBeLessThanOrEqual(201);
    expect(text).toMatch(/word…$/);
  });
});
