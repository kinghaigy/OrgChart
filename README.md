# Just Org Charts

Who does what around here anyway?

A local-only, browser-based organisation chart builder. No external network
resources are used at runtime — everything (UI, responsibility catalog, saved data)
runs from the files you host or open locally.

Try it here: https://kinghaigy.github.io/OrgChart/

## Features

- **Fixed-Spacing Tree Layout**: Automatically computed hierarchical tree rendered on an interactive canvas with SVG connector lines.
- **Top-Tier Organisation Node**: An organisation root node connects to top-tier roles and tracks required business responsibilities.
- **Interactive Drag & Reparenting**: Drag any role (along with its entire subtree and connectors) onto another role to nest it. Roles can be placed on the top tier under the organisation, but once nested beneath another role, they lock into the chart hierarchy.
- **Copy & Paste Roles**: Duplicate any selected role along with all of its assigned responsibilities using **Ctrl+C** and **Ctrl+V** (or **Cmd+C** / **Cmd+V** on Mac).
- **Pannable & Zoomable Canvas**: Pan by dragging the canvas background and zoom with the mouse wheel (anchored under the cursor and cleanly snapped at 100% to avoid font blurring). Includes **Fit all** and **Reset view** buttons, with viewport coordinates saved between sessions.
- **Dynamic Card Sizing**: Role and organisation cards automatically expand horizontally to fit longer titles without unnecessary text clipping.
- **Built-in & Custom Responsibilities**: Comprehensive, multi-tag catalog of 200+ industry responsibilities (Agriculture, Livestock, Management, Finance, Operations, Tech, etc.) plus support for user-created custom responsibilities with tags and deletion.
- **Background Catalog Reconciliation**: Preserves custom responsibilities and active role assignments across app updates while automatically introducing newly released catalog entries and tag refinements.
- **Organisation Coverage & Tracking**: Define essential responsibilities required by your organisation. Roles inherit tracking upon assignment, and any tracked responsibilities not currently covered by at least one role are highlighted in light red.
- **Responsibility Filtering**: Filter the catalog by free-text search, multiple category tags, "Organisation-required only", or "Show only assigned" to easily locate and manage responsibilities.
- **People & Role Assignment**: Manage team members, drag and drop people onto roles (one person per role, one person across multiple roles), and rename people (ideal for placeholder roles transitioning to new hires).
- **Deduplicated Responsibilities**: View combined responsibilities per person across all roles they hold, automatically deduplicating shared items for clear job scoping.
- **Export & Import**: Export the entire organisation chart and responsibility data to a standalone JSON file for backup or transfer, and re-import anytime.
- **Print View**: Formatted two-stage print layout fitting the full org chart onto one landscape page followed by a clean, per-person responsibility breakdown.
- **Onboarding Guide**: Integrated welcome and usage guide available on first launch or via the "Help" button in the top toolbar.

## Development

```bash
npm install
npm run dev      # start local dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

The production build in `dist/` is fully static and can be opened directly
from disk or served from any static file host — no backend required.

## Data Model Notes

- `Role` — `id`, `title`, `parentId` (`null` = top-tier), `personId`, `responsibilityIds: string[]`, `hasBeenNested: boolean`.
- `Person` — `id`, `name`. Assigned roles are derived by looking up `role.personId`.
- `Responsibility` — `id`, `name`, `tags: string[]`, `isCustom?: boolean`.
- `Organisation` — `name`, `trackedResponsibilityIds: string[]`.

Responsibilities and people are referenced by stable IDs everywhere, ensuring that a person's aggregate responsibilities across multiple roles are cleanly deduplicated without duplicate listings.
