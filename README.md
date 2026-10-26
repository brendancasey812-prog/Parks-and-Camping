# California Campsite Release Tracker

A static site (no build step, no framework) that answers: **when does a California campground open for booking, and what are its season, peak season and walk-up options?**

- Pick the date you want to camp. Every listing shows the exact day and time its booking opens for that arrival date (Pacific time, or your own time zone), with a countdown.
- Filter by booking site, date available, season, open-in-month, peak season, walk-up, data confidence and region. Sort any column. Export CSV. Add a calendar reminder (15 minutes before) for any release.
- "Opening next" lists the next release moment for every booking rule (Recreation.gov 6-month rolling, ReserveCalifornia 6-month rolling, Yosemite's monthly blocks, and so on).

This is the first build. The data comes from a web search on 2026-10-26 and each row says how sure we are (`conf`) and which fields still need checking (`check`). The automated daily check is described in [docs/DAILY-SEARCH.md](docs/DAILY-SEARCH.md) and is not built yet.

## Files
| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The page, styles (light/dark), filters, table and reminders |
| `engine.js` | Release-time math (Pacific wall clock to real instants, DST, month-end clamping). Runs in the browser and in Node |
| `data/sites.js` | The listings, booking systems and sources. This is the file the daily check will update |
| `tests/engine.test.cjs` | Unit tests for the release math |
| `tests/ui.cjs` | Browser tests (Playwright) for filters, sorting, reminders, time zones and the phone layout |

## Run it
Open `index.html` with any static server, for example `python3 -m http.server`. Tests: `node tests/engine.test.cjs` and `NODE_PATH=<playwright dir> node tests/ui.cjs`.

## Unofficial
Not affiliated with Recreation.gov, ReserveCalifornia, the National Park Service or California State Parks. Confirm on the booking site before relying on any date.
