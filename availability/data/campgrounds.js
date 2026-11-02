/* One row per campground. Some rows in sites.js / roster.js grouped several campgrounds of a park ("Hidden Valley, Belle,
   White Tank"); this file splits them, adds campgrounds that were missing, and moves the season research (data/seasons.js)
   onto the new rows. Loaded after seasons.js and before app.js.
   Each split part copies its group's row (booking rule, walk-up, sources) and may set its own name, site count and dates.
   window.SPLIT_FROM maps each new id to the grouped id it came from, so edits saved under the old id carry over. */
(function () {
  const S = window.SITES, SEAS = window.SEASONS || (window.SEASONS = {});
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const from = window.SPLIT_FROM = {};
  // part: [name, sites, openDates, peakDates, sitesNote] (empty = use the group's value)
  function split(id, parts) {
    const i = S.findIndex(s => s.id === id); if (i < 0) return;
    const base = S[i], seas = SEAS[id] || {};
    const rows = parts.map(([name, sites, open, peak, note]) => {
      const nid = id + "--" + slug(name); from[nid] = id;
      SEAS[nid] = Object.assign({}, seas, { sites: sites ?? null, sitesNote: note || "" }, open ? { openDates: open } : {}, peak ? { peakDates: peak } : {});
      return Object.assign({}, base, { id: nid, name });
    });
    S.splice(i, 1, ...rows); delete SEAS[id];
  }
  // a campground that was missing: copies a row of the same park (booking rule, region, sources), then sets its own fields
  function add(likeId, name, o, seas) {
    const like = S.find(s => s.id === likeId); if (!like) return;
    const id = likeId.replace(/--.*$/, "").replace(/-[^-]+$/, "") + "-" + slug(name);
    S.push(Object.assign({}, like, { id, name, open: null, openNote: "", peak: null, peakNote: "", walkup: null, walkupNote: "", conf: "check", check: ["rule", "season", "peak", "walkup"], notes: "" }, o || {}));
    SEAS[id] = seas;
  }
  const SP = "May 15 – Sep 15";

  // ---------- national parks ----------
  split("jotr-fcfs", [["Hidden Valley", 44], ["Belle", 18], ["White Tank", 15]]);
  add("nps-joshua-tree-national-park-ryan", "Sheep Pass (group)", { notes: "Group sites" }, { openDates: "Year-round", peakDates: "Oct – May", sites: 6, sitesNote: "group sites, reservations required", src: [{ t: "parkrangerjohn joshua tree camping" }] });
  split("deva-fcfs", [["Sunset", 270, "Oct – Apr", "Nov – Mar", "first-come; about 270"], ["Stovepipe Wells", 190, "Oct – Apr", "Nov – Mar", "28 tent-only"], ["Texas Springs", 92, "Nov – Apr", "Nov – Mar"]]);
  split("nps-death-valley-national-park-thorndike-mahogany-flat", [["Thorndike", 6, "", "", "tent-only"], ["Mahogany Flat", null, "", "", "count not found"]]);
  split("moja-fcfs", [["Mid Hills", 26, "", "", "first-come"], ["Hole-in-the-Wall", 37, "", "", "first-come; listings 35–38"]]);
  split("pore-backcountry", [["Coast Camp", 12, "", "", "plus 2 group sites"], ["Glen Camp", 12], ["Sky Camp", 11, "", "", "plus 1 group site"], ["Wildcat Camp", 5, "", "", "plus 3 group sites"]]);
  split("lavo-summit", [["Summit Lake North", 46, "Summer (about late Jun – Sep)", "", "NPS 2026"], ["Summit Lake South", 48, "", "", "NPS 2026"]]);
  add("nps-lassen-volcanic-national-park-butte-lake", "Juniper Lake", {}, { openDates: "Closed; work in progress to reopen", peakDates: "Jul – Aug", sites: 18, sitesNote: "plus 2 group sites (also closed)", src: [{ t: "NPS Lassen campgrounds", u: "https://www.nps.gov/lavo/planyourvisit/camping-in-campgrounds.htm" }] });
  add("nps-yosemite-national-park-white-wolf", "Tamarack Flat", { rule: { kind: "days", days: 14, time: "07:00" }, conf: "good", check: [] }, { openDates: "Jun 22 – Oct 12, 2026", peakDates: "Jul – Aug", sites: 52, sitesNote: "tent-only; booked 2 weeks ahead", src: [{ t: "NPS Yosemite campgrounds table (2026)", u: "https://www.nps.gov/yose/planyourvisit/campgrounds.htm" }] });
  add("nps-sequoia-kings-canyon-national-parks-sentinel", "Atwell Mill", { rule: { kind: "rolling", months: 1, time: "07:00" } }, { openDates: "May 20 – Oct 13, 2026", peakDates: "Jun – Aug", sites: 19, sitesNote: "tent-only; Mineral King; Recreation.gov inventory", src: [{ t: "Recreation.gov: Atwell Mill", u: "https://www.recreation.gov/camping/campgrounds/10044710" }, { t: "thedyrt sequoia kings canyon guide" }] });
  add("nps-channel-islands-national-park-santa-barbara-island-landing-cove", "Anacapa Island", { park: "Channel Islands National Park (Anacapa Island)" }, { openDates: "Year-round", peakDates: "Jun – Sep", sites: 7, sitesNote: "no water", src: [{ t: "hipcamp channel islands" }] });
  split("nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-group", [["Brandy Creek RV", 15, "Year-round", "", "all reservable"], ["Brandy Creek Primitive", 2, "Mid-Apr – Oct", "", "tent-only"], ["Dry Creek Group", 2, "Early Apr – Oct", "", "group sites for 20–50 people"]]);

  add("chis-scorpion", "Prisoners Harbor (Santa Cruz Island)", { walkup: "none", walkupNote: "Reservations required" }, { openDates: "Year-round", peakDates: "Jun – Sep", sites: 6, sitesNote: "no drinking water", src: [{ t: "NPS Channel Islands camping", u: "https://www.nps.gov/chis/planyourvisit/camping.htm" }] });
  // Whiskeytown campgrounds that were missing (NPS camping table, 2026)
  [["Oak Bottom Tent", 94, "Year-round", "reservable through Whiskeytown Marinas"], ["Oak Bottom RV", 22, "Year-round", "no hook-ups; reservable through Whiskeytown Marinas"],
   ["Sheep Camp", 4, "Mid-Apr – Oct", ""], ["Peltier Bridge", 9, "Year-round", ""], ["Horse Camp", 2, "Year-round", "only campground for camping with horses"], ["Crystal Creek", 2, "May – Oct", ""]]
    .forEach(([n, sites, open, note]) => add("nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-group--brandy-creek-primitive", n, {}, { openDates: open, peakDates: "Jun – Aug", sites, sitesNote: note, src: [{ t: "NPS Whiskeytown camping", u: "https://www.nps.gov/whis/planyourvisit/whiskeytown-camping.htm" }] }));

  // ---------- booking rules corrected from official sources (audit 2026-11-02, docs/AUDIT-2026-11-02.md) ----------
  const fix = (id, o) => { const r = S.find(s => s.id === id); if (r) Object.assign(r, o); };
  ["crane-flat", "white-wolf", "yosemite-creek", "porcupine-flat", "bridalveil-creek"].forEach(k =>
    fix("nps-yosemite-national-park-" + k, { rule: { kind: "days", days: 14, time: "07:00" }, conf: "good", check: [], sources: [{ t: "NPS Yosemite campgrounds table (2026)", u: "https://www.nps.gov/yose/planyourvisit/campgrounds.htm" }] }));
  ["yose-upper-pines", "yose-lower-pines", "yose-north-pines", "yose-wawona", "yose-hodgdon", "yose-tuolumne", "yose-camp4"].forEach(id => { const r = S.find(s => s.id === id); if (r) { r.conf = "good"; r.check = r.check.filter(c => c !== "season"); r.sources = [{ t: "NPS Yosemite campgrounds table (2026)", u: "https://www.nps.gov/yose/planyourvisit/campgrounds.htm" }].concat(r.sources); } });
  // Sequoia & Kings Canyon: Recreation.gov booking windows (rolling; release time assumed 7:00 AM Pacific)
  const SEKI = "nps-sequoia-kings-canyon-national-parks-";
  [["seki-lodgepole", 4], [SEKI + "potwisha", 4], ["seki-azalea", 4], [SEKI + "canyon-view", 4], [SEKI + "sentinel", 4],
   ["seki-dorst", 1], ["seki-cold-springs", 1], [SEKI + "buckeye-flat", 1], [SEKI + "sunset", 1], [SEKI + "sheep-creek", 1], [SEKI + "moraine", 1]]
    .forEach(([id, m]) => fix(id, { rule: { kind: "rolling", months: m, time: "07:00" }, check: ["rule"] }));

  // ---------- state parks ----------
  // campgrounds named on each park's parks.ca.gov page that were missing, and rows that carried the park's name instead of the campground's (2026-11-02)
  const PCS = (pid, park) => [{ t: "parks.ca.gov: " + park, u: "https://www.parks.ca.gov/?page_id=" + pid }];
  const rename = (id, name) => { const r = S.find(s => s.id === id); if (r) r.name = name; };
  rename("sp-monta-a-de-oro-state-park-monta-a-de-oro", "Islay Creek");
  rename("sp-china-camp-state-park-china-camp", "Back Ranch Meadows");
  rename("sp-austin-creek-state-recreation-area-austin-creek", "Bullfrog Pond");
  rename("sp-red-rock-canyon-state-park-red-rock-canyon", "Ricardo");
  rename("sp-plumas-eureka-state-park-plumas-eureka", "Upper Jamison Creek");
  rename("sp-andrew-molera-state-park-andrew-molera", "Andrew Molera Trail Camp");
  rename("sp-mount-diablo-state-park-mount-diablo--junction", "Junction");
  const more = (likeId, pid, park, list) => list.forEach(([n, note, open]) => add(likeId, n, {}, { openDates: open || "", peakDates: SP, sites: null, sitesNote: note || "count not found", src: PCS(pid, park) }));
  more("sp-monta-a-de-oro-state-park-monta-a-de-oro", 592, "Montaña de Oro State Park", [["Hazard Canyon Horse Camp", "equestrian sites"]]);
  more("sp-borrego-palm", 638, "Anza-Borrego Desert State Park", [["Vern Whitaker Horse Camp", "equestrian sites"], ["Blair Valley", "primitive, first-come"], ["Culp Valley", "primitive, first-come"], ["Mountain Palm Springs", "primitive, first-come"], ["Sheep Canyon", "primitive, first-come"]]);
  more("sp-butano-state-park-butano", 536, "Butano State Park", [["Butano Trail Camp", "8 backcountry sites"]]);
  more("sp-cuyamaca-rancho-state-park-paso-picacho-green-valley--paso-picacho", 667, "Cuyamaca Rancho State Park", [["Los Caballos Horse Camp", "equestrian sites"]]);
  more("sp-emerald-bay-state-park-eagle-point", 506, "Emerald Bay State Park", [["Boat-in Campground", "boat-in only", "Summer (closed for the 2026 season)"]]);
  more("sp-folsom-lake-state-recreation-area-beals-point-peninsula--beals-point", 500, "Folsom Lake SRA", [["Black Miners Bar"]]);
  more("sp-henry-w-coe-state-park-dowdy-ranch-hunting-hollow--dowdy-ranch", 561, "Henry W. Coe State Park", [["Coe Ranch (Headquarters)", "drive-in sites"], ["Manzanita Point Group (hike-in)", "group sites"], ["Poverty Flat Group (hike-in)", "group sites"], ["Coe Horse Camp", "equestrian sites"]]);
  more("sp-lake-oroville-state-recreation-area-lake-oroville--loafer-creek", 462, "Lake Oroville SRA", [["Lime Saddle"]]);
  more("sp-mount-tamalpais-state-park-pantoll-steep-ravine--pantoll", 471, "Mount Tamalpais State Park", [["Bootjack", "walk-in, first-come"], ["Alice Eastwood Group Camp", "group sites"], ["Frank Valley Horse Camp", "equestrian sites"]]);
  more("sp-plumas-eureka-state-park-plumas-eureka", 507, "Plumas-Eureka State Park", [["Camp Lisa Group Camp", "group site"]]);
  more("sp-point-mugu-state-park-thornhill-broome-sycamore-canyon--sycamore-canyon", 630, "Point Mugu State Park", [["La Jolla Group Camp", "walk-in group site"]]);
  more("sp-portola-redwoods-state-park-portola-redwoods", 539, "Portola Redwoods State Park", [["Slate Creek Trail Camp", "backcountry"]]);
  more("sp-saddleback-butte-state-park-saddleback-butte", 618, "Saddleback Butte State Park", [["Joshua Group Camp", "group site"]]);
  more("sp-salton-sea-state-recreation-area-mecca-beach-corvina-beach--corvina-beach", 639, "Salton Sea SRA", [["Bombay Beach", "", "Closed"], ["Salt Creek", "primitive"]]);
  more("sp-samuel-p-taylor-state-park-samuel-p-taylor", 469, "Samuel P. Taylor State Park", [["Madrone Group Camp", "group site"]]);
  more("sp-silverwood-lake-state-recreation-area-silverwood-lake", 650, "Silverwood Lake SRA", [["Miller Canyon Group Camps", "3 group sites"]]);
  more("sp-sonoma-coast-state-park-bodega-dunes-wright-s-beach--bodega-dunes", 451, "Sonoma Coast State Park", [["Pomo Canyon Environmental", "walk-in environmental sites"], ["Willow Creek Environmental", "walk-in environmental sites; closed in winter"]]);
  split("sp-richardson-grove-state-park-richardson-grove", [["Huckleberry", null, "Week before Memorial Day – fall"], ["Madrone", null, "Year-round"], ["Oak Flat", null, "Summer only"], ["Dawn Redwood Group Camp", null, "Week before Memorial Day – fall", "", "group site"]]);

  split("sp-patrick-s-point-state-park-patrick-s-point", [["Abalone", 70, "", "", "from site-number range"], ["Agate", 39, "Late May – early Sep", ""], ["Penn Creek", 15, "Year-round (reservations May – Sep)", "", "tent only"]]);
  split("sp-humboldt-redwoods-state-park-burlington-albee-creek-hidden-springs", [["Burlington", 57, "Year-round"], ["Albee Creek", null, "Mid-May – mid-Oct", "", "count not confirmed"], ["Hidden Springs", 146, "Mid-Apr – Labor Day"]]);
  split("sp-standish-hickey-state-recreation-area-standish-hickey", [["Rock Creek", 35, "Year-round"], ["Hickey", 63, "May 1 – Oct 15 (reservations)"], ["Redwood", 62, "Jul 1 – Sep 15"]]);
  split("sp-salt-point-state-park-salt-point", [["Gerstle Cove", 30, "Year-round"], ["Woodside", 79, "Seasonal (closed in winter)"]]);
  split("sp-sonoma-coast-state-park-bodega-dunes-wright-s-beach", [["Bodega Dunes", 81, "Apr – Nov (older park doc)", "", "older doc says 98"], ["Wright's Beach", 27, "Year-round", "", "parks.ca.gov: 27 developed sites"]]);
  split("sp-lake-oroville-state-recreation-area-lake-oroville", [["Bidwell Canyon", 75, "Year-round", "", "from site-number ranges"], ["Loafer Creek", 137, "Year-round (reservations Apr 1 – Oct 15)", "", "from site-number ranges"]]);
  split("sp-san-luis-reservoir-state-recreation-area-basalt-medeiros", [["Basalt", 79, "Temporarily closed (dam safety work)"], ["Medeiros", null, "Year-round", "", "primitive, first-come; count not found"]]);
  split("sp-folsom-lake-state-recreation-area-beals-point-peninsula", [["Beals Point", 69, "Year-round"], ["Peninsula", 100, "Apr – Oct", "", "primitive"]]);
  split("sp-calaveras-big-trees-state-park-north-grove-oak-hollow", [["North Grove", 74, "Year-round (limited first-come in winter)"], ["Oak Hollow", 55, "May 15 – Oct 1"]]);
  split("sp-mount-diablo-state-park-mount-diablo", [["Juniper", 27], ["Live Oak", 22, "", "", "one listing 18"], ["Junction", 6, "", "", "first-come"]]);
  split("sp-mount-tamalpais-state-park-pantoll-steep-ravine", [["Pantoll", null, "Year-round", "", "walk-in, first-come; count not found"], ["Steep Ravine", 6, "Year-round", "", "hike-in sites plus 10 cabins"]]);
  split("sp-henry-w-coe-state-park-dowdy-ranch-hunting-hollow", [["Dowdy Ranch", null, "", "", "count not found"], ["Hunting Hollow", null, "", "", "count not found"]]);
  split("sp-hearst-san-simeon-state-park-washburn-san-simeon-creek", [["San Simeon Creek", 115, "", "", "The Dyrt lists 66"], ["Washburn", 68, "", "", "no showers on site"]]);
  split("sp-pismo-state-beach-north-beach-oceano", [["North Beach", 103, "", "", "tent-focused, no hookups"], ["Oceano", 80, "", "", "hookups; one guide says 82"]]);
  split("sp-point-mugu-state-park-thornhill-broome-sycamore-canyon", [["Thornhill Broome", null, "Closed from Oct 8, 2026 (high tide)", "", "beachfront; count not found"], ["Sycamore Canyon", 58, "", "", "listings 49–113"]]);
  split("sp-cuyamaca-rancho-state-park-paso-picacho-green-valley", [["Paso Picacho", 85, "Year-round (reservations Apr 1 – Nov 30; first-come Dec 1 – Mar 31)"], ["Green Valley", 81, "Apr – Nov (closed Dec – Mar)"]]);
  split("sp-mount-san-jacinto-state-park-idyllwild-stone-creek", [["Idyllwild", 31, "", "", "listings 31–78"], ["Stone Creek", 50, "", "", "listings 35–50"]]);
  split("sp-anza-borrego-desert-state-park-tamarisk-grove-bow-willow-fish-creek", [["Tamarisk Grove", 27, "Oct – Apr (reservations)", "", "includes 11 cabins"], ["Bow Willow", 16, "Year-round (first-come)"], ["Fish Creek", null, "Year-round (primitive, first-come)", "", "count not found"]]);
  split("sp-salton-sea-state-recreation-area-mecca-beach-corvina-beach", [["Headquarters", null, "Year-round", "", "main campground; hookup and tent sites"], ["Mecca Beach", null, "Closed for maintenance repairs (no reopening date)"], ["Corvina Beach", null, "", "", "primitive"]]);
})();
