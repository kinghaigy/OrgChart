import type { Organisation, Responsibility, Role } from '../types';
import { seedResponsibilities } from '../data/seedResponsibilities';

/**
 * Reconciles a stored or imported list of responsibilities against the bundled seed catalog.
 *
 * 1. Takes all latest seed responsibilities (fresh names, tags, and new additions from codebase).
 * 2. Preserves all user-created custom responsibilities (isCustom: true, or non-seed IDs).
 * 3. Retains deprecated seed items if they are currently assigned to a role or tracked by the organisation.
 */
export function reconcileResponsibilities(
  savedList: Responsibility[],
  roles: Role[] = [],
  organisation?: Organisation,
): Responsibility[] {
  // Active seed catalog with isCustom: false
  const result: Responsibility[] = seedResponsibilities.map((r) => ({
    ...r,
    isCustom: false,
  }));
  const resultIds = new Set(result.map((r) => r.id));

  // Collect all assigned / tracked IDs from the chart
  const referencedIds = new Set<string>();
  for (const role of roles) {
    for (const rId of role.responsibilityIds) {
      referencedIds.add(rId);
    }
  }
  if (organisation) {
    for (const rId of organisation.trackedResponsibilityIds) {
      referencedIds.add(rId);
    }
  }

  for (const saved of savedList) {
    if (resultIds.has(saved.id)) {
      // Already in catalog with latest definitions
      continue;
    }

    // Custom items either have isCustom === true or their ID was generated (not starting with resp-)
    const isCustom = saved.isCustom === true || !saved.id.startsWith('resp-');

    if (isCustom) {
      result.push({
        ...saved,
        isCustom: true,
      });
      resultIds.add(saved.id);
    } else if (referencedIds.has(saved.id)) {
      // Deprecated seed item from an older version of the catalog, but still in use in this chart.
      // Preserve it so role assignments don't break.
      result.push({
        ...saved,
        isCustom: false,
      });
      resultIds.add(saved.id);
    }
  }

  result.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  return result;
}
