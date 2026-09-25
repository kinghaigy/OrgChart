import { store } from '../state/store';

const STORAGE_KEY = 'orgchart:viewport:v1';
const MAX_ZOOM = 1;
const MIN_ZOOM = 0.05;
const SNAP_THRESHOLD = 0.05;
const VIEW_PADDING = 24;

type ViewState = {
  zoom: number;
  x: number;
  y: number;
};

function clampZoom(zoom: number): number {
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  return clamped >= 1 - SNAP_THRESHOLD ? MAX_ZOOM : clamped;
}

function loadViewState(): ViewState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<ViewState>;
    if (![parsed.zoom, parsed.x, parsed.y].every(Number.isFinite)) return null;
    const zoom = clampZoom(parsed.zoom!);
    return {
      zoom,
      x: zoom === 1 ? Math.round(parsed.x!) : parsed.x!,
      y: zoom === 1 ? Math.round(parsed.y!) : parsed.y!,
    };
  } catch {
    return null;
  }
}

export function createViewportController(wrapperEl: HTMLElement, canvasEl: HTMLElement) {
  let view: ViewState = loadViewState() ?? { zoom: MAX_ZOOM, x: 0, y: VIEW_PADDING };
  let rawZoom = view.zoom;
  let hasSavedView = localStorage.getItem(STORAGE_KEY) !== null;

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  }

  function apply() {
    canvasEl.dataset.zoom = String(view.zoom);
    if (view.zoom === 1) {
      canvasEl.style.transform = `translate(${Math.round(view.x)}px, ${Math.round(view.y)}px)`;
    } else {
      canvasEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
    }
  }

  function centerAtZoom(zoom: number) {
    const width = canvasEl.offsetWidth * zoom;
    const height = canvasEl.offsetHeight * zoom;
    const rawX = (wrapperEl.clientWidth - width) / 2;
    const rawY = height <= wrapperEl.clientHeight ? (wrapperEl.clientHeight - height) / 2 : VIEW_PADDING;
    view = {
      zoom,
      x: zoom === 1 ? Math.round(rawX) : rawX,
      y: zoom === 1 ? Math.round(rawY) : rawY,
    };
    rawZoom = zoom;
    persist();
    apply();
  }

  function resetView() {
    hasSavedView = true;
    rawZoom = MAX_ZOOM;
    centerAtZoom(MAX_ZOOM);
  }

  function fitAll() {
    const availableWidth = Math.max(1, wrapperEl.clientWidth - VIEW_PADDING * 2);
    const availableHeight = Math.max(1, wrapperEl.clientHeight - VIEW_PADDING * 2);
    const zoom = clampZoom(
      Math.min(MAX_ZOOM, availableWidth / canvasEl.offsetWidth, availableHeight / canvasEl.offsetHeight),
    );
    hasSavedView = true;
    centerAtZoom(zoom);
  }

  function zoomAt(clientX: number, clientY: number, requestedZoom: number) {
    rawZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requestedZoom));
    const nextZoom = rawZoom >= 1 - SNAP_THRESHOLD ? MAX_ZOOM : rawZoom;
    if (nextZoom === view.zoom && (nextZoom === MAX_ZOOM || nextZoom === MIN_ZOOM)) return;

    const bounds = wrapperEl.getBoundingClientRect();
    const pointerX = clientX - bounds.left;
    const pointerY = clientY - bounds.top;
    const contentX = (pointerX - view.x) / view.zoom;
    const contentY = (pointerY - view.y) / view.zoom;

    let nextX = pointerX - contentX * nextZoom;
    let nextY = pointerY - contentY * nextZoom;
    if (nextZoom === 1) {
      nextX = Math.round(nextX);
      nextY = Math.round(nextY);
    }

    view = {
      zoom: nextZoom,
      x: nextX,
      y: nextY,
    };
    hasSavedView = true;
    persist();
    apply();
  }

  wrapperEl.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomAt(event.clientX, event.clientY, rawZoom * factor);
    },
    { passive: false },
  );

  wrapperEl.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.role-node, .org-node')) return;

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = view.x;
    const originY = view.y;
    let moved = false;
    try {
      wrapperEl.setPointerCapture(event.pointerId);
    } catch {
      // Window listeners still keep panning functional when pointer capture is unavailable.
    }
    wrapperEl.classList.add('panning');

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 4) moved = true;
      if (!moved) return;
      view = { ...view, x: originX + dx, y: originY + dy };
      apply();
    }

    function onUp(upEvent: PointerEvent) {
      if (wrapperEl.hasPointerCapture(upEvent.pointerId)) {
        wrapperEl.releasePointerCapture(upEvent.pointerId);
      }
      wrapperEl.classList.remove('panning');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        if (view.zoom === 1) {
          view.x = Math.round(view.x);
          view.y = Math.round(view.y);
          apply();
        }
        hasSavedView = true;
        persist();
      } else {
        store.selectRole(null);
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  if (hasSavedView) apply();
  else resetView();

  return {
    applyAfterRender() {
      if (hasSavedView) apply();
      else resetView();
    },
    resetView,
    fitAll,
  };
}
