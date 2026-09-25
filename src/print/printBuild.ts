import { store } from '../state/store';
import { computeLayout } from '../chart/layout';
import { getPersonResponsibilities, getRolesForPerson } from '../utils/personResponsibilities';

// Usable print area in CSS px, sized for A4/Letter landscape with ~12mm margins (see print.css @page rule).
const PRINT_PAGE_WIDTH = 950;
const PRINT_PAGE_HEIGHT = 680;

/** Rebuilds the hidden #print-root with a one-page, fit-to-page chart followed by a per-person responsibilities list. */
export function buildPrintView() {
  const printRoot = document.getElementById('print-root');
  const canvasEl = document.getElementById('canvas');
  if (!printRoot || !canvasEl) return;

  printRoot.innerHTML = '';

  const state = store.getState();
  const { contentWidth, contentHeight } = computeLayout(state.roles);
  // Shrink to fit the page if needed, but never blow small charts up past their natural size.
  const scale = Math.min(PRINT_PAGE_WIDTH / contentWidth, PRINT_PAGE_HEIGHT / contentHeight, 1);

  const chartPageOuter = document.createElement('div');
  chartPageOuter.className = 'print-chart-page';

  const chartPage = document.createElement('div');
  chartPage.className = 'print-chart-box';
  chartPage.style.width = `${contentWidth * scale}px`;
  chartPage.style.height = `${contentHeight * scale}px`;

  const chartClone = canvasEl.cloneNode(true) as HTMLElement;
  chartClone.removeAttribute('id');
  chartClone.className = 'print-chart-clone';
  chartClone.style.transform = `scale(${scale})`;
  chartClone.style.transformOrigin = 'top left';
  chartPage.appendChild(chartClone);
  chartPageOuter.appendChild(chartPage);
  printRoot.appendChild(chartPageOuter);

  const peoplePage = document.createElement('div');
  peoplePage.className = 'print-people-page';

  const heading = document.createElement('h1');
  heading.textContent = 'People & Responsibilities';
  peoplePage.appendChild(heading);

  if (state.people.length === 0) {
    const empty = document.createElement('p');
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
    rolesLine.textContent = roles.length > 0 ? roles.map((r) => r.title).join(', ') : 'No roles assigned';
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
