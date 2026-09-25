import type { OrgChartState, Responsibility } from '../types';

/** Union of responsibilities across every role held by this person, deduplicated by responsibility id. */
export function getPersonResponsibilities(state: OrgChartState, personId: string): Responsibility[] {
  const responsibilityMap = new Map<string, Responsibility>();
  const responsibilityById = new Map(state.responsibilities.map((r) => [r.id, r]));
  for (const role of state.roles) {
    if (role.personId !== personId) continue;
    for (const responsibilityId of role.responsibilityIds) {
      const responsibility = responsibilityById.get(responsibilityId);
      if (responsibility) responsibilityMap.set(responsibility.id, responsibility);
    }
  }
  return [...responsibilityMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

export function getRolesForPerson(state: OrgChartState, personId: string) {
  return state.roles.filter((r) => r.personId === personId);
}
