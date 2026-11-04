/* Permits and lotteries (Yosemite first). Built from a web search on 2026-10-26; Recreation.gov and nps.gov were not reachable from the build
   environment, so the fields below say what each source claimed and which parts still need an official check.
   phase.kind
     annual   a yearly application window  {open:{m,d,time?}, close:{m,d,time?}, announced:<year the dates were seen>}
     weekly   a weekly lottery that targets start dates `leadDays` ahead (Sunday 12:01 AM to Saturday 11:59 PM Pacific)
     daily    a lottery `daysBefore` days before the trip date, `open` to `close` Pacific time
     days     a rolling release `days` days before the trip date at `time` Pacific
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
];
