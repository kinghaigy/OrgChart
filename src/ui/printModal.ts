import type { PrintMode } from '../print/printBuild';

export function showPrintModal(onConfirm: (mode: PrintMode) => void): void {
  if (document.querySelector('.print-options-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay print-options-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box print-options-box';

  box.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">Print Options</h3>
      <p class="modal-subtitle">Choose what you would like to print.</p>
    </div>

    <form class="print-options-form">
      <div class="dialog-radio-group">
        <label class="dialog-radio-option">
          <input type="radio" name="print-mode" value="people-only" checked />
          <div class="dialog-radio-text">
            <strong>Roles & Responsibilities by Person</strong>
            <p>Clean multi-page document listing each team member, their roles, and their deduplicated responsibilities. Formatted for standard portrait or landscape paper.</p>
          </div>
        </label>

        <label class="dialog-radio-option">
          <input type="radio" name="print-mode" value="chart-only" />
          <div class="dialog-radio-text">
            <strong>Organisation Chart only</strong>
            <p>The visual org chart scaled vector-crisp to fit on one page. (Tip: select Landscape in your browser's print preview for best results).</p>
          </div>
        </label>

        <label class="dialog-radio-option">
          <input type="radio" name="print-mode" value="both" />
          <div class="dialog-radio-text">
            <strong>Both (Chart on Page 1, People & Responsibilities after)</strong>
            <p>Full org chart on the first page, followed by detailed personnel breakdowns.</p>
          </div>
        </label>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel">Cancel</button>
        <button type="submit" class="btn-confirm">Print</button>
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

  const form = box.querySelector<HTMLFormElement>('.print-options-form');
  const cancelBtn = box.querySelector<HTMLButtonElement>('.btn-cancel');

  cancelBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const mode = (formData.get('print-mode') as PrintMode) || 'people-only';
    close();
    onConfirm(mode);
  });

  document.addEventListener('keydown', handleKeyDown);
}
