import { store } from '../state/store';
import { exportChartAsPng, exportChartAsSvg } from '../chart/exportImage';

export function showExportImageModal(): void {
  if (document.querySelector('.export-image-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay export-image-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box export-image-box';

  box.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">Export Canvas as Image</h3>
      <p class="modal-subtitle">Save the complete organisation chart as a high-resolution or vector image.</p>
    </div>

    <form class="export-image-form">
      <div class="dialog-radio-group">
        <label class="dialog-radio-option">
          <input type="radio" name="image-format" value="png-2x" checked />
          <div class="dialog-radio-text">
            <strong>High-Resolution PNG (2x Retina)</strong>
            <p>Crisp 200% resolution bitmap image. Perfect for slides, documents, emails, and presentations.</p>
          </div>
        </label>

        <label class="dialog-radio-option">
          <input type="radio" name="image-format" value="png-3x" />
          <div class="dialog-radio-text">
            <strong>Ultra High-Resolution PNG (3x Print Quality)</strong>
            <p>Maximum pixel density bitmap. Ideal for large displays, high-DPI desktop wallpapers, or posters.</p>
          </div>
        </label>

        <label class="dialog-radio-option">
          <input type="radio" name="image-format" value="svg" />
          <div class="dialog-radio-text">
            <strong>Scalable Vector Graphic (SVG)</strong>
            <p>Pure vector file. Infinitely zoomable without pixelation, easily opened in Illustrator, Inkscape, or web browsers.</p>
          </div>
        </label>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel">Cancel</button>
        <button type="submit" class="btn-confirm">Download Image</button>
      </div>
    </form>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  const form = box.querySelector<HTMLFormElement>('.export-image-form');
  const cancelBtn = box.querySelector<HTMLButtonElement>('.btn-cancel');

  cancelBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const format = formData.get('image-format');
    const submitBtn = box.querySelector<HTMLButtonElement>('.btn-confirm');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';
    }

    try {
      const state = store.getState();
      if (format === 'svg') {
        exportChartAsSvg(state);
      } else if (format === 'png-3x') {
        await exportChartAsPng(state, 3);
      } else {
        await exportChartAsPng(state, 2);
      }
      close();
    } catch (err) {
      alert(`Failed to export image: ${err instanceof Error ? err.message : String(err)}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Download Image';
      }
    }
  });

  document.addEventListener('keydown', handleKeyDown);
}
