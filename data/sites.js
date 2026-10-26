/* Campsite release data for California.
   Built from a web search on 2026-10-26. Nothing here was read from Recreation.gov or ReserveCalifornia directly (those sites were not reachable
   from the build environment), so every row carries a confidence level and a list of fields still to verify. The daily check (docs/DAILY-SEARCH.md)
   is meant to confirm and refresh these.

   rule.kind
     rolling   {months,time}                 every day at `time` (Pacific) the date exactly `months` months ahead opens
     monthly   {blockStart,monthsAhead,time} on day (blockStart) of each month at `time`, a whole block opens that begins `monthsAhead` months later
                                             (block = blockStart of one month through the day before blockStart of the next)
     days      {days,time}                   rolling window `days` days ahead
     none                                    nothing to release (first-come, first-served) or release rule not known
   walkup: "none" | "some" | "only"
   conf:   "good" (official page or several agreeing sources) | "check" (secondary or conflicting sources) | "assumed" (system default applied)
   check:  fields to verify: "season" | "peak" | "rule" | "walkup"
   Months are 1-12. */
window.DATA_CHECKED = "2026-10-26";
window.SYSTEMS = {
  rec: { name: "Recreation.gov", url: "https://www.recreation.gov/", tz: "America/Los_Angeles", note: "Federal lands: national parks, forests, BLM. Default rolling 6 months, new date opens 7:00 AM Pacific (10:00 AM Eastern). Individual campgrounds can differ." },
  rc: { name: "ReserveCalifornia", url: "https://www.reservecalifornia.com/", tz: "America/Los_Angeles", note: "California State Parks. Rolling 6 months to the day, new date opens 8:00 AM Pacific." },
  fcfs: { name: "First-come, first-served", url: "", tz: "America/Los_Angeles", note: "No advance booking. Arrive early; weekends and holidays fill fast." },
  other: { name: "Other / concessionaire", url: "", tz: "America/Los_Angeles", note: "Booked outside Recreation.gov and ReserveCalifornia." }
};
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const S = (t, u) => ({ t, u });
const REC6 = { kind: "rolling", months: 6, time: "07:00" };
const RC6 = { kind: "rolling", months: 6, time: "08:00" };
const YOSE15 = { kind: "monthly", blockStart: 15, monthsAhead: 5, time: "07:00" };
window.SITES = [
  /* ---------- system-wide defaults (cover every campground that has no row of its own) ---------- */
  { id: "sys-rec", name: "Any Recreation.gov campground (default rule)", park: "All federal campgrounds in California", region: "Statewide", agency: "NPS / USFS / BLM", system: "rec", rule: REC6,
    open: null, openNote: "Varies by campground", peak: null, peakNote: "Varies by campground", walkup: "some", walkupNote: "Many campgrounds keep first-come sites; their availability is not shown live on Recreation.gov",
    conf: "good", check: [], notes: "Individual campgrounds can use a different window (monthly blocks, shorter windows, lotteries). Check the row for the park or the campground page.",
    sources: [S("Outdoorithm 2026 booking-window guide", "https://outdoorithm.com/blog/when-do-campground-reservations-open-2026"), S("Recreation.gov", "https://www.recreation.gov/")] },
  { id: "sys-rc", name: "Any California State Parks campground (default rule)", park: "All state park campgrounds", region: "Statewide", agency: "California State Parks", system: "rc", rule: RC6,
    open: null, openNote: "Varies by park", peak: null, peakNote: "Summer, holiday weekends and school breaks fill first; coastal parks fill year-round on weekends", walkup: "some",
    walkupNote: "Many parks keep a few first-come or same-day sites; availability comes from cancellations and is not guaranteed", conf: "good", check: ["peak"],
    notes: "About 13,000 campsites on ReserveCalifornia. Each new date opens 6 months to the day at 8:00 AM Pacific; log in 15-20 minutes early.",
    sources: [S("ReserveCalifornia FAQs (California State Parks)", "https://www.parks.ca.gov/29676"), S("KQED guide", "https://www.kqed.org/news/11953853/how-to-find-a-camping-spot-in-california-when-they-always-seem-to-be-fully-booked")] },

  /* ---------- Yosemite ---------- */
  { id: "yose-upper-pines", name: "Upper Pines", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: YOSE15,
    open: ALL, openNote: "Open most of the year; closed May 26-Jun 8, 2026 for work", peak: [5, 6, 7, 8, 9], peakNote: "May-Sep sells out in seconds or minutes", walkup: "none", walkupNote: "No first-come campgrounds in Yosemite spring through fall",
    conf: "good", check: ["season"], notes: "Blocks of one month open 5 months ahead on the 15th at 7:00 AM Pacific. 2026 summer releases were delayed to March; watch park notices.",
    sources: [S("NPS Yosemite campground reservations", "https://www.nps.gov/yose/planyourvisit/camping.htm"), S("Outdoorithm Yosemite 2026", "https://outdoorithm.com/blog/yosemite-camping-sold-out-2026"), S("More Than Just Parks", "https://morethanjustparks.com/yosemite-reservations/")] },
  { id: "yose-lower-pines", name: "Lower Pines", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: YOSE15,
    open: [3, 4, 5, 6, 7, 8, 9, 10], openNote: "Seasonal; closed Jun 9-19, 2026 for work", peak: [5, 6, 7, 8, 9], peakNote: "May-Sep", walkup: "none", walkupNote: "No first-come campgrounds spring through fall",
    conf: "check", check: ["season"], notes: "Same monthly release as the other Pines campgrounds.", sources: [S("NPS Yosemite campground reservations", "https://www.nps.gov/yose/planyourvisit/camping.htm"), S("Outdoorithm Yosemite 2026", "https://outdoorithm.com/blog/yosemite-camping-sold-out-2026")] },
  { id: "yose-north-pines", name: "North Pines", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: YOSE15,
    open: [4, 5, 6, 7, 8, 9, 10], openNote: "Seasonal; closed Jun 22-Jul 2, 2026 for road work", peak: [5, 6, 7, 8, 9], peakNote: "May-Sep", walkup: "none", walkupNote: "No first-come campgrounds spring through fall",
    conf: "check", check: ["season"], notes: "A one-time early-access lottery covered the 2026 season; leftover sites went into the regular Feb 15 release.", sources: [S("Recreation.gov North Pines", "https://www.recreation.gov/camping/campgrounds/232449"), S("Outdoorithm Yosemite 2026", "https://outdoorithm.com/blog/yosemite-camping-sold-out-2026")] },
  { id: "yose-wawona", name: "Wawona", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: YOSE15,
    open: [4, 5, 6, 7, 8, 9, 10, 11], openNote: "2026: Loop A open to Nov 29; Loops B and C closed from Oct 26", peak: [6, 7, 8, 9], peakNote: "Summer", walkup: "none", walkupNote: "No first-come campgrounds spring through fall",
    conf: "check", check: ["season", "peak"], notes: "Monthly block release, 5 months ahead on the 15th.", sources: [S("NPS Yosemite campground reservations", "https://www.nps.gov/yose/planyourvisit/camping.htm"), S("Sierra News", "https://sierranewsonline.com/yosemite-camping-plans-shift-as-summer-winds-down/")] },
  { id: "yose-hodgdon", name: "Hodgdon Meadow", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: YOSE15,
    open: ALL, openNote: "Believed year-round; check winter status", peak: [6, 7, 8, 9], peakNote: "Summer", walkup: "some", walkupNote: "Winter rules differ; check Recreation.gov",
    conf: "check", check: ["season", "peak", "walkup"], notes: "Monthly block release, 5 months ahead on the 15th.", sources: [S("NPS Yosemite campground reservations", "https://www.nps.gov/yose/planyourvisit/camping.htm")] },
  { id: "yose-tuolumne", name: "Tuolumne Meadows", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: { kind: "monthly", blockStart: 15, monthsAhead: 2, time: "07:00" },
    open: [6, 7, 8, 9], openNote: "Opening date set by Tioga Road snow clearing (median about May 21 historically)", peak: [7, 8], peakNote: "Jul-Aug", walkup: "none", walkupNote: "No first-come sites in season",
    conf: "check", check: ["rule", "season"], notes: "Half the sites open 2 months ahead on the 15th; the other half open on a rolling window about 2 weeks ahead (shown here is the 2-month half).", sources: [S("NPS Yosemite campground reservations", "https://www.nps.gov/yose/planyourvisit/camping.htm"), S("Outdoorithm Yosemite 2026", "https://outdoorithm.com/blog/yosemite-camping-sold-out-2026")] },
  { id: "yose-camp4", name: "Camp 4 (walk-in)", park: "Yosemite National Park", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: { kind: "days", days: 7, time: "07:00" },
    open: [4, 5, 6, 7, 8, 9, 10, 11], openNote: "Apr 15-Nov 9 in 2026", peak: [5, 6, 7, 8, 9, 10], peakNote: "Climbing season", walkup: "none", walkupNote: "Reserved through Recreation.gov, $10 per person per night",
    conf: "good", check: ["rule"], notes: "Opens one week before arrival (release time assumed 7:00 AM Pacific).", sources: [S("NPS Yosemite Camp 4", "https://home.nps.gov/yose/planyourvisit/camp4.htm")] },

  /* ---------- Sequoia & Kings Canyon ---------- */
  { id: "seki-lodgepole", name: "Lodgepole", park: "Sequoia & Kings Canyon National Parks", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: { kind: "monthly", blockStart: 15, monthsAhead: 1, time: "07:00" },
    open: null, openNote: "Not verified", peak: [6, 7, 8, 9], peakNote: "Fills within minutes in summer", walkup: "none", walkupNote: "Not verified",
    conf: "check", check: ["rule", "season", "walkup"], notes: "One source says standard Sequoia/Kings Canyon sites open one month ahead on the 15th at 7:00 AM Pacific. Older sources describe a 6-month window. Confirm on Recreation.gov.",
    sources: [S("The Dyrt camping guide", "https://www.thedyrt.com/guides/np/sequoia-kings-canyon-national-parks-camping-guide"), S("NPS Sequoia & Kings Canyon", "https://www.nps.gov/seki/planyourvisit/camping.htm")] },
  { id: "seki-dorst", name: "Dorst Creek", park: "Sequoia & Kings Canyon National Parks", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: { kind: "none" },
    open: [], openNote: "Closed for 2026 (disaster recovery / hazard-tree work)", peak: null, peakNote: "", walkup: "none", walkupNote: "", status: "closed",
    conf: "check", check: ["rule"], notes: "Recreation.gov says it will not take reservations in 2026.", sources: [S("Recreation.gov Dorst Creek", "https://www.recreation.gov/camping/campgrounds/232460"), S("The Dyrt camping guide", "https://www.thedyrt.com/guides/np/sequoia-kings-canyon-national-parks-camping-guide")] },
  { id: "seki-cold-springs", name: "Cold Springs", park: "Sequoia & Kings Canyon National Parks", region: "Sierra Nevada", agency: "NPS", system: "fcfs", rule: { kind: "none" },
    open: [6, 7, 8, 9, 10], openNote: "Jun 15-Oct 13 in 2026", peak: [7, 8], peakNote: "Summer weekends", walkup: "only", walkupNote: "First-come, first-served",
    conf: "check", check: ["season"], notes: "", sources: [S("The Dyrt camping guide", "https://www.thedyrt.com/guides/np/sequoia-kings-canyon-national-parks-camping-guide")] },
  { id: "seki-azalea", name: "Azalea", park: "Sequoia & Kings Canyon National Parks", region: "Sierra Nevada", agency: "NPS", system: "rec", rule: { kind: "none" },
    open: ALL, openNote: "Year-round", peak: [6, 7, 8, 9], peakNote: "Summer: all sites reserved", walkup: "some", walkupNote: "Fall and winter sites are first-come, first-served",
    resMonths: [5, 6, 7, 8, 9], conf: "check", check: ["rule", "season"], notes: "Summer is reservation-only; release rule not verified.", sources: [S("The Dyrt camping guide", "https://www.thedyrt.com/guides/np/sequoia-kings-canyon-national-parks-camping-guide")] },

  /* ---------- Joshua Tree ---------- */
  { id: "jotr-black-rock", name: "Black Rock", park: "Joshua Tree National Park", region: "Desert", agency: "NPS", system: "rec", rule: REC6,
    open: ALL, openNote: "Year-round", peak: [10, 11, 12, 1, 2, 3, 4, 5], peakNote: "Oct-May busy season", walkup: "none", walkupNote: "Reservation required; same-day booking on Recreation.gov",
    conf: "good", check: [], notes: "Reservations from 6 months ahead to the same day. 99 sites.", sources: [S("NPS Joshua Tree campgrounds", "https://www.nps.gov/jotr/planyourvisit/campgrounds.htm")] },
  { id: "jotr-jumbo-rocks", name: "Jumbo Rocks", park: "Joshua Tree National Park", region: "Desert", agency: "NPS", system: "rec", rule: REC6,
    open: ALL, openNote: "Year-round", peak: [10, 11, 12, 1, 2, 3, 4, 5], peakNote: "Oct-May busy season", walkup: "none", walkupNote: "NPS lists it as reservation-required; older guides say first-come in the off-season",
    conf: "check", check: ["walkup"], notes: "Confirm current rule on the NPS page.", sources: [S("NPS Joshua Tree campgrounds", "https://www.nps.gov/jotr/planyourvisit/campgrounds.htm")] },
  { id: "jotr-indian-cove", name: "Indian Cove", park: "Joshua Tree National Park", region: "Desert", agency: "NPS", system: "rec", rule: REC6,
    open: ALL, openNote: "Year-round", peak: [10, 11, 12, 1, 2, 3, 4, 5], peakNote: "Oct-May busy season", walkup: "none", walkupNote: "Reservation required",
    conf: "good", check: [], notes: "", sources: [S("NPS Joshua Tree campgrounds", "https://www.nps.gov/jotr/planyourvisit/campgrounds.htm")] },
  { id: "jotr-fcfs", name: "Hidden Valley, Belle, White Tank", park: "Joshua Tree National Park", region: "Desert", agency: "NPS", system: "fcfs", rule: { kind: "none" },
    open: ALL, openNote: "Year-round", peak: [10, 11, 12, 1, 2, 3, 4, 5], peakNote: "Weekend sites full by Friday afternoon", walkup: "only", walkupNote: "First-come; pay within 1 hour of setting up ($25/night)",
    conf: "good", check: [], notes: "", sources: [S("NPS Joshua Tree campgrounds", "https://www.nps.gov/jotr/planyourvisit/campgrounds.htm")] },

  /* ---------- Death Valley ---------- */
  { id: "deva-furnace-creek", name: "Furnace Creek", park: "Death Valley National Park", region: "Desert", agency: "NPS", system: "rec", rule: REC6,
    open: ALL, openNote: "Reservable Oct 15-Apr 15; first-come in summer with fewer sites", peak: [10, 11, 12, 1, 2, 3, 4], peakNote: "Oct 15-Apr 15: booked to capacity most days", walkup: "some", walkupNote: "A few first-come sites; not shown live on Recreation.gov",
    resMonths: [10, 11, 12, 1, 2, 3, 4], conf: "good", check: [], notes: "Reservations must be made at least 2 days ahead, up to 6 months. Summer camping is not recommended (heat).", sources: [S("NPS Camping in Death Valley", "https://www.nps.gov/deva/planyourvisit/camping-in-death-valley.htm"), S("Recreation.gov Furnace Creek", "https://www.recreation.gov/camping/campgrounds/232496")] },
  { id: "deva-fcfs", name: "Sunset, Stovepipe Wells, Texas Springs", park: "Death Valley National Park", region: "Desert", agency: "NPS", system: "fcfs", rule: { kind: "none" },
    open: [11, 12, 1, 2, 3, 4], openNote: "Late fall to Apr 15", peak: [11, 12, 1, 2, 3, 4], peakNote: "Sunset almost always has space", walkup: "only", walkupNote: "First-come, first-served",
    conf: "good", check: [], notes: "", sources: [S("NPS Camping in Death Valley", "https://www.nps.gov/deva/planyourvisit/camping-in-death-valley.htm")] },

  /* ---------- Other federal ---------- */
  { id: "pinn-campground", name: "Pinnacles Campground", park: "Pinnacles National Park", region: "Central Coast", agency: "NPS", system: "rec", rule: REC6,
    open: ALL, openNote: "Year-round (pool seasonal, about Apr-Sep)", peak: [3, 4, 5, 10], peakNote: "Spring and fall weekends (typical, not confirmed)", walkup: "none", walkupNote: "No first-come sites",
    conf: "check", check: ["rule", "peak"], notes: "Individual sites 6 months ahead, group sites up to 12 months (third-party report).", sources: [S("Recreation.gov Pinnacles Campground", "https://www.recreation.gov/camping/campgrounds/234015"), S("Park Ranger John", "https://www.parkrangerjohn.com/pinnacles-national-park-camping-pinnacles-campground/")] },
  { id: "lavo-manzanita", name: "Manzanita Lake", park: "Lassen Volcanic National Park", region: "Cascades", agency: "NPS", system: "rec", rule: REC6,
    open: [5, 6, 7, 8, 9, 10], openNote: "May-Oct", peak: [7, 8], peakNote: "Summer", walkup: "some", walkupNote: "Unreserved sites are first-come for one night; after the reservation period all sites are first-come",
    conf: "check", check: ["rule", "peak"], notes: "Window not confirmed; 6 months assumed.", sources: [S("NPS Lassen campgrounds", "https://www.nps.gov/lavo/planyourvisit/camping-in-campgrounds.htm"), S("Park Ranger John", "https://www.parkrangerjohn.com/lassen-volcanic-national-park-camping/")] },
  { id: "lavo-summit", name: "Summit Lake", park: "Lassen Volcanic National Park", region: "Cascades", agency: "NPS", system: "rec", rule: REC6,
    open: [6, 7, 8, 9], openNote: "About Jun-Sep", peak: [7, 8], peakNote: "Summer", walkup: "some", walkupNote: "Reservations must be made at least 4 days ahead; all sites reservable after Jul 1",
    conf: "check", check: ["rule", "season"], notes: "", sources: [S("NPS Lassen campgrounds", "https://www.nps.gov/lavo/planyourvisit/camping-in-campgrounds.htm")] },
  { id: "lavo-southwest", name: "Southwest Walk-in", park: "Lassen Volcanic National Park", region: "Cascades", agency: "NPS", system: "fcfs", rule: { kind: "none" },
    open: ALL, openNote: "Year-round", peak: [7, 8], peakNote: "Summer", walkup: "only", walkupNote: "Walk-in, first-come only",
    conf: "check", check: ["peak"], notes: "", sources: [S("NPS Lassen campgrounds", "https://www.nps.gov/lavo/planyourvisit/camping-in-campgrounds.htm")] },
  { id: "chis-scorpion", name: "Scorpion Anchorage (Santa Cruz Island)", park: "Channel Islands National Park", region: "Channel Islands", agency: "NPS", system: "rec", rule: REC6,
    open: ALL, openNote: "Year-round", peak: [6, 7, 8, 9], peakNote: "Summer", walkup: "none", walkupNote: "Book the boat (Island Packers) first, then the campsite",
    conf: "check", check: ["season"], notes: "Family sites 6 months ahead; group sites reported as 6 or 12 months. 7 consecutive nights max.", sources: [S("Island Packers: Scorpion camping", "https://islandpackers.com/island-camping/scorpion-anchorage-camping-santa-cruz-island/")] },
  { id: "pore-backcountry", name: "Backcountry camps (Coast, Glen, Sky, Wildcat)", park: "Point Reyes National Seashore", region: "North Coast", agency: "NPS", system: "rec", rule: { kind: "rolling", months: 3, time: "07:00" },
    open: ALL, openNote: "Year-round", peak: [6, 7, 8, 9], peakNote: "Summer weekends (typical)", walkup: "none", walkupNote: "Permit through Recreation.gov; 4 nights per visit",
    conf: "check", check: ["peak"], notes: "Three months to the day. Release time assumed 7:00 AM Pacific.", sources: [S("NPS Point Reyes backcountry camping", "https://www.nps.gov/thingstodo/point-reyes-backcountry-camping.htm")] },
  { id: "labe-indian-well", name: "Indian Well", park: "Lava Beds National Monument", region: "Cascades", agency: "NPS", system: "fcfs", rule: { kind: "none" },
    open: [4, 5, 6, 7, 8, 9, 10], openNote: "Group site Apr-Oct; Loop B closes after Thanksgiving", peak: [6, 7, 8], peakNote: "Fills on summer holiday weekends", walkup: "only", walkupNote: "Most sites first-come; group site reservable",
    conf: "check", check: ["rule"], notes: "Group site up to 6 months ahead on Recreation.gov.", sources: [S("Recreation.gov Indian Well", "https://www.recreation.gov/camping/campgrounds/10334752")] },
  { id: "moja-fcfs", name: "Mid Hills and Hole-in-the-Wall", park: "Mojave National Preserve", region: "Desert", agency: "NPS", system: "fcfs", rule: { kind: "none" },
    open: ALL, openNote: "Year-round (Mid Hills at 5,600 ft gets cold)", peak: [3, 4, 5, 10, 11], peakNote: "Spring and fall (typical)", walkup: "only", walkupNote: "First-come at about $12; one forum post claims reservations began in 2025",
    conf: "check", check: ["rule", "peak"], notes: "Sources conflict on whether reservations were added.", sources: [S("Hikespeak: Mojave camping", "https://www.hikespeak.com/campgrounds/mojave-national-preserve/")] },

  /* ---------- California State Parks (ReserveCalifornia) ---------- */
  { id: "sp-pfeiffer", name: "Pfeiffer Big Sur", park: "Pfeiffer Big Sur State Park", region: "Central Coast", agency: "California State Parks", system: "rc", rule: RC6,
    open: ALL, openNote: "Year-round", peak: [5, 6, 7, 8, 9], peakNote: "Usually fully reserved in summer; 7-night maximum in peak season", walkup: "some", walkupNote: "Cancellation sites handed out at 3 PM in person; not guaranteed. No bookings within 48 hours of arrival.",
    conf: "check", check: ["peak"], notes: "Book right at the 6-month mark.", sources: [S("Campendium Big Sur guide", "https://campendium.com/blog/big-sur-camping-guide/"), S("KQED Big Sur camping", "https://kqed.org/news/11988380/want-to-go-camping-in-big-sur-this-summer-what-to-know")] },
  { id: "sp-jedediah-smith", name: "Jedediah Smith Campground", park: "Redwood National and State Parks", region: "North Coast", agency: "California State Parks", system: "rc", rule: RC6,
    open: ALL, openNote: "Year-round (winter: north loop only)", peak: [5, 6, 7, 8, 9], peakNote: "Memorial Day weekend to Labor Day weekend", walkup: "some", walkupNote: "Reservations can be made until 2 days before arrival; leftovers walk-up",
    conf: "check", check: ["walkup"], notes: "Booked through ReserveCalifornia.", sources: [S("NPS Redwood developed campgrounds", "https://www.nps.gov/redw/planyourvisit/developedcampgrounds.htm"), S("The Dyrt Redwood guide", "https://www.thedyrt.com/guides/np/redwood-national-park-camping-guide")] },
  { id: "sp-elk-prairie", name: "Elk Prairie Campground", park: "Prairie Creek Redwoods State Park", region: "North Coast", agency: "California State Parks", system: "rc", rule: RC6,
    open: ALL, openNote: "Year-round", peak: [5, 6, 7, 8, 9], peakNote: "Memorial Day weekend to Labor Day weekend", walkup: "some", walkupNote: "Reservations until 2 days before arrival",
    conf: "check", check: ["walkup"], notes: "", sources: [S("NPS Redwood developed campgrounds", "https://www.nps.gov/redw/planyourvisit/developedcampgrounds.htm")] },
  { id: "sp-mill-creek", name: "Mill Creek Campground", park: "Del Norte Coast Redwoods State Park", region: "North Coast", agency: "California State Parks", system: "rc", rule: RC6,
    open: [5, 6, 7, 8, 9, 10], openNote: "Mid-May to early Oct (sources conflict on year-round)", peak: [6, 7, 8, 9], peakNote: "Summer", walkup: "some", walkupNote: "Reservations until 2 days before arrival",
    conf: "check", check: ["season"], notes: "", sources: [S("The Dyrt Redwood guide", "https://www.thedyrt.com/guides/np/redwood-national-park-camping-guide"), S("NPS Redwood developed campgrounds", "https://www.nps.gov/redw/planyourvisit/developedcampgrounds.htm")] },
  { id: "sp-borrego-palm", name: "Borrego Palm Canyon", park: "Anza-Borrego Desert State Park", region: "Desert", agency: "California State Parks", system: "rc", rule: RC6,
    open: ALL, openNote: "Year-round", peak: [10, 11, 12, 1, 2, 3, 4], peakNote: "Oct-Apr", walkup: "some", walkupNote: "Reservations Oct 1-Apr 30; first-come May-Sep",
    resMonths: [10, 11, 12, 1, 2, 3, 4], conf: "check", check: ["season"], notes: "Site-specific reservations; highly recommended in the reservation season.", sources: [S("California State Parks campsite map", "https://www.parks.ca.gov/pages/638/files/AnzaBorregoPalmCanyon_CampMap2017.pdf"), S("Campflare", "https://campflare.com/campground/borrego-palm-canyon-campground-californiastateparks-151")] }
];
