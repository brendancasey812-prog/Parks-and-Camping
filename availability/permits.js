/* Permits & lotteries view. Uses the shared date and time-zone choice from app.js (window.CC) and the Pacific-time helpers in engine.js. */
(function () {
const E = window.Engine, CC = window.CC, PERMITS = window.PERMITS;
if (!CC || !PERMITS) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = CC.esc;
const pad = n => String(n).padStart(2, "0");
const dow = iso => { const p = E.parseISO(iso); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); };
const at = (iso, time) => { const p = E.parseISO(iso), [h, m] = (time || "00:00").split(":").map(Number); return E.ptInstant(p.y, p.m, p.d, h, m); };
const inRange = (iso, v) => { if (!v) return true; const md = iso.slice(5); return v.from <= v.to ? md >= v.from && md <= v.to : md >= v.from || md <= v.to; };
const when = d => CC.fmtAt(d), day = iso => CC.fmtShort(iso);
const conf = { good: ["Confirmed", "good"], check: ["Needs checking", "check"] };

// ---------- compute one phase for the chosen date ----------
// the date each step is worked out for: the first day of the step's season in the chosen Year (today if that has passed)
const tripFor = p => {
  const d = CC.st.year + "-" + (p.valid ? p.valid.from : "01-01"), t = CC.todayPT(), x = d < t ? t : d;
  if (p.kind === "monthsBefore" && !p.valid) return E.addDays(t, Math.round(p.closeMonths * 30.44) + 10);
  if (p.kind !== "weekly") return x;
  let now = E.addDays(t, -dow(t));                        // this week's lottery
  if (p.leftover) { now = E.addDays(now, -7); while (at(E.addDays(now, 12), "09:00") > new Date()) now = E.addDays(now, -7); }   // the latest leftovers already on sale (Friday 9:00 AM, 12 days after their lottery opened)
  const cur = E.addDays(now, p.leadDays); return cur > x ? cur : x;
};
function compute(p, D, now) {
  D = tripFor(p);
  const r = { phase: p, open: null, close: null, extra: [], approx: false, projected: false, na: "" };
  if (p.kind !== "oneTime" && D < CC.todayPT()) { r.na = "That date has passed."; return r; }
  if (p.kind !== "oneTime" && !inRange(D.slice(0, 10), p.valid)) { r.na = "Outside this permit's usual season, so this step does not apply yet this year."; return r; }
  if (p.kind === "annual") {
    const Y = E.parseISO(D).y, mk = (x, def) => { const t = x.time || def; return at(Y + "-" + pad(x.m) + "-" + pad(x.d), t); };
    r.open = mk(p.open, "00:00"); r.close = mk(p.close, "23:59"); r.approx = !(p.open.time && p.close.time); r.projected = Y > p.announced;
  } else if (p.kind === "daily") {
    const d = E.addDays(D, -p.daysBefore); r.open = at(d, p.open); r.close = at(d, p.close);
  } else if (p.kind === "weekly") {
    const base = E.addDays(D, -p.leadDays), sun = E.addDays(base, -dow(base)), sunY = E.parseISO(sun), md = pad(sunY.m) + "-" + pad(sunY.d);
    const ss = pad(p.seasonStart.m) + "-" + pad(p.seasonStart.d), se = pad(p.seasonEnd.m) + "-" + pad(p.seasonEnd.d);
    if (!(md >= ss || md <= se)) { r.na = "The weekly lottery does not run in that week (it runs mid-November to early May)."; return r; }
    r.cover = [E.addDays(sun, p.leadDays), E.addDays(sun, p.leadDays + 6)];
    if (p.leftover) { r.open = at(E.addDays(sun, 12), "09:00"); r.close = null; r.week = "From the lottery of " + day(sun) + " – " + day(E.addDays(sun, 6)); return r; }
    r.open = at(sun, "00:01"); r.close = at(E.addDays(sun, 6), "23:59"); r.week = day(sun) + " – " + day(E.addDays(sun, 6));
    r.extra = [["Results", at(E.addDays(sun, 8), "00:00"), true], ["Accept and pay by", at(E.addDays(sun, 11), "23:59"), true], ["Leftovers open", at(E.addDays(sun, 12), "09:00"), false]];
    r.approx = true;
  } else if (p.kind === "days") {
    r.open = at(E.addDays(D, -p.days), p.time || "00:00"); if (!p.time) r.approx = true;
  } else if (p.kind === "monthsBefore") {                                         // e.g. a drawing: apply from N months before arrival until M months before
    const a = E.parseISO(D.slice(0, 10)), o = E.rollingReleaseDay(a.y, a.m, a.d, p.openMonths), c = E.rollingReleaseDay(a.y, a.m, a.d, p.closeMonths);
    r.open = at(E.iso(o.y, o.m, o.d), p.time || "00:00"); r.close = at(E.iso(c.y, c.m, c.d), p.time || "00:00"); r.approx = true;
    if (p.release) { const l = E.rollingReleaseDay(a.y, a.m, a.d, p.release.months); r.extra = [["Unclaimed sites open", at(E.iso(l.y, l.m, l.d), p.release.time), false]]; }
  } else if (p.kind === "oneTime") {
    const f = s => { const [d, t] = s.split("T"); return at(d, t); }; r.open = f(p.open); r.close = f(p.close);
  }
  return r;
}
function status(r, now) {
  if (r.na) return { k: "na", t: "Not this season" };
  if (now < r.open) return { k: "soon", t: "Opens " + CC.countdown(r.open) };
  if (r.close && now <= r.close) return { k: "open", t: "Open now" };
  if (!r.close) return { k: "open", t: "Open now" };
  return { k: "closed", t: "Closed" };
}

// ---------- search and filters (saved in this browser) ----------
const F = Object.assign({ q: "", cf: {}, sort: "odate", dir: 1 }, (() => { try { return JSON.parse(localStorage.getItem("cc-pm2")) || {}; } catch (e) { return {}; } })());
Object.keys(F.cf || {}).forEach(k => { if (!["name", "step", "odate", "otime", "stat", "access", "cdate", "type", "sys"].includes(k)) delete F.cf[k]; });   // filters on columns no longer shown
const saveF = () => { try { localStorage.setItem("cc-pm2", JSON.stringify(F)); } catch (e) {} };
const loc = perm => { const n = CC.splitName(perm.park); return n.name + (n.des ? " " + n.des : ""); };
const typeOf = p => p.kind === "days" || p.leftover ? "release" : /lottery/i.test(p.label) || ["weekly", "daily", "oneTime"].includes(p.kind) ? "lottery" : "window";
const TYPE = { lottery: "Lottery", release: "Rolling release", window: "Application window" };
const textOk = (perm, p) => { const q = F.q.trim().toLowerCase(); return !q || [perm.name, perm.park, loc(perm), perm.summary, perm.system, p && p.label, p && p.what].join(" ").toLowerCase().includes(q); };
const permOk = perm => textOk(perm) || perm.phases.some(p => textOk(perm, p));
const EV_PERM = { "hd-pre": "half-dome", "yw-weekly": "yose-wilderness" };
const dayT = d => CC.fmtDay(d), timeT = d => CC.fmtTime(d);

// ---------- render ----------
function phaseRow(perm, p, D, now) {
  const r = compute(p, D, now), st = status(r, now);
  const stat = '<span class="st ' + (st.k === "open" ? "open" : st.k === "soon" ? "later" : "none") + '"' + (st.k === "soon" ? ' data-pre="Opens " data-cd="' + r.open.getTime() + '"' : "") + ">" + esc(st.t) + "</span>";
  const proj = r.projected ? '<span class="when-t">Projected</span>' : "";
  let opens = "", closes = "", more = "";
  if (r.na) { opens = '<span class="muted">' + esc(r.na) + "</span>"; }
  else {
    opens = "<b>" + esc(when(r.open)) + "</b>" + (r.week ? '<span class="when-t">Week of ' + esc(r.week) + "</span>" : "") + ((r.approx && p.kind === "annual" || (!p.time && ["monthsBefore", "days"].includes(p.kind))) ? '<span class="when-t">Exact time not published</span>' : "") + proj;
    closes = r.close ? esc(when(r.close)) : "None";
    more = r.extra.map(x => '<span class="when-t">' + esc(x[0]) + ": " + esc(CC.fmtAt(x[1], !x[2])) + "</span>").join("");
  }
  const rem = !r.na && st.k === "soon" ? '<button type="button" class="btn sm" data-rem="' + esc(perm.id + "|" + p.id) + '">Add reminder</button>' : "";
  return '<tr><th scope="row" data-l="Step">' + esc(p.label) + '<span class="when-t">' + esc(p.what) + '</span></th><td data-l="Status">' + stat + '</td><td data-l="Opens">' + opens + '</td><td data-l="Closes">' + closes + '</td><td data-l="Results">' + esc(p.results) + more + (p.note ? '<span class="when-t">' + esc(p.note) + "</span>" : "") + '</td><td data-l="">' + rem + "</td></tr>";
}
// permit openings: one row each with open date and time, close, release date, hiking dates and permits
function openingsHtml(perm) {
  if (!perm.openings || !perm.openings.length) return "";
  const H = ["Permit", "Open date", "Open time (Pacific)", "Closes", "Release date", "Hiking dates", "Permits"], K = ["name", "open", "time", "close", "release", "hike", "permits"];
  return '<div class="tw"><table class="tbl stack pm-open"><caption>' + esc(perm.openingsYear || "") + '</caption><thead><tr>' + H.map(h => '<th scope="col">' + h + "</th>").join("") + "</tr></thead><tbody>" +
    perm.openings.map(o => "<tr>" + K.map((k, n) => n ? '<td data-l="' + H[n] + '">' + esc(o[k] || "") + "</td>" : '<th scope="row">' + esc(o[k]) + "</th>").join("") + "</tr>").join("") + "</tbody></table></div>";
}
function cardHtml(perm, D, now) {
  const b = conf[perm.conf] || conf.check;
  return '<article class="card flush pm-card" tabindex="-1" id="' + esc(perm.id) + '"><div class="card-h"><div><h2>' + esc(perm.name) + '</h2><p class="sub">' + esc(perm.park) + " &middot; " + esc(perm.system) + '</p></div><span class="badge ' + b[1] + '">' + b[0] + "</span></div>" +
    (perm.openings ? openingsHtml(perm) : '<div class="pm-body"><p>' + esc(perm.summary) + '</p><table class="tbl simple"><tbody><tr><th scope="row">Fees</th><td>' + esc(perm.fees) + "</td></tr>" + (perm.group ? '<tr><th scope="row">Group</th><td>' + esc(perm.group) + "</td></tr>" : "") + (perm.check.length ? '<tr><th scope="row">To verify</th><td>' + perm.check.map(esc).join("; ") + "</td></tr>" : "") + "</tbody></table></div>") +
    '<div class="tw" tabindex="-1"><table class="tbl stack"><thead><tr><th scope="col">Step</th><th scope="col">Status</th><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col">Results and notes</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>' + perm.phases.map(p => phaseRow(perm, p, D, now)).join("") + "</tbody></table></div>" +
    '<div class="pm-foot"><a class="btn" href="' + esc(perm.url) + '" target="_blank" rel="noopener">Open on the booking site</a><details><summary>Sources</summary><ul>' + perm.sources.map(s => '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + "</a></li>").join("") + "</ul></details></div></article>";
}
// ---------- "coming up": the next open of each recurring lottery ----------
function nextEvents(now) {
  const out = [], hd = PERMITS.find(x => x.id === "half-dome").phases[0], y = E.parseISO(CC.todayPT()).y;
  for (const Y of [y, y + 1]) {
    const o = at(Y + "-" + pad(hd.open.m) + "-" + pad(hd.open.d), hd.open.time || "00:00"), c = at(Y + "-" + pad(hd.close.m) + "-" + pad(hd.close.d), hd.close.time || "23:59");
    if (now <= c) { out.push({ id: "hd-pre", title: "Half Dome preseason lottery", sub: Y > hd.announced ? "Hiking about 05/15 – 10/13 (projected from 2026)" : "", open: o, close: c, rule: "Apply 03/01 - 03/31 (closes 4:59 PM Pacific). Results about 04/11.", url: PERMITS[0].url, park: "Yosemite" }); break; }
  }
  const yw = PERMITS.find(x => x.id === "yose-wilderness").phases[0];
  let sun = CC.todayPT(); sun = E.addDays(sun, -dow(sun));
  for (let i = 0; i < 60; i++, sun = E.addDays(sun, 7)) {
    const p = E.parseISO(sun), md = pad(p.m) + "-" + pad(p.d), inSeason = md >= pad(yw.seasonStart.m) + "-" + pad(yw.seasonStart.d) || md <= pad(yw.seasonEnd.m) + "-" + pad(yw.seasonEnd.d);
    const o = at(sun, "00:01"); if (!inSeason || o < now) continue;
    out.push({ id: "yw-weekly", title: "Yosemite wilderness permit weekly lottery", sub: "Start dates " + day(E.addDays(sun, 168)) + " – " + day(E.addDays(sun, 174)), open: o, close: at(E.addDays(sun, 6), "23:59"), rule: "Sunday 12:01 AM to Saturday 11:59 PM Pacific. Results Monday.", url: PERMITS[1].url, park: "Yosemite" }); break;
  }
  return out.sort((a, b) => a.open - b.open);
}
let events = [];
// ---------- the permits table: one row per step, columns like the camping table ----------
const STATB = { open: "Open now", soon: "Opens later", closed: "Closed", na: "Not this season" };
const mdyI = iso => iso.slice(5, 7) + "/" + iso.slice(8, 10) + "/" + iso.slice(0, 4);
// the trip dates a step covers in the chosen season: its own text, or its valid range in that year
function accessOf(perm, p, r) {
  if (p.access) return { t: p.access, n: p.accessNote || "" };
  if (r.cover) return { t: mdyI(r.cover[0]) + " – " + mdyI(r.cover[1]), n: p.accessNote || "" };
  if (p.valid) { const Y = CC.st.year, wrap = p.valid.from > p.valid.to; return { t: mdyI(Y + "-" + p.valid.from) + " – " + mdyI((wrap ? Y + 1 : Y) + "-" + p.valid.to) + (r.projected ? " (projected)" : ""), n: p.accessNote || "" }; }
  const o = perm.openings && perm.openings[0]; return { t: o ? o.hike : "", n: p.accessNote || "" };
}
const noTime = (p, r) => r.approx && p.kind === "annual" || (!p.time && ["monthsBefore", "days"].includes(p.kind));
const PMCOL = {
  name: x => x.perm.name, loc: x => loc(x.perm), step: x => x.p.label, type: x => TYPE[typeOf(x.p)], stat: x => STATB[x.s.k],
  odate: x => x.r.open && !x.r.na ? dayT(x.r.open) : "—", otime: x => x.r.open && !x.r.na ? (noTime(x.p, x.r) ? "Not published" : timeT(x.r.open)) : "—",
  cdate: x => x.r.close && !x.r.na ? dayT(x.r.close) : x.r.na ? "—" : "None", access: x => x.a.t || "—", results: x => x.p.results || "", sys: x => x.perm.system
};
const tKey = d => d ? d.getTime() : Infinity;
const LATE = { closed: 1e15, na: 2e15 };
const PMSORT = { odate: x => (LATE[x.s.k] || 0) + tKey(!x.r.na && x.r.open), otime: x => x.r.open && !x.r.na ? CC.fmtTime(x.r.open) : "~", cdate: x => tKey(!x.r.na && x.r.close) };
function stepRows(now) {
  const out = [];
  PERMITS.filter(permOk).forEach(perm => perm.phases.forEach(p => {
    if (!textOk(perm) && !textOk(perm, p)) return;
    const r = compute(p, null, now), s = status(r, now);
    out.push({ perm, p, r, s, a: accessOf(perm, p, r) });
  }));
  return out;
}
const passPM = (x, skip) => Object.keys(F.cf).every(k => k === skip || !F.cf[k] || !F.cf[k].length || !PMCOL[k] || !F.cf[k].includes(PMCOL[k](x)));
let pmAllRows = [];
function rowHtml(x) {
  const { perm, p, r, s, a } = x;
  const stat = '<span class="st ' + (s.k === "open" ? "open" : s.k === "soon" ? "later" : "none") + '"' + (s.k === "soon" ? ' data-pre="Opens " data-cd="' + r.open.getTime() + '"' : "") + ">" + esc(s.t) + "</span>";
  const live = r.open && !r.na;
  return '<tr><th scope="row" data-l="Permit"><button type="button" class="nm" data-goperm="' + esc(perm.id) + '">' + esc(perm.name) + '</button><small class="loc">' + esc(loc(perm)) + "</small></th>" +
    '<td data-l="Step">' + esc(p.label) + (p.what ? '<span class="when-t">' + esc(p.what) + "</span>" : "") + "</td>" +
    '<td data-l="Open date">' + (live ? "<b>" + esc(dayT(r.open)) + "</b>" + (r.week ? '<span class="when-t">' + (p.leftover ? "" : "Week of ") + esc(r.week) + "</span>" : "") + (r.projected ? '<span class="when-t">Projected</span>' : "") : '<span class="nv">—</span>') + "</td>" +
    '<td data-l="Open time">' + (live ? (noTime(p, r) ? '<span class="nv">Not published</span>' : esc(timeT(r.open))) : '<span class="nv">—</span>') + "</td>" +
    '<td data-l="Days out">' + stat + "</td>" +
    '<td data-l="Availability period">' + (a.t ? "<b>" + esc(a.t) + "</b>" : '<span class="nv">—</span>') + (a.n ? '<span class="when-t">' + esc(a.n) + "</span>" : "") + "</td>" +
    '<td data-l="Booking closes">' + (r.close && !r.na ? esc(dayT(r.close)) + '<span class="when-t">' + esc(timeT(r.close)) + "</span>" : r.na ? '<span class="nv">' + esc(r.na) + "</span>" : "Until booked") + (p.results ? '<span class="when-t">Results: ' + esc(p.results) + "</span>" : "") + "</td>" +
    '<td data-l="How it opens">' + TYPE[typeOf(p)] + '</td><td data-l="Booking site">' + esc(perm.system) + "</td></tr>";
}
function render() {
  if ($("#vPermits").hidden) return;
  const D = CC.st.year, now = new Date(), steps = PERMITS.reduce((t, x) => t + x.phases.length, 0);
  pmAllRows = stepRows(now);
  const k = F.sort, key = PMSORT[k] || PMCOL[k] || PMCOL.odate, rows = pmAllRows.filter(x => passPM(x)).sort((a, b) => { const va = key(a), vb = key(b); return (typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true })) * F.dir; });
  $("#pmAll tbody").innerHTML = rows.map(rowHtml).join("") || '<tr><td colspan="9" class="empty">No permits match. Clear the search or a filter.</td></tr>';
  $("#pmCount").textContent = rows.length + " of " + steps + " steps";
  const on = Object.values(F.cf).some(v => v && v.length);
  $("#pmClear").hidden = !on && !F.q;
  $$("#pmAll thead th[data-k]").forEach(th => { th.classList.toggle("filtered", !!(F.cf[th.dataset.k] && F.cf[th.dataset.k].length)); if (th.dataset.k === F.sort) th.setAttribute("aria-sort", F.dir > 0 ? "ascending" : "descending"); else th.removeAttribute("aria-sort"); });
  events = nextEvents(now).filter(e => { const perm = PERMITS.find(x => x.id === EV_PERM[e.id]); return !perm || permOk(perm); });
  $("#pmSoon tbody").innerHTML = events.map((e, i) => { const perm = PERMITS.find(x => x.id === EV_PERM[e.id]); return '<tr><th scope="row" data-l="Permit">' + esc(e.title) + '<span class="when-t">' + esc(e.sub) + '</span></th><td data-l="Location">' + (perm ? esc(loc(perm)) : "") + '</td><td data-l="Opens date"><b>' + esc(dayT(e.open)) + '</b></td><td data-l="Opens time">' + esc(timeT(e.open)) + '</td><td data-l="Closes">' + esc(when(e.close)) + '</td><td data-l="Starts in"><span class="st later" data-cd="' + e.open.getTime() + '">' + esc(CC.countdown(e.open)) + '</span></td><td data-l=""><button type="button" class="btn sm" data-ev="' + i + '">Add reminder</button></td></tr>'; }).join("") || '<tr><td colspan="7" class="empty">Nothing coming up for this search.</td></tr>';
  $("#pmList").innerHTML = PERMITS.filter(permOk).map(p => cardHtml(p, D, now)).join("");
}
document.addEventListener("click", e => {
  const ev = e.target.closest("[data-ev]"); if (ev) { const x = events[+ev.dataset.ev]; CC.download("remind-" + x.id + ".ics", CC.ics(x.title + " opens", x.open, x.rule + " " + x.sub, x.url), "text/calendar"); CC.toast("Reminder saved. It rings 15 minutes before."); return; }
  const rem = e.target.closest("#pmList [data-rem]"); if (rem) {
    const [pid, phid] = rem.dataset.rem.split("|"), perm = PERMITS.find(x => x.id === pid), ph = perm.phases.find(x => x.id === phid), r = compute(ph, CC.st.year, new Date());
    if (r.open) { CC.download("remind-" + phid + ".ics", CC.ics(perm.name + ": " + ph.label + " opens", r.open, perm.park + ". " + ph.what + ". " + (ph.results || ""), perm.url), "text/calendar"); CC.toast("Reminder saved. It rings 15 minutes before."); }
  }
});
const sync = () => { $("#pmQ").value = F.q; };
$("#pmQ").addEventListener("input", e => { F.q = e.target.value; saveF(); render(); });
$("#pmClear").onclick = () => { F.q = ""; F.cf = {}; saveF(); sync(); render(); };
$$("#pmAll thead th[data-k]").forEach(th => {
  const k = th.dataset.k, label = th.textContent.trim();
  th.querySelector("button").onclick = () => { if (F.sort === k) F.dir = -F.dir; else { F.sort = k; F.dir = 1; } saveF(); render(); };
  th.insertAdjacentHTML("beforeend", '<button type="button" class="fb" aria-haspopup="dialog" aria-label="Sort and filter ' + esc(label) + '">▾</button>');
  th.querySelector(".fb").onclick = e => {
    e.stopPropagation(); const cnt = new Map();
    pmAllRows.filter(x => passPM(x, k)).forEach(x => { const v = PMCOL[k](x); cnt.set(v, (cnt.get(v) || 0) + 1); });
    (F.cf[k] || []).forEach(v => { if (!cnt.has(v)) cnt.set(v, 0); });
    const vals = [...cnt].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }));
    CC.colMenu(k, e.currentTarget, { label, vals, hidden: F.cf[k] || [],
      sort: dir => { F.sort = k; F.dir = dir; saveF(); render(); },
      apply: hid => { if (hid.length) F.cf[k] = hid; else delete F.cf[k]; saveF(); render(); } });
  };
});
$("#pmAll").addEventListener("click", e => { const b = e.target.closest("[data-goperm]"); if (!b) return; const c = document.getElementById(b.dataset.goperm); if (c) { c.scrollIntoView({ behavior: "smooth", block: "start" }); c.focus({ preventScroll: true }); } });
sync();
CC.subs.push(render);
window.addEventListener("hashchange", render);
render();
window.PermitsApp = { compute, nextEvents };
})();
