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
    summary: "Needed for every hiker on the cables beyond the base of the subdome while the cables are up.",
    // key dates, one per row: event, next season (projected until Recreation.gov posts it), time Pacific, last season (official)
    dateCols: ["2027 (projected)", "2026 (official)"],
    dates: [
      ["Preseason lottery opens", "03/01/2027", "12:00 AM", "03/01/2026"],
      ["Preseason lottery closes", "03/31/2027", "4:59 PM", "03/31/2026"],
      ["Preseason results", "about 04/10/2027", "5:00 PM", "04/10/2026"],
      ["Accept and pay by", "about 05/17/2027", "", "05/17/2026"],
      ["Daily lotteries start", "about 05/26/2027", "midnight - 4:00 PM", "05/13/2026"],
      ["Cables up (first hiking day)", "05/28/2027", "", "05/15/2026"],
      ["Last hiking day", "10/12/2027", "", "10/13/2026"],
      ["Cables down", "10/13/2027", "", "10/14/2026"]
    ],
    datesNote: "2027 follows the NPS rule (cables up the Friday before Memorial Day; last day the Tuesday after the second Monday in October). Recreation.gov put the 2026 cables up a week earlier than that rule, so watch for the 2027 posting.",
    quota: [["Preseason lottery", "225", "per hiking day"], ["Daily lottery", "about 50", "per day, plus preseason permits not claimed"], ["Day-hike permits in all", "275", "per day (Recreation.gov)"], ["All hikers on the cables", "300", "per day, including about 75 backpackers (NPS)"]],
    fees: "$10 per application (not refundable); $10 per person if you win",
    group: "Up to 6 people; preseason: up to 7 date choices and an alternate; one application per person per lottery", conf: "good",
    check: ["2027 dates are projected until Recreation.gov posts them"],
    phases: [
      { id: "hd-pre", label: "Preseason lottery", kind: "annual", open: { m: 3, d: 1, time: "00:00" }, close: { m: 3, d: 31, time: "16:59" }, announced: 2026, valid: { from: "05-28", to: "10-12" },
        results: "Results about 04/10; accept and pay by about 05/17", what: "225 permits per hiking day", note: "Closes 4:59 PM Pacific on 03/31." },
      { id: "hd-daily", label: "Daily lottery", kind: "daily", daysBefore: 2, open: "00:00", close: "16:00", valid: { from: "05-28", to: "10-12" },
        results: "Emailed the same night", what: "About 50 permits a day; apply 2 days before your hike", note: "Permit holder only, no alternate. One Recreation.gov page says it closes at 1:00 PM, so apply early." }
    ],
    sources: [{ t: "Recreation.gov: Half Dome permit, important dates and quota (2026)", u: "https://www.recreation.gov/permits/234652" }, { t: "NPS: Half Dome permits for day hikers", u: "https://www.nps.gov/yose/planyourvisit/hdpermits.htm" }] },

  { id: "yose-wilderness", name: "Yosemite wilderness permits (overnight trailheads)", park: "Yosemite National Park", system: "Recreation.gov", url: "https://www.recreation.gov/permits/445859",
    summary: "Overnight trips from any trailhead, including Little Yosemite Valley (Mist Trail) and Cathedral Lakes. About 60% of permits go through a weekly lottery 24 weeks ahead; the rest release 7 days before the start date.",
    fees: "$10 lottery or reservation fee, plus $5 per person for an awarded permit", group: "Trailhead quotas apply", conf: "check",
    check: ["lottery open time (7 vs 9 AM)", "weekly lottery season start and end", "trailhead quotas", "Friday leftover release"],
    phases: [
      { id: "yw-lottery", label: "Weekly lottery", kind: "weekly", leadDays: 168, seasonStart: { m: 11, d: 15 }, seasonEnd: { m: 5, d: 7 }, valid: { from: "04-29", to: "10-23" },
        results: "Monday after the lottery closes; winners accept and pay by Thursday; leftovers open Friday at 9:00 AM Pacific", what: "Apply in the week that is 24 weeks before your start date",
        note: "Lotteries run each week from mid-November to early May. Sources give 7:00 AM and 9:00 AM for the leftover and 24-week release times; check the Recreation.gov page." },
      { id: "yw-7day", label: "7-day release", kind: "days", days: 7, time: "07:00", valid: { from: "04-29", to: "10-23" },
        results: "Instant: first-come booking", what: "About 40% of permits release 7 days before the start date", note: "Reservations can be made from 24 weeks to 3 days before the start date, April 29 - October 23 in 2026. Outside those dates, self-register at the permit station." }
    ],
    sources: [{ t: "NPS: Yosemite wilderness permit reservations", u: "https://www.nps.gov/yose/planyourvisit/wpres.htm" }, { t: "Big Dirty Hikes: Yosemite wilderness permit (2026)", u: "https://bigdirtyhikes.com/guides/yosemite-wilderness-permit" }, { t: "The Big Outside: Yosemite and High Sierra permits", u: "https://thebigoutside.com/how-to-get-a-yosemite-or-high-sierra-wilderness-permit/" }] },

  { id: "north-pines-early", name: "North Pines campground early-access lottery", park: "Yosemite National Park", system: "Recreation.gov", url: "https://www.nps.gov/yose/planyourvisit/lottery-pilot.htm",
    summary: "A one-time lottery for the 2026 season (April 21 - October 25). Remaining sites went into the regular February 15 release. No 2027 lottery is announced.",
    fees: "See the NPS page", group: "", conf: "check", check: ["whether a 2027 lottery is announced"],
    phases: [
      { id: "np-lottery", label: "Early-access lottery (2026 season)", kind: "oneTime", open: "2025-11-24T07:00", close: "2025-12-14T21:00", results: "Notified December 22, 2025; early-access booking January 2 - February 1, 2026", what: "Apply during the window", note: "Past. Check the NPS page for a 2027 version." }
    ],
    sources: [{ t: "NPS: North Pines early-access lottery", u: "https://www.nps.gov/yose/planyourvisit/lottery-pilot.htm" }] }
];
