import { store } from '../state/store';
import { getPersonResponsibilities, getRolesForPerson } from '../utils/personResponsibilities';
import { confirmModal, promptModal } from '../ui/modal';

let selectedPersonId: string | null = null;

export function renderPeoplePanel(container: HTMLElement) {
  const state = store.getState();

  const previousNameInput = container.querySelector<HTMLInputElement>('.add-person-form input[type="text"]');
  const hadFocus = document.activeElement === previousNameInput;

  container.innerHTML = '';

  const panelTitle = document.createElement('h2');
  panelTitle.className = 'panel-title';
  panelTitle.textContent = 'People';
  container.appendChild(panelTitle);

  const addHeading = document.createElement('h3');
  addHeading.className = 'section-title';
  addHeading.textContent = 'Add person';
  container.appendChild(addHeading);

  const addForm = document.createElement('form');
  addForm.className = 'add-person-form';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'New person name';
  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add person';
  addForm.append(nameInput, addBtn);
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    store.addPerson(name);
    nameInput.value = '';
  });
  container.appendChild(addForm);

  if (hadFocus) nameInput.focus();

  const list = document.createElement('ul');
  list.className = 'people-list';
  for (const person of state.people) {
    const li = document.createElement('li');
    li.draggable = true;
    li.className = 'person-item' + (person.id === selectedPersonId ? ' active' : '');
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('application/x-person-id', person.id);
      e.dataTransfer!.effectAllowed = 'copy';
    });
    li.addEventListener('click', () => {
      selectedPersonId = selectedPersonId === person.id ? null : person.id;
      renderPeoplePanel(container);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'person-name';
    nameSpan.textContent = person.name;
    li.appendChild(nameSpan);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = '✎';
    editBtn.title = 'Rename person';
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const newName = await promptModal('Rename person:', person.name);
      if (newName && newName.trim()) store.renamePerson(person.id, newName.trim());
    });
    li.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'item-delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete person';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (await confirmModal(`Delete ${person.name}? They will be unassigned from all roles.`)) {
        store.deletePerson(person.id);
      }
    });
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
  if (state.people.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-hint';
    li.textContent = 'No people yet. Add one above.';
    list.appendChild(li);
  }
  container.appendChild(list);

  const hint = document.createElement('p');
  hint.className = 'empty-hint';
  hint.textContent =
    'Click a name to see their assigned roles and responsibilities, or drag them onto a role on the chart to assign them.';
  container.appendChild(hint);

  if (selectedPersonId) {
    const person = state.people.find((p) => p.id === selectedPersonId);
    if (person) {
      const detail = document.createElement('div');
      detail.className = 'person-detail';
      const heading = document.createElement('h3');
      heading.className = 'detail-title';
      heading.textContent = person.name;
      detail.appendChild(heading);

      const rolesHeading = document.createElement('h4');
      rolesHeading.className = 'section-title';
      rolesHeading.textContent = 'Assigned roles';
      detail.appendChild(rolesHeading);

      const roles = getRolesForPerson(state, person.id);
      const roleList = document.createElement('ul');
      for (const r of roles) {
        const li = document.createElement('li');
        li.textContent = r.title;
        roleList.appendChild(li);
      }
      if (roles.length === 0) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'Not assigned to any role.';
        roleList.appendChild(li);
      }
      detail.appendChild(roleList);

      const responsibilities = getPersonResponsibilities(state, person.id);
      const responsibilitiesHeading = document.createElement('h4');
      responsibilitiesHeading.className = 'section-title';
      responsibilitiesHeading.textContent = `Deduplicated responsibilities (${responsibilities.length})`;
      detail.appendChild(responsibilitiesHeading);
      const responsibilityList = document.createElement('ul');
      for (const responsibility of responsibilities) {
        const li = document.createElement('li');
        li.textContent = responsibility.name;
        responsibilityList.appendChild(li);
      }
      if (responsibilities.length === 0) {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'No responsibilities assigned across their roles.';
        responsibilityList.appendChild(li);
      }
      detail.appendChild(responsibilityList);

      container.appendChild(detail);
    }
  }
}
