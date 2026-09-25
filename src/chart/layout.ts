import type { Role } from '../types';

export const NODE_MIN_WIDTH = 170;
export const NODE_MAX_WIDTH = 280;
export const NODE_HEIGHT = 76;
export const H_GAP = 24;
export const V_GAP = 60;

const TITLE_FONT = "600 15px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const TITLE_HORIZONTAL_PADDING = 24;
let measureCanvas: HTMLCanvasElement | null = null;

function measureTextWidth(text: string): number {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = TITLE_FONT;
  return ctx.measureText(text).width;
}

/** Node width grows to fit the title (up to NODE_MAX_WIDTH) so titles aren't clipped unnecessarily; long titles beyond the cap still ellipsis. */
export function computeNodeWidth(title: string): number {
  const fitted = Math.ceil(measureTextWidth(title)) + TITLE_HORIZONTAL_PADDING;
  return Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, fitted));
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  rects: Map<string, LayoutRect>;
  contentWidth: number;
  contentHeight: number;
}

/** Fixed-spacing tree layout: subtree widths computed bottom-up, then x/y assigned top-down. */
export function computeLayout(roles: Role[]): LayoutResult {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const childrenOf = new Map<string | null, Role[]>();
  for (const r of roles) {
    const key = r.parentId && byId.has(r.parentId) ? r.parentId : null;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(r);
  }

  const nodeWidth = new Map<string, number>();
  for (const r of roles) nodeWidth.set(r.id, computeNodeWidth(r.title));

  const subtreeWidth = new Map<string, number>();
  function computeWidth(id: string): number {
    const children = childrenOf.get(id) ?? [];
    const own = nodeWidth.get(id) ?? NODE_MIN_WIDTH;
    if (children.length === 0) {
      subtreeWidth.set(id, own);
      return own;
    }
    const childrenTotal = children.reduce((sum, c) => sum + computeWidth(c.id), 0) + H_GAP * (children.length - 1);
    const width = Math.max(own, childrenTotal);
    subtreeWidth.set(id, width);
    return width;
  }

  const roots = childrenOf.get(null) ?? [];
  for (const root of roots) computeWidth(root.id);

  const rects = new Map<string, LayoutRect>();
  function place(id: string, leftEdge: number, depth: number) {
    const subWidth = subtreeWidth.get(id) ?? NODE_MIN_WIDTH;
    const own = nodeWidth.get(id) ?? NODE_MIN_WIDTH;
    const x = leftEdge + subWidth / 2 - own / 2;
    const y = depth * (NODE_HEIGHT + V_GAP);
    rects.set(id, { x, y, width: own, height: NODE_HEIGHT });

    const children = childrenOf.get(id) ?? [];
    const childrenTotal =
      children.reduce((s, c) => s + (subtreeWidth.get(c.id) ?? NODE_MIN_WIDTH), 0) + H_GAP * (children.length - 1);
    let childLeft = leftEdge + (subWidth - childrenTotal) / 2;
    for (const child of children) {
      const childWidth = subtreeWidth.get(child.id) ?? NODE_MIN_WIDTH;
      place(child.id, childLeft, depth + 1);
      childLeft += childWidth + H_GAP;
    }
  }

  let cursor = 0;
  for (const root of roots) {
    const width = subtreeWidth.get(root.id) ?? NODE_MIN_WIDTH;
    place(root.id, cursor, 0);
    cursor += width + H_GAP * 2;
  }

  let contentWidth = 0;
  let contentHeight = 0;
  for (const rect of rects.values()) {
    contentWidth = Math.max(contentWidth, rect.x + rect.width);
    contentHeight = Math.max(contentHeight, rect.y + rect.height);
  }

  return { rects, contentWidth, contentHeight };
}
