export interface Responsibility {
  id: string;
  name: string;
  /** Flat tags — a responsibility can belong to several at once, e.g. "Agriculture" and "Livestock" */
  tags: string[];
  /** True if created as a custom responsibility by the user, false/undefined if from the built-in catalog */
  isCustom?: boolean;
}

export interface Role {
  id: string;
  title: string;
  /** null = root/top-tier or not yet attached to the tree */
  parentId: string | null;
  /** null = vacant; one person per role */
  personId: string | null;
  responsibilityIds: string[];
  /** Once true (given any parent at least once), this role can never be dropped back onto the organisation to return to the top tier. */
  hasBeenNested: boolean;
}

export interface Person {
  id: string;
  name: string;
  /** roles held are derived by lookup (role.personId), not stored here */
}

export interface Organisation {
  name: string;
  /** Responsibilities that must be covered by some role; grows automatically when a responsibility is assigned to any role, but shrinks only via explicit untracking. */
  trackedResponsibilityIds: string[];
}

export interface OrgChartState {
  schemaVersion: 1;
  roles: Role[];
  people: Person[];
  responsibilities: Responsibility[];
  organisation: Organisation;
}
