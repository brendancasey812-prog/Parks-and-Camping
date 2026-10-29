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
function compute(p, D, now) {
  const r = { phase: p, open: null, close: null, extra: [], approx: false, projected: false, na: "" };
  if (p.kind !== "oneTime" && D < CC.todayPT()) { r.na = "That date has passed."; return r; }
  if (p.kind !== "oneTime" && !inRange(D.slice(0, 10), p.valid)) { r.na = "Outside this permit's usual season, so this step does not apply to your date."; return r; }
  if (p.kind === "annual") {
    const Y = E.parseISO(D).y, mk = (x, def) => { const t = x.time || def; return at(Y + "-" + pad(x.m) + "-" + pad(x.d), t); };
    r.open = mk(p.open, "00:00"); r.close = mk(p.close, "23:59"); r.approx = !(p.open.time && p.close.time); r.projected = Y > p.announced;
  } else if (p.kind === "daily") {
    const d = E.addDays(D, -p.daysBefore); r.open = at(d, p.open); r.close = at(d, p.close);
  } else if (p.kind === "weekly") {
    const base = E.addDays(D, -p.leadDays), sun = E.addDays(base, -dow(base)), sunY = E.parseISO(sun), md = pad(sunY.m) + "-" + pad(sunY.d);
    const ss = pad(p.seasonStart.m) + "-" + pad(p.seasonStart.d), se = pad(p.seasonEnd.m) + "-" + pad(p.seasonEnd.d);
    if (!(md >= ss || md <= se)) { r.na = "The weekly lottery does not run in that week (it runs mid-November to early May)."; return r; }
    r.open = at(sun, "00:01"); r.close = at(E.addDays(sun, 6), "23:59"); r.week = day(sun) + " – " + day(E.addDays(sun, 6));
    r.extra = [["Results", at(E.addDays(sun, 8), "00:00"), true], ["Accept and pay by", at(E.addDays(sun, 11), "23:59"), true], ["Leftovers open", at(E.addDays(sun, 12), "09:00"), false]];
    r.approx = true;
  } else if (p.kind === "days") {
    r.open = at(E.addDays(D, -p.days), p.time);
  } else if (p.kind === "oneTime") {
    const f = s => { const [d, t] = s.split("T"); return at(d, t); }; r.open = f(p.open); r.close = f(p.close);
  }
  return r;
}
function status(r, now) {
  if (r.na) return { k: "na", t: "Not for your date" };
  if (now < r.open) return { k: "soon", t: "Opens " + CC.countdown(r.open) };
  if (r.close && now <= r.close) return { k: "open", t: "Open now" };
  if (!r.close) return { k: "open", t: "Open now" };
  return { k: "closed", t: "Closed" };
}

// ---------- search and filters (saved in this browser) ----------
const F = Object.assign({ q: "", loc: "", stat: "", type: "" }, (() => { try { return JSON.parse(localStorage.getItem("cc-pm")) || {}; } catch (e) { return {}; } })());
const saveF = () => { try { localStorage.setItem("cc-pm", JSON.stringify(F)); } catch (e) {} };
const loc = perm => { const n = CC.splitName(perm.park); return n.name + (n.des ? " " + n.des : ""); };
const typeOf = p => p.kind === "days" ? "release" : /lottery/i.test(p.label) || ["weekly", "daily", "oneTime"].includes(p.kind) ? "lottery" : "window";
const TYPE = { lottery: "Lottery", release: "Rolling release", window: "Application window" };
const textOk = (perm, p) => { const q = F.q.trim().toLowerCase(); return !q || [perm.name, perm.park, loc(perm), perm.summary, perm.system, p && p.label, p && p.what].join(" ").toLowerCase().includes(q); };
const permOk = perm => (!F.loc || loc(perm) === F.loc) && (textOk(perm) || perm.phases.some(p => textOk(perm, p)));
const EV_PERM = { "hd-pre": "half-dome", "yw-weekly": "yose-wilderness" };
const dayT = d => CC.fmtDay(d), timeT = d => CC.fmtTime(d);

// ---------- render ----------
function phaseRow(perm, p, D, now) {
  const r = compute(p, D, now), st = status(r, now);
  const stat = '<span class="st ' + (st.k === "open" ? "open" : st.k === "soon" ? "later" : "none") + '"' + (st.k === "soon" ? ' data-pre="Opens " data-cd="' + r.open.getTime() + '"' : "") + ">" + esc(st.t) + "</span>";
  const proj = r.projected ? '<span class="when-t">Projected from ' + p.announced + '; this year is not published</span>' : "";
  let opens = "", closes = "", more = "";
  if (r.na) { opens = '<span class="muted">' + esc(r.na) + "</span>"; }
  else {
    opens = "<b>" + esc(when(r.open)) + "</b>" + (r.week ? '<span class="when-t">Week of ' + esc(r.week) + "</span>" : "") + (r.approx && p.kind === "annual" ? '<span class="when-t">Exact time not published</span>' : "") + proj;
    closes = r.close ? esc(when(r.close)) : "None";
    more = r.extra.map(x => '<span class="when-t">' + esc(x[0]) + ": " + esc(CC.fmtAt(x[1], !x[2])) + "</span>").join("");
  }
  const rem = !r.na && st.k === "soon" ? '<button type="button" class="btn sm" data-rem="' + esc(perm.id + "|" + p.id) + '">Add reminder</button>' : "";
  return '<tr><th scope="row" data-l="Step">' + esc(p.label) + '<span class="when-t">' + esc(p.what) + '</span></th><td data-l="Status">' + stat + '</td><td data-l="Opens">' + opens + '</td><td data-l="Closes">' + closes + '</td><td data-l="Results">' + esc(p.results) + more + (p.note ? '<span class="when-t">' + esc(p.note) + "</span>" : "") + '</td><td data-l="">' + rem + "</td></tr>";
}
function cardHtml(perm, D, now) {
  const b = conf[perm.conf] || conf.check;
  return '<article class="card flush pm-card" tabindex="-1" id="' + esc(perm.id) + '"><div class="card-h"><div><h2>' + esc(perm.name) + '</h2><p class="sub">' + esc(perm.park) + " &middot; " + esc(perm.system) + '</p></div><span class="badge ' + b[1] + '">' + b[0] + "</span></div>" +
    '<div class="pm-body"><p>' + esc(perm.summary) + '</p><table class="tbl simple"><tbody><tr><th scope="row">Fees</th><td>' + esc(perm.fees) + "</td></tr>" + (perm.group ? '<tr><th scope="row">Group</th><td>' + esc(perm.group) + "</td></tr>" : "") + (perm.check.length ? '<tr><th scope="row">To verify</th><td>' + perm.check.map(esc).join("; ") + "</td></tr>" : "") + "</tbody></table></div>" +
    '<div class="tw" tabindex="-1"><table class="tbl stack"><thead><tr><th scope="col">Step</th><th scope="col">Status</th><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col">Results and notes</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>' + perm.phases.map(p => phaseRow(perm, p, D, now)).join("") + "</tbody></table></div>" +
    '<div class="pm-foot"><a class="btn" href="' + esc(perm.url) + '" target="_blank" rel="noopener">Open on the booking site</a><details><summary>Sources</summary><ul>' + perm.sources.map(s => '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + "</a></li>").join("") + "</ul></details></div></article>";
}
// ---------- "coming up": the next open of each recurring lottery ----------
function nextEvents(now) {
  const out = [], hd = PERMITS.find(x => x.id === "half-dome").phases[0], y = E.parseISO(CC.todayPT()).y;
  for (const Y of [y, y + 1]) {
    const o = at(Y + "-" + pad(hd.open.m) + "-" + pad(hd.open.d), "00:00"), c = at(Y + "-" + pad(hd.close.m) + "-" + pad(hd.close.d), "23:59");
    if (now <= c) { out.push({ id: "hd-pre", title: "Half Dome preseason lottery", sub: Y > hd.announced ? "Projected from 2026; 2027 dates not published" : "Applications", open: o, close: c, rule: "Apply March 1-31. Results mid-April.", url: PERMITS[0].url, park: "Yosemite" }); break; }
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
function allRows(D, now) {          // one row per step of every permit that passes the search and filters
  const out = [];
  PERMITS.filter(permOk).forEach(perm => perm.phases.forEach(p => {
    if (!textOk(perm) && !textOk(perm, p)) return;
    const r = compute(p, D, now), s = status(r, now);
    if (F.stat && s.k !== F.stat) return; if (F.type && typeOf(p) !== F.type) return;
    const stat = '<span class="st ' + (s.k === "open" ? "open" : s.k === "soon" ? "later" : "none") + '"' + (s.k === "soon" ? ' data-pre="Opens " data-cd="' + r.open.getTime() + '"' : "") + ">" + esc(s.t) + "</span>";
    out.push('<tr><th scope="row" data-l="Permit"><button type="button" class="nm" data-goperm="' + esc(perm.id) + '">' + esc(perm.name) + '</button></th><td data-l="Location">' + esc(loc(perm)) + '</td><td data-l="Step">' + esc(p.label) + '<span class="when-t">' + esc(p.what) + '</span></td><td data-l="Type">' + TYPE[typeOf(p)] +
      '</td><td data-l="Status">' + stat + '</td><td data-l="Opens date">' + (r.open ? esc(dayT(r.open)) + (r.projected ? '<span class="when-t">Projected</span>' : "") : '<span class="nv">—</span>') + '</td><td data-l="Opens time">' + (r.open ? esc(r.approx && p.kind === "annual" ? "Not published" : timeT(r.open)) : '<span class="nv">—</span>') +
      '</td><td data-l="Closes">' + (r.close ? esc(dayT(r.close)) + '<span class="when-t">' + esc(timeT(r.close)) + "</span>" : r.na ? '<span class="nv">' + esc(r.na) + "</span>" : "None") + '</td><td data-l="Results">' + esc(p.results || "") + "</td></tr>");
  }));
  return out;
}
function render() {
  if ($("#vPermits").hidden) return;
  const D = CC.st.target, now = new Date(), rows = allRows(D, now), steps = PERMITS.reduce((t, x) => t + x.phases.length, 0);
  $("#pmAll tbody").innerHTML = rows.join("") || '<tr><td colspan="9" class="empty">No permits match. Clear the search or a filter.</td></tr>';
  $("#pmCount").textContent = rows.length + " of " + steps + " steps";
  events = nextEvents(now).filter(e => { const perm = PERMITS.find(x => x.id === EV_PERM[e.id]); return !perm || permOk(perm); });
  $("#pmSoon tbody").innerHTML = events.map((e, i) => { const perm = PERMITS.find(x => x.id === EV_PERM[e.id]); return '<tr><th scope="row" data-l="Permit">' + esc(e.title) + '<span class="when-t">' + esc(e.sub) + '</span></th><td data-l="Location">' + (perm ? esc(loc(perm)) : "") + '</td><td data-l="Opens date"><b>' + esc(dayT(e.open)) + '</b><span class="when-t">' + esc(e.rule) + '</span></td><td data-l="Opens time">' + esc(timeT(e.open)) + '</td><td data-l="Closes">' + esc(when(e.close)) + '</td><td data-l="Starts in"><span class="st later" data-cd="' + e.open.getTime() + '">' + esc(CC.countdown(e.open)) + '</span></td><td data-l=""><button type="button" class="btn sm" data-ev="' + i + '">Add reminder</button></td></tr>'; }).join("") || '<tr><td colspan="7" class="empty">Nothing coming up for this search.</td></tr>';
  $("#pmList").innerHTML = PERMITS.filter(permOk).map(p => cardHtml(p, D, now)).join("");
}
document.addEventListener("click", e => {
  const ev = e.target.closest("[data-ev]"); if (ev) { const x = events[+ev.dataset.ev]; CC.download("remind-" + x.id + ".ics", CC.ics(x.title + " opens", x.open, x.rule + " " + x.sub, x.url), "text/calendar"); CC.toast("Reminder saved. It rings 15 minutes before."); return; }
  const rem = e.target.closest("#pmList [data-rem]"); if (rem) {
    const [pid, phid] = rem.dataset.rem.split("|"), perm = PERMITS.find(x => x.id === pid), ph = perm.phases.find(x => x.id === phid), r = compute(ph, CC.st.target, new Date());
    if (r.open) { CC.download("remind-" + phid + ".ics", CC.ics(perm.name + ": " + ph.label + " opens", r.open, perm.park + ". " + ph.what + ". " + (ph.results || ""), perm.url), "text/calendar"); CC.toast("Reminder saved. It rings 15 minutes before."); }
  }
});
$("#pmLoc").insertAdjacentHTML("beforeend", [...new Set(PERMITS.map(loc))].sort().map(l => '<option value="' + esc(l) + '">' + esc(l) + "</option>").join(""));
const sync = () => { $("#pmQ").value = F.q; $("#pmLoc").value = F.loc; $("#pmStat").value = F.stat; $("#pmType").value = F.type; };
$("#pmQ").addEventListener("input", e => { F.q = e.target.value; saveF(); render(); });
[["#pmLoc", "loc"], ["#pmStat", "stat"], ["#pmType", "type"]].forEach(([id, k]) => { $(id).onchange = e => { F[k] = e.target.value; saveF(); render(); }; });
$("#pmClear").onclick = () => { Object.assign(F, { q: "", loc: "", stat: "", type: "" }); saveF(); sync(); render(); };
$("#pmAll").addEventListener("click", e => { const b = e.target.closest("[data-goperm]"); if (!b) return; const c = document.getElementById(b.dataset.goperm); if (c) { c.scrollIntoView({ behavior: "smooth", block: "start" }); c.focus({ preventScroll: true }); } });
sync();
CC.subs.push(render);
window.addEventListener("hashchange", render);
render();
window.PermitsApp = { compute, nextEvents };
})();
