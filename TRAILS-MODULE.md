# Trails Map module

The **Trails Map** tab is the Map tab's map (same code, same toolbar, same hover cards, zoom, compass, visited toggles)
plus an NPS trails layer. Its filtering is the shared taskbar at the top of the site (search, States / territories, Park / unit,
Designation, Status), so trails are always limited to the parks the taskbar is showing.

## Moving it to another site
| File / folder | Purpose |
|---|---|
| `trailsmap.js` | The trails layer: service queries, paging, drawing, legend, trail settings menu. |
| `trailsmap.css` | Styles for the tab's extras. Uses shared variables and the `.hamb*`, `.rose`, `.maplegend`, `.hovercard`, `.ms-*` styles from `style.css`. |
| `app.js` | Contains `createMapView()` (the shared map) and `window.ParksBridge`. Take both, or reimplement the bridge. |
| `tiles/`, `data/geo.js`, `vendor/`, `fonts/` | Terrain pyramid, state / river / lake / city data, Leaflet + topojson, fonts. |
| `data/parks.js`, `data/details.js` | Park list and nearest city / highlights. |
The markup is the `<section id="tab-trails">` block in `index.html` plus the `#fUnit` dropdown in the taskbar.

`trailsmap.js` needs `window.ParksBridge`:
`view` (the trails map view: `.map` is the Leaflet map), `parks`, `fld`, `disp`, `infoUrl`, `visibleParks()`,
`setUnitFilter(codes)`, `subscribe(fn)` and `zoomSens()`.

## How trails are mapped to parks and locales
- Every trail segment from the NPS service carries a unit code (`UNITCODE`, the exact field name is read from the layer metadata).
  Park codes in this site are the same NPS codes (Sequoia and Kings Canyon both map to `SEKI`).
- The taskbar decides which parks are in play (`ParksBridge.visibleParks()`); the layer queries `UNITCODE IN (...)` for those parks
  (or `1=1` when every park is showing). Choosing a state in the taskbar therefore shows the trails of that state's parks.
- Hovering a trail shows its name and park; clicking it opens a card with "Show only this park" (sets the taskbar Park / unit filter).
- "Color trails by" can use Park or any category field the service exposes (class, use, surface, ...).

## Loading rules
- Up to 40,000 matching segments: all of them are loaded (in pages of 2,000, 4 at a time) and lightly generalised for the zoom.
- At zoom 8 and closer, only the area in view is loaded, at full detail (up to 16,000 segments).
- If more than 40,000 segments match and you are zoomed out, the chip says so and asks you to zoom in or narrow the taskbar filters.
- If the service is down or blocks the browser, a message appears and the rest of the map keeps working.

## Settings stored
`localStorage` keys beginning `tm_` (trail style, relief, legend) and `t_` (this map's toolbar toggles, view). Zoom sensitivity is shared.

## Planned next: GIS detail
The settings menu already has disabled placeholders for contour lines and land cover.
