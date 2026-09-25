import { store } from '../state/store';
import { confirmModal } from '../ui/modal';

export async function promptDeleteRole(roleId: string) {
  const state = store.getState();
  const role = state.roles.find((r) => r.id === roleId);
  if (!role) return;
  if (await confirmModal(`Delete "${role.title}"? Its children will be reattached to its parent.`)) {
    store.deleteRole(role.id);
  }
}

export function renderRolePanel(container: HTMLElement) {
  const state = store.getState();
  const roleId = store.selectedRoleId;
  const role = state.roles.find((r) => r.id === roleId);

  const previousNameInput = container.querySelector<HTMLInputElement>('.add-role-form input[type="text"]');
  const hadFocus = document.activeElement === previousNameInput;

  container.innerHTML = '';

  const panelTitle = document.createElement('h2');
  panelTitle.className = 'panel-title';
  panelTitle.textContent = 'Roles';
  container.appendChild(panelTitle);

  const addHeading = document.createElement('h3');
  addHeading.className = 'section-title';
  addHeading.textContent = 'Add role';
  container.appendChild(addHeading);

  const addForm = document.createElement('form');
  addForm.className = 'add-role-form';
  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.placeholder = 'New role title';
  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add role';
  addForm.append(addInput, addBtn);
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = addInput.value.trim();
    if (!title) return;
    store.addRole(title);
    addInput.value = '';
  });
  container.appendChild(addForm);

  if (hadFocus) addInput.focus();

  const divider = document.createElement('hr');
  divider.className = 'panel-divider';
  container.appendChild(divider);

  if (!role) {
    const empty = document.createElement('p');
    empty.className = 'empty-hint';
    empty.textContent = 'Select a role on the chart to edit it, or add a new one above.';
    container.appendChild(empty);
    return;
  }

  const detailsHeading = document.createElement('h3');
  detailsHeading.className = 'section-title';
  detailsHeading.textContent = 'Selected role';
  container.appendChild(detailsHeading);

  const nameLabel = document.createElement('label');
  nameLabel.className = 'field-label';
  nameLabel.textContent = 'Role title';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = role.title;
  nameInput.addEventListener('change', () => store.renameRole(role.id, nameInput.value.trim() || role.title));
  nameLabel.appendChild(nameInput);
  container.appendChild(nameLabel);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'danger';
  deleteBtn.textContent = 'Delete role';
  deleteBtn.addEventListener('click', () => {
    promptDeleteRole(role.id);
  });
  container.appendChild(deleteBtn);

  if (role.personId) {
    const personHeading = document.createElement('h3');
    personHeading.className = 'section-title';
    personHeading.textContent = 'Assigned person';
    container.appendChild(personHeading);
    const person = state.people.find((p) => p.id === role.personId);
    const personRow = document.createElement('div');
    personRow.className = 'assigned-person-row';
    personRow.textContent = `Assigned: ${person?.name ?? 'Unknown'} `;
    const unassignBtn = document.createElement('button');
    unassignBtn.type = 'button';
    unassignBtn.textContent = 'Unassign';
    unassignBtn.addEventListener('click', () => store.assignPersonToRole(role.id, null));
    personRow.appendChild(unassignBtn);
    container.appendChild(personRow);
  } else {
    const personHeading = document.createElement('h3');
    personHeading.className = 'section-title';
    personHeading.textContent = 'Assigned person';
    container.appendChild(personHeading);
    const vacantRow = document.createElement('p');
    vacantRow.className = 'empty-hint';
    vacantRow.textContent = 'Vacant. Drag a person from the People tab onto this role on the chart.';
    container.appendChild(vacantRow);
  }

  const responsibilitiesHeading = document.createElement('h3');
  responsibilitiesHeading.className = 'section-title';
  responsibilitiesHeading.textContent = 'Assigned responsibilities';
  container.appendChild(responsibilitiesHeading);

  const responsibilityList = document.createElement('ul');
  responsibilityList.className = 'plain-list';
  if (role.responsibilityIds.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-hint';
    li.textContent = 'None yet — add some from the Responsibilities Library tab.';
    responsibilityList.appendChild(li);
  } else {
    const assigned = role.responsibilityIds
      .map((id) => state.responsibilities.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

    for (const responsibility of assigned) {
      const li = document.createElement('li');
      li.textContent = responsibility.name;
      responsibilityList.appendChild(li);
    }
  }
  container.appendChild(responsibilityList);
}
