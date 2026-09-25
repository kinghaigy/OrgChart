import { store } from '../state/store';
import type { OrgChartState } from '../types';

export function exportJson() {
  const state = store.getState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orgchart-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJsonFile(file: File): Promise<void> {
  return file.text().then((text) => {
    const parsed = JSON.parse(text) as OrgChartState;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.roles) || !Array.isArray(parsed.people) || !Array.isArray(parsed.responsibilities)) {
      throw new Error('Invalid org chart file');
    }
    if (!parsed.organisation) {
      parsed.organisation = { name: 'My Organisation', trackedResponsibilityIds: [] };
    }
    store.replaceState(parsed);
  });
}
