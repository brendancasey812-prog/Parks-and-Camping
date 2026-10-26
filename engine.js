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
  function addDays(isoStr, n) { const p = parseISO(isoStr), t = new Date(Date.UTC(p.y, p.m - 1, p.d + n)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }

  // When does the booking for `arrival` (YYYY-MM-DD) open? -> { at: Date, from, to } or null
  function releaseFor(rule, arrival) {
    const a = parseISO(arrival), [h, mi] = rule.time ? hm(rule.time) : [0, 0];
    if (rule.kind === "rolling") { const r = addMonths(a.y, a.m, a.d, -rule.months); return { at: ptInstant(r.y, r.m, r.d, h, mi), from: arrival, to: arrival }; }
    if (rule.kind === "days") { const r = parseISO(addDays(arrival, -rule.days)); return { at: ptInstant(r.y, r.m, r.d, h, mi), from: arrival, to: arrival }; }
    if (rule.kind === "monthly") {
      let by = a.y, bm = a.m; if (a.d < rule.blockStart) { const p = addMonths(a.y, a.m, 1, -1); by = p.y; bm = p.m; }
      const r = addMonths(by, bm, rule.blockStart, -rule.monthsAhead), n = addMonths(by, bm, rule.blockStart, 1);
      return { at: ptInstant(r.y, r.m, r.d, h, mi), from: iso(by, bm, rule.blockStart), to: addDays(iso(n.y, n.m, n.d), -1) };
    }
    return null;
  }
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
      if (rule.kind === "rolling") { const t = addMonths(dd.y, dd.m, dd.d, rule.months); const arr = iso(t.y, t.m, t.d); out.push({ at, from: arr, to: arr }); }
      else if (rule.kind === "days") { const arr = addDays(day, rule.days); out.push({ at, from: arr, to: arr }); }
      else if (rule.kind === "monthly" && dd.d === rule.blockStart) {
        const t = addMonths(dd.y, dd.m, rule.blockStart, rule.monthsAhead), n = addMonths(t.y, t.m, rule.blockStart, 1);
        out.push({ at, from: iso(t.y, t.m, rule.blockStart), to: addDays(iso(n.y, n.m, n.d), -1) });
      }
    }
    return out;
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
    if (rule.kind === "rolling") return rule.months + " months ahead, new day opens daily at " + t;
    if (rule.kind === "days") return rule.days + " days ahead, daily at " + t;
    if (rule.kind === "monthly") return "Monthly on the " + rule.blockStart + "th at " + t + ": a month opens " + rule.monthsAhead + " month" + (rule.monthsAhead > 1 ? "s" : "") + " ahead";
    return "No advance booking / rule not known";
  }
  const api = { TZ, ptInstant, releaseFor, nextReleases, addMonths, addDays, monthsLabel, ruleText, iso, parseISO, tzOffsetMin };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
