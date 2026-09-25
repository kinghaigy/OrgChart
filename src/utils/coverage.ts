import type { OrgChartState, Responsibility } from '../types';

export function isResponsibilityCovered(state: OrgChartState, responsibilityId: string): boolean {
  return state.roles.some((r) => r.responsibilityIds.includes(responsibilityId));
}

/** Organisation-tracked responsibilities that no role currently covers. */
export function getUncoveredTrackedResponsibilities(state: OrgChartState): Responsibility[] {
  const byId = new Map(state.responsibilities.map((r) => [r.id, r]));
  return state.organisation.trackedResponsibilityIds
    .filter((id) => !isResponsibilityCovered(state, id))
    .map((id) => byId.get(id))
    .filter((r): r is Responsibility => !!r);
}
