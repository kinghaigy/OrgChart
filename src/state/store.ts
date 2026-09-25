import type { OrgChartState, Role, Person, Responsibility } from '../types';
import { seedResponsibilities } from '../data/seedResponsibilities';
import { createId } from '../utils/id';
import { reconcileResponsibilities } from '../utils/reconcileResponsibilities';

const STORAGE_KEY = 'orgchart:v1';

type Listener = () => void;

function initialState(): OrgChartState {
  const ceo: Role = {
    id: createId(),
    title: 'CEO',
    parentId: null,
    personId: null,
    responsibilityIds: [],
    hasBeenNested: false,
  };
  return {
    schemaVersion: 1,
    roles: [ceo],
    people: [],
    responsibilities: seedResponsibilities.map((r) => ({ ...r, isCustom: false })),
    organisation: { name: 'My Organisation', trackedResponsibilityIds: [] },
  };
}

function loadFromStorage(): OrgChartState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState();
  try {
    const parsed = JSON.parse(raw) as OrgChartState;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.roles)) {
      return initialState();
    }
    // Migrate saves from before the organisation feature existed.
    if (!parsed.organisation) {
      parsed.organisation = { name: 'My Organisation', trackedResponsibilityIds: [] };
    }
    parsed.responsibilities = reconcileResponsibilities(
      parsed.responsibilities ?? [],
      parsed.roles,
      parsed.organisation,
    );
    return parsed;
  } catch {
    return initialState();
  }
}

class Store {
  private state: OrgChartState = loadFromStorage();
  private listeners = new Set<Listener>();
  private roleClipboard: { title: string; responsibilityIds: string[]; parentId: string | null } | null = null;
  selectedRoleId: string | null = this.state.roles[0]?.id ?? null;
  organisationSelected = false;

  getState(): OrgChartState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.persist();
    for (const l of this.listeners) l();
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  replaceState(next: OrgChartState) {
    const organisation = next.organisation ?? { name: 'My Organisation', trackedResponsibilityIds: [] };
    const responsibilities = reconcileResponsibilities(
      next.responsibilities ?? [],
      next.roles,
      organisation,
    );
    this.state = {
      ...next,
      organisation,
      responsibilities,
    };
    this.selectedRoleId = next.roles[0]?.id ?? null;
    this.organisationSelected = false;
    this.emit();
  }

  selectRole(id: string | null) {
    this.selectedRoleId = id;
    this.organisationSelected = false;
    this.emit();
  }

  selectOrganisation() {
    this.selectedRoleId = null;
    this.organisationSelected = true;
    this.emit();
  }

  addRole(title: string, parentId: string | null = null): Role {
    const role: Role = {
      id: createId(),
      title,
      parentId,
      personId: null,
      responsibilityIds: [],
      hasBeenNested: parentId !== null,
    };
    this.state = { ...this.state, roles: [...this.state.roles, role] };
    this.selectedRoleId = role.id;
    this.organisationSelected = false;
    this.emit();
    return role;
  }

  renameRole(id: string, title: string) {
    this.state = {
      ...this.state,
      roles: this.state.roles.map((r) => (r.id === id ? { ...r, title } : r)),
    };
    this.emit();
  }

  copyRole(id?: string | null): boolean {
    const targetId = id ?? this.selectedRoleId;
    if (!targetId) return false;
    const role = this.state.roles.find((r) => r.id === targetId);
    if (!role) return false;
    this.roleClipboard = {
      title: role.title,
      responsibilityIds: [...role.responsibilityIds],
      parentId: role.parentId,
    };
    try {
      sessionStorage.setItem('orgchart:role_clipboard', JSON.stringify(this.roleClipboard));
    } catch {
      // Ignore storage errors in private/sandboxed browsing
    }
    return true;
  }

  hasCopiedRole(): boolean {
    if (this.roleClipboard) return true;
    try {
      const stored = sessionStorage.getItem('orgchart:role_clipboard');
      if (stored) {
        this.roleClipboard = JSON.parse(stored);
        return true;
      }
    } catch {
      // Ignore parsing errors
    }
    return false;
  }

  pasteRole(): Role | null {
    if (!this.hasCopiedRole() || !this.roleClipboard) return null;

    const parentStillExists =
      this.roleClipboard.parentId !== null &&
      this.state.roles.some((r) => r.id === this.roleClipboard!.parentId);
    const parentId = parentStillExists ? this.roleClipboard.parentId : null;

    const role: Role = {
      id: createId(),
      title: this.roleClipboard.title,
      parentId,
      personId: null,
      responsibilityIds: [...this.roleClipboard.responsibilityIds],
      hasBeenNested: parentId !== null,
    };

    // Ensure any copied responsibilities are also tracked in organisation if needed
    let organisation = this.state.organisation;
    const untracked = role.responsibilityIds.filter(
      (rId) => !organisation.trackedResponsibilityIds.includes(rId),
    );
    if (untracked.length > 0) {
      organisation = {
        ...organisation,
        trackedResponsibilityIds: [...organisation.trackedResponsibilityIds, ...untracked],
      };
    }

    this.state = {
      ...this.state,
      roles: [...this.state.roles, role],
      organisation,
    };
    this.selectedRoleId = role.id;
    this.organisationSelected = false;
    this.emit();
    return role;
  }

  /** Deletes a role and reassigns its direct children to its parent (children are not orphaned). */
  deleteRole(id: string) {
    const role = this.state.roles.find((r) => r.id === id);
    if (!role) return;
    this.state = {
      ...this.state,
      roles: this.state.roles
        .filter((r) => r.id !== id)
        .map((r) => (r.parentId === id ? { ...r, parentId: role.parentId } : r)),
    };
    if (this.selectedRoleId === id) this.selectedRoleId = null;
    this.emit();
  }

  /**
   * Returns false (no-op) if targetParentId is the role itself/a descendant, or if dropping back onto the
   * organisation (targetParentId null) for a role that has already been nested under something at least once.
   */
  reparentRole(id: string, targetParentId: string | null): boolean {
    if (id === targetParentId) return false;
    if (targetParentId !== null && this.isDescendant(id, targetParentId)) return false;
    const role = this.state.roles.find((r) => r.id === id);
    if (!role) return false;
    if (targetParentId === null && role.hasBeenNested) return false;
    this.state = {
      ...this.state,
      roles: this.state.roles.map((r) =>
        r.id === id ? { ...r, parentId: targetParentId, hasBeenNested: r.hasBeenNested || targetParentId !== null } : r,
      ),
    };
    this.emit();
    return true;
  }

  private isDescendant(ancestorId: string, candidateId: string): boolean {
    let current = this.state.roles.find((r) => r.id === candidateId);
    while (current) {
      if (current.parentId === ancestorId) return true;
      current = this.state.roles.find((r) => r.id === current!.parentId) ?? undefined;
    }
    return false;
  }

  setRoleResponsibilities(id: string, responsibilityIds: string[]) {
    this.state = {
      ...this.state,
      roles: this.state.roles.map((r) => (r.id === id ? { ...r, responsibilityIds } : r)),
    };
    this.emit();
  }

  /** Toggles a responsibility on a role. Adding it also tracks it at the organisation level (removing does not untrack). */
  toggleResponsibilityOnRole(roleId: string, responsibilityId: string) {
    const role = this.state.roles.find((r) => r.id === roleId);
    if (!role) return;
    const has = role.responsibilityIds.includes(responsibilityId);
    const responsibilityIds = has
      ? role.responsibilityIds.filter((r) => r !== responsibilityId)
      : [...role.responsibilityIds, responsibilityId];
    const roles = this.state.roles.map((r) => (r.id === roleId ? { ...r, responsibilityIds } : r));
    let organisation = this.state.organisation;
    if (!has && !organisation.trackedResponsibilityIds.includes(responsibilityId)) {
      organisation = { ...organisation, trackedResponsibilityIds: [...organisation.trackedResponsibilityIds, responsibilityId] };
    }
    this.state = { ...this.state, roles, organisation };
    this.emit();
  }

  renameOrganisation(name: string) {
    this.state = { ...this.state, organisation: { ...this.state.organisation, name } };
    this.emit();
  }

  /** Manually marks a responsibility as required by the organisation, independent of any role assignment. */
  trackResponsibility(responsibilityId: string) {
    if (this.state.organisation.trackedResponsibilityIds.includes(responsibilityId)) return;
    this.state = {
      ...this.state,
      organisation: {
        ...this.state.organisation,
        trackedResponsibilityIds: [...this.state.organisation.trackedResponsibilityIds, responsibilityId],
      },
    };
    this.emit();
  }

  untrackResponsibility(responsibilityId: string) {
    this.state = {
      ...this.state,
      organisation: {
        ...this.state.organisation,
        trackedResponsibilityIds: this.state.organisation.trackedResponsibilityIds.filter((id) => id !== responsibilityId),
      },
    };
    this.emit();
  }

  addCustomResponsibility(name: string, tags: string[]): Responsibility {
    const responsibility: Responsibility = { id: createId(), name, tags, isCustom: true };
    const nextList = [...this.state.responsibilities, responsibility].sort((a, b) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
    );
    this.state = { ...this.state, responsibilities: nextList };
    this.emit();
    return responsibility;
  }

  deleteCustomResponsibility(id: string) {
    const responsibility = this.state.responsibilities.find((r) => r.id === id);
    if (!responsibility || !responsibility.isCustom) return;
    this.state = {
      ...this.state,
      responsibilities: this.state.responsibilities.filter((r) => r.id !== id),
      roles: this.state.roles.map((role) => ({
        ...role,
        responsibilityIds: role.responsibilityIds.filter((rId) => rId !== id),
      })),
      organisation: {
        ...this.state.organisation,
        trackedResponsibilityIds: this.state.organisation.trackedResponsibilityIds.filter((rId) => rId !== id),
      },
    };
    this.emit();
  }

  addPerson(name: string): Person {
    const person: Person = { id: createId(), name };
    this.state = { ...this.state, people: [...this.state.people, person] };
    this.emit();
    return person;
  }

  renamePerson(id: string, name: string) {
    this.state = { ...this.state, people: this.state.people.map((p) => (p.id === id ? { ...p, name } : p)) };
    this.emit();
  }

  deletePerson(id: string) {
    this.state = {
      ...this.state,
      people: this.state.people.filter((p) => p.id !== id),
      roles: this.state.roles.map((r) => (r.personId === id ? { ...r, personId: null } : r)),
    };
    this.emit();
  }

  assignPersonToRole(roleId: string, personId: string | null) {
    this.state = {
      ...this.state,
      roles: this.state.roles.map((r) => (r.id === roleId ? { ...r, personId } : r)),
    };
    this.emit();
  }
}

export const store = new Store();
