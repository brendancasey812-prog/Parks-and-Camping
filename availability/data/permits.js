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
      { name: "Preseason lottery", open: "03/01/2027", time: "12:00 AM", close: "03/31/2027, 4:59 PM", release: "About 04/11/2027 (2026: 04/11); accept and pay by about 05/17", hike: "Cables up about 05/15/2027 – 10/13/2027 (2026 dates: May 15 – Oct 13)", permits: "225 a day" },
      { name: "Daily lottery", open: "2 days before the hike", time: "12:00 AM", close: "Same day, 4:00 PM", release: "Same night", hike: "Hikes while the cables are up (2026 lotteries ran May 13 – Oct 11 for hikes May 15 – Oct 13)", permits: "~50 a day" }
    ],
    fees: "$10 per application (not refundable); $10 per person if you win",
    group: "Up to 6 people; preseason: up to 7 date choices and an alternate; one application per person per lottery", conf: "good",
    check: ["2027 dates are projected until Recreation.gov posts them"],
    phases: [
      { id: "hd-pre", accessNote: "Hike dates while the cables are up", label: "Preseason lottery", kind: "annual", open: { m: 3, d: 1, time: "00:00" }, close: { m: 3, d: 31, time: "16:59" }, announced: 2026, valid: { from: "05-15", to: "10-13" },
        results: "Results about 04/11; accept by about 05/17", what: "", note: "" },
      { id: "hd-daily", accessNote: "Apply 2 days before the hike", label: "Daily lottery", kind: "daily", daysBefore: 2, open: "00:00", close: "16:00", valid: { from: "05-15", to: "10-13" },
        results: "Release same night", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: Half Dome permit, important dates and quota (2026)", u: "https://www.recreation.gov/permits/234652" }, { t: "NPS: Half Dome permits for day hikers", u: "https://www.nps.gov/yose/planyourvisit/hdpermits.htm" }] },

  { id: "yose-wilderness", name: "Yosemite wilderness permits (overnight trailheads)", park: "Yosemite National Park", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445859",
    summary: "", fees: "", group: "", conf: "good", check: [],
    openingsYear: "2027 season (Recreation.gov)",
    openings: [
      { name: "Weekly lottery", open: "Every Sunday, 11/08/2026 – 05/07/2027", time: "12:01 AM", close: "Saturday, 11:59 PM", release: "Monday evening (accept by Thursday, 11:59 PM)", hike: "Start dates 24 weeks after the lottery week", permits: "60% of trailhead quota" },
      { name: "Lottery leftovers", open: "Friday, 12 days after each lottery opens (from 11/20/2026)", time: "9:00 AM", close: "3 days before the start date", release: "Instant", hike: "Same start dates as that lottery", permits: "What the lottery did not award" },
      { name: "7-day release", open: "7 days before the start date", time: "7:00 AM", close: "3 days before the start date", release: "Instant", hike: "Start dates to 10/21/2027", permits: "40% of trailhead quota" },
      { name: "Self-registration (no reservation)", open: "In the park", time: "", close: "", release: "", hike: "Start dates 10/19/2026 – 04/29/2027", permits: "Winter and spring: register in the park, no quota" }
    ],
    phases: [
      { id: "yw-lottery", accessNote: "Start dates in this week's lottery (each lottery covers start dates 24 weeks out)", label: "Weekly lottery", kind: "weekly", leadDays: 168, seasonStart: { m: 11, d: 8 }, seasonEnd: { m: 5, d: 7 }, valid: { from: "04-30", to: "10-21" },
        results: "", what: "", note: "" },
      { id: "yw-leftover", accessNote: "Start dates on sale now, first come; a new week is added every Friday at 9:00 AM", label: "Lottery leftovers (first come)", kind: "weekly", leftover: true, leadDays: 168, seasonStart: { m: 11, d: 8 }, seasonEnd: { m: 5, d: 7 }, valid: { from: "04-30", to: "10-21" },
        results: "Instant", what: "", note: "" },
      { id: "yw-7day", accessNote: "Start dates; each opens 7 days before", label: "7-day release", kind: "days", days: 7, time: "07:00", valid: { from: "04-30", to: "10-21" },
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
      { id: "hsc-lottery", access: "May Lake 07/02/2027 – 09/08/2027; Glen Aulin and Sunrise 07/09/2027 – 09/05/2027", label: "Lottery (2027 season)", kind: "oneTime", open: "2026-12-01T00:00", close: "2026-12-30T23:59", results: "By end of February 2027", what: "Apply on travelyosemite.com only", note: "" }
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
      { id: "np-lottery", access: "Stays 04/15/2027 – 10/31/2027", label: "Early-access lottery (2027 season)", kind: "oneTime", open: "2026-11-23T07:00", close: "2026-12-14T21:00", results: "Booking 01/02/2027 – 02/01/2027", what: "", note: "" }
    ],
    sources: [{ t: "Recreation.gov: North Pines Campground (2027 early-access lottery)", u: "https://www.recreation.gov/camping/campgrounds/232449" }, { t: "NPS: North Pines early-access lottery", u: "https://www.nps.gov/yose/planyourvisit/lottery-pilot.htm" }] }
,
  { id: "ca-drawings", name: "California State Parks reservation drawings", park: "California State Parks", system: "ReserveCalifornia", url: "https://www.reservecalifornia.com/",
    summary: "", fees: "", group: "", conf: "good", check: ["exact drawing dates for each arrival date are listed on ReserveCalifornia"],
    openingsYear: "Every arrival date (California State Parks)",
    openings: [
      { name: "Reservation drawing", open: "Up to 8 months before arrival", time: "—", close: "Drawing held 7 months before arrival", release: "Email after the drawing; winners pay within 30 days", hike: "Select sites at Malibu Creek, Morro Bay, Burney Falls (mid-May – Labor Day); Steep Ravine cabins", permits: "Select sites" },
      { name: "Unclaimed sites", open: "6 months before arrival", time: "8:00 AM", close: "Until booked", release: "Instant", hike: "Same sites", permits: "Whatever the drawing left" }
    ],
    phases: [
      { id: "cad-draw", access: "Arrival dates 7 months after each drawing", label: "Reservation drawing", kind: "monthsBefore", openMonths: 8, closeMonths: 7, release: { months: 6, time: "08:00" }, results: "Email after the drawing; 30 days to pay", what: "", note: "" }
    ],
    sources: [{ t: "parks.ca.gov: Reservation Drawing FAQs", u: "https://www.parks.ca.gov/31271" }, { t: "parks.ca.gov: Steep Ravine drawing pilot (news release)", u: "https://www.parks.ca.gov/NewsRelease/1235" }] }
];
