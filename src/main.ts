import './style.css';
import { store } from './state/store';
import { renderChart } from './chart/ChartRenderer';
import { renderRolePanel, promptDeleteRole } from './panel/RolePanel';
import { renderOrganisationPanel } from './panel/OrganisationPanel';
import { renderResponsibilityLibraryPanel } from './panel/ResponsibilityLibraryPanel';
import { renderPeoplePanel } from './panel/PeoplePanel';
import { exportJson, importJsonFile } from './panel/ExportPanel';
import { promptModal } from './ui/modal';
import { buildPrintView } from './print/printBuild';
import { createViewportController } from './chart/viewport';
import { hasSeenOnboarding, showOnboardingModal } from './ui/onboarding';
import { showPrintModal } from './ui/printModal';
import { showExportImageModal } from './ui/exportImageModal';

const canvasEl = document.getElementById('canvas') as HTMLElement;
const canvasWrapperEl = document.getElementById('canvas-wrapper') as HTMLElement;
const tabRole = document.getElementById('tab-role') as HTMLElement;
const tabResponsibilities = document.getElementById('tab-responsibilities') as HTMLElement;
const tabPeople = document.getElementById('tab-people') as HTMLElement;

function renderAll() {
  renderChart(canvasEl);
  if (store.organisationSelected) renderOrganisationPanel(tabRole);
  else renderRolePanel(tabRole);
  renderResponsibilityLibraryPanel(tabResponsibilities);
  renderPeoplePanel(tabPeople);
}

renderAll();
const viewport = createViewportController(canvasWrapperEl, canvasEl);
store.subscribe(() => {
  renderAll();
  viewport.applyAfterRender();
});

// Tab switching
const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
const tabPanes = document.querySelectorAll<HTMLElement>('.tab-pane');
for (const btn of tabButtons) {
  btn.addEventListener('click', () => {
    for (const b of tabButtons) b.classList.remove('active');
    for (const pane of tabPanes) pane.classList.remove('active');
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
  });
}

// Toolbar actions
document.getElementById('btn-fit-view')?.addEventListener('click', () => viewport.fitAll());
document.getElementById('btn-reset-view')?.addEventListener('click', () => viewport.resetView());
document.getElementById('btn-export-image')?.addEventListener('click', () => showExportImageModal());
document.getElementById('btn-export')?.addEventListener('click', () => exportJson());

const importInput = document.getElementById('import-file-input') as HTMLInputElement;
document.getElementById('btn-import')?.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', () => {
  const file = importInput.files?.[0];
  if (!file) return;
  importJsonFile(file)
    .catch((err) => promptModal(`Failed to import: ${err.message}`))
    .finally(() => {
      importInput.value = '';
    });
});

document.getElementById('btn-print')?.addEventListener('click', () => {
  showPrintModal((mode) => {
    buildPrintView(mode);
    window.print();
  });
});

document.getElementById('btn-help')?.addEventListener('click', () => {
  showOnboardingModal();
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  if (document.querySelector('.modal-overlay')) return;
  const target = e.target as HTMLElement | null;
  const active = document.activeElement as HTMLElement | null;
  if (
    (target && (target.closest('input, textarea, select') || target.isContentEditable)) ||
    (active && (active.closest('input, textarea, select') || active.isContentEditable))
  ) {
    return;
  }
  if (store.selectedRoleId) {
    e.preventDefault();
    promptDeleteRole(store.selectedRoleId);
  }
});

// Show onboarding modal on first load if never dismissed
if (!hasSeenOnboarding()) {
  showOnboardingModal();
}

