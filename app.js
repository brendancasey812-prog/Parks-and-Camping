(function () {
const E = window.Engine, SITES = window.SITES, SYSTEMS = window.SYSTEMS;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = n => String(n).padStart(2, "0");

// ---------- state ----------
const ptParts = d => { const p = {}; new Intl.DateTimeFormat("en-US", { timeZone: E.TZ, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).forEach(x => p[x.type] = +x.value); return p; };
const todayPT = () => { const p = ptParts(new Date()); return E.iso(p.year, p.month, p.day); };
const defaultTarget = () => { let d = E.addDays(todayPT(), 215); const p = E.parseISO(d), dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); return E.addDays(d, (5 - dow + 7) % 7); };
const saved = store.get("cc-state", {});
const st = Object.assign({ target: defaultTarget(), tz: "pt", q: "", sys: "", region: "", avail: "", season: "", month: "", peak: "", walk: "", conf: "", unk: true, sort: "opens", dir: 1 }, saved);
if (st.target < todayPT()) st.target = defaultTarget();
const persist = () => store.set("cc-state", st);
const open = new Set();

// ---------- per-row calculation ----------
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
function countdown(at) {
  let ms = at - new Date(); if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  if (d >= 60) return "in " + Math.round(d / 30.4) + " months";
  if (d >= 1) return "in " + d + "d " + h + "h";
  if (h >= 1) return "in " + h + "h " + m + "m";
  return "in " + m + "m " + (s % 60) + "s";
}
function fmtAt(date, withTime = true) {
  const o = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  if (withTime) { o.hour = "numeric"; o.minute = "2-digit"; o.timeZoneName = "short"; }
  if (st.tz === "pt") o.timeZone = E.TZ;
  return date.toLocaleString([], o);
}
const fmtDate = iso => { const p = E.parseISO(iso); return new Date(p.y, p.m - 1, p.d, 12).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }); };
const fmtShort = iso => { const p = E.parseISO(iso); return new Date(p.y, p.m - 1, p.d, 12).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); };

// ---------- filtering ----------
function matches(s, c) {
  const q = st.q.trim().toLowerCase();
  if (q && !(s.name + " " + s.park + " " + s.region + " " + s.agency + " " + SYSTEMS[s.system].name).toLowerCase().includes(q)) return false;
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
  const seasonOn = st.season || st.month, unkSeason = !s.open, unkPeak = !s.peak, unkWalk = !s.walkup;
  if (seasonOn && unkSeason) { if (!st.unk) return false; }
  else {
    if (st.season === "on" && !s.open.includes(m)) return false;
    if (st.season === "year" && s.open.length !== 12) return false;
    if (st.season === "seasonal" && !(s.open.length > 0 && s.open.length < 12)) return false;
    if (st.month && !s.open.includes(+st.month)) return false;
  }
  if (st.peak && unkPeak) { if (!st.unk) return false; }
  else {
    if (st.peak === "on" && !s.peak.includes(m)) return false;
    if (st.peak === "off" && s.peak.includes(m)) return false;
  }
  if (st.walk && unkWalk) { if (!st.unk) return false; }
  else {
    if (st.walk === "any" && !["some", "only"].includes(s.walkup)) return false;
    if (st.walk === "none" && s.walkup !== "none") return false;
    if (st.walk === "only" && s.walkup !== "only") return false;
  }
  if (st.conf && s.conf !== st.conf) return false;
  return true;
}
const SORT = {
  name: (a, b) => a.s.name.localeCompare(b.s.name), sys: (a, b) => a.s.system.localeCompare(b.s.system) || a.s.name.localeCompare(b.s.name),
  rule: (a, b) => (a.s.rule.kind + (a.s.rule.months || a.s.rule.monthsAhead || 0)).localeCompare(b.s.rule.kind + (b.s.rule.months || b.s.rule.monthsAhead || 0)),
  opens: (a, b) => (a.c.at ? a.c.at.getTime() : Infinity) - (b.c.at ? b.c.at.getTime() : Infinity) || a.s.name.localeCompare(b.s.name),
  season: (a, b) => ((a.s.open || []).length || 99) - ((b.s.open || []).length || 99), peak: (a, b) => ((a.s.peak || []).length || 99) - ((b.s.peak || []).length || 99),
  walk: (a, b) => ["none", "some", "only"].indexOf(a.s.walkup) - ["none", "some", "only"].indexOf(b.s.walkup), conf: (a, b) => a.s.conf.localeCompare(b.s.conf)
};

// ---------- rendering ----------
const STATUS_TEXT = { past: "That date has passed", closed: "Closed", walk: "No reservations that month. Walk-up only", fcfs: "First-come, first-served. Nothing to release", unknown: "Release rule not verified" };
function openCell(s, c) {
  if (c.at) {
    const when = fmtAt(c.at), span = c.from !== c.to ? "<small>Opens " + esc(fmtShort(c.from)) + " – " + esc(fmtShort(c.to)) + "</small>" : "";
    if (c.status === "open") return '<span class="st open">Open now</span><b>Opened ' + esc(when) + "</b>" + span;
    return '<span class="st later" data-cd="' + c.at.getTime() + '">' + esc(countdown(c.at)) + "</span><b>" + esc(when) + "</b>" + span;
  }
  return '<span class="st none">' + esc(STATUS_TEXT[c.status] || "") + "</span>";
}
const NV = '<span class="nv">Not verified yet</span>';
function seasonCell(s) {
  if (!s.open && !s.openNote) return NV;
  const t = s.open ? E.monthsLabel(s.open) : "Not verified";
  return "<b>" + esc(t) + "</b>" + (s.openNote ? "<small>" + esc(s.openNote) + "</small>" : "") + (s.check.includes("season") ? '<span class="warn" title="Season still to verify">⚠ verify</span>' : "");
}
function peakCell(s) {
  if (!s.peak && !s.peakNote) return NV;
  const t = s.peak ? E.monthsLabel(s.peak) : "Varies";
  const on = s.peak && s.peak.includes(monthOf(st.target));
  return "<b>" + esc(t) + "</b>" + (on ? '<span class="tag peak">Peak on your date</span>' : "") + (s.peakNote ? "<small>" + esc(s.peakNote) + "</small>" : "") + (s.check.includes("peak") ? '<span class="warn" title="Peak season still to verify">⚠ verify</span>' : "");
}
const WALK = { none: ["Reservation only", "no"], some: ["Some walk-up", "some"], only: ["Walk-up only", "only"] };
function walkCell(s) { if (!s.walkup) return s.walkupNote ? "<small>" + esc(s.walkupNote) + "</small>" + NV : NV; const w = WALK[s.walkup]; return '<span class="tag walk-' + w[1] + '">' + w[0] + "</span>" + (s.walkupNote ? "<small>" + esc(s.walkupNote) + "</small>" : "") + (s.check.includes("walkup") ? '<span class="warn" title="Walk-up rules still to verify">⚠ verify</span>' : ""); }
const CONF = { good: ["Confirmed", "good"], check: ["Needs checking", "check"], assumed: ["Default rule", "assumed"] };
function rowHtml(x) {
  const { s, c } = x, sys = SYSTEMS[s.system], isOpen = open.has(s.id), badge = CONF[s.conf];
  const book = sys.url ? '<a class="btn" href="' + esc(sys.url) + '" target="_blank" rel="noopener">Book ↗</a>' : "";
  const rem = c.at && c.status === "later" ? '<button type="button" class="btn" data-rem="' + esc(s.id) + '" aria-label="Add a calendar reminder for ' + esc(s.name) + '">⏰ Remind me</button>' : "";
  const src = s.sources.map(r => '<li><a href="' + esc(r.u) + '" target="_blank" rel="noopener">' + esc(r.t) + " ↗</a></li>").join("");
  const chk = s.check.length ? "<p><b>Still to verify:</b> " + s.check.map(esc).join(", ") + "</p>" : "";
  return '<tr class="row' + (isOpen ? " open" : "") + '" data-id="' + esc(s.id) + '">' +
    '<th scope="row" data-l="Location"><button type="button" class="xp" data-xp="' + esc(s.id) + '" aria-expanded="' + isOpen + '" aria-label="Details for ' + esc(s.name) + '"><i aria-hidden="true">' + (isOpen ? "▾" : "▸") + "</i><span><b>" + esc(s.name) + "</b><small>" + esc(s.park) + " · " + esc(s.region) + "</small></span></button></th>" +
    '<td data-l="Booking site"><b>' + esc(sys.name) + "</b><small>" + esc(s.agency) + "</small></td>" +
    '<td data-l="How it opens">' + esc(E.ruleText(s.rule)) + (s.check.includes("rule") && s.rule.kind !== "none" ? ' <span class="warn" title="Release rule assumed from the booking system default">assumed</span>' : "") + "</td>" +
    '<td data-l="Date available" class="av">' + openCell(s, c) + "</td>" +
    '<td data-l="Season">' + seasonCell(s) + "</td>" +
    '<td data-l="Peak season">' + peakCell(s) + "</td>" +
    '<td data-l="Walk-up">' + walkCell(s) + "</td>" +
    '<td data-l="Data check"><span class="badge ' + badge[1] + '">' + badge[0] + "</span></td>" +
    '<td class="acts">' + rem + book + "</td></tr>" +
    (isOpen ? '<tr class="detail"><td colspan="9"><div class="dt"><p>' + esc(s.notes || "No extra notes.") + "</p>" + chk + "<p><b>Sources</b></p><ul>" + src + "</ul></div></td></tr>" : "");
}
let shown = [];
function render() {
  const rows = SITES.map(s => ({ s, c: calc(s) })).filter(x => matches(x.s, x.c));
  const f = SORT[st.sort] || SORT.opens; rows.sort((a, b) => f(a, b) * st.dir);
  shown = rows;
  $("#tbody").innerHTML = rows.map(rowHtml).join("") || '<tr><td colspan="9" class="empty">Nothing matches these filters. Try clearing one.</td></tr>';
  $("#count").textContent = rows.length + " of " + SITES.length + " listings";
  $$("thead th[data-k]").forEach(th => { const on = th.dataset.k === st.sort; th.setAttribute("aria-sort", on ? (st.dir > 0 ? "ascending" : "descending") : "none"); th.classList.toggle("on", on); });
  renderChips(); renderPlanNote(); renderSoon(); renderSummary();
}
function renderSummary() {
  const by = k => SITES.filter(s => s.system === k).length, ok = SITES.filter(s => s.conf !== "assumed").length;
  $("#summary").textContent = SITES.length + " listings: " + by("rec") + " on Recreation.gov, " + by("rc") + " on ReserveCalifornia, " + by("fcfs") + " first-come only. " + ok + " have researched details; " + (SITES.length - ok) + " use their booking site's default release rule until the daily check fills in season, peak season and walk-up.";
}
function renderPlanNote() {
  const m = monthOf(st.target), peakN = SITES.filter(s => s.peak && s.peak.includes(m)).length;
  const rec = E.releaseFor({ kind: "rolling", months: 6, time: "07:00" }, st.target), rc = E.releaseFor({ kind: "rolling", months: 6, time: "08:00" }, st.target);
  $("#planNote").innerHTML = "For <b>" + esc(fmtDate(st.target)) + "</b>: Recreation.gov usually opens <b>" + esc(fmtAt(rec.at)) + "</b>; ReserveCalifornia opens <b>" + esc(fmtAt(rc.at)) + "</b>. " + peakN + " listed campgrounds are in peak season that month.";
}
const LABELS = { sys: v => SYSTEMS[v].name, avail: v => ({ open: "Already open", "7d": "Opens within 7 days", "30d": "Opens within 30 days", later: "Opens later", walk: "No advance booking" })[v], season: v => ({ on: "Open on my date", year: "Year-round", seasonal: "Seasonal only" })[v],
  month: v => "Open in " + MONTHS[v - 1], peak: v => ({ on: "Peak on my date", off: "Not peak on my date", has: "Has a peak season" })[v], walk: v => ({ any: "Walk-up available", none: "Reservation only", only: "Walk-up only" })[v], conf: v => ({ good: "Confirmed", check: "Needs checking", assumed: "Default rule" })[v], region: v => v, q: v => "Search: " + v };
function renderChips() {
  const out = Object.keys(LABELS).filter(k => st[k] && String(st[k]).trim()).map(k => '<button type="button" class="chip" data-k="' + k + '" aria-label="Remove filter: ' + esc(LABELS[k](st[k])) + '">' + esc(LABELS[k](st[k])) + ' <span aria-hidden="true">✕</span></button>');
  $("#chips").innerHTML = out.join(""); $("#chips").hidden = !out.length;
}

// ---------- "Opening next" cards ----------
function renderSoon() {
  const groups = new Map();
  SITES.filter(s => s.rule.kind !== "none" && s.status !== "closed").forEach(s => { const k = s.system + "|" + JSON.stringify(s.rule); if (!groups.has(k)) groups.set(k, { rule: s.rule, system: s.system, sites: [] }); groups.get(k).sites.push(s); });
  const now = new Date(), list = [...groups.values()].map(g => ({ g, n: E.nextReleases(g.rule, now, 1)[0] })).filter(x => x.n).sort((a, b) => a.n.at - b.n.at);
  $("#soonList").innerHTML = list.map(({ g, n }, i) => {
    const names = g.sites.map(s => s.name), more = names.length > 3 ? " +" + (names.length - 3) + " more" : "";
    const opens = n.from === n.to ? fmtDate(n.from) : fmtShort(n.from) + " – " + fmtShort(n.to);
    return '<article class="card"><span class="st later" data-cd="' + n.at.getTime() + '">' + esc(countdown(n.at)) + "</span><h3>" + esc(SYSTEMS[g.system].name) + "</h3><p class=\"rl\">" + esc(E.ruleText(g.rule)) + '</p><p><b>' + esc(fmtAt(n.at)) + "</b></p><p>Opens dates: <b>" + esc(opens) + "</b></p><p class=\"muted\">" + esc(names.slice(0, 3).join(", ") + more) + '</p><button type="button" class="btn" data-soon="' + i + '">⏰ Remind me</button></article>';
  }).join("");
  renderSoon.list = list;
}

// ---------- reminders (.ics) ----------
function ics(title, at, desc, url) {
  const z = d => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", end = new Date(at.getTime() + 30 * 60000);
  const e = s => String(s || "").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//California Campsite Release Tracker//EN", "BEGIN:VEVENT", "UID:" + Math.random().toString(36).slice(2) + "@campsite-release", "DTSTAMP:" + z(new Date()), "DTSTART:" + z(at), "DTEND:" + z(end),
    "SUMMARY:" + e(title), "DESCRIPTION:" + e(desc), url ? "URL:" + url : "", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + e(title), "TRIGGER:-PT15M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
}
function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500); }

// ---------- events ----------
$("#tbody").addEventListener("click", e => {
  const xp = e.target.closest("[data-xp]"); if (xp) { const id = xp.dataset.xp; open.has(id) ? open.delete(id) : open.add(id); render(); const b = $('[data-xp="' + id + '"]'); b && b.focus(); return; }
  const rem = e.target.closest("[data-rem]"); if (rem) {
    const x = shown.find(r => r.s.id === rem.dataset.rem); if (!x || !x.c.at) return;
    download("remind-" + x.s.id + ".ics", ics("Book " + x.s.name + " (opens for " + fmtShort(x.c.from) + ")", x.c.at, x.s.park + ". " + E.ruleText(x.s.rule) + ". Log in 15 minutes early.", SYSTEMS[x.s.system].url), "text/calendar");
    toast("Reminder saved. It rings 15 minutes before the release.");
  }
});
$("#soonList").addEventListener("click", e => {
  const b = e.target.closest("[data-soon]"); if (!b) return; const { g, n } = renderSoon.list[+b.dataset.soon];
  download("remind-" + SYSTEMS[g.system].name.toLowerCase().replace(/[^a-z]+/g, "-") + ".ics", ics(SYSTEMS[g.system].name + " release: " + (n.from === n.to ? fmtShort(n.from) : fmtShort(n.from) + " – " + fmtShort(n.to)), n.at, g.sites.map(s => s.name).join(", "), SYSTEMS[g.system].url), "text/calendar");
  toast("Reminder saved. It rings 15 minutes before the release.");
});
$$("thead th[data-k] button").forEach(b => b.onclick = () => { const k = b.closest("th").dataset.k; if (st.sort === k) st.dir = -st.dir; else { st.sort = k; st.dir = 1; } persist(); render(); });
const FIELD = { fSys: "sys", fAvail: "avail", fSeason: "season", fMonth: "month", fPeak: "peak", fWalk: "walk", fConf: "conf", fRegion: "region" };
$("#fUnk").onchange = e => { st.unk = e.target.checked; persist(); render(); };
Object.keys(FIELD).forEach(id => { $("#" + id).onchange = e => { st[FIELD[id]] = e.target.value; persist(); render(); }; });
$("#q").addEventListener("input", e => { st.q = e.target.value; persist(); render(); });
$("#chips").addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; st[c.dataset.k] = ""; syncFields(); persist(); render(); });
$("#clear").onclick = () => { Object.values(FIELD).concat("q").forEach(k => st[k] = ""); syncFields(); persist(); render(); };
$("#target").onchange = e => { if (e.target.value) { st.target = e.target.value; persist(); render(); } };
$$(".quick button").forEach(b => b.onclick = () => {
  let d = todayPT(); if (b.dataset.add) d = E.addDays(d, +b.dataset.add); else { const p = E.parseISO(d), dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); d = E.addDays(d, ((5 - dow + 7) % 7) || 7); }
  st.target = d; $("#target").value = d; persist(); render();
});
$$("#tz button").forEach(b => b.onclick = () => { st.tz = b.dataset.tz; syncTz(); persist(); render(); });
$("#csv").onclick = () => {
  const head = ["Location", "Park", "Booking site", "How it opens", "Date available (" + (st.tz === "pt" ? "Pacific" : "local") + ")", "Season", "Peak season", "Walk-up", "Data check", "Notes"];
  const rows = shown.map(({ s, c }) => [s.name, s.park, SYSTEMS[s.system].name, E.ruleText(s.rule), c.at ? fmtAt(c.at) : STATUS_TEXT[c.status], s.open ? E.monthsLabel(s.open) : "Not verified yet", s.peak ? E.monthsLabel(s.peak) : "Not verified yet", s.walkup ? WALK[s.walkup][0] : "Not verified yet", CONF[s.conf][0], s.notes]);
  download("california-campsite-releases.csv", [head].concat(rows).map(r => r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n"), "text/csv");
};
$("#themeBtn").onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), nx = cur === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = nx; store.set("cc-theme", nx); };

// ---------- setup ----------
function syncFields() { Object.keys(FIELD).forEach(id => $("#" + id).value = st[FIELD[id]] || ""); $("#q").value = st.q; $("#fUnk").checked = st.unk !== false; }
function syncTz() { $$("#tz button").forEach(b => { const on = b.dataset.tz === st.tz; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
$("#fMonth").insertAdjacentHTML("beforeend", MONTHS.map((m, i) => '<option value="' + (i + 1) + '">' + m + "</option>").join(""));
$("#fRegion").insertAdjacentHTML("beforeend", [...new Set(SITES.map(s => s.region))].sort().map(r => '<option value="' + esc(r) + '">' + esc(r) + "</option>").join(""));
$("#target").min = todayPT(); $("#target").value = st.target; syncFields(); syncTz();
$("#checked").textContent = "Data checked " + new Date(window.DATA_CHECKED + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
$("#aboutDate").textContent = new Date(window.DATA_CHECKED + "T12:00:00").toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
render();
setInterval(() => { $$("[data-cd]").forEach(e => { const t = +e.dataset.cd; e.textContent = countdown(new Date(t)); if (t <= Date.now()) render(); }); }, 1000);
window.__app = { st, calc, render };
})();
