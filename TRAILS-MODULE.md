# Trails Map module

The **Trails Map** tab is built as a self-contained module so it can be lifted into its own site.

## Files to copy
| File / folder | Purpose |
|---|---|
| `trailsmap.js` | All of the tab's logic (map, trails loading, filters, legend, settings, park cards). |
| `trailsmap.css` | Styles for the tab. Reuses the CSS variables and `.ms-*` dropdown / `.rose` / `.stlab` / `.city` / `.lbl` styles from `style.css`. |
| `tiles/` | Pre-rendered terrain tiles (pyramid 0-8). |
| `data/geo.js` | State borders, lakes, rivers, country borders, cities, state label points (`window.GEO`). |
| `vendor/leaflet.js`, `vendor/leaflet.css`, `vendor/topojson-client.min.js` | Map libraries (bundled, no CDN). |
| `fonts/` | Inter + Fraunces (self-hosted). |
| `data/parks.js` | `window.PARKS_RAW` (unit list). Only needed for the standalone fallback. |

The markup for the tab is the `<section id="tab-trails">` block in `index.html`.

## What it needs from the rest of the site
`window.ParksBridge` (defined at the end of `app.js`) gives the module the park list, visited checks and edits:
`parks, caParks, fld, disp, official, isChecked, toggle, setField, subscribe, infoUrl, zoomSens`.
If `ParksBridge` is missing, `trailsmap.js` falls back to a minimal built-in version that reads `window.PARKS_RAW`
and keeps visited checks in `localStorage["checked"]`, so it runs on its own.

The module calls `window.TrailsMap.show()` when its tab is opened (see `showTab` in `app.js`).

## Settings it stores
`localStorage` keys starting `tm_` (colour-by, line width, opacity, relief, toggles, selected parks/states, panel collapsed).
Map zoom sensitivity is shared with the main site (`zoomSens`).

## NPS trails service
`https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/MapServer/0` (layer "Trails", GeoJSON, 2,000 per page).
- Selected parks are fetched with `where UNITCODE='XXXX'` (the exact field name is read from the layer's metadata), in pages, and cached.
- With nothing selected, trails load for the visible area once you zoom in (about zoom 9.5).
- Sequoia and Kings Canyon share the NPS unit code `SEKI`.
- If the service is down or blocks the browser, a message appears and the rest of the map keeps working.

## Planned next: GIS detail
The panel already has disabled placeholders for contour lines and land cover. Add new vector layers in `addVectors()` /
`updatePlaceLabels()` and a checkbox in the "Map" section of the panel.
