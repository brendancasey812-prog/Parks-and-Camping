/* Release-time engine. All release moments are Pacific wall-clock times, converted to real instants so they can be shown in any time zone.
   Works in the browser (window.Engine) and in Node (module.exports) so it can be unit-tested. */
(function (root) {
  const TZ = "America/Los_Angeles";
  const pad = n => String(n).padStart(2, "0");
  const iso = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
  const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
  const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();               // days in month (m is 1-12)
  const fmtPT = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  function tzOffsetMin(date) { const p = {}; fmtPT.formatToParts(date).forEach(x => p[x.type] = +x.value); return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime()) / 60000; }
  // the real instant when a clock in Pacific time reads y-m-d h:mi
  function ptInstant(y, m, d, h, mi) {
    const wall = Date.UTC(y, m - 1, d, h, mi); let t = wall;
    for (let i = 0; i < 3; i++) t = wall - tzOffsetMin(new Date(t)) * 60000;
    return new Date(t);
  }
  const hm = s => s.split(":").map(Number);
  function addMonths(y, m, d, delta) {                                           // clamps to the last day of a shorter month
    const tot = y * 12 + (m - 1) + delta, ny = Math.floor(tot / 12), nm = tot - ny * 12 + 1;
    return { y: ny, m: nm, d: Math.min(d, dim(ny, nm)) };
  }
  // A rolling window of N months releases arrival date A on the first day D whose "D + N months" reaches A. When A's day does not
  // exist N months earlier (Aug 29-31 -> no Feb 29-31), that is the 1st of the next month: ReserveCalifornia's published example
  // opens Aug 28 on Feb 28 and Aug 29-31 together on Mar 1 (parks.ca.gov/29676).
  function rollingReleaseDay(y, m, d, months) {
    const r = addMonths(y, m, 1, -months);
    return d <= dim(r.y, r.m) ? { y: r.y, m: r.m, d } : addMonths(r.y, r.m, 1, 1);
  }
  function addDays(isoStr, n) { const p = parseISO(isoStr), t = new Date(Date.UTC(p.y, p.m - 1, p.d + n)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }

  // When does the booking for `arrival` (YYYY-MM-DD) open? -> { at: Date, from, to } or null
  function releaseFor(rule, arrival) {
    const a = parseISO(arrival), [h, mi] = rule.time ? hm(rule.time) : [0, 0];
    if (rule.kind === "rolling") { const r = rollingReleaseDay(a.y, a.m, a.d, rule.months); return { at: ptInstant(r.y, r.m, r.d, h, mi), from: arrival, to: arrival }; }
    if (rule.kind === "days") { const r = parseISO(addDays(arrival, -rule.days)); return { at: ptInstant(r.y, r.m, r.d, h, mi), from: arrival, to: arrival }; }
    if (rule.kind === "monthly") {
      let by = a.y, bm = a.m; if (a.d < rule.blockStart) { const p = addMonths(a.y, a.m, 1, -1); by = p.y; bm = p.m; }
      // "released N months in advance on the 15th": each release opens one month of arrivals whose last night is N months out
      // (Yosemite, measured: the 10/15 release opened arrivals through 3/14, the 11/15 release through 4/14)
      const r = addMonths(by, bm, rule.blockStart, -(rule.monthsAhead - 1)), n = addMonths(by, bm, rule.blockStart, 1);
      let at = ptInstant(r.y, r.m, r.d, h, mi);
      const hold = holdAt(rule); if (hold && at < hold) at = hold;              // no general sale before the hold date (North Pines lottery year)
      return { at, from: iso(by, bm, rule.blockStart), to: addDays(iso(n.y, n.m, n.d), -1) };
    }
    return null;
  }
  // rule.holdUntil (YYYY-MM-DD): the monthly releases before that date do not happen; that day's release opens every arrival
  // from rule.holdFrom through its normal block (Yosemite North Pines 2027: early-access lottery first, general sale from Feb 15)
  function holdAt(rule) { if (!rule.holdUntil) return null; const p = parseISO(rule.holdUntil), [h, mi] = rule.time ? hm(rule.time) : [0, 0]; return ptInstant(p.y, p.m, p.d, h, mi); }
  // Next `count` release moments at or after `from` (a Date), and which arrival dates each one opens
  function nextReleases(rule, from, count) {
    const out = [], [h, mi] = rule.time ? hm(rule.time) : [0, 0];
    if (rule.kind === "none") return out;
    const start = new Date(from.getTime() - 86400000);                           // begin a day early, then filter
    const p = fmtPT.formatToParts(start), g = {}; p.forEach(x => g[x.type] = +x.value);
    let day = iso(g.year, g.month, g.day);
    for (let guard = 0; out.length < count && guard < 800; guard++, day = addDays(day, 1)) {
      const dd = parseISO(day), at = ptInstant(dd.y, dd.m, dd.d, h, mi);
      if (at < from) continue;
      if (rule.kind === "rolling") {                                             // the nights this day opens: after (yesterday + N months) up to (today + N months)
        const t = addMonths(dd.y, dd.m, dd.d, rule.months), y = parseISO(addDays(day, -1)), u = addMonths(y.y, y.m, y.d, rule.months);
        const hi = iso(t.y, t.m, t.d), lo = addDays(iso(u.y, u.m, u.d), 1);
        if (lo <= hi) out.push({ at, from: lo, to: hi });
      }
      else if (rule.kind === "days") { const arr = addDays(day, rule.days); out.push({ at, from: arr, to: arr }); }
      else if (rule.kind === "monthly" && dd.d === rule.blockStart) {
        const hold = holdAt(rule); if (hold && at < hold) continue;
        const t = addMonths(dd.y, dd.m, rule.blockStart, rule.monthsAhead - 1), n = addMonths(t.y, t.m, rule.blockStart, 1);
        out.push({ at, from: hold && at.getTime() === hold.getTime() && rule.holdFrom ? rule.holdFrom : iso(t.y, t.m, rule.blockStart), to: addDays(iso(n.y, n.m, n.d), -1) });
      }
    }
    return out;
  }
  // The furthest arrival date the public can book right now under `rule` (YYYY-MM-DD), or null when nothing is bookable ahead
  function bookableThrough(rule, now) {
    if (!rule) return null;
    if (rule.kind === "block") return rule.through || null;
    if (!["rolling", "days", "monthly"].includes(rule.kind)) return null;
    const [h, mi] = rule.time ? hm(rule.time) : [0, 0], g = {};
    fmtPT.formatToParts(now).forEach(x => g[x.type] = +x.value);
    let day = iso(g.year, g.month, g.day);
    if (now < ptInstant(g.year, g.month, g.day, h, mi)) day = addDays(day, -1);          // today's release has not happened yet
    const d = parseISO(day);
    if (rule.kind === "rolling") { const t = addMonths(d.y, d.m, d.d, rule.months); return iso(t.y, t.m, t.d); }
    if (rule.kind === "days") return addDays(day, rule.days);
    const hold = holdAt(rule); if (hold && now < hold) return null;              // nothing on general sale yet
    const rm = d.d >= rule.blockStart ? { y: d.y, m: d.m } : addMonths(d.y, d.m, 1, -1);    // the last monthly release (the 15th)
    const e = addMonths(rm.y, rm.m, rule.blockStart, rule.monthsAhead);
    return addDays(iso(e.y, e.m, e.d), -1);
  }
  const monthName = m => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  function monthsLabel(arr) {                                                    // [10,11,12,1,2,3,4] -> "Oct–Apr"; [1..12] -> "Year-round"
    if (!arr) return ""; if (!arr.length) return "Closed"; if (arr.length === 12) return "Year-round";
    const s = new Set(arr); let start = arr.find(m => !s.has(m === 1 ? 12 : m - 1)); if (start === undefined) start = arr[0];
    const runs = []; let m = start, cur = null;
    for (let i = 0; i < 12; i++, m = m === 12 ? 1 : m + 1) { if (s.has(m)) { if (!cur) { cur = [m, m]; runs.push(cur); } else cur[1] = m; } else cur = null; }
    return runs.map(r => r[0] === r[1] ? monthName(r[0]) : monthName(r[0]) + "–" + monthName(r[1])).join(", ");
  }
  function ruleText(rule) {
    const t = rule.time ? (() => { const [h, mi] = hm(rule.time); return (h % 12 || 12) + ":" + pad(mi) + " " + (h < 12 ? "AM" : "PM") + " PT"; })() : "";
    if (rule.kind === "rolling") return rule.months + (rule.months === 1 ? " month" : " months") + " ahead, new day opens daily at " + t;
    if (rule.kind === "days") return rule.days + " days ahead, daily at " + t;
    if (rule.kind === "block" && !rule.through) return "Released in blocks: next season not released yet; release date not published";
    if (rule.kind === "block") { const [y, m, d] = rule.through.split("-"); return (rule.season ? "Whole season released at once: open through " : "Released in blocks: open through ") + m + "/" + d + "/" + y + "; next release not published"; }
    if (rule.kind === "monthly") return "Monthly on the " + rule.blockStart + "th at " + t + ": opens a month of arrivals reaching " + rule.monthsAhead + " month" + (rule.monthsAhead > 1 ? "s" : "") + " ahead (to the " + (rule.blockStart - 1) + "th)" +
      (rule.holdUntil ? "; this season's general sale starts " + rule.holdUntil.slice(5, 7) + "/" + rule.holdUntil.slice(8) + "/" + rule.holdUntil.slice(0, 4) + " (after the early-access lottery)" : "");
    return "No advance booking / rule not known";
  }
  const api = { TZ, ptInstant, releaseFor, nextReleases, addMonths, addDays, rollingReleaseDay, bookableThrough, monthsLabel, ruleText, iso, parseISO, tzOffsetMin };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
