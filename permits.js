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

// ---------- render ----------
function dateLine(label, d, extraNote, dateOnly) {
  return '<li><b>' + esc(label) + "</b><span>" + esc(dateOnly ? CC.fmtAt(d, false) : when(d)) + (extraNote ? " <small>" + esc(extraNote) + "</small>" : "") + "</span></li>";
}
function phaseHtml(perm, p, D, now) {
  const r = compute(p, D, now), st = status(r, now);
  let body = "";
  if (r.na) body = '<p class="muted">' + esc(r.na) + "</p>";
  else {
    const lines = [];
    if (r.week) lines.push('<li><b>Application week</b><span>' + esc(r.week) + "</span></li>");
    lines.push(dateLine(p.kind === "days" ? "Opens" : "Applications open", r.open, r.approx && p.kind === "annual" ? "start of day; exact time not published" : ""));
    if (r.close) lines.push(dateLine("Applications close", r.close, r.approx && p.kind === "annual" ? "end of day; exact time not published" : ""));
    r.extra.forEach(x => lines.push(dateLine(x[0], x[1], "", x[2])));
    lines.push('<li><b>Results</b><span>' + esc(p.results) + "</span></li>");
    body = '<ul class="pm-dates">' + lines.join("") + "</ul>";
    if (r.projected) body += '<p class="warn-line">⚠ Projected from the ' + p.announced + ' dates. The official dates for this year are not published yet.</p>';
  }
  const rem = !r.na && st.k === "soon" ? '<button type="button" class="btn" data-rem="' + esc(perm.id + "|" + p.id) + '">⏰ Remind me</button>' : "";
  return '<section class="pm-phase"><header><h4>' + esc(p.label) + '</h4><span class="st ' + (st.k === "open" ? "open" : st.k === "soon" ? "later" : "none") + '"' + (st.k === "soon" ? ' data-pre="Opens " data-cd="' + r.open.getTime() + '"' : "") + ">" + esc(st.t) + '</span></header><p class="pm-what">' + esc(p.what) + "</p>" + body + (p.note ? '<p class="muted">' + esc(p.note) + "</p>" : "") + rem + "</section>";
}
function cardHtml(perm, D, now) {
  const b = conf[perm.conf] || conf.check;
  return '<article class="pm-card" id="' + esc(perm.id) + '"><header class="pm-h"><span class="pm-ic" aria-hidden="true">' + perm.icon + '</span><div><h3>' + esc(perm.name) + "</h3><p class=\"muted\">" + esc(perm.park) + " · " + esc(perm.system) + '</p></div><span class="badge ' + b[1] + '">' + b[0] + "</span></header>" +
    '<p>' + esc(perm.summary) + '</p><dl class="pm-meta"><div><dt>Fees</dt><dd>' + esc(perm.fees) + "</dd></div>" + (perm.group ? "<div><dt>Group</dt><dd>" + esc(perm.group) + "</dd></div>" : "") + "</dl>" +
    '<div class="pm-phases">' + perm.phases.map(p => phaseHtml(perm, p, D, now)).join("") + "</div>" +
    (perm.check.length ? "<p class=\"muted\"><b>Still to verify:</b> " + perm.check.map(esc).join("; ") + "</p>" : "") +
    '<div class="pm-foot"><a class="btn" href="' + esc(perm.url) + '" target="_blank" rel="noopener">Open on the booking site ↗</a><details><summary>Sources</summary><ul>' + perm.sources.map(s => '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + " ↗</a></li>").join("") + "</ul></details></div></article>";
}
// ---------- "coming up": the next open of each recurring lottery ----------
function nextEvents(now) {
  const out = [], hd = PERMITS.find(x => x.id === "half-dome").phases[0], y = E.parseISO(CC.todayPT()).y;
  for (const Y of [y, y + 1]) {
    const o = at(Y + "-" + pad(hd.open.m) + "-" + pad(hd.open.d), "00:00"), c = at(Y + "-" + pad(hd.close.m) + "-" + pad(hd.close.d), "23:59");
    if (now <= c) { out.push({ id: "hd-pre", title: "Half Dome preseason lottery", sub: Y > hd.announced ? "Projected from 2026 (2027 dates not published)" : "Applications", open: o, close: c, rule: "Apply March 1-31. Results mid-April.", url: PERMITS[0].url, park: "Yosemite" }); break; }
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
function render() {
  if ($("#viewPermits").hidden) return;
  const D = CC.st.target, now = new Date();
  events = nextEvents(now);
  $("#pmSoon").innerHTML = events.map((e, i) => '<article class="card"><span class="st later" data-cd="' + e.open.getTime() + '">' + esc(CC.countdown(e.open)) + "</span><h3>" + esc(e.title) + "</h3><p class=\"rl\">" + esc(e.rule) + "</p><p><b>" + esc(when(e.open)) + "</b></p><p>Closes <b>" + esc(when(e.close)) + "</b></p><p class=\"muted\">" + esc(e.sub) + '</p><button type="button" class="btn" data-ev="' + i + '">⏰ Remind me</button></article>').join("");
  $("#pmList").innerHTML = PERMITS.map(p => cardHtml(p, D, now)).join("");
}
document.addEventListener("click", e => {
  const ev = e.target.closest("[data-ev]"); if (ev) { const x = events[+ev.dataset.ev]; CC.download("remind-" + x.id + ".ics", CC.ics(x.title + " opens", x.open, x.rule + " " + x.sub, x.url), "text/calendar"); CC.toast("Reminder saved. It rings 15 minutes before."); return; }
  const rem = e.target.closest("#pmList [data-rem]"); if (rem) {
    const [pid, phid] = rem.dataset.rem.split("|"), perm = PERMITS.find(x => x.id === pid), ph = perm.phases.find(x => x.id === phid), r = compute(ph, CC.st.target, new Date());
    if (r.open) { CC.download("remind-" + phid + ".ics", CC.ics(perm.name + ": " + ph.label + " opens", r.open, perm.park + ". " + ph.what + ". " + (ph.results || ""), perm.url), "text/calendar"); CC.toast("Reminder saved. It rings 15 minutes before."); }
  }
});
CC.subs.push(render);
window.addEventListener("hashchange", render);
render();
window.PermitsApp = { compute, nextEvents };
})();
