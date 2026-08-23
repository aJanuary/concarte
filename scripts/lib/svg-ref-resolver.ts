import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";
import { DOMParser } from "linkedom";

/**
 * A 2D affine transform matrix, in the same [a, b, c, d, e, f] order as the
 * SVG/CSS `matrix()` function:
 *
 *   [ a c e ]
 *   [ b d f ]
 *   [ 0 0 1 ]
 */
export type Matrix = [number, number, number, number, number, number];

/**
 * The minimal subset of the DOM `Element`/`Document` interfaces this module
 * needs. Defined structurally rather than typed against `linkedom`'s (or
 * `lib.dom`'s) `Element`/`Document` directly, since the two don't line up
 * exactly and this module only ever touches a handful of members.
 */
interface SvgNode {
  tagName: string;
  getAttribute(name: string): string | null;
  children: ArrayLike<SvgNode>;
  parentElement: SvgNode | null;
}

export interface SvgDocument {
  querySelectorAll(selector: string): ArrayLike<SvgNode>;
}

const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/** Composes two matrices such that `m2` is applied to a point before `m1`. */
export function multiplyMatrices(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

const TRANSFORM_FUNCTION_RE = /(\w+)\s*\(([^)]*)\)/g;

function parseArgs(raw: string): number[] {
  return raw
    .trim()
    .split(/[\s,]+/)
    .filter((part) => part.length > 0)
    .map(Number);
}

/**
 * Parses an SVG `transform` attribute value (a space-separated list of
 * transform functions) into a single composed matrix.
 */
export function parseTransform(transform: string | null | undefined): Matrix {
  if (!transform) {
    return IDENTITY_MATRIX;
  }

  let result = IDENTITY_MATRIX;
  for (const match of transform.matchAll(TRANSFORM_FUNCTION_RE)) {
    const [, name, argsRaw] = match;
    const args = parseArgs(argsRaw);
    result = multiplyMatrices(result, transformFunctionToMatrix(name, args));
  }
  return result;
}

function transformFunctionToMatrix(name: string, args: number[]): Matrix {
  switch (name) {
    case "matrix": {
      const [a, b, c, d, e, f] = args;
      return [a, b, c, d, e, f];
    }
    case "translate": {
      const [tx, ty = 0] = args;
      return [1, 0, 0, 1, tx, ty];
    }
    case "scale": {
      const [sx, sy = sx] = args;
      return [sx, 0, 0, sy, 0, 0];
    }
    case "rotate": {
      const [angleDeg, cx, cy] = args;
      const angle = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotation: Matrix = [cos, sin, -sin, cos, 0, 0];
      if (cx === undefined || cy === undefined) {
        return rotation;
      }
      return multiplyMatrices(
        multiplyMatrices([1, 0, 0, 1, cx, cy], rotation),
        [1, 0, 0, 1, -cx, -cy],
      );
    }
    case "skewX": {
      const [angleDeg] = args;
      return [1, 0, Math.tan((angleDeg * Math.PI) / 180), 1, 0, 0];
    }
    case "skewY": {
      const [angleDeg] = args;
      return [1, Math.tan((angleDeg * Math.PI) / 180), 0, 1, 0, 0];
    }
    default:
      throw new Error(`Unsupported SVG transform function: ${name}()`);
  }
}

function attr(element: SvgNode, name: string, fallback = "0"): number {
  return Number(element.getAttribute(name) ?? fallback);
}

function ellipseD(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

/**
 * Converts a basic SVG shape element into an equivalent path `d` string, in
 * the element's own local coordinate space (i.e. before its `transform`
 * attribute, if any, is applied).
 */
function shapeToPathD(element: SvgNode): string {
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case "path":
      return element.getAttribute("d") ?? "";

    case "rect": {
      if (attr(element, "rx") !== 0 || attr(element, "ry") !== 0) {
        throw new Error(
          `<rect id="${element.getAttribute("id")}"> has rounded corners (rx/ry), which is not supported`,
        );
      }
      const x = attr(element, "x");
      const y = attr(element, "y");
      const width = attr(element, "width");
      const height = attr(element, "height");
      return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
    }

    case "circle": {
      const r = attr(element, "r");
      return ellipseD(attr(element, "cx"), attr(element, "cy"), r, r);
    }

    case "ellipse":
      return ellipseD(
        attr(element, "cx"),
        attr(element, "cy"),
        attr(element, "rx"),
        attr(element, "ry"),
      );

    case "polygon":
    case "polyline": {
      const points = (element.getAttribute("points") ?? "")
        .trim()
        .split(/\s+/)
        .filter((p) => p.length > 0);
      if (points.length === 0) {
        throw new Error(
          `<${tag} id="${element.getAttribute("id")}"> has no points`,
        );
      }
      const [first, ...rest] = points;
      const [fx, fy] = first.split(",");
      const d = [`M ${fx} ${fy}`];
      for (const point of rest) {
        const [x, y] = point.split(",");
        d.push(`L ${x} ${y}`);
      }
      d.push("Z");
      return d.join(" ");
    }

    default:
      throw new Error(
        `Unsupported SVG element <${tag} id="${element.getAttribute("id")}">; expected <path>, <rect>, <circle>, <ellipse>, <polygon>, <polyline>, or <g>`,
      );
  }
}

interface Shape {
  d: string;
  matrix: Matrix;
}

/**
 * Recursively collects the drawable shapes under `element` (itself included),
 * combining each shape's own `transform` (and, for shapes nested in `<g>`
 * elements, every ancestor's `transform` up to but not including `element`'s
 * parent chain outside of it) with `inheritedMatrix`.
 */
function collectShapes(element: SvgNode, inheritedMatrix: Matrix): Shape[] {
  const localMatrix = parseTransform(element.getAttribute("transform"));
  const combined = multiplyMatrices(inheritedMatrix, localMatrix);

  if (element.tagName.toLowerCase() === "g") {
    const shapes: Shape[] = [];
    for (const child of Array.from(element.children)) {
      shapes.push(...collectShapes(child, combined));
    }
    return shapes;
  }

  return [{ d: shapeToPathD(element), matrix: combined }];
}

/** Bakes `matrix` into `d`, producing an absolute path string with no transform left implicit. */
function bakeMatrix(d: string, matrix: Matrix): string {
  return new SVGPathData(d)
    .transform(SVGPathDataTransformer.MATRIX(...matrix))
    .toAbs()
    .encode();
}

function findById(document: SvgDocument, id: string): SvgNode {
  const matches = Array.from(document.querySelectorAll(`[id="${id}"]`));

  if (matches.length === 0) {
    throw new Error(`no element with id "${id}" found`);
  }
  if (matches.length > 1) {
    throw new Error(
      `id "${id}" is not unique (matches ${matches.length} elements)`,
    );
  }
  return matches[0];
}

function ancestorMatrix(element: SvgNode): Matrix {
  const matrices: Matrix[] = [];
  let node = element.parentElement;
  while (node && node.tagName.toLowerCase() !== "svg") {
    matrices.unshift(parseTransform(node.getAttribute("transform")));
    node = node.parentElement;
  }
  return matrices.reduce(multiplyMatrices, IDENTITY_MATRIX);
}

export function parseSvg(svgSource: string): SvgDocument {
  return new DOMParser().parseFromString(svgSource, "image/svg+xml");
}

/**
 * Resolves the SVG element identified by `id` in `document` into a plain
 * SVG path `d` string, in the root `<svg>`'s coordinate space, with the
 * element's own transform and all of its ancestors' transforms baked in.
 *
 * Supports `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`,
 * `<polyline>`, and `<g>` (whose descendants each become a sub-path).
 */
export function resolveAreaRefIn(document: SvgDocument, id: string): string {
  const element = findById(document, id);

  const shapes = collectShapes(element, ancestorMatrix(element));
  if (shapes.length === 0) {
    throw new Error(
      `id "${id}" refers to an empty <g> with no drawable shapes`,
    );
  }

  return shapes.map((shape) => bakeMatrix(shape.d, shape.matrix)).join(" ");
}

/** Convenience wrapper for `resolveAreaRefIn` when the document hasn't already been parsed. */
export function resolveAreaRef(svgSource: string, id: string): string {
  return resolveAreaRefIn(parseSvg(svgSource), id);
}
