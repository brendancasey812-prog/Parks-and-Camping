# California campsite release dates

A static site (no build step) showing when California state and national campgrounds open for booking, with season, peak season and walk-up information.

## Use
- **Inside Parks & Camping**: the site's **Camping** tab shows this page in place (no sidebar; Parks / Permits and lotteries / Data and edits as tabs; the site's theme). `?embed=1` or being framed turns that on; opened directly, it is a full page with its sidebar.
- **Parks table**: park name and type (NP, NF, SP, SB…) in separate columns; the opening split into days out, date and time; type tabs (All, national parks & monuments, state parks, national forests); a filter row under the headings (park text, type, region, booking site, opens in, walk-up, data) with season / month / peak under **More filters**.
- **Permits and lotteries**: search, location, status and type filters over a table of every step (opens date and time in their own columns); Coming up and the permit cards follow the same search and location.
- **Parks**: one table of parks. Filter by park type, booking site, region, date available, season, peak season, walk-up and data status. Ask in plain words, for example "walk-up sites in July".
- **Column menus** (▾ on every column, like Google Sheets): sort A→Z / Z→A, search the column's values and tick which ones to show. Filters on the Parks table show as chips and are remembered.
- **Search** also finds campgrounds: a match shows under its park and opens it (e.g. "camp 4" → Camp 4 under Yosemite).
- **Park page**: a table of that park's campgrounds with a campground filter, plus a details panel with a photo slot, edit form and reminder.
- **Edit in the table**: double-click (or Enter, or the pencil) a Season, Peak season or Walk-up cell. Saved like the edit form; Undo or Ctrl+Z puts it back.
- **Permits and lotteries**: Half Dome preseason and daily lotteries, Yosemite wilderness weekly lottery and 7-day release, in tables.
- **Data and edits**: how dates are computed; export, import or reset your edits.

Edits and photos are stored in this browser only (localStorage and IndexedDB).

## Files
- `data/seasons.js` open-season dates, peak season and number of sites for every listing (web search, 2026-10-30; official sites were unreachable, so each value needs checking).
- `engine.js` release-date math in Pacific time (DST-safe); `data/sites.js` researched rows; `data/roster.js` default-rule rows; `data/permits.js` permit phases.
- `app.js`, `permits.js`, `style.css`, `index.html` the interface.
- `docs/DAILY-SEARCH.md` plan for the daily updater (not built yet).

## Tests
```
node tests/engine.test.cjs
NODE_PATH=<playwright dir> node tests/ui.cjs
```
Data is unofficial; confirm on the booking site before relying on a date.
