(function () {
const E = window.Engine, SYSTEMS = window.SYSTEMS;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON3 = MONTHS.map(m => m.slice(0, 3));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pad = n => String(n).padStart(2, "0");

// ---------- dates and formatting ----------
const ptParts = d => { const p = {}; new Intl.DateTimeFormat("en-US", { timeZone: E.TZ, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).forEach(x => p[x.type] = +x.value); return p; };
const todayPT = () => { const p = ptParts(new Date()); return E.iso(p.year, p.month, p.day); };
const defaultTarget = () => { const d = E.addDays(todayPT(), 215), p = E.parseISO(d), dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); return E.addDays(d, (5 - dow + 7) % 7); };
const saved = store.get("cc-state", {});
const st = Object.assign({ target: defaultTarget(), tz: "pt", q: "", kind: "", sys: "", region: "", avail: "", season: "", month: "", peak: "", walk: "", conf: "", unk: true, sort: "name", dir: 1, des: "", csort: "name", cdir: 1, cq: "", cmode: "all", cf: {}, ccf: { park: "", f: {} } }, saved);
if (st.target < todayPT()) st.target = defaultTarget();
const persist = () => store.set("cc-state", st);
function fmtAt(date, withTime = true) {
  const o = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  if (withTime) { o.hour = "numeric"; o.minute = "2-digit"; o.timeZoneName = "short"; }
  if (st.tz === "pt") o.timeZone = E.TZ;
  return date.toLocaleString([], o);
}
const tzOpt = o => (st.tz === "pt" ? Object.assign(o, { timeZone: E.TZ }) : o);
const fmtDay = d => d.toLocaleDateString([], tzOpt({ weekday: "short", month: "short", day: "numeric", year: "numeric" }));
const fmtTime = d => d.toLocaleTimeString([], tzOpt({ hour: "numeric", minute: "2-digit", timeZoneName: "short" }));
const timeKey = d => d.toLocaleTimeString("en-GB", tzOpt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
const dateOf = iso => { const p = E.parseISO(iso); return new Date(p.y, p.m - 1, p.d, 12); };
const fmtShort = iso => dateOf(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
const fmtDate = iso => dateOf(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
function countdown(at) {
  const ms = at - new Date(); if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  if (d >= 60) return "in " + Math.round(d / 30.4) + " months";
  if (d >= 1) return "in " + d + " day" + (d > 1 ? "s" : "") + (d < 10 ? " " + h + " h" : "");
  if (h >= 1) return "in " + h + " h " + m + " min";
  return "in " + m + " min " + (s % 60) + " s";
}
function undoToast(m, canUndo) { toast(m); if (!canUndo) return; const t = $("#toast"); t.insertAdjacentHTML("beforeend", ' <button type="button" class="tbtn">Undo</button>'); t.querySelector(".tbtn").onclick = undoEdit; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 6000); }
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500); }
function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
function ics(title, at, desc, url) {
  const z = d => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", end = new Date(at.getTime() + 30 * 60000);
  const e = s => String(s || "").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//California camping//Release dates//EN", "BEGIN:VEVENT", "UID:" + Math.random().toString(36).slice(2) + "@camping-release", "DTSTAMP:" + z(new Date()), "DTSTART:" + z(at), "DTEND:" + z(end),
    "SUMMARY:" + e(title), "DESCRIPTION:" + e(desc), url ? "URL:" + url : "", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + e(title), "TRIGGER:-PT15M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
}

// ---------- data: base rows, local edits, parks ----------
const BASE = window.SITES.map(s => Object.assign({}, s, { updated: s.updated || window.DATA_CHECKED }));
let edits = store.get("cc-edits", {});
const kindOf = s => s.agency === "California State Parks" ? "state" : s.agency === "USFS" ? "forest" : s.agency === "NPS" ? "nps" : "default";
function eff(s) { const e = edits[s.id]; return e ? Object.assign({}, s, e, { edited: true }) : Object.assign({}, s, { edited: false }); }
const rows = () => BASE.map(eff);
// "Yosemite National Park" -> name "Yosemite", designation NP (full name kept for tooltips and filters)
const DES = [["National and State Parks", "NP & SP"], ["National Parks", "NP"], ["National Park", "NP"], ["National Monument", "NM"], ["National Preserve", "NPres"], ["National Seashore", "NS"],
  ["National Recreation Area", "NRA"], ["National Forest", "NF"], ["State Vehicular Recreation Area", "SVRA"], ["State Recreation Area", "SRA"], ["State Historic Park", "SHP"],
  ["State Natural Reserve", "SNR"], ["State Beach", "SB"], ["State Park", "SP"]];
const DES_FULL = Object.fromEntries(DES.map(d => [d[1], d[0].replace(/s$/, "")]));
function splitName(park) {
  const m = park.match(/^(.*?)\s*(\([^)]*\))?$/), base = m[1], extra = m[2] ? " " + m[2] : "";
  for (const [full, ab] of DES) if (base.endsWith(" " + full)) return { name: base.slice(0, -full.length - 1) + extra, des: ab };
  return { name: park, des: /forest/i.test(park) ? "NF" : /state park/i.test(park) ? "SP" : park.startsWith("All ") ? "All" : "" };   // statewide "All …" rows
}
const desOf = park => splitName(park).des;
function groupParks(list) {
  const m = new Map();
  list.forEach(r => { const k = slug(r.park); if (!m.has(k)) m.set(k, { key: k, name: r.park, region: r.region, agency: r.agency, kind: kindOf(r), rows: [] }); m.get(k).rows.push(r); });
  return [...m.values()];
}
const ALLPARKS = groupParks(BASE.map(s => s));        // for counts and lookups (base data)

// ---------- per-campground calculation ----------
const monthOf = iso => E.parseISO(iso).m;
function calc(s) {
  const arrival = st.target, now = new Date(), r = { at: null, status: "unknown", from: arrival, to: arrival };
  if (arrival < todayPT()) { r.status = "past"; return r; }
  if (s.status === "closed") { r.status = "closed"; return r; }
  if (s.resMonths && !s.resMonths.includes(monthOf(arrival))) { r.status = "walk"; return r; }
  if (s.rule.kind === "none") { r.status = s.system === "fcfs" ? "fcfs" : "unknown"; return r; }
  const rel = E.releaseFor(s.rule, arrival); r.at = rel.at; r.from = rel.from; r.to = rel.to;
  r.status = rel.at <= now ? "open" : "later"; return r;
}
const hoursUntil = at => (at - new Date()) / 36e5;
const STATUS_TEXT = { past: "That date has passed", closed: "Closed", walk: "No reservations that month", fcfs: "First-come, first-served", unknown: "Release rule not verified" };
function matches(s, c) {
  const q = st.q.trim().toLowerCase();
  if (q && !(s.name + " " + s.park + " " + s.region + " " + s.agency + " " + SYSTEMS[s.system].name).toLowerCase().includes(q)) return false;
  if (st.kind && kindOf(s) !== st.kind) return false;
  if (st.des && desOf(s.park) !== st.des) return false;
  if (st.sys && s.system !== st.sys) return false;
  if (st.region && s.region !== st.region) return false;
  const m = monthOf(st.target);
  if (st.avail) {
    const a = st.avail;
    if (a === "open" && c.status !== "open") return false;
    if (a === "7d" && !(c.status === "later" && hoursUntil(c.at) <= 168)) return false;
    if (a === "30d" && !(c.status === "later" && hoursUntil(c.at) <= 720)) return false;
    if (a === "later" && c.status !== "later") return false;
    if (a === "walk" && !["walk", "fcfs"].includes(c.status)) return false;
  }
  const unkSeason = !s.open, unkPeak = !s.peak, unkWalk = !s.walkup;
  if ((st.season || st.month) && unkSeason) { if (!st.unk) return false; }
  else {
    if (st.season === "on" && !s.open.includes(m)) return false;
    if (st.season === "year" && s.open.length !== 12) return false;
    if (st.season === "seasonal" && !(s.open.length > 0 && s.open.length < 12)) return false;
    if (st.month && !s.open.includes(+st.month)) return false;
  }
  if (st.peak && unkPeak) { if (!st.unk) return false; }
  else { if (st.peak === "on" && !s.peak.includes(m)) return false; if (st.peak === "off" && s.peak.includes(m)) return false; }
  if (st.walk && unkWalk) { if (!st.unk) return false; }
  else { if (st.walk === "any" && !["some", "only"].includes(s.walkup)) return false; if (st.walk === "none" && s.walkup !== "none") return false; if (st.walk === "only" && s.walkup !== "only") return false; }
  if (st.conf && s.conf !== st.conf) return false;
  return true;
}
const WALK = { none: "Reservation only", some: "Some walk-up", only: "Walk-up only" };
const CONF = { good: ["Verified", "good"], check: ["Needs checking", "check"], assumed: ["Not yet researched", ""] };
const confLabel = s => CONF[s.conf][0];
const seasonText = s => s.open ? E.monthsLabel(s.open) : "";
const peakText = s => s.peak ? E.monthsLabel(s.peak) : "";
const ruleTxt = s => E.ruleText(s.rule) + (s.check.includes("rule") && s.rule.kind !== "none" ? " (assumed)" : "");
function opensCell(s, c) {
  if (c.at) {
    const span = c.from !== c.to ? '<span class="when-t">Dates ' + esc(fmtShort(c.from)) + " to " + esc(fmtShort(c.to)) + "</span>" : "";
    if (c.status === "open") return '<span class="st open">Open now</span><span class="when-t">Opened ' + esc(fmtAt(c.at)) + "</span>" + span;
    return '<span class="st later" data-cd="' + c.at.getTime() + '" data-pre="Opens ">Opens ' + esc(countdown(c.at)) + '</span><span class="when-t">' + esc(fmtAt(c.at)) + "</span>" + span;
  }
  return '<span class="st none">' + esc(STATUS_TEXT[c.status] || "") + "</span>";
}
const NV = '<span class="nv">Not researched</span>';
// ---------- column filters (Google Sheets style): per column, the values you untick are hidden ----------
function opensBucket(c) { if (c.at) { if (c.status === "open") return "Open now"; const h = hoursUntil(c.at); return h <= 168 ? "Opens within 7 days" : h <= 720 ? "Opens within 30 days" : "Opens later"; } return STATUS_TEXT[c.status] || ""; }
const PCOL = { name: x => splitName(x.p.name).name, des: x => splitName(x.p.name).des || "—", region: x => x.p.region, sys: x => x.sys, rule: x => x.rules.length > 1 ? "Varies by campground" : x.rules[0],
  days: x => opensBucket((x.first || x.calcs[0]).c), date: x => x.first ? fmtDay(x.first.c.at) : "—", time: x => x.first ? fmtTime(x.first.c.at) : "—",
  walk: x => x.walk || "Not researched", n: x => String(x.n), conf: x => x.researched === x.n ? "Verified or checked" : x.researched ? "Partly researched" : "Not yet researched" };
const CCOL = { name: x => x.s.name, opens: x => opensBucket(x.c), season: x => seasonText(x.s) || "Not researched", peak: x => peakText(x.s) || "Not researched", walk: x => x.s.walkup ? WALK[x.s.walkup] : "Not researched", conf: x => confLabel(x.s) };
const passCF = (x, cols, cf, skip) => Object.keys(cf).every(k => k === skip || !cf[k] || !cf[k].length || !cf[k].includes(cols[k](x)));
const campCF = () => { if (st.ccf.park !== R.key) st.ccf = { park: R.key, f: {} }; return st.ccf.f; };   // campground filters belong to one park
let allParkSums = [], allCamps = [];

// ---------- routing ----------
function route() {
  const h = location.hash.replace(/^#\/?/, ""), parts = h.split("/");
  if (parts[0] === "park" && parts[1]) return { v: "park", key: parts[1], id: parts[2] || "" };
  if (parts[0] === "permits") return { v: "permits" };
  if (parts[0] === "data") return { v: "data" };
  return { v: "parks" };
}
let R = route();
function show() {
  R = route(); closeMenu(); closeEditor();
  ["parks", "park", "permits", "data"].forEach(v => $("#v" + v[0].toUpperCase() + v.slice(1)).hidden = v !== R.v);
  $$(".nav-i").forEach(a => { const on = a.dataset.nav === (R.v === "park" ? "parks" : R.v); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
  $(".ask").style.visibility = R.v === "parks" ? "visible" : "hidden";
  closeNav(); render();
  const titles = { parks: "Parks", permits: "Permits and lotteries", data: "Data and edits", park: "" };
  document.title = (R.v === "park" ? (ALLPARKS.find(p => p.key === R.key) || { name: "Park" }).name : titles[R.v]) + " | Campsite release dates, California";
}
function nav(hash) { if (location.hash === hash) show(); else location.hash = hash; }
window.addEventListener("hashchange", () => { show(); window.scrollTo(0, 0); $("#content").focus({ preventScroll: true }); });

// ---------- parks overview ----------
const AGG_WALK = rs => { const v = rs.map(r => r.walkup).filter(Boolean); if (!v.length) return ""; if (v.includes("some") || (v.includes("only") && v.includes("none"))) return "Some walk-up"; return v.every(x => x === "only") ? "Walk-up only" : v.every(x => x === "none") ? "Reservation only" : "Some walk-up"; };
function parkSummary(p) {
  const all = ALLPARKS.find(x => x.key === p.key).rows, match = p.rows;
  const calcs = match.map(r => ({ r, c: calc(r) })), ats = calcs.filter(x => x.c.at), first = ats.slice().sort((a, b) => a.c.at - b.c.at)[0];
  const sameAt = ats.length === calcs.length && ats.every(x => x.c.at.getTime() === ats[0].c.at.getTime());
  const sys = [...new Set(match.map(r => SYSTEMS[r.system].name))].join(", ");
  const rules = [...new Set(match.map(r => ruleTxt(r)))];
  const researched = match.filter(r => r.conf !== "assumed").length;
  return { p, calcs, first, sameAt, sys, rules, all: all.length, n: match.length, walk: AGG_WALK(match), researched,
    opens: sameAt ? first.c : (first ? first.c : null), varies: !sameAt && ats.length > 1 };
}
function opensCells(x) {          // days out | date | time, for the first campground to open
  const varies = x.varies ? '<span class="when-t">Varies by campground</span>' : "";
  if (!x.first) { const c = x.calcs[0].c; return ['<span class="st none">' + esc(STATUS_TEXT[c.status] || "") + "</span>", '<span class="nv">—</span>', '<span class="nv">—</span>']; }
  const c = x.first.c, d = c.status === "open" ? '<span class="st open">Open now</span>' : '<span class="st later" data-cd="' + c.at.getTime() + '" data-bare>' + esc(countdown(c.at).replace(/^in /, "")) + "</span>";
  const span = c.from !== c.to ? '<span class="when-t">Dates ' + esc(fmtShort(c.from)) + " to " + esc(fmtShort(c.to)) + "</span>" : "";
  return [d + varies, esc(fmtDay(c.at)) + span, esc(fmtTime(c.at))];
}
function opensParkCell(x) {
  if (x.sameAt && x.first) return opensCell(x.first.r, x.first.c);
  if (x.first) { const c = x.first.c; return c.status === "open" ? '<span class="st open">Open now</span><span class="when-t">Some campgrounds open at different times</span>' : '<span class="st later" data-cd="' + c.at.getTime() + '" data-pre="Next: ">Next ' + esc(countdown(c.at)) + '</span><span class="when-t">' + esc(fmtAt(c.at)) + "</span><span class=\"when-t\">Varies by campground</span>"; }
  const c = x.calcs[0].c; return '<span class="st none">' + esc(STATUS_TEXT[c.status] || "") + "</span>";
}
const atOf = x => x.first ? x.first.c.at.getTime() : Infinity;
const SORTP = {
  name: (a, b) => splitName(a.p.name).name.localeCompare(splitName(b.p.name).name), des: (a, b) => desOf(a.p.name).localeCompare(desOf(b.p.name)) || a.p.name.localeCompare(b.p.name),
  days: (a, b) => atOf(a) - atOf(b) || a.p.name.localeCompare(b.p.name), date: (a, b) => atOf(a) - atOf(b) || a.p.name.localeCompare(b.p.name),
  time: (a, b) => (a.first ? timeKey(a.first.c.at) : "~").localeCompare(b.first ? timeKey(b.first.c.at) : "~") || atOf(a) - atOf(b), region: (a, b) => a.p.region.localeCompare(b.p.region) || a.p.name.localeCompare(b.p.name), sys: (a, b) => a.sys.localeCompare(b.sys) || a.p.name.localeCompare(b.p.name),
  rule: (a, b) => a.rules[0].localeCompare(b.rules[0]), opens: (a, b) => (a.first ? a.first.c.at.getTime() : Infinity) - (b.first ? b.first.c.at.getTime() : Infinity) || a.p.name.localeCompare(b.p.name),
  walk: (a, b) => a.walk.localeCompare(b.walk), n: (a, b) => b.n - a.n, conf: (a, b) => b.researched / b.n - a.researched / a.n
};
let shownParks = [];
function renderParks() {
  const list = rows().map(r => ({ r, c: calc(r) })).filter(x => matches(x.r, x.c)).map(x => x.r);
  let sums = groupParks(list).map(parkSummary); const f = SORTP[st.sort] || SORTP.name; sums.sort((a, b) => f(a, b) * st.dir);
  allParkSums = sums; sums = sums.filter(x => passCF(x, PCOL, st.cf)); shownParks = sums;
  const q = st.q.trim().toLowerCase(), hit = x => q ? x.p.rows.filter(r => r.name.toLowerCase().includes(q) && !x.p.name.toLowerCase().includes(q)) : [];
  $("#parksBody").innerHTML = sums.map(x => {
    const dc = x.researched === x.n ? "good" : x.researched ? "check" : "";
    const nm = splitName(x.p.name), oc = opensCells(x);
    return '<tr class="link" data-park="' + esc(x.p.key) + '"><th scope="row" data-l="Park"><a class="nm link-cell" href="#/park/' + esc(x.p.key) + '" title="' + esc(x.p.name) + '">' + esc(nm.name) + "</a><small>" + esc(x.p.agency) + "</small>" +
      hit(x).map(r => '<a class="hit" href="#/park/' + esc(x.p.key) + "/" + esc(r.id) + '">Campground: ' + esc(r.name) + "</a>").join("") + "</th>" +
      '<td data-l="Type">' + (nm.des ? '<abbr class="des" title="' + esc(DES_FULL[nm.des] || "Statewide") + '">' + esc(nm.des) + "</abbr>" : "") + '</td><td data-l="Region">' + esc(x.p.region) + '</td><td data-l="Booking site">' + esc(x.sys) + '</td><td data-l="How it opens">' + esc(x.rules.length > 1 ? "Varies by campground" : x.rules[0]) + "</td>" +
      '<td data-l="Days out">' + oc[0] + '</td><td data-l="Open date">' + oc[1] + '</td><td data-l="Open time">' + oc[2] + '</td><td data-l="Walk-up">' + (x.walk ? esc(x.walk) : NV) + '</td><td data-l="Campgrounds">' + x.n + (x.n !== x.all ? " of " + x.all : "") + '</td>' +
      '<td data-l="Data"><span class="dtl ' + dc + '">' + (x.researched === x.n ? "Verified or checked" : x.researched ? x.researched + " of " + x.n + " researched" : "Not yet researched") + "</span></td></tr>";
  }).join("") || '<tr><td colspan="11" class="empty">No parks match these filters. Clear a filter to see more.</td></tr>';
  markFiltered("#parksTable", st.cf);
  $("#parksTable").classList.add("stack");
  $$("#parksTable thead th[data-k]").forEach(th => { const on = th.dataset.k === st.sort; if (on) th.setAttribute("aria-sort", st.dir > 0 ? "ascending" : "descending"); else th.removeAttribute("aria-sort"); });
  const camp = sums.reduce((t, x) => t + x.n, 0);
  $("#parksCount").textContent = sums.length + " parks, " + camp + " campground listings";
  $("#parksSub").textContent = ALLPARKS.length + " parks and forests with " + BASE.length + " campground listings. Opening times are for " + fmtDate(st.target) + ".";
  renderChips(); renderSugg(); renderSide(); renderKinds();
}
const KINDS = [["", "All"], ["nps", "National parks & monuments"], ["state", "State parks"], ["forest", "National forests"]];
function renderKinds() { $("#kindTabs").innerHTML = KINDS.map(k => '<button type="button" data-kind="' + k[0] + '" aria-pressed="' + (st.kind === k[0]) + '">' + esc(k[1]) + " <small>" + (k[0] ? ALLPARKS.filter(p => p.kind === k[0]).length : ALLPARKS.length) + "</small></button>").join(""); }
const FILT = { kind: "Type", sys: "Booking site", region: "Region", avail: "Date available", season: "Season", month: "Month", peak: "Peak season", walk: "Walk-up", conf: "Data" };
const LAB = {
  kind: v => ({ nps: "National parks and monuments", state: "State parks", forest: "National forests" })[v], des: v => v + (DES_FULL[v] ? " (" + DES_FULL[v] + ")" : ""), sys: v => SYSTEMS[v].name, region: v => v,
  avail: v => ({ open: "Already open", "7d": "Opens within 7 days", "30d": "Opens within 30 days", later: "Opens later", walk: "No advance booking" })[v], season: v => ({ on: "Open on my date", year: "Year-round", seasonal: "Seasonal only" })[v],
  month: v => "Open in " + MONTHS[v - 1], peak: v => ({ on: "Peak on my date", off: "Not peak on my date", has: "Has a defined peak" })[v], walk: v => ({ any: "Walk-up available", none: "Reservation only", only: "Walk-up only" })[v],
  conf: v => ({ good: "Verified", check: "Needs checking", assumed: "Not yet researched" })[v]
};
function activeFilters() { const o = Object.keys(LAB).filter(k => st[k] && String(st[k]).trim()).map(k => ({ k, t: LAB[k](st[k]) })); if (st.q.trim()) o.unshift({ k: "q", t: "Search: " + st.q.trim() });
  Object.keys(st.cf).filter(k => st.cf[k] && st.cf[k].length).forEach(k => { const kept = [...new Set(allParkSums.filter(x => passCF(x, PCOL, st.cf, k)).map(PCOL[k]))].filter(v => !st.cf[k].includes(v));
    o.push({ k: "cf:" + k, t: colName("#parksTable", k) + ": " + (kept.length <= 2 ? kept.join(", ") || "none" : kept.length + " selected") }); });
  return o; }
const colName = (tbl, k) => $(tbl + ' thead th[data-k="' + k + '"] button').textContent;
function renderChips() {
  const a = activeFilters();
  $("#chips").innerHTML = a.map(x => '<button type="button" class="chip" data-k="' + x.k + '" aria-label="Remove filter: ' + esc(x.t) + '">' + esc(x.t) + " <i aria-hidden=\"true\">x</i></button>").join(""); $("#chips").hidden = !a.length;
  const n = a.filter(x => x.k !== "q").length; $("#fCount").hidden = !n; $("#fCount").textContent = n;
}
const SUGG = [["avail", "30d", "Opening within 30 days"], ["walk", "any", "Walk-up available"], ["season", "on", "Open on my date"], ["peak", "on", "Peak season on my date"], ["walk", "none", "Reservation only"], ["conf", "good", "Verified data"]];
function renderSugg() { $("#sugg").innerHTML = SUGG.map(s => '<button type="button" class="sg" data-f="' + s[0] + '" data-v="' + s[1] + '" aria-pressed="' + (st[s[0]] === s[1]) + '">' + s[2] + "</button>").join(""); }
function renderSide() {
  const kinds = [["nps", "National parks and monuments"], ["state", "State parks"], ["forest", "National forests"]];
  const cnt = k => ALLPARKS.filter(p => p.kind === k).length, regions = [...new Set(BASE.map(s => s.region))].sort();
  $("#sideGroups").innerHTML = '<div class="side-h">Browse</div>' + kinds.map(k => '<a class="side-l" href="#/" data-side="kind:' + k[0] + '"' + (R.v === "parks" && st.kind === k[0] ? ' aria-current="true"' : "") + ">" + k[1] + " <small>" + cnt(k[0]) + "</small></a>").join("") +
    '<div class="side-h">Regions</div>' + regions.map(r => '<a class="side-l" href="#/" data-side="region:' + esc(r) + '"' + (R.v === "parks" && st.region === r ? ' aria-current="true"' : "") + ">" + esc(r) + "</a>").join("");
}

// ---------- one park ----------
let selId = "";
const SORTC = {
  name: (a, b) => a.s.name.localeCompare(b.s.name), opens: (a, b) => (a.c.at ? a.c.at.getTime() : Infinity) - (b.c.at ? b.c.at.getTime() : Infinity) || a.s.name.localeCompare(b.s.name),
  season: (a, b) => ((a.s.open || []).length || 99) - ((b.s.open || []).length || 99), peak: (a, b) => ((a.s.peak || []).length || 99) - ((b.s.peak || []).length || 99),
  walk: (a, b) => ["none", "some", "only"].indexOf(a.s.walkup) - ["none", "some", "only"].indexOf(b.s.walkup), conf: (a, b) => a.s.conf.localeCompare(b.s.conf)
};
let shownCamps = [];
function renderPark() {
  const p = ALLPARKS.find(x => x.key === R.key);
  if (!p) { $("#parkName").textContent = "Park not found"; $("#campBody").innerHTML = ""; $("#panel").innerHTML = ""; return; }
  const all = rows().filter(r => slug(r.park) === p.key);
  $("#crumbName").textContent = p.name; $("#parkName").textContent = p.name;
  const sys = [...new Set(all.map(r => SYSTEMS[r.system].name))].join(", ");
  $("#parkMeta").textContent = p.agency + ", " + p.region + ". Booked through " + sys + ". " + all.length + " campground" + (all.length === 1 ? "" : "s") + " listed.";
  const q = st.cq.trim().toLowerCase();
  const list = all.map(s => ({ s, c: calc(s) })).filter(x => matches(x.s, x.c)).filter(x => (!q || x.s.name.toLowerCase().includes(q)) && cmodeOk(x));
  const f = SORTC[st.csort] || SORTC.name; list.sort((a, b) => f(a, b) * st.cdir); allCamps = list;
  const cf = campCF(); shownCamps = list.filter(x => passCF(x, CCOL, cf)); markFiltered("#campTable", cf);
  if (R.id && all.some(r => r.id === R.id)) selId = R.id;
  if (!shownCamps.some(x => x.s.id === selId)) selId = shownCamps.length ? shownCamps[0].s.id : "";
  $("#campBody").innerHTML = shownCamps.map(x => campRow(x)).join("") || '<tr><td colspan="6" class="empty">No campgrounds match. Clear a filter or the search.</td></tr>';
  $("#campTable").classList.add("stack");
  $$("#campTable thead th[data-k]").forEach(th => { const on = th.dataset.k === st.csort; if (on) th.setAttribute("aria-sort", st.cdir > 0 ? "ascending" : "descending"); else th.removeAttribute("aria-sort"); });
  $$("#cMode button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === st.cmode));
  $("#cq").value = st.cq;
  $("#campCount").textContent = shownCamps.length + " of " + all.length + " campgrounds";
  $("#cClear").hidden = !Object.values(cf).some(v => v && v.length);
  renderPanel(shownCamps.find(x => x.s.id === selId));
}
function cmodeOk(x) { const m = monthOf(st.target); if (st.cmode === "open") return x.s.open && x.s.open.includes(m); if (st.cmode === "peak") return x.s.peak && x.s.peak.includes(m); if (st.cmode === "walk") return ["some", "only"].includes(x.s.walkup); return true; }
function campRow(x) {
  const { s, c } = x, dc = CONF[s.conf][1];
  const season = s.open ? "<b>" + esc(seasonText(s)) + "</b>" + (s.openNote ? "<small>" + esc(s.openNote) + "</small>" : "") : (s.openNote ? "<small>" + esc(s.openNote) + "</small>" : "") + (s.open ? "" : NV);
  const m = monthOf(st.target), peak = s.peak ? "<b>" + esc(peakText(s)) + "</b>" + (s.peak.includes(m) ? '<span class="tag">Peak on your date</span>' : "") + (s.peakNote ? "<small>" + esc(s.peakNote) + "</small>" : "") : (s.peakNote ? "<small>" + esc(s.peakNote) + "</small>" : NV);
  const walk = s.walkup ? "<b>" + esc(WALK[s.walkup]) + "</b>" + (s.walkupNote ? "<small>" + esc(s.walkupNote) + "</small>" : "") : (s.walkupNote ? "<small>" + esc(s.walkupNote) + "</small>" : "") + (s.walkup ? "" : NV);
  return '<tr class="link' + (s.id === selId ? " sel" : "") + '" data-id="' + esc(s.id) + '"><th scope="row" data-l="Campground"><button type="button" class="nm" data-pick="' + esc(s.id) + '" aria-pressed="' + (s.id === selId) + '">' + esc(s.name) + "</button>" + (s.edited ? '<span class="tag edit">Edited</span>' : "") + "</th>" +
    '<td data-l="Opens for your date">' + opensCell(s, c) + "</td>" + edCell("season", "Season", season, s) + edCell("peak", "Peak season", peak, s) + edCell("walk", "Walk-up", walk, s) + '<td data-l="Data"><span class="dtl ' + dc + '">' + esc(confLabel(s)) + "</span></td></tr>";
}
const edCell = (k, label, html, s) => '<td data-l="' + label + '" class="edc" tabindex="0" data-ed="' + k + '" title="Double-click to edit">' + html +
  '<button type="button" class="pen" data-cedit="' + k + '" aria-label="Edit ' + label.toLowerCase() + " for " + esc(s.name) + '"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.5 2.5l2 2L6 12l-2.6.6L4 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button></td>';

// ---------- detail panel with photo and editing ----------
let editing = false;
function renderPanel(x) {
  const el = $("#panel");
  if (!x) { el.innerHTML = '<div class="empty">Select a campground to see its details.</div>'; return; }
  const { s, c } = x, sys = SYSTEMS[s.system];
  if (editing) { el.innerHTML = '<div class="photo" id="photo"></div><div class="pn-b">' + editHtml(s) + "</div>"; loadPhoto(s.id); return; }
  const src = s.sources.map(r => '<li><a href="' + esc(r.u) + '" target="_blank" rel="noopener">' + esc(r.t) + "</a></li>").join("");
  const verify = s.check.length ? esc(s.check.join(", ")) : "";
  const dl = [
    ["Opens for your date", opensCell(s, c)], ["Booking site", esc(sys.name)], ["How it opens", esc(ruleTxt(s))],
    ["Season", s.open ? esc(seasonText(s)) + (s.openNote ? "<small>" + esc(s.openNote) + "</small>" : "") : NV],
    ["Peak season", s.peak ? esc(peakText(s)) + (s.peakNote ? "<small>" + esc(s.peakNote) + "</small>" : "") : NV],
    ["Walk-up", s.walkup ? esc(WALK[s.walkup]) + (s.walkupNote ? "<small>" + esc(s.walkupNote) + "</small>" : "") : NV]
  ];
  if (s.notes) dl.push(["Notes", esc(s.notes)]);
  if (verify) dl.push(["To verify", verify]);
  dl.push(["Data", '<span class="dtl ' + CONF[s.conf][1] + '">' + esc(confLabel(s)) + "</span>" + (s.edited ? ' <span class="tag edit">Edited locally</span>' : "")], ["Last checked", esc(fmtShort(s.updated))]);
  el.innerHTML = '<div class="photo" id="photo"></div><div class="pn-b"><div><h2>' + esc(s.name) + '</h2><p class="sub">' + esc(s.park) + "</p></div>" +
    '<dl class="dl">' + dl.map(d => "<div><dt>" + d[0] + "</dt><dd>" + d[1] + "</dd></div>").join("") + "</dl>" +
    '<div class="pn-act">' + (c.at && c.status === "later" ? '<button type="button" class="btn primary" data-act="remind">Remind me</button>' : "") + '<button type="button" class="btn" data-act="edit">Edit details</button>' + (sys.url ? '<a class="btn" href="' + esc(sys.url) + '" target="_blank" rel="noopener">Booking site</a>' : "") + "</div>" +
    '<div><h3>Sources</h3><ul class="src">' + src + "</ul></div></div>";
  loadPhoto(s.id);
}
function editHtml(s) {
  const mo = (name, arr) => '<div class="months">' + MON3.map((m, i) => '<label><input type="checkbox" name="' + name + '" value="' + (i + 1) + '"' + (arr && arr.includes(i + 1) ? " checked" : "") + "> " + m + "</label>").join("") + "</div>";
  const r = s.rule;
  return '<form class="ed" id="edForm" data-id="' + esc(s.id) + '"><h2>Edit ' + esc(s.name) + "</h2>" +
    "<fieldset><legend>Season (open months)</legend>" + mo("open", s.open) + '<label>Season note<input type="text" name="openNote" value="' + esc(s.openNote) + '"></label></fieldset>' +
    "<fieldset><legend>Peak season</legend>" + mo("peak", s.peak) + '<label>Peak note<input type="text" name="peakNote" value="' + esc(s.peakNote) + '"></label></fieldset>' +
    '<fieldset><legend>Walk-up</legend><label>Walk-up sites<select name="walkup"><option value="">Not known</option><option value="none"' + (s.walkup === "none" ? " selected" : "") + '>Reservation only</option><option value="some"' + (s.walkup === "some" ? " selected" : "") + '>Some walk-up</option><option value="only"' + (s.walkup === "only" ? " selected" : "") + '>Walk-up only</option></select></label><label>Walk-up note<input type="text" name="walkupNote" value="' + esc(s.walkupNote) + '"></label></fieldset>' +
    '<fieldset><legend>Release rule</legend><label>Type<select name="rkind"><option value="rolling"' + (r.kind === "rolling" ? " selected" : "") + '>Rolling (months ahead, daily)</option><option value="days"' + (r.kind === "days" ? " selected" : "") + '>Rolling (days ahead)</option><option value="monthly"' + (r.kind === "monthly" ? " selected" : "") + '>Monthly block</option><option value="none"' + (r.kind === "none" ? " selected" : "") + '>No advance booking</option></select></label>' +
    '<div class="r2"><label>Months or days ahead<input type="number" name="rn" min="0" max="400" value="' + (r.kind === "rolling" ? r.months : r.kind === "days" ? r.days : r.kind === "monthly" ? r.monthsAhead : "") + '"></label><label>Release time (Pacific)<input type="text" name="rtime" value="' + esc(r.time || "07:00") + '" placeholder="07:00"></label></div>' +
    '<label>Block starts on day (monthly only)<input type="number" name="rblock" min="1" max="28" value="' + (r.blockStart || 15) + '"></label></fieldset>' +
    '<label>Notes<textarea name="notes" rows="3">' + esc(s.notes) + '</textarea></label><div class="pn-act"><button type="submit" class="btn primary">Save</button><button type="button" class="btn" data-act="cancel">Cancel</button><button type="button" class="btn danger" data-act="reset">Reset to source</button></div></form>';
}
let lastEdit = null;
function commitEdit(id, next) {
  const base = BASE.find(b => b.id === id); lastEdit = { id, prev: edits[id] ? JSON.parse(JSON.stringify(edits[id])) : null };
  const diff = {}; Object.keys(next).forEach(k => { if (JSON.stringify(next[k] ?? null) !== JSON.stringify(base[k] ?? null)) diff[k] = next[k]; });
  if (Object.keys(diff).length) { diff.conf = base.conf === "assumed" ? "check" : base.conf; diff.updated = todayPT(); diff.check = base.check.filter(c => !["season", "peak", "walkup", "rule"].includes(c) || !(c === "season" && next.open) ); edits[id] = diff; } else delete edits[id];
  store.set("cc-edits", edits); return Object.keys(diff).length > 0;
}
function undoEdit() { if (!lastEdit) return; const { id, prev } = lastEdit; lastEdit = null; if (prev) edits[id] = prev; else delete edits[id]; store.set("cc-edits", edits); toast("Undone."); render(); }
function saveEdit(form) {
  const id = form.dataset.id, fd = new FormData(form), g = n => fd.get(n);
  const months = n => { const a = fd.getAll(n).map(Number).sort((x, y) => x - y); return a.length ? a : null; };
  const kind = g("rkind"), rn = +g("rn") || 0, time = /^\d{1,2}:\d{2}$/.test(g("rtime")) ? g("rtime").padStart(5, "0") : "07:00";
  const rule = kind === "rolling" ? { kind, months: rn || 6, time } : kind === "days" ? { kind, days: rn || 7, time } : kind === "monthly" ? { kind, blockStart: +g("rblock") || 15, monthsAhead: rn || 5, time } : { kind: "none" };
  const next = { open: months("open"), openNote: g("openNote").trim(), peak: months("peak"), peakNote: g("peakNote").trim(), walkup: g("walkup") || null, walkupNote: g("walkupNote").trim(), rule, notes: g("notes").trim() };
  const changed = commitEdit(id, next); editing = false; undoToast(changed ? "Saved. Marked as edited on this device." : "No changes.", changed); render();
}

// ---------- photos (IndexedDB, this browser only) ----------
const photoDB = () => new Promise((res, rej) => { const r = indexedDB.open("cc-photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const dbGet = id => photoDB().then(db => new Promise(res => { const q = db.transaction("p").objectStore("p").get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); })).catch(() => null);
const dbSet = (id, v) => photoDB().then(db => new Promise((res, rej) => { const t = db.transaction("p", "readwrite"); v ? t.objectStore("p").put(v, id) : t.objectStore("p").delete(id); t.oncomplete = res; t.onerror = () => rej(t.error); }));
function shrink(file) {
  return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.82)); }; img.onerror = () => rej(new Error("That file is not an image")); img.src = u; });
}
async function loadPhoto(id) {
  const box = $("#photo"); if (!box) return; const url = await dbGet(id); if (!$("#photo") || selId !== id) return;
  box.innerHTML = url ? '<img alt="Photo of the campground" src="' + url + '"><div class="photo-act"><label class="btn sm file">Replace<input type="file" accept="image/*" data-photo="' + esc(id) + '" hidden></label><button type="button" class="btn sm" data-act="rmphoto">Remove</button></div>' :
    '<div class="photo-empty"><span>No photo yet</span><label class="btn sm file">Add a photo<input type="file" accept="image/*" data-photo="' + esc(id) + '" hidden></label></div>';
}

// ---------- natural-language search: turns a phrase into filters ----------
const REGIONS = { "channel islands": "Channel Islands", "central valley": "Central Valley", "southern california": "Southern California", "north coast": "North Coast", "central coast": "Central Coast", "bay area": "Bay Area", "sierra nevada": "Sierra Nevada", "sierra": "Sierra Nevada", "cascades": "Cascades", "desert": "Desert" };
function interpret(text) {
  let t = " " + text.toLowerCase().replace(/[?!.]/g, " ") + " ", set = {};
  const take = re => { const m = t.match(re); if (m) { t = t.replace(re, " "); return m; } return null; };
  if (take(/ reservations? only /)) set.walk = "none";
  if (take(/ walk[- ]?ups?(?: only)? | first[- ]come(?:,? first[- ]served)? | no reservations? needed /)) set.walk = "any";
  if (take(/ peak(?: season)? /)) set.peak = "on";
  if (take(/ year[- ]round /)) set.season = "year";
  if (take(/ in season | open on my date /)) set.season = "on";
  if (take(/ already open | open now | bookable now /)) set.avail = "open";
  if (take(/ (?:opens?|opening) (?:soon|this week|within (?:a|1) week) /)) set.avail = "7d";
  if (take(/ (?:opens?|opening) (?:this|next) month | within 30 days | opening soon /)) set.avail = "30d";
  if (take(/ verified /)) set.conf = "good";
  if (take(/ state parks? | state beaches? /)) set.kind = "state"; else if (take(/ national forests? | forests? /)) set.kind = "forest"; else if (take(/ national parks? | nps /)) set.kind = "nps";
  if (take(/ recreation\.gov /)) set.sys = "rec"; if (take(/ reservecalifornia | reserve california /)) set.sys = "rc";
  Object.keys(REGIONS).forEach(k => { if (take(new RegExp(" " + k + " "))) set.region = REGIONS[k]; });
  let m = take(/ (\d{4})-(\d{2})-(\d{2}) /); if (m) set.target = m[1] + "-" + m[2] + "-" + m[3];
  m = take(/ (jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?: (\d{1,2}))?(?:,? (\d{4}))? /);
  if (m) { const mo = MON3.findIndex(x => x.toLowerCase() === m[1].slice(0, 3)) + 1, today = todayPT(), y0 = E.parseISO(today).y; let y = m[3] ? +m[3] : y0, d = m[2] ? +m[2] : 15; let iso = E.iso(y, mo, d); if (iso < today && !m[3]) iso = E.iso(y + 1, mo, d); set.target = iso; }
  const stop = / (sites?|campgrounds?|campsites?|camping|for|in|on|the|a|an|with|and|at|near|show|me|find|that|are|is|have|has|available|options?|parks?) /g;
  const rest = t.replace(stop, " ").replace(stop, " ").replace(/\s+/g, " ").trim();
  return { set, rest };
}
function applyAsk(text) {
  const { set, rest } = interpret(text), keys = Object.keys(set);
  keys.forEach(k => { if (k === "target") { st.target = set[k]; $("#target").value = st.target; } else st[k] = set[k]; });
  st.q = rest; syncFields(); persist(); if (R.v !== "parks") nav("#/"); else render();
  if (keys.length) toast("Applied " + keys.map(k => k === "target" ? "trip date " + fmtShort(set[k]) : LAB[k] ? LAB[k](set[k]) : k).join(", "));
}

// ---------- events ----------
$("#ask").addEventListener("submit", e => { e.preventDefault(); applyAsk($("#q").value); });
$("#q").addEventListener("input", e => { if (!e.target.value.trim() && st.q) { st.q = ""; persist(); render(); } });
$("#sugg").addEventListener("click", e => { const b = e.target.closest(".sg"); if (!b) return; const k = b.dataset.f; st[k] = st[k] === b.dataset.v ? "" : b.dataset.v; persist(); syncFields(); render(); });
$("#chips").addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; if (c.dataset.k.startsWith("cf:")) { delete st.cf[c.dataset.k.slice(3)]; persist(); render(); return; } st[c.dataset.k] = ""; if (c.dataset.k === "q") $("#q").value = ""; syncFields(); persist(); render(); });
$("#sideGroups").addEventListener("click", e => { const a = e.target.closest("[data-side]"); if (!a) return; e.preventDefault(); const [k, v] = a.dataset.side.split(":"); st.kind = k === "kind" ? (st.kind === v ? "" : v) : st.kind; st.region = k === "region" ? (st.region === v ? "" : v) : st.region; syncFields(); persist(); nav("#/"); });
const FIELD = { fDes: "des", fSys: "sys", fRegion: "region", fAvail: "avail", fSeason: "season", fMonth: "month", fPeak: "peak", fWalk: "walk", fConf: "conf" };
Object.keys(FIELD).forEach(id => { $("#" + id).onchange = e => { st[FIELD[id]] = e.target.value; persist(); render(); }; });
$("#kindTabs").addEventListener("click", e => { const b = e.target.closest("[data-kind]"); if (!b) return; st.kind = b.dataset.kind; persist(); render(); });
$("#fName").addEventListener("input", e => { st.q = e.target.value; $("#q").value = st.q; persist(); render(); });
$("#fUnk").onchange = e => { st.unk = e.target.checked; persist(); render(); };
$("#clear").onclick = () => { Object.values(FIELD).concat("q", "kind").forEach(k => st[k] = ""); st.cf = {}; $("#q").value = ""; syncFields(); persist(); render(); };
$("#target").onchange = e => { if (e.target.value) { st.target = e.target.value; persist(); render(); } };
$("#tz").onchange = e => { st.tz = e.target.value; persist(); render(); };
$$("#parksTable thead th[data-k] button").forEach(b => b.onclick = () => { const k = b.closest("th").dataset.k; if (st.sort === k) st.dir = -st.dir; else { st.sort = k; st.dir = 1; } persist(); render(); });
$$("#campTable thead th[data-k] button").forEach(b => b.onclick = () => { const k = b.closest("th").dataset.k; if (st.csort === k) st.cdir = -st.cdir; else { st.csort = k; st.cdir = 1; } persist(); render(); });
$("#parksBody").addEventListener("click", e => { const tr = e.target.closest("tr[data-park]"); if (tr && !e.target.closest("a")) nav("#/park/" + tr.dataset.park); });
$("#campBody").addEventListener("click", e => { const pen = e.target.closest("[data-cedit]"); if (pen) { openEditor(pen.closest("tr").dataset.id, pen.dataset.cedit, pen.closest("td")); return; } const b = e.target.closest("[data-pick]"); const tr = e.target.closest("tr[data-id]"); const id = b ? b.dataset.pick : tr && tr.dataset.id; if (!id) return; selId = id; editing = false;
  $$("#campBody tr[data-id]").forEach(r => { const on = r.dataset.id === id; r.classList.toggle("sel", on); const p = r.querySelector("[data-pick]"); p && p.setAttribute("aria-pressed", on); });   // no redraw, so a double-click can land on the same cell
  renderPanel(shownCamps.find(x => x.s.id === id)); });
$("#cq").addEventListener("input", e => { st.cq = e.target.value; persist(); const pos = e.target.selectionStart; render(); const i = $("#cq"); i.focus(); i.setSelectionRange(pos, pos); });
$("#cMode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.cmode = b.dataset.m; persist(); render(); });
$("#panel").addEventListener("click", e => {
  const a = e.target.closest("[data-act]"); if (!a) return; const x = shownCamps.find(r => r.s.id === selId); if (!x) return;
  if (a.dataset.act === "edit") { editing = true; renderPanel(x); }
  else if (a.dataset.act === "cancel") { editing = false; renderPanel(x); }
  else if (a.dataset.act === "reset") { delete edits[selId]; store.set("cc-edits", edits); editing = false; toast("Reset to the original data."); render(); }
  else if (a.dataset.act === "remind") { download("remind-" + x.s.id + ".ics", ics("Book " + x.s.name + " (opens for " + fmtShort(x.c.from) + ")", x.c.at, x.s.park + ". " + E.ruleText(x.s.rule) + ". Log in 15 minutes early.", SYSTEMS[x.s.system].url), "text/calendar"); toast("Reminder saved. It rings 15 minutes before."); }
  else if (a.dataset.act === "rmphoto") { dbSet(selId, null).then(() => loadPhoto(selId)); }
});
$("#panel").addEventListener("submit", e => { if (e.target.id === "edForm") { e.preventDefault(); saveEdit(e.target); } });
$("#panel").addEventListener("change", e => { const f = e.target.closest("[data-photo]"); if (!f || !f.files[0]) return; shrink(f.files[0]).then(u => dbSet(f.dataset.photo, u)).then(() => { loadPhoto(f.dataset.photo); toast("Photo saved on this device."); }).catch(err => toast(err.message || "Could not save the photo.")); });
$("#csv").onclick = () => {
  const head = ["Park", "Type", "Campground", "Booking site", "How it opens", "Open date", "Open time (" + (st.tz === "pt" ? "Pacific" : "local") + ")", "Season", "Peak season", "Walk-up", "Data", "Notes"];
  const out = []; shownParks.forEach(x => x.calcs.forEach(({ r, c }) => out.push([splitName(r.park).name, desOf(r.park), r.name, SYSTEMS[r.system].name, ruleTxt(r), c.at ? fmtDay(c.at) : STATUS_TEXT[c.status], c.at ? fmtTime(c.at) : "", seasonText(r) || "Not researched", peakText(r) || "Not researched", r.walkup ? WALK[r.walkup] : "Not researched", confLabel(r), r.notes])));
  download("california-campsite-release-dates.csv", [head].concat(out).map(r => r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n"), "text/csv");
};
if (document.documentElement.classList.contains("embed")) window.addEventListener("storage", e => { if (e.key !== "theme") return; let t = null; try { t = JSON.parse(e.newValue); } catch (x) {} if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; });   // follow the site's theme
$("#themeBtn").onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), nx = cur === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = nx; store.set("cc-theme", nx); };
const openNav = () => { $("#side").classList.add("open"); $("#scrim").hidden = false; $("#menuBtn").setAttribute("aria-expanded", "true"); };
function closeNav() { $("#side").classList.remove("open"); $("#scrim").hidden = true; $("#menuBtn").setAttribute("aria-expanded", "false"); }
$("#menuBtn").onclick = openNav; $("#scrim").onclick = closeNav;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeNav(); });
// data page
function renderData() {
  const n = Object.keys(edits).length; $("#editSummary").textContent = n ? n + " campground" + (n > 1 ? "s" : "") + " edited on this device." : "No edits yet. Open a campground and choose Edit details to correct a date, season or note.";
  $("#aboutDate").textContent = dateOf(window.DATA_CHECKED).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}
$("#exportEdits").onclick = () => { download("campsite-edits.json", JSON.stringify({ app: "california-camping", v: 1, savedAt: new Date().toISOString(), edits }, null, 1), "application/json"); };
$("#importEdits").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (d.app !== "california-camping" || typeof d.edits !== "object") throw 0; if (!confirm("Replace your current edits with the " + Object.keys(d.edits).length + " in this file?")) return; edits = d.edits; store.set("cc-edits", edits); toast("Edits imported."); render(); } catch (err) { alert("That file is not an edits export from this site. Nothing changed."); } finally { e.target.value = ""; } };
$("#resetEdits").onclick = () => { if (!Object.keys(edits).length) return; if (confirm("Remove all " + Object.keys(edits).length + " edits and go back to the original data?")) { edits = {}; store.set("cc-edits", edits); toast("All edits removed."); render(); } };

// ---------- column menus: sort, search the values, tick which ones to show ----------
function markFiltered(tbl, cf) { $$(tbl + " thead th[data-k]").forEach(th => th.classList.toggle("filtered", !!(cf[th.dataset.k] && cf[th.dataset.k].length))); }
let M = null;
const menu = document.createElement("div"); menu.className = "cmenu"; menu.hidden = true; menu.setAttribute("role", "dialog"); document.body.appendChild(menu);
function place(el, anchor, maxW = 300) {
  const r = anchor.getBoundingClientRect(), w = Math.min(maxW, innerWidth - 16); el.style.width = w + "px";
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
  const h = el.offsetHeight, below = r.bottom + 4, above = r.top - 4 - h;   // under the cell if it fits, else above it, else as low as fits
  el.style.top = (below + h <= innerHeight - 8 ? below : above >= 8 ? above : Math.max(8, innerHeight - 8 - h)) + "px";
}
function openMenu(tbl, k, btn) {
  const park = tbl === "p", cols = park ? PCOL : CCOL, cf = park ? st.cf : campCF(), src = park ? allParkSums : allCamps, cnt = new Map();
  src.filter(x => passCF(x, cols, cf, k)).forEach(x => { const v = cols[k](x); cnt.set(v, (cnt.get(v) || 0) + 1); });
  (cf[k] || []).forEach(v => { if (!cnt.has(v)) cnt.set(v, 0); });
  M = { park, k, btn, cf, hidden: new Set(cf[k] || []), vals: [...cnt].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })) };
  menu.setAttribute("aria-label", "Sort and filter " + colName(park ? "#parksTable" : "#campTable", k));
  menu.innerHTML = '<div class="cm-sort"><button type="button" data-cm="asc">Sort A → Z</button><button type="button" data-cm="desc">Sort Z → A</button></div>' +
    '<div class="cm-h">Filter by values</div><div class="cm-sa"><button type="button" data-cm="all">Select all</button><button type="button" data-cm="none">Clear</button><span class="cm-n"></span></div>' +
    '<input type="search" class="cm-q" placeholder="Search" aria-label="Search values"><ul class="cm-l"></ul>' +
    '<div class="cm-f"><button type="button" class="btn" data-cm="cancel">Cancel</button><button type="button" class="btn primary" data-cm="ok">OK</button></div>';
  drawMenu(); menu.hidden = false; place(menu, btn); menu.querySelector(".cm-q").focus();
}
const menuShown = () => { const q = menu.querySelector(".cm-q").value.trim().toLowerCase(); return M.vals.map((v, i) => [v, i]).filter(([v]) => !q || String(v[0]).toLowerCase().includes(q)); };
function drawMenu() {
  const sh = menuShown();
  menu.querySelector(".cm-l").innerHTML = sh.map(([[v, n], i]) => '<li><label><input type="checkbox" value="' + i + '"' + (M.hidden.has(v) ? "" : " checked") + "><span>" + esc(v || "(blank)") + "</span><em>" + n + "</em></label></li>").join("") || '<li class="cm-none">No matches</li>';
  menu.querySelector(".cm-n").textContent = M.vals.filter(([v]) => !M.hidden.has(v)).length + " of " + M.vals.length;
}
function closeMenu(focus) { if (menu.hidden) return; menu.hidden = true; if (focus && M) M.btn.focus(); M = null; }
menu.addEventListener("input", e => { if (e.target.matches(".cm-q")) drawMenu(); });
menu.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches(".cm-q")) { e.preventDefault(); menu.querySelector('[data-cm="ok"]').click(); } });
menu.addEventListener("change", e => { const c = e.target; if (c.type !== "checkbox") return; const v = M.vals[+c.value][0]; c.checked ? M.hidden.delete(v) : M.hidden.add(v); drawMenu(); });
menu.addEventListener("click", e => {
  const b = e.target.closest("[data-cm]"); if (!b) return; const a = b.dataset.cm;
  if (a === "all" || a === "none") { menuShown().forEach(([[v]]) => a === "all" ? M.hidden.delete(v) : M.hidden.add(v)); drawMenu(); return; }
  if (a === "asc" || a === "desc") { if (M.park) { st.sort = M.k; st.dir = a === "asc" ? 1 : -1; } else { st.csort = M.k; st.cdir = a === "asc" ? 1 : -1; } }
  if (a === "ok") { if (M.hidden.size) M.cf[M.k] = [...M.hidden]; else delete M.cf[M.k]; }
  const btn = M.btn; closeMenu(); if (a !== "cancel") { persist(); render(); }
  const again = $((btn.closest("table").id ? "#" + btn.closest("table").id : "") + ' thead th[data-k="' + btn.closest("th").dataset.k + '"] .fb'); (again || btn).focus();
});
document.addEventListener("mousedown", e => { if (!menu.hidden && !menu.contains(e.target) && !e.target.closest(".fb")) closeMenu(); if (!ed.hidden && !ed.contains(e.target) && !e.target.closest("[data-cedit]")) closeEditor(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (!menu.hidden) closeMenu(true); if (!ed.hidden) closeEditor(true); }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z" && lastEdit && !e.target.closest("input,textarea,select")) { e.preventDefault(); undoEdit(); }
});
["#parksTable", "#campTable"].forEach(t => $$(t + " thead th[data-k]").forEach(th => {
  th.insertAdjacentHTML("beforeend", '<button type="button" class="fb" aria-haspopup="dialog" aria-label="Sort and filter ' + esc(th.textContent.trim()) + '">▾</button>');
  th.querySelector(".fb").onclick = e => { e.stopPropagation(); const open = !menu.hidden && M && M.btn === e.currentTarget; closeMenu(); if (!open) openMenu(t === "#parksTable" ? "p" : "c", th.dataset.k, e.currentTarget); };
}));
$("#cClear").onclick = () => { st.ccf = { park: R.key, f: {} }; persist(); render(); };

// ---------- edit a campground cell in place (double-click, Enter or the pencil): Season, Peak season, Walk-up ----------
const ed = document.createElement("div"); ed.className = "cmenu ced"; ed.hidden = true; ed.setAttribute("role", "dialog"); document.body.appendChild(ed);
let ET = null;
function openEditor(id, k, td) {
  closeMenu(); const s = eff(BASE.find(b => b.id === id)); ET = { id, k, td };
  const mo = arr => '<div class="months">' + MON3.map((m, i) => '<label><input type="checkbox" name="m" value="' + (i + 1) + '"' + (arr && arr.includes(i + 1) ? " checked" : "") + "> " + m + "</label>").join("") + "</div>";
  const title = { season: "Season (open months)", peak: "Peak season", walk: "Walk-up" }[k];
  ed.setAttribute("aria-label", title + ", " + s.name);
  ed.innerHTML = '<form class="ed-f"><div class="cm-h">' + esc(title) + " · " + esc(s.name) + "</div>" +
    (k === "walk" ? '<label class="field">Walk-up sites<select name="walkup"><option value="">Not known</option>' + Object.keys(WALK).map(w => '<option value="' + w + '"' + (s.walkup === w ? " selected" : "") + ">" + WALK[w] + "</option>").join("") + "</select></label>" +
      '<label class="field">Note<input type="text" name="note" value="' + esc(s.walkupNote) + '"></label>'
    : mo(k === "season" ? s.open : s.peak) + '<div class="cm-sa"><button type="button" data-ea="all">All year</button><button type="button" data-ea="none">Not known</button></div>' +
      '<label class="field">Note<input type="text" name="note" value="' + esc(k === "season" ? s.openNote : s.peakNote) + '"></label>') +
    '<div class="cm-f"><button type="button" class="btn" data-ea="cancel">Cancel</button><button type="submit" class="btn primary">Save</button></div></form>';
  ed.hidden = false; place(ed, td, 360); (ed.querySelector("select,input")).focus();
}
function closeEditor(focus) { if (ed.hidden) return; ed.hidden = true; const t = ET; ET = null; if (focus && t) { const c = $('#campBody tr[data-id="' + CSS.escape(t.id) + '"] [data-ed="' + t.k + '"]'); c && c.focus(); } }
ed.addEventListener("click", e => { const b = e.target.closest("[data-ea]"); if (!b) return; const a = b.dataset.ea;
  if (a === "cancel") closeEditor(true); else ed.querySelectorAll('input[name="m"]').forEach(c => c.checked = a === "all"); });
ed.addEventListener("submit", e => {
  e.preventDefault(); const fd = new FormData(e.target), { id, k } = ET, s = eff(BASE.find(b => b.id === id)), note = String(fd.get("note") || "").trim();
  const ms = fd.getAll("m").map(Number).sort((a, b) => a - b), cur = { open: s.open, openNote: s.openNote, peak: s.peak, peakNote: s.peakNote, walkup: s.walkup, walkupNote: s.walkupNote, rule: s.rule, notes: s.notes };
  if (k === "season") Object.assign(cur, { open: ms.length ? ms : null, openNote: note }); else if (k === "peak") Object.assign(cur, { peak: ms.length ? ms : null, peakNote: note }); else Object.assign(cur, { walkup: fd.get("walkup") || null, walkupNote: note });
  const before = JSON.stringify(edits[id] || null), changed = commitEdit(id, cur) || before !== JSON.stringify(edits[id] || null);
  closeEditor(); undoToast(changed ? "Saved. Marked as edited on this device." : "No changes.", changed); render();
  const c = $('#campBody tr[data-id="' + CSS.escape(id) + '"] [data-ed="' + k + '"]'); c && c.focus();
});
$("#campBody").addEventListener("dblclick", e => { const td = e.target.closest("td[data-ed]"); if (td) openEditor(td.closest("tr").dataset.id, td.dataset.ed, td); });
$("#campBody").addEventListener("keydown", e => { const td = e.target.closest("td[data-ed]"); if (td && e.target === td && (e.key === "Enter" || e.key === "F2")) { e.preventDefault(); openEditor(td.closest("tr").dataset.id, td.dataset.ed, td); } });

// ---------- setup and render ----------
function syncFields() { Object.keys(FIELD).forEach(id => $("#" + id).value = st[FIELD[id]] || ""); $("#fName").value = st.q; $("#fUnk").checked = st.unk !== false; $("#q").value = st.q; }
function render() {
  if (R.v === "parks") renderParks(); else if (R.v === "park") { renderPark(); renderSide(); } else if (R.v === "data") renderData(); else renderSide();
  CC.subs.forEach(f => { try { f(); } catch (e) {} });
}
const CC = { subs: [], st, fmtAt, fmtShort, fmtDate, fmtDay, fmtTime, splitName, countdown, ics, download, toast, todayPT, esc };
window.CC = CC;
$("#fMonth").insertAdjacentHTML("beforeend", MONTHS.map((m, i) => '<option value="' + (i + 1) + '">' + m + "</option>").join(""));
$("#fDes").insertAdjacentHTML("beforeend", [...new Set(BASE.map(s => desOf(s.park)).filter(Boolean))].sort().map(d => '<option value="' + esc(d) + '">' + esc(d) + (DES_FULL[d] ? " · " + esc(DES_FULL[d]) : "") + "</option>").join(""));
$("#fRegion").insertAdjacentHTML("beforeend", [...new Set(BASE.map(s => s.region))].sort().map(r => '<option value="' + esc(r) + '">' + esc(r) + "</option>").join(""));
$("#target").min = todayPT(); $("#target").value = st.target; $("#tz").value = st.tz; syncFields();
if (matchMedia("(min-width: 861px)").matches) $("#filters").open = activeFilters().some(x => x.k !== "q");
show();
setInterval(() => { $$("[data-cd]").forEach(el => { const t = +el.dataset.cd; const cd = countdown(new Date(t)); el.textContent = (el.dataset.pre || "") + (el.dataset.bare !== undefined ? cd.replace(/^in /, "") : cd); if (t <= Date.now()) render(); }); }, 1000);
window.__app = { st, calc, render, interpret };
})();
