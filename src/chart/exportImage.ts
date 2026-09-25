import type { OrgChartState } from '../types';
import { computeLayout, computeNodeWidth, NODE_HEIGHT, V_GAP } from './layout';

const PADDING = 40;
const ORG_OFFSET = NODE_HEIGHT + V_GAP;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function truncateToWidth(text: string, maxWidth: number): string {
  // Approximate 8.5px per character for 15px system-ui bold text
  const maxChars = Math.floor(maxWidth / 8.8);
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)).trim() + '…';
}

export function generateChartSvgString(state: OrgChartState): {
  svgString: string;
  width: number;
  height: number;
} {
  const { rects, contentWidth, contentHeight } = computeLayout(state.roles);
  const totalWidth = contentWidth + PADDING * 2;
  const totalHeight = contentHeight + PADDING * 2 + ORG_OFFSET;
  const byId = new Map(state.roles.map((r) => [r.id, r]));

  const lines: string[] = [];

  // 1. Role-to-parent connectors
  for (const role of state.roles) {
    if (!role.parentId || !byId.has(role.parentId)) continue;
    const childRect = rects.get(role.id);
    const parentRect = rects.get(role.parentId);
    if (!childRect || !parentRect) continue;
    const x1 = parentRect.x + parentRect.width / 2 + PADDING;
    const y1 = parentRect.y + parentRect.height + PADDING + ORG_OFFSET;
    const x2 = childRect.x + childRect.width / 2 + PADDING;
    const y2 = childRect.y + PADDING + ORG_OFFSET;
    const midY = (y1 + y2) / 2;
    lines.push(
      `<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>`,
    );
  }

  // 2. Organisation-to-root connectors
  const orgWidth = computeNodeWidth(state.organisation.name);
  const orgX = PADDING + contentWidth / 2 - orgWidth / 2;
  const orgY = PADDING;
  const roots = state.roles.filter((r) => !r.parentId || !byId.has(r.parentId));
  for (const root of roots) {
    const rootRect = rects.get(root.id);
    if (!rootRect) continue;
    const x1 = orgX + orgWidth / 2;
    const y1 = orgY + NODE_HEIGHT;
    const x2 = rootRect.x + rootRect.width / 2 + PADDING;
    const y2 = rootRect.y + PADDING + ORG_OFFSET;
    const midY = (y1 + y2) / 2;
    lines.push(
      `<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>`,
    );
  }

  // 3. Organisation node
  const orgTitleText = escapeXml(truncateToWidth(state.organisation.name, orgWidth - 20));
  const orgNodeSvg = `
  <g transform="translate(${orgX}, ${orgY})">
    <rect width="${orgWidth}" height="${NODE_HEIGHT}" rx="8" fill="#1f2937" stroke="#1f2937" stroke-width="2"/>
    <text x="${orgWidth / 2}" y="${NODE_HEIGHT / 2}" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central">${orgTitleText}</text>
  </g>`;

  // 4. Role nodes
  const roleNodesSvg: string[] = [];
  for (const role of state.roles) {
    const rect = rects.get(role.id);
    if (!rect) continue;
    const x = rect.x + PADDING;
    const y = rect.y + PADDING + ORG_OFFSET;
    const titleText = escapeXml(truncateToWidth(role.title, rect.width - 20));
    const person = role.personId ? state.people.find((p) => p.id === role.personId) : null;
    const badgeW = rect.width - 16;
    const badgeX = 8;
    const badgeY = 44;
    const badgeH = 22;

    const personSvg = person
      ? `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="4" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
         <text x="${rect.width / 2}" y="${badgeY + badgeH / 2}" fill="#065f46" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="500" text-anchor="middle" dominant-baseline="central">${escapeXml(truncateToWidth(person.name, badgeW - 10))}</text>`
      : `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="4" fill="#f3f4f6" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 2"/>
         <text x="${rect.width / 2}" y="${badgeY + badgeH / 2}" fill="#6b7280" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="13" text-anchor="middle" dominant-baseline="central">Vacant</text>`;

    roleNodesSvg.push(`
  <g transform="translate(${x}, ${y})">
    <rect width="${rect.width}" height="${NODE_HEIGHT}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="${rect.width / 2}" y="24" fill="#1a1a1a" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central">${titleText}</text>
    ${personSvg}
  </g>`);
  }

  const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff"/>
  ${lines.join('\n  ')}
  ${orgNodeSvg}
  ${roleNodesSvg.join('\n')}
</svg>`;

  return { svgString, width: totalWidth, height: totalHeight };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getSafeFilename(name: string, ext: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'org-chart';
  const date = new Date().toISOString().slice(0, 10);
  return `${clean}-${date}.${ext}`;
}

export function exportChartAsSvg(state: OrgChartState): void {
  const { svgString } = generateChartSvgString(state);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, getSafeFilename(state.organisation.name, 'svg'));
}

export async function exportChartAsPng(state: OrgChartState, scale = 2): Promise<void> {
  const { svgString, width, height } = generateChartSvgString(state);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to render SVG to image'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        downloadBlob(pngBlob, getSafeFilename(state.organisation.name, 'png'));
        resolve();
      } else {
        reject(new Error('Failed to encode PNG'));
      }
    }, 'image/png');
  });
}
