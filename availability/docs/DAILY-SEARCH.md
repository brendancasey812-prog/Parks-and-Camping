# Weekly update

A scheduled Claude task runs every Monday at 8:41 AM Pacific. It re-checks the campground data, changes only what new
information supports, and opens a pull request for the owner to review. Nothing goes live until that pull request is merged.

## What a run does
1. **Start fresh.** Fetch `main` into a new branch `data-update/YYYY-MM-DD`.
2. **Decide what to check.** Every run covers:
   - every row whose season text names a year before the coming season (for example "Apr 21 – Oct 25, 2026" once 2027 dates could exist);
   - closures and reopenings (rows saying "Closed", "Not opening", "temporarily closed", "no reopening date");
   - permits and lotteries in `data/permits.js` (Half Dome preseason and daily lottery, Yosemite wilderness permits, North Pines early access);
   - about a quarter of the remaining rows in turn, so every campground is looked at once a month.
3. **Look it up**, in this order of trust, and keep the page that settled each value:
   | Source | For |
   |---|---|
   | nps.gov park pages (campgrounds, operating hours, alerts, news releases) | season dates, closures, site counts |
   | recreation.gov public data (no key): `www.recreation.gov/api/camps/campgrounds/<id>` (booking rules, notices, description) and `www.recreation.gov/api/search/campsites?fq=asset_id:<id>&size=1` (`total` = campsite count) | site counts, booking windows, closures |
   | RIDB API `https://ridb.recreation.gov/api/v1/facilities/<id>` (header `apikey: $RIDB_API_KEY`; also `/facilities/<id>/campsites`) | official facility details and campsite lists for federal campgrounds |
   | parks.ca.gov park pages and campground maps, reservecalifornia.com | state park seasons, closures, site counts |
   | Web search | hints only; a value from search alone is marked "needs checking" |
   If an official host is unreachable from the session, fall back to web search and say so in the pull request.
4. **Change the data**, never the page code:
   - `data/seasons.js`: `openDates`, `peakDates`, `sites`, `sitesNote`, `src`; set `DATA_SEASONS` to the run date.
   - `data/campgrounds.js`: per-campground values for split rows, and new campgrounds (`add(...)`).
   - `data/sites.js`: booking rules (months ahead, release time, monthly block day) only when an official page states a change; bump `DATA_CHECKED`.
   - `data/permits.js`: new season dates (`open`, `close`, `announced`), and remove "projected" once a year's dates are published.
   A value changes only when a source says so. Where sources disagree, keep the official one and note the range in `sitesNote`.
5. **Test**: `node tests/engine.test.cjs`, `node tests/ui.cjs` (in `availability/`) and `node tests/regression.cjs` (repo root).
   If a test fails because of the data change, fix the data; never edit or skip a test to make it pass.
6. **Open a pull request** titled `Campsite data update YYYY-MM-DD` with:
   - a table: campground, field, old value, new value, source link;
   - what could not be checked and why (unreachable site, no information yet);
   - anything the owner should act on (a booking window that opens soon, a closure, a new lottery).
   If nothing changed, open no pull request and leave a one-line note in the session instead.

## What the owner may be asked to do
- Review and merge the weekly pull request.
- Keep network access for `www.nps.gov`, `www.recreation.gov`, `ridb.recreation.gov`, `www.parks.ca.gov` and `www.reservecalifornia.com` in the environment settings.
- Keep the RIDB key in the environment variable `RIDB_API_KEY` (set up 2026-11-02). If it stops working (401), regenerate it at ridb.recreation.gov and update the variable.

## Adding the rest of California (later)
- **State parks:** the ReserveCalifornia facility list (about 280 campgrounds), one row per campground, `system: "rc"`, default rule `RC6`.
- **Federal:** California campgrounds from Recreation.gov (NPS, USFS, BLM, USACE), `system: "rec"`, default rule `REC6`.
