# UI/UX retool: report

Refactor in place. No framework, no new dependency, stored-data format unchanged (old browser data and v1 backup files load exactly as before). One commit per phase.

| Phase | Commit |
|---|---|
| 1 Information architecture | `503beef` |
| 2 Table UX | `bc14585` |
| 3 Map UX | `3ac8e5c` |
| 4 Data safety | `392ecb5` |
| 5 Visual design + WCAG 2.2 AA | `f8e1e38` |
| 6 Verify (tests, perf, fixes, this report) | next commit |

## Verification

**Behaviour:** `tests/regression.cjs` runs 42 checks (filter + chips, edit, undo/redo, fill down, visited, backup/restore round trip incl. an old v1 file and a bad file, reset-with-undo, clusters, row/dot link, pan, region buttons, layers, drawer, theme, zoom sensitivity, list menu, CSV, mobile cards, trail error/retry). Result: **42/42**, three runs in a row.

**Lighthouse (local, throttled mobile / desktop):**

| | Before | After |
|---|---|---|
| Mobile performance | 43 | 70 |
| Mobile accessibility | 93 | 100 |
| Mobile LCP | 8.8 s | 3.4 s |
| Mobile CLS | 0.289 | 0.196 |
| Desktop performance | 95 | 98 |
| Desktop accessibility | 93 | 96 |

**axe (WCAG 2.2 AA + best practice, 6 views x light/dark x 375/1280):** the critical `tablist` error, heading order, empty headers and colour-contrast failures are gone. One flag remains: a number cluster can sit partly under another control (target-size).

Before/after screenshots: `docs/before-after_*.jpg`.

## What changed (file | change | why)

| File | Change | Why |
|---|---|---|
| `index.html` | Explore split view shell, Table/Map toggle, Settings drawer, filter chips + progress, Layers menus, shortcuts dialog, edit sheet, toast, live regions, skip link, `defer` on scripts, honest title/About, removed 4 duplicate dot-size sliders and the "coming with GIS data" items | Phases 1-5; mobile load speed |
| `app.js` | Explore/drawer/pane logic; chips, progress; sticky-column/cards/sheet editing through the existing edit + undo path; undo/redo toasts; header-button and Tab keyboard-trap fixes; row<->dot link, clustering, visited centre dot, pan buttons; autosave indicator, backup reminder, undo for bulk actions, restore safety copy; reduced-motion; aria-sort and live cell announcements; Alt+M | Phases 1-5 |
| `trailsmap.js` | Status note with spinner, error alert and Retry; legend headings | Phase 3 + a11y |
| `style.css`, `trailsmap.css` | Layout, tokens, focus ring, 24/44px targets, contrast fixes, cards, clusters, banners | Phases 1-5 |
| `sw.js` | Cache name bumped each phase | Browsers pick up new files |
| `tests/` | Regression suite + README | Phase 6 |
| `docs/` | This report + screenshots | Phase 6 |

## Bugs found and fixed during verification
- After clicking a dot, flying to a region (e.g. Alaska) snapped the map back: the "ring the selected row" feature panned to the dot on every re-render. It now pans only when you select a row.
- "Add row" did nothing under the default National Parks filter (the blank row was filtered out). Filters now clear so the new row is visible and editable.
- Header filter buttons were hijacked by the table's key handler; Tab trapped inside the grid.

## Deferred
- Mobile CLS (0.196) and the 868 KB `data/geo.js`: load geo.js only when a map first opens; reserve space for the filter bar.
- Individual map dots are not focusable (canvas); the table, Alt+M and focusable clusters are the keyboard route.
- Cluster target-size flag (above).
- Column filters/sort for the mobile card view beyond the Sort dropdown.
- Contour lines and land-cover layers; Firebase sync; official NPS coordinate/trail-field refresh (need your NPS API file and Firebase config).
- Real-device screen reader and iPad testing (checks here are automated).
