import { store } from '../state/store';
import { getPersonResponsibilities, getRolesForPerson } from '../utils/personResponsibilities';
import { generateChartSvgString } from '../chart/exportImage';

export type PrintMode = 'people-only' | 'chart-only' | 'both';

/** Rebuilds the hidden #print-root with user-chosen print content (chart, people list, or both). */
export function buildPrintView(mode: PrintMode = 'people-only') {
  const printRoot = document.getElementById('print-root');
  if (!printRoot) return;

  printRoot.innerHTML = '';
  const state = store.getState();

  // 1. Vector chart page (if selected)
  if (mode === 'chart-only' || mode === 'both') {
    const { svgString } = generateChartSvgString(state);
    const chartPage = document.createElement('div');
    chartPage.className = 'print-chart-page';
    chartPage.innerHTML = svgString;
    printRoot.appendChild(chartPage);
  }

  // 2. People & responsibilities pages (if selected)
  if (mode === 'people-only' || mode === 'both') {
    const peoplePage = document.createElement('div');
    peoplePage.className = 'print-people-page';

    const header = document.createElement('div');
    header.className = 'print-people-header';

    const title = document.createElement('h1');
    title.textContent = `${state.organisation.name} — Roles & Responsibilities`;
    header.appendChild(title);

    const date = document.createElement('p');
    date.className = 'print-date';
    date.textContent = `Generated ${new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    header.appendChild(date);
    peoplePage.appendChild(header);

    if (state.people.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-hint';
      empty.textContent = 'No people have been added yet.';
      peoplePage.appendChild(empty);
    }

    for (const person of state.people) {
      const block = document.createElement('section');
      block.className = 'print-person';

      const name = document.createElement('h2');
      name.textContent = person.name;
      block.appendChild(name);

      const roles = getRolesForPerson(state, person.id);
      const rolesLine = document.createElement('p');
      rolesLine.className = 'print-person-roles';
      rolesLine.textContent =
        roles.length > 0
          ? `Roles: ${roles.map((r) => r.title).join(', ')}`
          : 'No roles assigned';
      block.appendChild(rolesLine);

      const responsibilities = getPersonResponsibilities(state, person.id);
      const responsibilityList = document.createElement('ul');
      for (const responsibility of responsibilities) {
        const li = document.createElement('li');
        li.textContent = responsibility.name;
        responsibilityList.appendChild(li);
      }
      if (responsibilities.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No responsibilities assigned';
        responsibilityList.appendChild(li);
      }
      block.appendChild(responsibilityList);

      peoplePage.appendChild(block);
    }

    printRoot.appendChild(peoplePage);
  }
}
