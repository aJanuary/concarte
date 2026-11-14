import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";

// Tolerance for curve flatness to determine sampling density
// Lower values yield more points
const curveTolerance = 1.0;

/**
 * Adaptively samples a cubic bezier curve based on its flatness.
 * Uses recursive subdivision to add more points where the curve is sharper.
 */
function sampleCubicBezier(
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  tolerance: number = 0.5,
  depth: number = 0,
): [number, number][] {
  if (depth >= 12) {
    return [[p3x, p3y]];
  }

  // Calculate flatness using distance from control points to the line p0-p3
  // This measures how much the curve deviates from a straight line
  const ux = 3 * p1x - 2 * p0x - p3x;
  const uy = 3 * p1y - 2 * p0y - p3y;
  const vx = 3 * p2x - 2 * p3x - p0x;
  const vy = 3 * p2y - 2 * p3y - p0y;

  const flatness = Math.max(ux * ux + uy * uy, vx * vx + vy * vy);

  // If curve is flat enough, just use the endpoint
  if (flatness < tolerance) {
    return [[p3x, p3y]];
  }

  // Subdivide the curve using de Casteljau's algorithm
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

  const p0123x = (p012x + p123x) / 2;
  const p0123y = (p012y + p123y) / 2;

  // Recursively sample both halves
  const left = sampleCubicBezier(
    p0x,
    p0y,
    p01x,
    p01y,
    p012x,
    p012y,
    p0123x,
    p0123y,
    tolerance,
    depth + 1,
  );
  const right = sampleCubicBezier(
    p0123x,
    p0123y,
    p123x,
    p123y,
    p23x,
    p23y,
    p3x,
    p3y,
    tolerance,
    depth + 1,
  );

  return [...left, ...right];
}

/**
 * Convert an SVG path into an array of rings (sub-paths).
 *
 * Each ring is a closed sub-path delimited by M...Z in the SVG path.
 * Multiple M commands produce multiple rings, supporting disconnected shapes.
 *
 * @param path - SVG path string
 * @returns Array of rings, where each ring is an array of [x, y] coordinate pairs
 */
export function parseSVGPath(path: string): [number, number][][] {
  const pathData = new SVGPathData(path)
    .toAbs()
    .transform(SVGPathDataTransformer.QT_TO_C())
    .transform(SVGPathDataTransformer.A_TO_C())
    .normalizeHVZ();

  const rings: [number, number][][] = [];
  let currentRing: [number, number][] = [];
  let currentX = 0;
  let currentY = 0;

  pathData.commands.forEach((command) => {
    switch (command.type) {
      case SVGPathData.MOVE_TO:
        if (currentRing.length > 0) {
          rings.push(currentRing);
          currentRing = [];
        }
        currentRing.push([command.x, command.y]);
        currentX = command.x;
        currentY = command.y;
        break;

      case SVGPathData.LINE_TO:
        currentRing.push([command.x, command.y]);
        currentX = command.x;
        currentY = command.y;
        break;

      case SVGPathData.CURVE_TO:
        const samples = sampleCubicBezier(
          currentX,
          currentY,
          command.x1,
          command.y1,
          command.x2,
          command.y2,
          command.x,
          command.y,
          curveTolerance,
        );
        currentRing.push(...samples);
        currentX = command.x;
        currentY = command.y;
        break;

      case SVGPathData.CLOSE_PATH:
        // Close path command doesn't add a new point
        break;
    }
  });

  if (currentRing.length > 0) {
    rings.push(currentRing);
  }

  return rings;
}
