import { describe, expect, it } from "vitest";
import {
  resolveAreaRef,
  parseTransform,
  multiplyMatrices,
} from "./svg-ref-resolver";

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

describe("resolveAreaRef", () => {
  it("resolves a bare path with no ancestor transforms", () => {
    const doc = svg(`<path id="room" d="M 0 0 L 10 0 L 10 10 Z" />`);
    expect(resolveAreaRef(doc, "room")).toBe("M0 0L10 0L10 10z");
  });

  it("bakes in the element's own transform", () => {
    const doc = svg(
      `<path id="room" d="M 0 0 L 10 0 L 10 10 Z" transform="translate(5,5)" />`,
    );
    expect(resolveAreaRef(doc, "room")).toBe("M5 5L15 5L15 15z");
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
    expect(resolveAreaRef(doc, "room")).toBe("M100 0L120 0L120 20z");
  });

  it("does not apply the root <svg>'s own attributes as a transform", () => {
    const doc = svg(`<path id="room" d="M 0 0 L 10 0 L 10 10 Z" />`);
    expect(resolveAreaRef(doc, "room")).toBe("M0 0L10 0L10 10z");
  });

  it("converts a rect", () => {
    const doc = svg(`<rect id="room" x="1" y="2" width="10" height="20" />`);
    expect(resolveAreaRef(doc, "room")).toBe("M1 2H11V22H1z");
  });

  it("rejects a rect with rounded corners", () => {
    const doc = svg(
      `<rect id="room" x="0" y="0" width="10" height="10" rx="2" />`,
    );
    expect(() => resolveAreaRef(doc, "room")).toThrow(/rounded corners/);
  });

  it("converts a polygon and closes it", () => {
    const doc = svg(`<polygon id="room" points="0,0 10,0 10,10" />`);
    expect(resolveAreaRef(doc, "room")).toBe("M0 0L10 0L10 10z");
  });

  it("converts a circle to two arcs", () => {
    const doc = svg(`<circle id="room" cx="5" cy="5" r="5" />`);
    const d = resolveAreaRef(doc, "room");
    expect(d).toMatch(/^M0 5A5 5/);
  });

  it("expands a <g> into one sub-path per descendant shape", () => {
    const doc = svg(`
      <g id="room">
        <path d="M 0 0 L 1 0 L 1 1 Z" />
        <path d="M 5 5 L 6 5 L 6 6 Z" transform="translate(1,0)" />
      </g>
    `);
    expect(resolveAreaRef(doc, "room")).toBe("M0 0L1 0L1 1z M6 5L7 5L7 6z");
  });

  it("throws a descriptive error when the id is missing", () => {
    const doc = svg(`<path id="other" d="M 0 0 Z" />`);
    expect(() => resolveAreaRef(doc, "room")).toThrow(
      /no element with id "room"/,
    );
  });

  it("throws a descriptive error when the id is duplicated", () => {
    const doc = svg(`
      <path id="room" d="M 0 0 Z" />
      <path id="room" d="M 1 1 Z" />
    `);
    expect(() => resolveAreaRef(doc, "room")).toThrow(/not unique/);
  });

  it("throws a descriptive error for unsupported elements", () => {
    const doc = svg(`<text id="room">hi</text>`);
    expect(() => resolveAreaRef(doc, "room")).toThrow(
      /Unsupported SVG element/,
    );
  });

  it("throws a descriptive error for an empty group", () => {
    const doc = svg(`<g id="room"></g>`);
    expect(() => resolveAreaRef(doc, "room")).toThrow(/empty <g>/);
  });
});
