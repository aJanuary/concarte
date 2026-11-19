import { describe, expect, it } from "vitest";
import { parseSvg } from "./parse-svg.ts";
import {
  resolveShape,
  parseTransform,
  multiplyMatrices,
} from "./shape-resolver.ts";

const resolve = (source: string, id: string) =>
  resolveShape(parseSvg(source), id);

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
}

describe("parseTransform", () => {
  it("returns the identity matrix for no transform", () => {
    expect(parseTransform(null)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("parses translate", () => {
    expect(parseTransform("translate(10,20)")).toEqual([1, 0, 0, 1, 10, 20]);
  });

  it("parses translate with implicit ty", () => {
    expect(parseTransform("translate(10)")).toEqual([1, 0, 0, 1, 10, 0]);
  });

  it("parses scale", () => {
    expect(parseTransform("scale(2,3)")).toEqual([2, 0, 0, 3, 0, 0]);
  });

  it("parses matrix", () => {
    expect(parseTransform("matrix(1,2,3,4,5,6)")).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("composes multiple functions left to right", () => {
    // translate then scale: point is scaled first (inner), then translated (outer)
    const combined = parseTransform("translate(10,0) scale(2,2)");
    expect(combined).toEqual(
      multiplyMatrices([1, 0, 0, 1, 10, 0], [2, 0, 0, 2, 0, 0]),
    );
  });

  it("rotates about a given center", () => {
    const m = parseTransform("rotate(90,10,10)");
    // (10,10) is the pivot, should map to itself
    const x = m[0] * 10 + m[2] * 10 + m[4];
    const y = m[1] * 10 + m[3] * 10 + m[5];
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(10);
  });
});

describe("resolveShape", () => {
  it("resolves a bare path with no ancestor transforms", () => {
    const doc = svg(`<path id="room" d="M 0 0 L 10 0 L 10 10 Z" />`);
    expect(resolve(doc, "room")).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ]);
  });

  it("bakes in the element's own transform", () => {
    const doc = svg(
      `<path id="room" d="M 0 0 L 10 0 L 10 10 Z" transform="translate(5,5)" />`,
    );
    expect(resolve(doc, "room")).toEqual([
      [
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 5],
      ],
    ]);
  });

  it("bakes in ancestor group transforms, outer applied after inner", () => {
    const doc = svg(`
      <g transform="translate(100,0)">
        <g transform="scale(2,2)">
          <path id="room" d="M 0 0 L 10 0 L 10 10 Z" />
        </g>
      </g>
    `);
    // scale(2,2) first -> (0,0) (20,0) (20,20); then translate(100,0) -> (100,0) (120,0) (120,20)
    expect(resolve(doc, "room")).toEqual([
      [
        [100, 0],
        [120, 0],
        [120, 20],
        [100, 0],
      ],
    ]);
  });

  it("does not apply the root <svg>'s own attributes as a transform", () => {
    const doc = svg(`<path id="room" d="M 0 0 L 10 0 L 10 10 Z" />`);
    expect(resolve(doc, "room")).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ]);
  });

  it("converts a rect", () => {
    const doc = svg(`<rect id="room" x="1" y="2" width="10" height="20" />`);
    expect(resolve(doc, "room")).toEqual([
      [
        [1, 2],
        [11, 2],
        [11, 22],
        [1, 22],
        [1, 2],
      ],
    ]);
  });

  describe("rect with rounded corners", () => {
    const rect = (attrs: string) =>
      resolve(svg(`<rect id="room" ${attrs} />`), "room");

    /**
     * Asserts the ring traces a `width`×`height` rect at the origin whose
     * corners are elliptical arcs of radii `rx`, `ry`.
     */
    function expectRoundedRect(
      rings: [number, number][][],
      width: number,
      height: number,
      rx: number,
      ry: number,
    ) {
      expect(rings).toHaveLength(1);
      const [ring] = rings;
      for (const [cx, cy] of [
        [rx, ry],
        [width - rx, ry],
        [width - rx, height - ry],
        [rx, height - ry],
      ]) {
        const tangents = [
          [cx, cy < height / 2 ? 0 : height],
          [cx < width / 2 ? 0 : width, cy],
        ];
        for (const tangent of tangents) {
          expect(ring).toContainEqual(tangent);
        }
      }
      for (const [x, y] of ring) {
        const inCornerX = x < rx || x > width - rx;
        const inCornerY = y < ry || y > height - ry;
        if (inCornerX && inCornerY) {
          const cx = x < rx ? rx : width - rx;
          const cy = y < ry ? ry : height - ry;
          const distance = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          expect(distance).toBeCloseTo(1, 1);
        } else {
          const onEdge = x === 0 || x === width || y === 0 || y === height;
          expect(onEdge).toBe(true);
        }
      }
      // The arcs are flattened into several points, not just their ends.
      expect(ring.length).toBeGreaterThan(12);
    }

    it("follows elliptical corner arcs", () => {
      expectRoundedRect(
        rect(`width="100" height="60" rx="20" ry="10"`),
        100,
        60,
        20,
        10,
      );
    });

    it("uses rx for ry when only rx is given", () => {
      expectRoundedRect(
        rect(`width="100" height="60" rx="15"`),
        100,
        60,
        15,
        15,
      );
    });

    it("uses ry for rx when only ry is given", () => {
      expectRoundedRect(
        rect(`width="100" height="60" ry="15"`),
        100,
        60,
        15,
        15,
      );
    });

    it("treats ry=auto as missing", () => {
      expectRoundedRect(
        rect(`width="100" height="60" rx="15" ry="auto"`),
        100,
        60,
        15,
        15,
      );
    });

    it("caps each radius at half the rect's size on that axis", () => {
      expectRoundedRect(
        rect(`width="40" height="100" rx="999"`),
        40,
        100,
        20,
        50,
      );
    });

    it("draws square corners when either radius is zero", () => {
      const square = [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ];
      expect(rect(`width="10" height="10" rx="0"`)).toEqual(square);
      expect(rect(`width="10" height="10" rx="0" ry="5"`)).toEqual(square);
    });

    it("rejects a negative radius", () => {
      expect(() => rect(`width="10" height="10" rx="-2"`)).toThrow(
        /<rect id="room"> has rx="-2"/,
      );
    });

    it("rejects a percentage radius", () => {
      expect(() => rect(`width="10" height="10" ry="10%"`)).toThrow(
        /<rect id="room"> has ry="10%"/,
      );
    });
  });

  it("converts a polygon and closes it", () => {
    const doc = svg(`<polygon id="room" points="0,0 10,0 10,10" />`);
    expect(resolve(doc, "room")).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ]);
  });

  describe("polygon points separators", () => {
    const triangle = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 0],
      ],
    ];

    it.each([
      ["whitespace only", "0 0 10 0 10 10"],
      ["comma and space within a pair", "0, 0 10, 0 10, 10"],
      ["commas only", "0,0,10,0,10,10"],
      ["newlines and tabs", "0,0\n\t10,0\n\t10,10"],
    ])("accepts %s", (_, points) => {
      const doc = svg(`<polygon id="room" points="${points}" />`);
      expect(resolve(doc, "room")).toEqual(triangle);
    });

    it("rejects an odd number of coordinates", () => {
      const doc = svg(`<polygon id="room" points="0,0 10,0 10" />`);
      expect(() => resolve(doc, "room")).toThrow(
        /<polygon id="room"> has an odd number of coordinates/,
      );
    });

    it("rejects a non-numeric coordinate", () => {
      const doc = svg(`<polygon id="room" points="0,0 10,0 10,ten" />`);
      expect(() => resolve(doc, "room")).toThrow(
        /<polygon id="room"> has points="0,0 10,0 10,ten"/,
      );
    });
  });

  it("flattens a circle into points on its circumference", () => {
    const doc = svg(`<circle id="room" cx="50" cy="50" r="40" />`);
    const [ring, ...others] = resolve(doc, "room");
    expect(others).toEqual([]);
    expect(ring.length).toBeGreaterThan(16);
    for (const [x, y] of ring) {
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(40, 0);
    }
  });

  it("expands a <g> into one sub-path per descendant shape", () => {
    const doc = svg(`
      <g id="room">
        <path d="M 0 0 L 1 0 L 1 1 Z" />
        <path d="M 5 5 L 6 5 L 6 6 Z" transform="translate(1,0)" />
      </g>
    `);
    expect(resolve(doc, "room")).toEqual([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
      [
        [6, 5],
        [7, 5],
        [7, 6],
        [6, 5],
      ],
    ]);
  });

  it("throws a descriptive error when the id is missing", () => {
    const doc = svg(`<path id="other" d="M 0 0 Z" />`);
    expect(() => resolve(doc, "room")).toThrow(/no element with id "room"/);
  });

  it("throws a descriptive error when the id is duplicated", () => {
    const doc = svg(`
      <path id="room" d="M 0 0 Z" />
      <path id="room" d="M 1 1 Z" />
    `);
    expect(() => resolve(doc, "room")).toThrow(/not unique/);
  });

  it("throws a descriptive error for unsupported elements", () => {
    const doc = svg(`<text id="room">hi</text>`);
    expect(() => resolve(doc, "room")).toThrow(/Unsupported SVG element/);
  });

  it("throws a descriptive error for an empty group", () => {
    const doc = svg(`<g id="room"></g>`);
    expect(() => resolve(doc, "room")).toThrow(/empty <g>/);
  });
});
