/* Saved parks and campgrounds, shared by the whole site (main pages and the Camping tracker in its iframe).
   Parks: localStorage "favorites" (park ids, as the dashboard has always used). Campgrounds: localStorage "savedCamps"
   ([{id,name,park,city}]). Both pages are on the same origin, so a star clicked in one shows up in the other at once
   (the browser's "storage" event). On the main site the pair also syncs to the cloud (cloud.js, field "saved") when signed in.
   window.Saved: parks(), camps(), isPark(id), isCamp(id), togglePark(id), toggleCamp(row), removeCamp(id), on(fn), star(on,label). */
(function () {
  if (window.Saved) return;
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const subs = new Set();
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { console.warn(e); } });
  const parks = () => { const p = get("favorites", []); return Array.isArray(p) ? p : []; };
  const camps = () => { const c = get("savedCamps", []); return Array.isArray(c) ? c.filter(x => x && x.id) : []; };
  let at = get("savedAt", 0);
  function changed() { at = Date.now(); set("savedAt", at); emit(); push(); }

  // first run: start the list with the places the owner asked for (2026-11-02); after that, only stars change it
  if (!get("savedSeed1", false)) {
    const p = parks();
    ["CA:Mount Diablo|State Park", "CA:Big Basin Redwoods|State Park", "CHIS"].forEach(id => { if (!p.includes(id)) p.push(id); });
    set("favorites", p);
    const c = camps(), have = new Set(c.map(x => x.id));
    [{ id: "chis-scorpion", name: "Scorpion Anchorage (Santa Cruz Island)", park: "Channel Islands National Park", city: "Ventura" },
     { id: "sp-big-basin-redwoods-state-park-big-basin", name: "Big Basin", park: "Big Basin Redwoods State Park", city: "Boulder Creek" },
     { id: "sp-mount-diablo-state-park-mount-diablo--juniper", name: "Juniper", park: "Mount Diablo State Park", city: "Danville" },
     { id: "sp-mount-diablo-state-park-mount-diablo--live-oak", name: "Live Oak", park: "Mount Diablo State Park", city: "Danville" },
     { id: "sp-mount-diablo-state-park-mount-diablo--junction", name: "Junction", park: "Mount Diablo State Park", city: "Danville" }]
      .forEach(x => { if (!have.has(x.id)) c.push(x); });
    set("savedCamps", c); set("savedSeed1", true); at = Date.now(); set("savedAt", at);
  }

  const api = window.Saved = {
    parks, camps,
    isPark: id => parks().includes(id),
    isCamp: id => camps().some(x => x.id === id),
    togglePark(id) { const p = parks(), i = p.indexOf(id); if (i < 0) p.push(id); else p.splice(i, 1); set("favorites", p); changed(); return i < 0; },
    toggleCamp(row) { const c = camps(), i = c.findIndex(x => x.id === row.id);
      if (i < 0) c.push({ id: row.id, name: row.name || "", park: row.park || "", city: row.city || "" }); else c.splice(i, 1);
      set("savedCamps", c); changed(); return i < 0; },
    removeCamp(id) { set("savedCamps", camps().filter(x => x.id !== id)); changed(); },
    on(f) { subs.add(f); return () => subs.delete(f); },
    // the star button used everywhere: filled when saved
    star: (on, label) => '<button type="button" class="star' + (on ? " on" : "") + '" data-star aria-pressed="' + !!on + '" title="' + (on ? "Saved (click to remove)" : "Save") + '" aria-label="' + (on ? "Remove from saved: " : "Save: ") + String(label || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;") + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg></button>'
  };
  // a star clicked in another page of the site (the Camping tab is an iframe): refresh this one
  addEventListener("storage", e => { if (e.key === "favorites" || e.key === "savedCamps") { at = get("savedAt", at); emit(); push(); } });

  // cloud sync on the main site; newest copy wins, like the dashboard list
  let pushT = 0;
  function push() { const C = window.Cloud; if (!C || C.state() !== "in") return; clearTimeout(pushT); pushT = setTimeout(() => C.put("saved", { parks: parks(), camps: camps(), at }), 400); }
  function hook() {
    const C = window.Cloud; if (!C) return;
    C.watch("saved", r => {
      if (!r || !Array.isArray(r.parks)) { push(); return; }
      if ((r.at || 0) > at) { set("favorites", r.parks); set("savedCamps", r.camps || []); at = r.at; set("savedAt", at); emit(); }
      else if ((r.at || 0) < at) push();
    });
  }
  if (window.Cloud) hook(); else addEventListener("DOMContentLoaded", hook);
  api._sync = push;
})();
