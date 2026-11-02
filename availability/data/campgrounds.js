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
  split("lavo-summit", [["Summit Lake North", null, "Summer (about late Jun – Sep)", "", "count not found"], ["Summit Lake South", 49, "", "", "23 tent-only"]]);
  add("nps-lassen-volcanic-national-park-butte-lake", "Juniper Lake", {}, { openDates: "Closed; no 2026 opening date set", peakDates: "Jul – Aug", sites: null, sitesNote: "closed while repair work continues", src: [{ t: "nps.gov/lavo/planyourvisit/camping-in-campgrounds.htm", u: "https://www.nps.gov/lavo/planyourvisit/camping-in-campgrounds.htm" }] });
  add("nps-yosemite-national-park-white-wolf", "Tamarack Flat", {}, { openDates: "Jun 22 – Oct 12, 2026 (tentative)", peakDates: "Jul – Aug", sites: 52, sitesNote: "tent-only; Campnab lists 54", src: [{ t: "campflare tamarack flat" }, { t: "nps.gov/yose/planyourvisit/campground.htm", u: "https://www.nps.gov/yose/planyourvisit/campground.htm" }] });
  add("nps-sequoia-kings-canyon-national-parks-sentinel", "Atwell Mill", {}, { openDates: "May 20 – Oct 13, 2026", peakDates: "Jun – Aug", sites: 21, sitesNote: "tent-only; Mineral King", src: [{ t: "thedyrt sequoia kings canyon guide" }] });
  add("nps-channel-islands-national-park-santa-barbara-island-landing-cove", "Anacapa Island", { park: "Channel Islands National Park (Anacapa Island)" }, { openDates: "Year-round", peakDates: "Jun – Sep", sites: 7, sitesNote: "no water", src: [{ t: "hipcamp channel islands" }] });
  split("nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-group", [["Brandy Creek RV", 15, "Year-round", "", "all reservable"], ["Brandy Creek Primitive", 2, "Mid-Apr – Oct", "", "tent-only"], ["Dry Creek Group", null, "", "", "group site; count not found"]]);

  // ---------- state parks ----------
  split("sp-patrick-s-point-state-park-patrick-s-point", [["Abalone", 70, "", "", "from site-number range"], ["Agate", 39, "Late May – early Sep", ""], ["Penn Creek", 15, "Year-round (reservations May – Sep)", "", "tent only"]]);
  split("sp-humboldt-redwoods-state-park-burlington-albee-creek-hidden-springs", [["Burlington", 57, "Year-round"], ["Albee Creek", null, "Mid-May – mid-Oct", "", "count not confirmed"], ["Hidden Springs", 146, "Mid-Apr – Labor Day"]]);
  split("sp-standish-hickey-state-recreation-area-standish-hickey", [["Rock Creek", 35, "Year-round"], ["Hickey", 63, "May 1 – Oct 15 (reservations)"], ["Redwood", 62, "Jul 1 – Sep 15"]]);
  split("sp-salt-point-state-park-salt-point", [["Gerstle Cove", 30, "Year-round"], ["Woodside", 79, "Seasonal (closed in winter)"]]);
  split("sp-sonoma-coast-state-park-bodega-dunes-wright-s-beach", [["Bodega Dunes", 81, "Apr – Nov (older park doc)", "", "older doc says 98"], ["Wright's Beach", 24, "Year-round"]]);
  split("sp-lake-oroville-state-recreation-area-lake-oroville", [["Bidwell Canyon", 75, "Year-round", "", "from site-number ranges"], ["Loafer Creek", 137, "Year-round (reservations Apr 1 – Oct 15)", "", "from site-number ranges"]]);
  split("sp-san-luis-reservoir-state-recreation-area-basalt-medeiros", [["Basalt", 79, "Temporarily closed (dam safety work)"], ["Medeiros", null, "Year-round", "", "primitive, first-come; count not found"]]);
  split("sp-folsom-lake-state-recreation-area-beals-point-peninsula", [["Beals Point", 69, "Year-round"], ["Peninsula", 100, "Apr – Oct", "", "primitive"]]);
  split("sp-calaveras-big-trees-state-park-north-grove-oak-hollow", [["North Grove", 74, "Year-round (limited first-come in winter)"], ["Oak Hollow", 55, "May 15 – Oct 1"]]);
  split("sp-mount-diablo-state-park-mount-diablo", [["Juniper", 27], ["Live Oak", 22, "", "", "one listing 18"], ["Junction", 6, "", "", "first-come"]]);
  split("sp-mount-tamalpais-state-park-pantoll-steep-ravine", [["Pantoll", null, "Year-round", "", "walk-in, first-come; count not found"], ["Steep Ravine", 6, "Year-round", "", "hike-in sites plus 10 cabins"]]);
  split("sp-henry-w-coe-state-park-dowdy-ranch-hunting-hollow", [["Dowdy Ranch", null, "", "", "count not found"], ["Hunting Hollow", null, "", "", "count not found"]]);
  split("sp-hearst-san-simeon-state-park-washburn-san-simeon-creek", [["San Simeon Creek", 115, "", "", "The Dyrt lists 66"], ["Washburn", 68, "", "", "no showers on site"]]);
  split("sp-pismo-state-beach-north-beach-oceano", [["North Beach", 103, "", "", "tent-focused, no hookups"], ["Oceano", 80, "", "", "hookups; one guide says 82"]]);
  split("sp-point-mugu-state-park-thornhill-broome-sycamore-canyon", [["Thornhill Broome", null, "", "", "beachfront; count not found"], ["Sycamore Canyon", 58, "", "", "listings 49–113"]]);
  split("sp-cuyamaca-rancho-state-park-paso-picacho-green-valley", [["Paso Picacho", 85, "Year-round"], ["Green Valley", 81, "Apr – Nov (closed Dec – Mar)"]]);
  split("sp-mount-san-jacinto-state-park-idyllwild-stone-creek", [["Idyllwild", 31, "", "", "listings 31–78"], ["Stone Creek", 50, "", "", "listings 35–50"]]);
  split("sp-anza-borrego-desert-state-park-tamarisk-grove-bow-willow-fish-creek", [["Tamarisk Grove", 27, "Oct – Apr (reservations)", "", "includes 11 cabins"], ["Bow Willow", 16, "Year-round (first-come)"], ["Fish Creek", null, "Year-round (primitive, first-come)", "", "count not found"]]);
  split("sp-salton-sea-state-recreation-area-mecca-beach-corvina-beach", [["Mecca Beach", null], ["Corvina Beach", null, "", "", "primitive"]]);
})();
