import { SHAPE_TAGS, type SvgTreeNode } from "../../shared/tree";

type ElementLike = {
  tagName: string;
  getAttribute(name: string): string | null;
  children: ArrayLike<ElementLike>;
};

export function buildTree(svg: ElementLike): SvgTreeNode[] {
  const build = (parent: ElementLike, path: string): SvgTreeNode[] => {
    const nodes: SvgTreeNode[] = [];
    Array.from(parent.children).forEach((el, index) => {
      const tag = el.tagName.toLowerCase();
      const childPath = `${path}/${index}`;
      const id = el.getAttribute("id") || null;
      if (SHAPE_TAGS.has(tag)) {
        nodes.push({
          key: id ?? childPath,
          id,
          tag,
          isGroup: false,
          children: [],
        });
      } else if (tag === "g" || tag === "a" || tag === "switch") {
        const children = build(el, childPath);
        if (children.length > 0) {
          nodes.push({
            key: id ?? childPath,
            id,
            tag: "g",
            isGroup: true,
            children,
          });
        }
      }
      // Anything else (text, images, <use>, defs...) can't be a room.
    });
    return nodes;
  };
  return build(svg, "");
}

export type ParsedSvg = {
  markup: string;
  width: number;
  height: number;
  tree: SvgTreeNode[];
};

function dimension(value: string | null): number | undefined {
  const n = value ? parseFloat(value) : NaN;
  return Number.isFinite(n) && n > 0 && !value!.trim().endsWith("%")
    ? n
    : undefined;
}

export function parseSvg(text: string): ParsedSvg {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) {
    throw new Error("Not a valid SVG");
  }

  // The SVG is rendered inline into the editor, so don't let it run code.
  svg.querySelectorAll("script").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    }
  });

  const viewBox = svg
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasViewBox = viewBox?.length === 4 && viewBox.every(Number.isFinite);
  const width =
    dimension(svg.getAttribute("width")) ?? (hasViewBox ? viewBox![2] : 1000);
  const height =
    dimension(svg.getAttribute("height")) ?? (hasViewBox ? viewBox![3] : 1000);
  if (!hasViewBox) {
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  return {
    markup: new XMLSerializer().serializeToString(svg),
    width,
    height,
    tree: buildTree(svg),
  };
}
