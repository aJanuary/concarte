import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";

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
 * needs. Defined structurally so that both a browser's document and
 * `linkedom`'s satisfy it: the editor resolves shapes in the browser with the
 * same code the build runs under Node.
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

/** A `<rect>` corner radius attribute; `undefined` when absent or `auto`. */
function cornerRadius(element: SvgNode, name: "rx" | "ry"): number | undefined {
  const raw = element.getAttribute(name)?.trim();
  if (raw === undefined || raw === "" || raw === "auto") {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `<rect id="${element.getAttribute("id")}"> has ${name}="${raw}"; corner radii must be a non-negative number`,
    );
  }
  return value;
}

/** Follows the SVG 2 rules for resolving `rx`/`ry` into the drawn radii. */
function rectD(element: SvgNode): string {
  const x = attr(element, "x");
  const y = attr(element, "y");
  const width = attr(element, "width");
  const height = attr(element, "height");

  const rxAttr = cornerRadius(element, "rx");
  const ryAttr = cornerRadius(element, "ry");
  const rx = Math.min(rxAttr ?? ryAttr ?? 0, width / 2);
  const ry = Math.min(ryAttr ?? rxAttr ?? 0, height / 2);

  if (rx === 0 || ry === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }

  const arc = (endX: number, endY: number) =>
    `A ${rx} ${ry} 0 0 1 ${endX} ${endY}`;
  // A capped radius leaves no straight edge between corners; drawing the
  // zero-length edge anyway would repeat a point in the ring.
  const hasHorizontalEdge = rx < width / 2;
  const hasVerticalEdge = ry < height / 2;
  return [
    `M ${x + rx} ${y}`,
    hasHorizontalEdge ? `H ${x + width - rx}` : "",
    arc(x + width, y + ry),
    hasVerticalEdge ? `V ${y + height - ry}` : "",
    arc(x + width - rx, y + height),
    hasHorizontalEdge ? `H ${x + rx}` : "",
    arc(x, y + height - ry),
    hasVerticalEdge ? `V ${y + ry}` : "",
    arc(x + rx, y),
    "Z",
  ]
    .filter((command) => command !== "")
    .join(" ");
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

    case "rect":
      return rectD(element);

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

/** A closed outline, as [x, y] points in the map SVG's coordinate space. */
export type Ring = [number, number][];

// In SVG units; at the zoom levels a map is viewed at, well under a pixel.
const CURVE_TOLERANCE = 1.0;

/**
 * Adaptively samples a cubic bézier, subdividing more where it bends more.
 * Returns the points after the start point, ending at the end point.
 */
function sampleCubic(
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  depth = 0,
): [number, number][] {
  // Distance of the control points from the chord, squared and scaled.
  const ux = 3 * p1x - 2 * p0x - p3x;
  const uy = 3 * p1y - 2 * p0y - p3y;
  const vx = 3 * p2x - 2 * p3x - p0x;
  const vy = 3 * p2y - 2 * p3y - p0y;
  const flatness = Math.max(ux * ux + uy * uy, vx * vx + vy * vy);
  if (depth >= 12 || flatness < CURVE_TOLERANCE) {
    return [[p3x, p3y]];
  }

  // de Casteljau split at t = 0.5
  const p01x = (p0x + p1x) / 2;
  const p01y = (p0y + p1y) / 2;
  const p12x = (p1x + p2x) / 2;
  const p12y = (p1y + p2y) / 2;
  const p23x = (p2x + p3x) / 2;
  const p23y = (p2y + p3y) / 2;
  const p012x = (p01x + p12x) / 2;
  const p012y = (p01y + p12y) / 2;
  const p123x = (p12x + p23x) / 2;
  const p123y = (p12y + p23y) / 2;
  const midx = (p012x + p123x) / 2;
  const midy = (p012y + p123y) / 2;

  return [
    ...sampleCubic(p0x, p0y, p01x, p01y, p012x, p012y, midx, midy, depth + 1),
    ...sampleCubic(midx, midy, p123x, p123y, p23x, p23y, p3x, p3y, depth + 1),
  ];
}

/**
 * Turns path `d`, transformed by `matrix`, into rings: one per sub-path,
 * with curves flattened into points.
 */
function toRings(d: string, matrix: Matrix): Ring[] {
  const commands = new SVGPathData(d)
    .transform(SVGPathDataTransformer.MATRIX(...matrix))
    .toAbs()
    .transform(SVGPathDataTransformer.QT_TO_C())
    .transform(SVGPathDataTransformer.A_TO_C())
    .normalizeHVZ().commands;

  const rings: Ring[] = [];
  let ring: Ring = [];
  let x = 0;
  let y = 0;
  for (const command of commands) {
    switch (command.type) {
      case SVGPathData.MOVE_TO:
        if (ring.length > 0) {
          rings.push(ring);
        }
        ring = [[command.x, command.y]];
        break;
      case SVGPathData.LINE_TO:
        ring.push([command.x, command.y]);
        break;
      case SVGPathData.CURVE_TO:
        ring.push(
          ...sampleCubic(
            x,
            y,
            command.x1,
            command.y1,
            command.x2,
            command.y2,
            command.x,
            command.y,
          ),
        );
        break;
    }
    if ("x" in command && "y" in command) {
      x = command.x;
      y = command.y;
    }
  }
  if (ring.length > 0) {
    rings.push(ring);
  }
  return rings;
}

/**
 * Resolves the SVG element identified by `id` in `document` into rings in
 * the root `<svg>`'s coordinate space, with the element's own transform and
 * all of its ancestors' transforms applied.
 *
 * Supports `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`,
 * `<polyline>`, and `<g>` (whose descendants each become one or more rings).
 */
export function resolveShape(document: SvgDocument, id: string): Ring[] {
  const element = findById(document, id);

  const shapes = collectShapes(element, ancestorMatrix(element));
  if (shapes.length === 0) {
    throw new Error(
      `id "${id}" refers to an empty <g> with no drawable shapes`,
    );
  }

  return shapes.flatMap((shape) => toRings(shape.d, shape.matrix));
}
