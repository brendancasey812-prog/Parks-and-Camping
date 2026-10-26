# Regression tests

`regression.cjs` drives the site in headless Chromium (Playwright) and checks the behaviours the tracker must never lose: filters and chips, editing, undo/redo, fill down, backup and restore (including an old v1 file and a bad file), reset/undo safety, clusters and row/dot linking on the map, pan buttons, region buttons, Layers menu, settings drawer, theme, the list menu, CSV export, the dashboard (edit mode, columns, drag, favorites, trip countdown), the Trip Planner (calendar views, search, plans, import, export, booking links), the Passes tab (pass cards, filters, held passes and expiry, CSV, show on map) and the phone map flow (geolocation is faked, so no network is needed).

```
NODE_PATH=<folder that contains playwright> node tests/regression.cjs
```

It starts its own static server on a random local port, uses a fresh browser profile per group, and exits non-zero if any check fails. Nothing here is loaded by the site.
