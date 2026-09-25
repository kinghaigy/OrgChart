import { store } from '../state/store';
import { isResponsibilityCovered } from '../utils/coverage';
import { confirmModal } from '../ui/modal';

let searchText = '';
const activeTags = new Set<string>();
let organisationOnly = false;
let assignedOnly = false;

export function renderResponsibilityLibraryPanel(container: HTMLElement) {
  const state = store.getState();
  const role = store.organisationSelected ? undefined : state.roles.find((r) => r.id === store.selectedRoleId);
  const targetIsOrganisation = store.organisationSelected;

  const previousSearchInput = container.querySelector<HTMLInputElement>('input[type="search"]');
  const hadFocus = document.activeElement === previousSearchInput;
  const selectionStart = previousSearchInput?.selectionStart ?? null;
  const selectionEnd = previousSearchInput?.selectionEnd ?? null;
  const previousList = container.querySelector<HTMLElement>('.responsibility-library-list');
  const listScrollTop = previousList?.scrollTop ?? 0;
  const panelScrollEl = container.closest<HTMLElement>('#sidepanel-content');
  const panelScrollTop = panelScrollEl?.scrollTop ?? 0;

  container.innerHTML = '';

  const panelTitle = document.createElement('h2');
  panelTitle.className = 'panel-title';
  panelTitle.textContent = 'Responsibilities';
  container.appendChild(panelTitle);

  const selectionLabel = document.createElement('p');
  selectionLabel.className = 'selection-label';
  if (targetIsOrganisation) {
    selectionLabel.textContent = `Editing: ${state.organisation.name} (organisation)`;
  } else if (role) {
    selectionLabel.textContent = `Editing: ${role.title}`;
  } else {
    selectionLabel.textContent = 'Nothing selected';
  }
  container.appendChild(selectionLabel);

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search responsibilities…';
  searchInput.value = searchText;
  searchInput.addEventListener('input', () => {
    searchText = searchInput.value;
    renderResponsibilityLibraryPanel(container);
  });
  container.appendChild(searchInput);

  if (hadFocus) {
    searchInput.focus();
    if (selectionStart !== null && selectionEnd !== null) {
      searchInput.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  const hint = document.createElement('p');
  hint.className = 'empty-hint';
  hint.textContent = 'Click the tags that apply to your business to narrow the list.';
  container.appendChild(hint);

  const orgOnlyLabel = document.createElement('label');
  orgOnlyLabel.className = 'org-only-toggle';
  const orgOnlyCheckbox = document.createElement('input');
  orgOnlyCheckbox.type = 'checkbox';
  orgOnlyCheckbox.checked = organisationOnly;
  orgOnlyCheckbox.addEventListener('change', () => {
    organisationOnly = orgOnlyCheckbox.checked;
    renderResponsibilityLibraryPanel(container);
  });
  orgOnlyLabel.appendChild(orgOnlyCheckbox);
  orgOnlyLabel.append(' Organisation-required only');
  container.appendChild(orgOnlyLabel);

  const hasTarget = !!role || targetIsOrganisation;
  const assignedOnlyLabel = document.createElement('label');
  assignedOnlyLabel.className = 'org-only-toggle';
  const assignedOnlyCheckbox = document.createElement('input');
  assignedOnlyCheckbox.type = 'checkbox';
  assignedOnlyCheckbox.checked = assignedOnly;
  assignedOnlyCheckbox.disabled = !hasTarget;
  assignedOnlyCheckbox.addEventListener('change', () => {
    assignedOnly = assignedOnlyCheckbox.checked;
    renderResponsibilityLibraryPanel(container);
  });
  assignedOnlyLabel.appendChild(assignedOnlyCheckbox);
  assignedOnlyLabel.append(' Show only assigned');
  container.appendChild(assignedOnlyLabel);

  const allTags = [...new Set(state.responsibilities.flatMap((r) => r.tags))].sort();
  const tagBar = document.createElement('div');
  tagBar.className = 'tag-filter-bar';
  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = 'tag-chip' + (activeTags.size === 0 ? ' active' : '');
  allChip.textContent = 'All';
  allChip.addEventListener('click', () => {
    activeTags.clear();
    renderResponsibilityLibraryPanel(container);
  });
  tagBar.appendChild(allChip);
  for (const tag of allTags) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-chip' + (activeTags.has(tag) ? ' active' : '');
    chip.textContent = tag;
    chip.addEventListener('click', () => {
      if (activeTags.has(tag)) activeTags.delete(tag);
      else activeTags.add(tag);
      renderResponsibilityLibraryPanel(container);
    });
    tagBar.appendChild(chip);
  }
  container.appendChild(tagBar);

  if (!role && !targetIsOrganisation) {
    const noTargetHint = document.createElement('p');
    noTargetHint.className = 'empty-hint';
    noTargetHint.textContent = 'Select a role (or the organisation) to assign responsibilities to it.';
    container.appendChild(noTargetHint);
  }

  const list = document.createElement('ul');
  list.className = 'responsibility-library-list';
  const filtered = state.responsibilities
    .filter((responsibility) => {
      const matchesText =
        searchText.trim() === '' || responsibility.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesTags = activeTags.size === 0 || responsibility.tags.some((t) => activeTags.has(t));
      const matchesOrgOnly =
        !organisationOnly || state.organisation.trackedResponsibilityIds.includes(responsibility.id);
      const isAssignedToTarget = targetIsOrganisation
        ? state.organisation.trackedResponsibilityIds.includes(responsibility.id)
        : !!role && role.responsibilityIds.includes(responsibility.id);
      const matchesAssignedOnly = !assignedOnly || isAssignedToTarget;
      return matchesText && matchesTags && matchesOrgOnly && matchesAssignedOnly;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  for (const responsibility of filtered) {
    const isTracked = state.organisation.trackedResponsibilityIds.includes(responsibility.id);
    const isUncovered = isTracked && !isResponsibilityCovered(state, responsibility.id);

    const li = document.createElement('li');
    if (isUncovered) li.classList.add('uncovered-responsibility');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    if (targetIsOrganisation) {
      checkbox.checked = isTracked;
      checkbox.addEventListener('change', () => {
        if (isTracked) store.untrackResponsibility(responsibility.id);
        else store.trackResponsibility(responsibility.id);
      });
    } else {
      checkbox.disabled = !role;
      checkbox.checked = !!role && role.responsibilityIds.includes(responsibility.id);
      checkbox.addEventListener('change', () => {
        if (role) store.toggleResponsibilityOnRole(role.id, responsibility.id);
      });
    }
    label.appendChild(checkbox);
    const text = document.createElement('span');
    text.textContent = `${responsibility.name} `;
    label.appendChild(text);
    const tagText = document.createElement('small');
    tagText.textContent = responsibility.tags.join(', ');
    label.appendChild(tagText);
    li.appendChild(label);

    if (responsibility.isCustom) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'custom-resp-delete';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Delete custom responsibility';
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (await confirmModal(`Delete custom responsibility "${responsibility.name}"?`)) {
          store.deleteCustomResponsibility(responsibility.id);
        }
      });
      li.appendChild(deleteBtn);
    }

    list.appendChild(li);
  }
  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-hint';
    li.textContent = 'No responsibilities match your search/filter.';
    list.appendChild(li);
  }
  container.appendChild(list);
  list.scrollTop = listScrollTop;
  if (panelScrollEl) panelScrollEl.scrollTop = panelScrollTop;

  const addForm = document.createElement('form');
  addForm.className = 'add-responsibility-form';
  const addHeading = document.createElement('h3');
  addHeading.className = 'section-title';
  addHeading.textContent = 'Add custom responsibility';
  container.appendChild(addHeading);
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'New responsibility name';
  const tagsInput = document.createElement('input');
  tagsInput.type = 'text';
  tagsInput.placeholder = 'Tags, comma separated (e.g. Agriculture, Livestock)';
  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add custom responsibility';
  addForm.append(nameInput, tagsInput, addBtn);
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const tags = tagsInput.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    store.addCustomResponsibility(name, tags.length ? tags : ['Custom']);
    nameInput.value = '';
    tagsInput.value = '';
  });
  container.appendChild(addForm);
}
