# California Campsite Release Tracker

A static site (no build step, no framework) that answers: **when does a California campground open for booking, and what are its season, peak season and walk-up options?**

- Pick the date you want to camp. Every listing shows the exact day and time its booking opens for that arrival date (Pacific time, or your own time zone), with a countdown.
- Filter by booking site, date available, season, open-in-month, peak season, walk-up, data confidence and region. Sort any column. Export CSV. Add a calendar reminder (15 minutes before) for any release.
- **Permits & lotteries** (Yosemite first): Half Dome preseason lottery (March 1-31, projected for next year), the Half Dome daily lottery, the Yosemite wilderness weekly lottery and 7-day release for your date, and the North Pines early-access lottery. Reminders for each.
- "Opening next" lists the next release moment for every booking rule (Recreation.gov 6-month rolling, ReserveCalifornia 6-month rolling, Yosemite's monthly blocks, and so on).

Coverage: 171 listings. 32 are researched in detail (Yosemite, Sequoia and Kings Canyon, Joshua Tree, Death Valley, Pinnacles, Lassen, Channel Islands, Point Reyes, Lava Beds, Mojave, plus Redwood, Big Sur and Anza-Borrego state park campgrounds). The other 139 cover the rest of California's state park campgrounds (95 rows, one per park or campground group), more national park campgrounds and all 18 national forests; they use their booking site's default release rule and show season, peak season and walk-up as "not verified yet". Each row says how sure we are (`conf`) and which fields still need checking (`check`). Bureau of Land Management and Army Corps campgrounds are not included yet.

The data comes from a web search on 2026-10-26. The automated daily check is described in [docs/DAILY-SEARCH.md](docs/DAILY-SEARCH.md) and is not built yet.

## Files
| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The page, styles (light/dark), filters, table and reminders |
| `engine.js` | Release-time math (Pacific wall clock to real instants, DST, month-end clamping). Runs in the browser and in Node |
| `data/sites.js` | The researched listings, the booking systems and the sources |
| `data/permits.js`, `permits.js` | Permit and lottery data and the Permits & lotteries view |
| `data/roster.js` | The rest of the state parks, national park campgrounds and national forests, with default rules |
| `tests/engine.test.cjs` | Unit tests for the release math |
| `tests/ui.cjs` | Browser tests (Playwright) for filters, sorting, reminders, time zones and the phone layout |

## Run it
Open `index.html` with any static server, for example `python3 -m http.server`. Tests: `node tests/engine.test.cjs` and `NODE_PATH=<playwright dir> node tests/ui.cjs`.

## Unofficial
Not affiliated with Recreation.gov, ReserveCalifornia, the National Park Service or California State Parks. Confirm on the booking site before relying on any date.
