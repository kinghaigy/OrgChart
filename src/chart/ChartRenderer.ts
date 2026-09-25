import { store } from '../state/store';
import { computeLayout, computeNodeWidth, NODE_HEIGHT, V_GAP } from './layout';
import { makeDraggable } from './dragDrop';

const PADDING = 40;
// Extra row reserved above depth-0 roles for the organisation box.
const ORG_OFFSET = NODE_HEIGHT + V_GAP;

export function renderChart(canvasEl: HTMLElement) {
  const state = store.getState();
  const { rects, contentWidth, contentHeight } = computeLayout(state.roles);

  canvasEl.style.width = `${contentWidth + PADDING * 2}px`;
  canvasEl.style.height = `${contentHeight + PADDING * 2 + ORG_OFFSET}px`;
  canvasEl.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'connectors');
  svg.setAttribute('width', String(contentWidth + PADDING * 2));
  svg.setAttribute('height', String(contentHeight + PADDING * 2 + ORG_OFFSET));
  canvasEl.appendChild(svg);

  const byId = new Map(state.roles.map((r) => [r.id, r]));

  for (const role of state.roles) {
    if (!role.parentId || !byId.has(role.parentId)) continue;
    const childRect = rects.get(role.id);
    const parentRect = rects.get(role.parentId);
    if (!childRect || !parentRect) continue;
    const x1 = parentRect.x + parentRect.width / 2 + PADDING;
    const y1 = parentRect.y + parentRect.height + PADDING + ORG_OFFSET;
    const x2 = childRect.x + childRect.width / 2 + PADDING;
    const y2 = childRect.y + PADDING + ORG_OFFSET;
    const midY = (y1 + y2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
    path.setAttribute('class', 'connector-line');
    path.dataset.parentId = role.parentId;
    path.dataset.childId = role.id;
    path.dataset.x1 = String(x1);
    path.dataset.y1 = String(y1);
    path.dataset.x2 = String(x2);
    path.dataset.y2 = String(y2);
    svg.appendChild(path);
  }

  // Organisation box sits centered above every root (parentless) role, connected to each.
  const orgWidth = computeNodeWidth(state.organisation.name);
  const orgX = PADDING + contentWidth / 2 - orgWidth / 2;
  const orgY = PADDING;
  const roots = state.roles.filter((r) => !r.parentId || !byId.has(r.parentId));
  for (const root of roots) {
    const rootRect = rects.get(root.id);
    if (!rootRect) continue;
    const x1 = orgX + orgWidth / 2;
    const y1 = orgY + NODE_HEIGHT;
    const x2 = rootRect.x + rootRect.width / 2 + PADDING;
    const y2 = rootRect.y + PADDING + ORG_OFFSET;
    const midY = (y1 + y2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`);
    path.setAttribute('class', 'connector-line');
    path.dataset.parentId = 'organisation';
    path.dataset.childId = root.id;
    path.dataset.x1 = String(x1);
    path.dataset.y1 = String(y1);
    path.dataset.x2 = String(x2);
    path.dataset.y2 = String(y2);
    svg.appendChild(path);
  }

  const orgNode = document.createElement('div');
  orgNode.className = 'org-node';
  if (store.organisationSelected) orgNode.classList.add('selected');
  orgNode.style.left = `${orgX}px`;
  orgNode.style.top = `${orgY}px`;
  orgNode.style.width = `${orgWidth}px`;
  orgNode.style.height = `${NODE_HEIGHT}px`;
  const orgTitle = document.createElement('div');
  orgTitle.className = 'role-title';
  orgTitle.textContent = state.organisation.name;
  orgNode.appendChild(orgTitle);
  orgNode.addEventListener('click', () => store.selectOrganisation());
  canvasEl.appendChild(orgNode);

  for (const role of state.roles) {
    const rect = rects.get(role.id);
    if (!rect) continue;
    const node = document.createElement('div');
    node.className = 'role-node';
    if (role.id === store.selectedRoleId) node.classList.add('selected');
    node.dataset.id = role.id;
    node.style.left = `${rect.x + PADDING}px`;
    node.style.top = `${rect.y + PADDING + ORG_OFFSET}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${NODE_HEIGHT}px`;

    const title = document.createElement('div');
    title.className = 'role-title';
    title.textContent = role.title;
    node.appendChild(title);

    if (role.personId) {
      const person = state.people.find((p) => p.id === role.personId);
      if (person) {
        const personBox = document.createElement('div');
        personBox.className = 'role-person';
        personBox.textContent = person.name;
        node.appendChild(personBox);
      }
    } else {
      const vacant = document.createElement('div');
      vacant.className = 'role-person role-vacant';
      vacant.textContent = 'Vacant';
      node.appendChild(vacant);
    }

    node.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('application/x-person-id')) e.preventDefault();
    });
    node.addEventListener('drop', (e) => {
      const personId = e.dataTransfer?.getData('application/x-person-id');
      if (personId) {
        e.preventDefault();
        store.assignPersonToRole(role.id, personId);
      }
    });

    canvasEl.appendChild(node);
    makeDraggable(node, role.id, canvasEl);
  }
}
