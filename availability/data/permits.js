/* Permits and lotteries (Yosemite first). Built from a web search on 2026-10-26; Recreation.gov and nps.gov were not reachable from the build
   environment, so the fields below say what each source claimed and which parts still need an official check.
   phase.kind
     annual   a yearly application window  {open:{m,d,time?}, close:{m,d,time?}, announced:<year the dates were seen>}
     weekly   a weekly lottery that targets start dates `leadDays` ahead (Sunday 12:01 AM to Saturday 11:59 PM Pacific)
     daily    a lottery `daysBefore` days before the trip date, `open` to `close` Pacific time
     days     a rolling release `days` days before the trip date at `time` Pacific
     monthsBefore  a rolling release `openMonths` before the trip date (`time` Pacific if published), open until `closeMonths` before
     oneTime  a lottery that ran once  {open:"YYYY-MM-DDTHH:MM", close:"…"} Pacific wall-clock
   valid: {from:"MM-DD", to:"MM-DD"} trip dates the phase applies to */
window.PERMITS = [
  { id: "half-dome", name: "Half Dome cables permit", park: "Yosemite National Park", system: "Recreation.gov", url: "https://www.recreation.gov/permits/234652",
    summary: "",
    // key dates, one per row: event, next season (projected until Recreation.gov posts it), time Pacific, last season (official)
    // one row per permit opening (2027 projected from the NPS rule until Recreation.gov posts it)
    openingsYear: "2027 (projected)",
    openings: [
      { name: "Preseason lottery", open: "03/01/2027", time: "12:00 AM", close: "03/31/2027, 4:59 PM", release: "04/10/2027", hike: "05/28/2027 – 10/12/2027", permits: "225 a day" },
      { name: "Daily lottery", open: "2 days before the hike", time: "12:00 AM", close: "Same day, 4:00 PM", release: "Same night", hike: "05/28/2027 – 10/12/2027", permits: "~50 a day" }
    ],
    fees: "$10 per application (not refundable); $10 per person if you win",
    group: "Up to 6 people; preseason: up to 7 date choices and an alternate; one application per person per lottery", conf: "good",
    check: ["2027 dates are projected until Recreation.gov posts them"],
    phases: [
      { id: "hd-pre", label: "Preseason lottery", kind: "annual", open: { m: 3, d: 1, time: "00:00" }, close: { m: 3, d: 31, time: "16:59" }, announced: 2026, valid: { from: "05-28", to: "10-12" },
        results: "Release 04/10", what: "", note: "" },
      { id: "hd-daily", label: "Daily lottery", kind: "daily", daysBefore: 2, open: "00:00", close: "16:00", valid: { from: "05-28", to: "10-12" },
        results: "Release same night", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Half Dome permit, important dates and quota (2026)", u: "https://www.recreation.gov/permits/234652" }, { t: "NPS: Half Dome permits for day hikers", u: "https://www.nps.gov/yose/planyourvisit/hdpermits.htm" }] },

  { id: "yose-wilderness", name: "Yosemite wilderness permits (overnight trailheads)", park: "Yosemite National Park", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445859",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "2027 season (Recreation.gov)",
    openings: [
      { name: "Weekly lottery", open: "Every Sunday, 11/08/2026 – 05/07/2027", time: "12:01 AM", close: "Saturday, 11:59 PM", release: "Monday evening (accept by Thursday, 11:59 PM)", hike: "Start dates 24 weeks after the lottery week", permits: "60% of trailhead quota" },
      { name: "Lottery leftovers", open: "Friday, 12 days after each lottery opens (from 11/20/2026)", time: "9:00 AM", close: "3 days before the start date", release: "Instant", hike: "Same start dates as that lottery", permits: "What the lottery did not award" },
      { name: "7-day release", open: "7 days before the start date", time: "7:00 AM", close: "3 days before the start date", release: "Instant", hike: "Start dates to 10/24/2027", permits: "40% of trailhead quota" }
    ],
    phases: [
      { id: "yw-lottery", label: "Weekly lottery", kind: "weekly", leadDays: 168, seasonStart: { m: 11, d: 8 }, seasonEnd: { m: 5, d: 7 }, valid: { from: "04-30", to: "10-24" },
        results: "", what: "", note: "" },
      { id: "yw-7day", label: "7-day release", kind: "days", days: 7, time: "07:00", valid: { from: "04-30", to: "10-24" },
        results: "Instant", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Yosemite wilderness permits, 2027 dates", u: "https://www.recreation.gov/permits/445859" }, { t: "NPS: Yosemite wilderness permit reservations", u: "https://www.nps.gov/yose/planyourvisit/wpres.htm" }] },

  { id: "yose-hsc-lottery", name: "Yosemite High Sierra Camps lottery (Glen Aulin, May Lake, Sunrise)", park: "Yosemite National Park", system: "Travel Yosemite", url: "https://www.travelyosemite.com/stay/high-sierra-camps/high-sierra-camp-lottery",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "2027 season (Travel Yosemite)",
    openings: [
      { name: "Lottery application", open: "12/01/2026", time: "12:00 AM", close: "12/31/2026 (the form also says 12/30; apply by the 30th)", release: "Winners emailed by end of February 2027; pay within 7 days", hike: "2027 camps: May Lake Jul 2 – Sep 8; Glen Aulin and Sunrise Jul 9 – Sep 5 (Merced Lake and Vogelsang not offered)", permits: "Unguided stays ($192–$202 adult a night with dinner and breakfast) and the guided 5-day loop ($1,495 adult); meals-only stays are not in the lottery" },
      { name: "General availability", open: "After the lottery (spring 2027)", time: "", close: "Until booked", release: "First come, first served", hike: "Remaining 2027 dates", permits: "What the lottery did not fill, plus cancellations" }
    ],
    phases: [
      { id: "hsc-lottery", label: "Lottery (2027 season)", kind: "oneTime", open: "2026-12-01T00:00", close: "2026-12-30T23:59", results: "By end of February 2027", what: "Apply on travelyosemite.com only", note: "" }
    ],
    sources: [{ t: "Travel Yosemite: High Sierra Camp Lottery", u: "https://www.travelyosemite.com/stay/high-sierra-camps/high-sierra-camp-lottery" }, { t: "NPS: Yosemite lodging", u: "https://www.nps.gov/yose/planyourvisit/lodging.htm" }] }
,
  { id: "north-pines-early", name: "North Pines campground early-access lottery", park: "Yosemite National Park", system: "Recreation.gov", url: "https://www.recreation.gov/camping/campgrounds/232449",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "2027 season (Recreation.gov)",
    openings: [
      { name: "Early-access lottery", open: "11/23/2026", time: "7:00 AM", close: "12/14/2026, 9:00 PM", release: "Booking 01/02/2027 – 02/01/2027", hike: "Stays 04/15/2027 – 10/31/2027", permits: "Whole 2027 season" },
      { name: "Sites left after the lottery", open: "15th of each month", time: "7:00 AM", close: "Until booked", release: "Instant", hike: "Stays 5 months ahead", permits: "Unbooked sites" }
    ],
    phases: [
      { id: "np-lottery", label: "Early-access lottery (2027 season)", kind: "oneTime", open: "2026-11-23T07:00", close: "2026-12-14T21:00", results: "Booking 01/02/2027 – 02/01/2027", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: North Pines Campground (2027 early-access lottery)", u: "https://www.recreation.gov/camping/campgrounds/232449" }, { t: "NPS: North Pines early-access lottery", u: "https://www.nps.gov/yose/planyourvisit/lottery-pilot.htm" }] }
,
  { id: "inyo-wilderness", name: "Inyo National Forest wilderness permits (Ansel Adams, John Muir, Golden Trout, Hoover east side; JMT from the east)", park: "Inyo National Forest", system: "Recreation.gov", url: "https://www.recreation.gov/permits/233262",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "2027 quota season, May 1 – Nov 1 (Recreation.gov)",
    openings: [
      { name: "6-month release (60% of quota)", open: "6 months before the entry date (July 4 opens January 4)", time: "7:00 AM", close: "Until booked", release: "Instant", hike: "Entry dates May 1 – Nov 1", permits: "60% of each trailhead's quota" },
      { name: "2-week release (40% of quota)", open: "2 weeks before, same weekday", time: "7:00 AM", close: "Until booked", release: "Instant", hike: "Entry dates May 1 – Nov 1", permits: "40% of each trailhead's quota" },
      { name: "Non-quota season", open: "Up to 2 weeks ahead", time: "", close: "", release: "Instant", hike: "Nov 2 – Apr 30 (no daily limit)", permits: "Unlimited; permit still required" }
    ],
    phases: [
      { id: "inyo-6mo", label: "6-month release (60%)", kind: "monthsBefore", openMonths: 6, closeMonths: 0, time: "07:00", valid: { from: "05-01", to: "11-01" }, results: "Instant", what: "", note: "" },
      { id: "inyo-2wk", label: "2-week release (40%)", kind: "days", days: 14, time: "07:00", valid: { from: "05-01", to: "11-01" }, results: "Instant", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Inyo National Forest wilderness permits (official dates and rules)", u: "https://www.recreation.gov/permits/233262" }] },
  { id: "mt-whitney", name: "Mt. Whitney lottery (Whitney Trail, day hikes and overnight)", park: "Inyo National Forest", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445860",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "Yearly (2026 dates on Recreation.gov; 2027 expected the same)",
    openings: [
      { name: "Lottery application", open: "February 1", time: "", close: "March 1", release: "Results March 15; claim and pay by April 21", hike: "Hikes May 1 – Nov 1", permits: "Whitney Trail quota" },
      { name: "Unclaimed dates", open: "April 22", time: "7:00 AM", close: "Until booked", release: "Instant", hike: "Hikes May 1 – Nov 1", permits: "Dates the lottery did not fill" },
      { name: "Non-quota season", open: "Up to 2 weeks ahead", time: "", close: "", release: "Instant", hike: "Nov 2 – Apr 30", permits: "Unlimited; permit still required" }
    ],
    phases: [
      { id: "whitney-lottery", label: "Lottery", kind: "annual", open: { m: 2, d: 1 }, close: { m: 3, d: 1 }, announced: 2026, valid: { from: "05-01", to: "11-01" }, results: "March 15", what: "", note: "" },
      { id: "whitney-leftover", label: "Unclaimed lottery dates", kind: "annual", open: { m: 4, d: 22, time: "07:00" }, close: { m: 11, d: 1 }, announced: 2026, valid: { from: "05-01", to: "11-01" }, results: "Instant", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Mt. Whitney (official dates and rules)", u: "https://www.recreation.gov/permits/445860" }] },
  { id: "seki-wilderness", name: "Sequoia & Kings Canyon wilderness permits (High Sierra Trail, Rae Lakes, JMT south)", park: "Sequoia & Kings Canyon National Parks", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445857",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "2027 quota season, May 28 – Sep 25, 2027 (Recreation.gov)",
    openings: [
      { name: "Reservations (rolling)", open: "6 months before the entry date (2027 window opens 11/28/2026)", time: "", close: "1 week before the entry date", release: "Instant", hike: "Entry dates 05/28/2027 – 09/25/2027", permits: "Reservable share of each trailhead's quota" },
      { name: "Walk-up", open: "Day before entry, in person", time: "1:00 PM", close: "Until gone", release: "At the permit station", hike: "Quota season", permits: "Walk-up share plus no-shows; some trailheads (Lakes Trail) walk-up only" },
      { name: "Non-quota period", open: "Self-issue at visitor centers", time: "", close: "", release: "", hike: "09/26/2027 – 05/25/2028", permits: "No daily limit, no fee" }
    ],
    phases: [
      { id: "seki-6mo", label: "Reservations (6 months to 1 week ahead)", kind: "monthsBefore", openMonths: 6, closeMonths: 0, valid: { from: "05-28", to: "09-25" }, results: "Instant", what: "", note: "" },
      { id: "seki-walkup", label: "Walk-up (day before, 1:00 PM)", kind: "days", days: 1, time: "13:00", valid: { from: "05-28", to: "09-25" }, results: "In person", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Sequoia and Kings Canyon wilderness permits (official dates and rules)", u: "https://www.recreation.gov/permits/445857" }] },
  { id: "sierra-nf-wilderness", name: "Sierra National Forest wilderness permits (Ansel Adams, John Muir, Kaiser, Dinkey Lakes; west side)", park: "Sierra National Forest", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445858",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "Quota season (Recreation.gov)",
    openings: [
      { name: "Advance reservations", open: "6 months before the entry date (bulk release the first week of January)", time: "", close: "Until booked", release: "Instant", hike: "Quota season", permits: "Reservable quota" },
      { name: "Walk-up quota (online)", open: "14 days before the entry date", time: "", close: "Until booked", release: "Instant, online only", hike: "Quota season", permits: "Walk-up quota (not issued at stations)" }
    ],
    phases: [
      { id: "sierra-6mo", label: "6-month release", kind: "monthsBefore", openMonths: 6, closeMonths: 0, valid: { from: "06-01", to: "09-30" }, results: "Instant", what: "", note: "" },
      { id: "sierra-14d", label: "Walk-up quota online (14 days)", kind: "days", days: 14, valid: { from: "06-01", to: "09-30" }, results: "Instant", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Sierra National Forest wilderness permit (official dates and rules)", u: "https://www.recreation.gov/permits/445858" }] },
  { id: "desolation-wilderness", name: "Desolation Wilderness overnight permits (Lake Tahoe)", park: "Eldorado National Forest", system: "Recreation.gov", url: "https://www.recreation.gov/permits/233261",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "Quota season: Friday before Memorial Day – Sep 30 (Recreation.gov)",
    openings: [
      { name: "Advance reservations", open: "6 months before the entry date", time: "", close: "Day of entry (if left)", release: "Instant; print up to 7 days ahead", hike: "Quota season", permits: "45 destination zones, first-night quota" },
      { name: "Off-quota season", open: "Day of entry", time: "", close: "", release: "Instant", hike: "Oct 1 – Thursday before Memorial Day", permits: "No zone limit (group max 12)" }
    ],
    phases: [
      { id: "deso-6mo", label: "6-month release", kind: "monthsBefore", openMonths: 6, closeMonths: 0, valid: { from: "05-21", to: "09-30" }, results: "Instant", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Desolation Wilderness permit (official dates and rules)", u: "https://www.recreation.gov/permits/233261" }] },
  { id: "hoover-wilderness", name: "Hoover Wilderness permits (Humboldt-Toiyabe; Twin Lakes, Virginia Lakes, Green Creek)", park: "Humboldt-Toiyabe National Forest", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445856",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "Quota season Jun 15 – Oct 15 (Recreation.gov; 2027 releases start 12/15/2026)",
    openings: [
      { name: "6-month release (50% of quota)", open: "6 months before the entry date (from 12/15/2026)", time: "", close: "Until booked", release: "Instant", hike: "Entry dates Jun 15 – Oct 15", permits: "50% of quota" },
      { name: "3-day release (50% of quota)", open: "3 days before the entry date", time: "7:00 AM", close: "Until booked", release: "Instant", hike: "Entry dates Jun 15 – Oct 15", permits: "The other 50%" }
    ],
    phases: [
      { id: "hoover-6mo", label: "6-month release (50%)", kind: "monthsBefore", openMonths: 6, closeMonths: 0, valid: { from: "06-15", to: "10-15" }, results: "Instant", what: "", note: "" },
      { id: "hoover-3d", label: "3-day release (50%)", kind: "days", days: 3, time: "07:00", valid: { from: "06-15", to: "10-15" }, results: "Instant", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Hoover Wilderness permits (official dates and rules)", u: "https://www.recreation.gov/permits/445856" }] },
  { id: "ca-drawings", name: "California State Parks reservation drawings", park: "California State Parks", system: "ReserveCalifornia", url: "https://www.reservecalifornia.com/",
    summary: "", fees: "", group: "", conf: "good", check: ["exact drawing dates for each arrival date are listed on ReserveCalifornia"],
    openingsYear: "Every arrival date (California State Parks)",
    openings: [
      { name: "Reservation drawing", open: "Up to 8 months before arrival", time: "—", close: "Drawing held 7 months before arrival", release: "Email after the drawing; winners pay within 30 days", hike: "Select sites at Malibu Creek, Morro Bay, Burney Falls (mid-May – Labor Day); Steep Ravine cabins", permits: "Select sites" },
      { name: "Unclaimed sites", open: "6 months before arrival", time: "8:00 AM", close: "Until booked", release: "Instant", hike: "Same sites", permits: "Whatever the drawing left" }
    ],
    phases: [
      { id: "cad-draw", label: "Reservation drawing", kind: "monthsBefore", openMonths: 8, closeMonths: 7, release: { months: 6, time: "08:00" }, results: "Email after the drawing; 30 days to pay", what: "", note: "" }
    ],
    sources: [{ t: "parks.ca.gov: Reservation Drawing FAQs", u: "https://www.parks.ca.gov/31271" }, { t: "parks.ca.gov: Steep Ravine drawing pilot (news release)", u: "https://www.parks.ca.gov/NewsRelease/1235" }] }
];
