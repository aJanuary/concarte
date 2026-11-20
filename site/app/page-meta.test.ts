import { describe, expect, it } from "vitest";
import type { Config } from "@concarte/core";
import {
  named,
  pageUrl,
  previewImageAlt,
  previewMetadata,
  previewTitle,
  roomPreviewDescription,
  summary,
  type PageTranslator,
} from "./page-meta";

const messages = {
  title: "{eventName} venue map",
  description: "Interactive map of the {eventName} venue",
  named: "{name} · {title}",
  "map-image": "{map} map",
  "room-image": "{room} highlighted on the {map} map",
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

describe("pageUrl", () => {
  it.each([
    ["https://example.com", "", "https://example.com/"],
    ["https://example.com", "/about", "https://example.com/about"],
    ["https://example.com/myevent", "", "https://example.com/myevent"],
    [
      "https://example.com/myevent",
      "/map/m/room/r",
      "https://example.com/myevent/map/m/room/r",
    ],
  ])("puts %j and %j together as %j", (url, path, expected) => {
    expect(pageUrl({ url }, path)).toBe(expected);
  });

  it.each([undefined, "/myevent"])(
    "has no address without the domain: %j",
    (url) => {
      expect(pageUrl({ url }, "/about")).toBeUndefined();
    },
  );
});

describe("previewMetadata", () => {
  const page = {
    title: "Main Hall · DemoCon",
    description: "The big one",
    path: "/map/m/room/r",
  };
  const image = { width: 1200, height: 630, alt: "Main Hall · DemoCon" };

  it("gives the page's address and its image's in full", () => {
    expect(
      previewMetadata(
        { url: "https://example.com/myevent" },
        { ...page, image: { ...image, file: "/og/abc.png" } },
      ),
    ).toEqual({
      openGraph: {
        title: page.title,
        description: page.description,
        url: "https://example.com/myevent/map/m/room/r",
        images: [{ url: "https://example.com/myevent/og/abc.png", ...image }],
      },
      twitter: { card: "summary_large_image" },
    });
  });

  it("leaves out an image that wasn't made", () => {
    expect(
      previewMetadata(
        { url: "https://example.com" },
        { ...page, image: { ...image, file: undefined } },
      ),
    ).toEqual({
      openGraph: {
        title: page.title,
        description: page.description,
        url: "https://example.com/map/m/room/r",
      },
    });
  });

  it("leaves out addresses without the domain", () => {
    expect(
      previewMetadata(
        { url: "/myevent" },
        { ...page, image: { ...image, file: "/og/abc.png" } },
      ),
    ).toEqual({
      openGraph: {
        title: page.title,
        description: page.description,
        url: undefined,
      },
    });
  });
});

describe("previewImageAlt", () => {
  it("describes a map's image", () => {
    expect(previewImageAlt(t, map)).toBe("Ground floor map");
  });

  it("describes a room's image as the room on its map", () => {
    expect(previewImageAlt(t, map, room)).toBe(
      "Main Hall highlighted on the Ground floor map",
    );
  });
});
