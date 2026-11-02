(function () {
  const S = window.SITES, SEAS = window.SEASONS || (window.SEASONS = {});
  const link = (rg, name) => ({ t: "Recreation.gov: " + name, u: "https://www.recreation.gov/camping/campgrounds/" + rg });
  // rows already on the site: link their Recreation.gov page
  Object.entries(window.RECGOV_MATCH).forEach(([sid, rg]) => { const r = S.find(s => s.id === sid); if (!r) return;
    r.rg = rg; if (!r.sources.some(x => x.u && x.u.includes("/campgrounds/" + rg))) r.sources = [link(rg, r.name)].concat(r.sources); });
  // each national forest's own campgrounds replace the forest-wide "all campgrounds" rows
  for (let i = S.length - 1; i >= 0; i--) if (S[i].park === "All campgrounds in the forest (rules vary)") S.splice(i, 1);
  window.RECGOV.forEach(x => {
    const id = "rg-" + x.rg, rec = x.system === "rec";
    const check = [].concat(rec && !x.ruleKnown ? ["rule"] : [], x.open ? [] : ["season"], ["peak"], x.walkup ? [] : ["walkup"]);
    S.push({ id, name: x.name, park: x.park, region: x.region, agency: x.agency, system: x.system, rule: x.rule, open: null, openNote: "", peak: null, peakNote: "",
      walkup: x.walkup, walkupNote: x.walkup === "only" ? "First-come, first-served (listed but not reservable on Recreation.gov)" : x.walkup === "some" ? "Recreation.gov lists some first-come sites" : "",
      conf: "check", check, notes: x.note ? "Recreation.gov notice: " + x.note : "", city: x.city, lat: x.lat, lng: x.lng, rg: x.rg, updated: window.RECGOV_CHECKED,
      sources: [link(x.rg, x.name)] });
    SEAS[id] = { openDates: x.open, peakDates: "", sites: x.sites, sitesNote: x.sites == null ? "not listed on Recreation.gov" : "Recreation.gov listing",
      src: [link(x.rg, x.name)].concat(x.openEv ? [{ t: "Season from the Recreation.gov description: “" + x.openEv.trim() + "”", u: "https://www.recreation.gov/camping/campgrounds/" + x.rg }] : []), checked: window.RECGOV_CHECKED };
  });
})();
