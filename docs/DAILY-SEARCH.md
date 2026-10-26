# Daily check (planned, not built)

Goal: keep `data/sites.js` correct without hand-editing, and tell the owner when a booking rule changes (for example Yosemite delaying a summer release).

## What the daily job does
1. **Load** the current rows from `data/sites.js`.
2. **Fetch** each row's sources (the `sources` list) and the booking site's own page for that campground.
3. **Extract** the fields we publish: release rule (months ahead, release time, monthly block day), season dates, peak-season notes, walk-up / first-come notes, closures, and any new alert text.
4. **Compare** with the stored row. Anything that differs becomes a proposed change; nothing is overwritten silently.
5. **Report**: open a pull request that edits `data/sites.js` (and bumps `DATA_CHECKED`), with a table of old vs new values and the source link for each. A human merges it.
6. **Confidence**: a row moves to `conf: "good"` only when an official page confirms every field; fields that could not be confirmed stay in `check`.

## Where to run it
A scheduled GitHub Action (cron, once a day, early morning Pacific). It needs no server of its own.

## Sources, in order of trust
| Source | Use | Notes |
|---|---|---|
| Park pages on nps.gov (camping / reservations / alerts) | Season, closures, release schedule announcements | Public pages; respect robots.txt and rate limits |
| Recreation.gov facility pages and the RIDB API (`ridb.recreation.gov/api/v1`) | Facility names and IDs, booking details | Free API key stored as a GitHub secret, never in the repo. Availability itself is not part of RIDB |
| ReserveCalifornia FAQs and park pages on parks.ca.gov | State park rules and season dates | The facility list (about 280 campgrounds) can seed the full state-park table |
| Web search for "<park> campground reservations release" | Catch announcements (delays, lotteries, new rules) | Search results are hints; confirm against an official page before changing a row |

## Adding the rest of California
- **State parks:** import the ReserveCalifornia facility list, one row per campground, `system: "rc"`, default rule `RC6`, then fill season, peak and walk-up from each park's page.
- **Federal:** pull California campgrounds from RIDB (organizations NPS, USFS, BLM, USACE), `system: "rec"`, default rule `REC6`, then override where a campground uses a different window.
- **Walk-up:** a campground is walk-up friendly when its page says first-come, first-served or when it keeps same-day sites. Track it in `walkup` (`none`, `some`, `only`) and add the detail in `walkupNote`.

## Things to decide before building it
- Terms of service and rate limits for each site; prefer official APIs and public pages over scraping logged-in views.
- Where API keys live (GitHub Actions secrets) and who reviews the pull requests.
- Whether to add live availability later (needs a small server-side proxy because browsers block these calls and keys must stay private); see the Trip Planner notes in the main project's `docs/INTEGRATIONS.md`.
