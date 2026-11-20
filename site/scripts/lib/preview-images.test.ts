import { describe, expect, it } from "vitest";
import {
  areaBounds,
  mapFrame,
  previewMap,
  previewSvg,
  roomFrame,
  type Box,
} from "./preview-images.ts";

const ASPECT = 1200 / 630;
const map: Box = { x: 0, y: 0, width: 1000, height: 700 };

function expectBox(actual: Box, expected: Box) {
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(actual[key]).toBeCloseTo(expected[key]);
  }
}

describe("mapFrame", () => {
  it("fits a tall map by its height, with a margin, centred", () => {
    const height = 700 / 0.9;
    const width = height * ASPECT;
    expectBox(mapFrame(map), {
      x: 500 - width / 2,
      y: 350 - height / 2,
      width,
      height,
    });
  });

  it("fits a wide map by its width", () => {
    const wide = { x: 10, y: 20, width: 3000, height: 100 };
    const width = 3000 / 0.9;
    expectBox(mapFrame(wide), {
      x: 1510 - width / 2,
      y: 70 - width / ASPECT / 2,
      width,
      height: width / ASPECT,
    });
  });
});

describe("roomFrame", () => {
  it("shows the room filling most of the preview, centred on it", () => {
    const room = { x: 400, y: 300, width: 150, height: 100 };
    const height = 100 / 0.6;
    const width = Math.max(150 / 0.6, height * ASPECT);
    expectBox(roomFrame(room, map), {
      x: 475 - width / 2,
      y: 350 - width / ASPECT / 2,
      width,
      height: width / ASPECT,
    });
  });

  it("shows a sixth of the map's longer side around a tiny room", () => {
    const frame = roomFrame({ x: 500, y: 350, width: 2, height: 2 }, map);
    expect(frame.width).toBeCloseTo(1000 / 6);
  });

  it("keeps a room by the edge of the map within the map", () => {
    const frame = roomFrame({ x: 0, y: 690, width: 10, height: 10 }, map);
    expect(frame.x).toBe(0);
    expect(frame.y + frame.height).toBeCloseTo(700);
  });

  it("centres the frame across a map narrower than it", () => {
    const strip = { x: 0, y: 0, width: 1000, height: 20 };
    const frame = roomFrame({ x: 100, y: 0, width: 10, height: 20 }, strip);
    expect(frame.y + frame.height / 2).toBeCloseTo(10);
  });

  it("shows no more than the whole map around a large room", () => {
    const room = { x: 0, y: 0, width: 900, height: 600 };
    expect(roomFrame(room, map)).toEqual(mapFrame(map));
  });
});

describe("areaBounds", () => {
  it("bounds every ring", () => {
    expect(
      areaBounds([
        [
          [1, 2],
          [5, 3],
        ],
        [[-1, 8]],
      ]),
    ).toEqual({ x: -1, y: 2, width: 6, height: 6 });
  });

  it("refuses an area with no points", () => {
    expect(() => areaBounds([[]])).toThrow("no points");
  });
});

describe("previewMap", () => {
  it("reads the map's space from its viewBox", () => {
    const { box } = previewMap(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10cm" viewBox="-5 10 200 100"/>',
    );
    expect(box).toEqual({ x: -5, y: 10, width: 200, height: 100 });
  });

  it("reads the map's space from its size without a viewBox", () => {
    const { box } = previewMap(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>',
    );
    expect(box).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it("refuses a map without a size", () => {
    expect(() =>
      previewMap('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    ).toThrow("no viewBox");
  });
});

describe("previewSvg", () => {
  const theme = {
    background: "#eeeeee",
    accent: "#ff0000",
    "highlighted-room-background": "#ff000066",
  } as Parameters<typeof previewSvg>[2];

  it("nests the map in its own space, and outlines the area at the site's width", () => {
    const svg = previewSvg(
      previewMap(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10cm" viewBox="-5 10 200 100"><text>A &amp; B</text></svg>',
      ),
      { x: 0, y: 0, width: 600, height: 315 },
      theme,
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
        ],
      ],
    );
    expect(svg).toContain('viewBox="0 0 600 315"');
    expect(svg).toContain('fill="#eeeeee"');
    const nested = [...svg.matchAll(/<svg [^>]*>/g)][1]?.[0];
    for (const attribute of [
      'x="-5"',
      'y="10"',
      'width="200"',
      'height="100"',
      'viewBox="-5 10 200 100"',
    ]) {
      expect(nested).toContain(attribute);
    }
    expect(svg).toContain("<text>A &amp; B</text>");
    expect(svg).toContain(
      '<path d="M 0 0 L 10 0 L 10 10 Z" fill="#ff000066" stroke="#ff0000" stroke-width="2"',
    );
  });
});
