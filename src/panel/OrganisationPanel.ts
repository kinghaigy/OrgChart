import { store } from '../state/store';

export function renderOrganisationPanel(container: HTMLElement) {
  const state = store.getState();
  container.innerHTML = '';

  const panelTitle = document.createElement('h2');
  panelTitle.className = 'panel-title';
  panelTitle.textContent = 'Organisation';
  container.appendChild(panelTitle);

  const detailsHeading = document.createElement('h3');
  detailsHeading.className = 'section-title';
  detailsHeading.textContent = 'Details';
  container.appendChild(detailsHeading);

  const nameLabel = document.createElement('label');
  nameLabel.className = 'field-label';
  nameLabel.textContent = 'Organisation name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = state.organisation.name;
  nameInput.addEventListener('change', () =>
    store.renameOrganisation(nameInput.value.trim() || state.organisation.name),
  );
  nameLabel.appendChild(nameInput);
  container.appendChild(nameLabel);

  const hint = document.createElement('p');
  hint.className = 'empty-hint';
  hint.textContent =
    'Responsibilities checked here in the Responsibilities Library are required to be covered by some role in the chart. Assigning a responsibility to any role automatically tracks it too; removing it from a role does not stop tracking it.';
  container.appendChild(hint);

  const heading = document.createElement('h3');
  heading.className = 'section-title';
  heading.textContent = 'Tracked responsibilities';
  container.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'assigned-responsibility-list';
  if (state.organisation.trackedResponsibilityIds.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-hint';
    li.textContent = 'None yet — check some off in the Responsibilities Library tab.';
    list.appendChild(li);
  } else {
    const tracked = state.organisation.trackedResponsibilityIds
      .map((id) => state.responsibilities.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

    for (const responsibility of tracked) {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'responsibility-name';
      nameSpan.textContent = responsibility.name;
      li.appendChild(nameSpan);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'item-delete-btn';
      removeBtn.textContent = '×';
      removeBtn.title = 'Stop tracking';
      removeBtn.addEventListener('click', () => store.untrackResponsibility(responsibility.id));
      li.appendChild(removeBtn);
      list.appendChild(li);
    }
  }
  container.appendChild(list);
}
