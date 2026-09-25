import { store } from '../state/store';
import type { Role } from '../types';

function collectSubtreeIds(roles: Role[], rootId: string): Set<string> {
  const byParent = new Map<string | null, Role[]>();
  for (const r of roles) {
    if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
    byParent.get(r.parentId)!.push(r);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of byParent.get(id) ?? []) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return ids;
}

/** Wires pointer-based drag-to-reparent on a role node; its whole subtree (nodes + connector lines) translates together and snaps onto the target it's dropped on. */
export function makeDraggable(nodeEl: HTMLElement, roleId: string, canvasEl: HTMLElement) {
  nodeEl.addEventListener('pointerdown', (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const zoom = Number(canvasEl.dataset.zoom) || 1;
    const subtreeIds = collectSubtreeIds(store.getState().roles, roleId);
    const subtreeEls = [...subtreeIds]
      .map((id) => canvasEl.querySelector<HTMLElement>(`[data-id="${id}"]`))
      .filter((el): el is HTMLElement => !!el);

    const connectorPaths = [...canvasEl.querySelectorAll<SVGPathElement>('.connector-line')];
    // Lines fully inside the dragged subtree translate as-is; the one line entering it from its (fixed) parent gets its child end redrawn.
    const internalLines = connectorPaths.filter(
      (p) => subtreeIds.has(p.dataset.parentId!) && subtreeIds.has(p.dataset.childId!),
    );
    const entryLine = connectorPaths.find((p) => p.dataset.childId === roleId && !subtreeIds.has(p.dataset.parentId!));

    let dragging = false;
    try {
      nodeEl.setPointerCapture(e.pointerId);
    } catch {
      // Window listeners still keep dragging functional when pointer capture is unavailable.
    }

    function onMove(ev: PointerEvent) {
      const screenDx = ev.clientX - startX;
      const screenDy = ev.clientY - startY;
      if (!dragging && Math.hypot(screenDx, screenDy) > 4) dragging = true;
      if (!dragging) return;
      const dx = screenDx / zoom;
      const dy = screenDy / zoom;
      for (const el of subtreeEls) {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.zIndex = '10';
      }
      for (const line of internalLines) {
        line.style.transform = `translate(${dx}px, ${dy}px)`;
      }
      if (entryLine) {
        const x1 = Number(entryLine.dataset.x1);
        const y1 = Number(entryLine.dataset.y1);
        const x2 = Number(entryLine.dataset.x2) + dx;
        const y2 = Number(entryLine.dataset.y2) + dy;
        const midY = (y1 + y2) / 2;
        entryLine.setAttribute('d', `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
      }
    }

    function onUp(ev: PointerEvent) {
      if (nodeEl.hasPointerCapture(ev.pointerId)) {
        nodeEl.releasePointerCapture(ev.pointerId);
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      let reparented = false;
      if (dragging) {
        const target = findDropTarget(canvasEl, subtreeIds, ev.clientX, ev.clientY);
        if (target === 'organisation') {
          reparented = store.reparentRole(roleId, null);
        } else if (target) {
          reparented = store.reparentRole(roleId, target);
        }
      } else {
        store.selectRole(roleId);
      }

      for (const el of subtreeEls) {
        el.style.transform = '';
        el.style.zIndex = '';
      }
      for (const line of internalLines) {
        line.style.transform = '';
      }
      // If the reparent was rejected (or nothing changed), snap the entry line back to its original shape.
      if (entryLine && !reparented) {
        const x1 = Number(entryLine.dataset.x1);
        const y1 = Number(entryLine.dataset.y1);
        const x2 = Number(entryLine.dataset.x2);
        const y2 = Number(entryLine.dataset.y2);
        const midY = (y1 + y2) / 2;
        entryLine.setAttribute('d', `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

function findDropTarget(
  canvasEl: HTMLElement,
  excludeIds: Set<string>,
  clientX: number,
  clientY: number,
): string | 'organisation' | null {
  const nodes = canvasEl.querySelectorAll<HTMLElement>('.role-node');
  for (const el of nodes) {
    const id = el.dataset.id;
    if (!id || excludeIds.has(id)) continue;
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return id;
    }
  }
  const orgEl = canvasEl.querySelector<HTMLElement>('.org-node');
  if (orgEl) {
    const rect = orgEl.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return 'organisation';
    }
  }
  return null;
}
