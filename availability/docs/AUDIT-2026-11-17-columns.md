# Audit of the new booking-date columns (11/17/2026)

Columns checked on every campground row (903): Currently available through, Open date, Open time, Next date available, How it opens, Days out.

## How

1. The site's own table was dumped in headless Chromium (PT clock, the night of 11/16, before the 11/17 7:00 AM release), with each row's rule, `bookableThrough` and next release.
2. Every Recreation.gov booking calendar (710 campgrounds) was read again through the public availability endpoint the night of 11/16. The reading is in `tools/readings/2026-11-16-night.jsonl`.
3. Each campground's own Recreation.gov record was read for its published `reservationWindow`. 40 publish one; they are saved in `tools/readings/2026-11-17-published-windows.json`.
4. These official pages were read:
   - parks.ca.gov ReserveCalifornia FAQ (29676) and drawing FAQ (31271)
   - nps.gov Yosemite reservations, campgrounds and North Pines lottery pages
   - nps.gov Sequoia & Kings Canyon campgrounds page

## Results

| | Rows |
|---|---|
| Recreation.gov rows compared with the calendar | 713 |
| Consistent | 568 |
| Next season not released yet, consistent with the rule but not measurable now | 67 (plus Azalea, closed with nothing reservable) |
| No calendar served (rule stays marked assumed) | 73 |
| Fixed | 8 (below) |
| ReserveCalifornia rows (6 months at 8:00 AM, matching the official FAQ) | 158 |
| First-come and other rows, no booking date shown | 32 |

How the rows were judged:
- **Rolling and daily rows:** the first not-yet-released night sits 1–15 nights past "Currently available through", which is the documented max-stay overhang.
- **Block rows:** the last released night equals the date shown.
- **Formatting:** every date is MM/DD/YYYY and every time reads like "7:00 AM PST" (PDT for summer dates). There are no blank or "Invalid" cells and no page errors.

All 40 published windows agree with the site's rule, with one exception: Crystal Springs, which is not changed (see below).

## Fixed

| Row | Was | Now | Source |
|---|---|---|---|
| North Pines (Yosemite) | Next: 04/15–05/14/2027 opens 12/15/2026 | Not on general sale yet; 04/16–07/14/2027 opens 02/15/2027 7:00 AM, after the early-access lottery | nps.gov/yose/planyourvisit/lottery.htm |
| Cold Springs (Sequoia) | First-come, no reservations | Recreation.gov, 1 month ahead; 2027 calendar not released yet | Recreation.gov record 246864 (window 1 month) and its calendar |
| Conklin Park Family (Plumas NF, added 11/16) | 6 months (assumed) | First-come only | Recreation.gov record 10192027 ("first-come, first-served basis only"); every night is listed as not reservable |
| Hornswoggle Group (Tahoe NF) | Season released through 09/30/2027 | Through 10/15/2027 | Recreation.gov calendar 10040012 |
| Sequoia & Kings Canyon: Dorst, Atwell Mill, Buckeye Flat, Moraine, Sheep Creek, Sunset (1 month); Lodgepole, Azalea, Sentinel (4 months) | Assumed rule | Confirmed | Each campground's Recreation.gov record |
| Camp 4 (7 days) and Tuolumne Meadows (2 months on the 15th) | Assumed rule | Confirmed; Tuolumne's other half of the sites is on a rolling 14-day window | nps.gov/yose/planyourvisit/camping.htm |
| 18 seasonal campgrounds whose whole booking window falls in closed months (Crane Flat, White Wolf, Tuolumne, Cold Springs and others) | A bookable-looking date, e.g. "11/30/2026" | "Closed for the season", with the window edge and the reopening month | Each row's open months |
| Yosemite "Open date" details | "Dates Jun 15, 2027 to Jul 14, 2027" | "Dates 06/15/2027 to 07/14/2027" | Formatting |
| Sorting by Open time | Rows with no time sorted first | Sorted last | |
| "1 months ahead" | | "1 month ahead" | |

## Needs a decision

- **Crystal Springs (Sequoia & Kings Canyon):** Recreation.gov's record publishes a 2-day window. The site keeps 6 months (assumed). The 2027 calendar shows nothing until 05/26/2027, so neither reading can be confirmed yet.
- **Open time zone label:** summer dates show "PDT", which is correct. The request said "PST". Say if the label should always read PST.
- **Block and whole-season campgrounds (133):** no next release date is published on Recreation.gov, NPS or the Forest Service. The table says "Not published".
- **73 campgrounds with no calendar served:** they keep the 6-month assumption, marked "(assumed rule)".
- **Hand-edited windows.js entries:** Hornswoggle and Conklin Park were edited by hand. The next run of `tools/release_rules.py` regenerates `windows.js` from the classifier output, so carry these two forward.

## Release time measured (11/18/2026)

Recreation.gov's calendar API was read every 2 minutes from 11:42 PM PT 11/17 to 5:30 AM PT 11/18 for Crystal Lake (232336) and Black Rock (232473).
- Crystal Lake: arrival 05/18/2027 still closed at 5:08 AM PST, open at 5:10 AM PST.
- Black Rock: its edge moved by 5:12 AM PST.
- Nothing changed between midnight and 5:08 AM.

So the daily rolling release is about 5:00 AM Pacific (8:00 AM Eastern); the API showed it a few minutes later. The site's Recreation.gov rolling rules now use 05:00 instead of the assumed 07:00. These keep 7:00 AM, because NPS publishes that time for them:
- Yosemite's monthly blocks and 7- and 14-day windows
- Point Reyes backcountry
- permits

Raw readings: tools/readings/2026-11-18-release-minute.jsonl.
