# California campsite release dates

A static site (no build step) showing when California state and national campgrounds open for booking, with season, peak season and walk-up information.

## Use
- **Parks**: one table of parks. Filter by park type, booking site, region, date available, season, peak season, walk-up and data status. Ask in plain words, for example "walk-up sites in July".
- **Park page**: a table of that park's campgrounds with a campground filter, plus a details panel with a photo slot, edit form and reminder.
- **Permits and lotteries**: Half Dome preseason and daily lotteries, Yosemite wilderness weekly lottery and 7-day release, in tables.
- **Data and edits**: how dates are computed; export, import or reset your edits.

Edits and photos are stored in this browser only (localStorage and IndexedDB).

## Files
- `engine.js` release-date math in Pacific time (DST-safe); `data/sites.js` researched rows; `data/roster.js` default-rule rows; `data/permits.js` permit phases.
- `app.js`, `permits.js`, `style.css`, `index.html` the interface.
- `docs/DAILY-SEARCH.md` plan for the daily updater (not built yet).

## Tests
```
node tests/engine.test.cjs
NODE_PATH=<playwright dir> node tests/ui.cjs
```
Data is unofficial; confirm on the booking site before relying on a date.
