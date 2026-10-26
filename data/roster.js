/* Roster: the rest of California's state park, national park and national forest campgrounds.
   These rows use their booking site's default release rule and are marked conf:"assumed" (shown as "Default rule"):
   the release day and time is right for the system, but season, peak season and walk-up are "not verified yet".
   Names come from search results and general knowledge, so a campground can be missing, renamed or closed; the daily check
   (docs/DAILY-SEARCH.md) is meant to confirm each one against the park or forest page and the booking site.
   Row format: [campground or area, park or forest, region, optional note] */
(function () {
  const S = (t, u) => ({ t, u });
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const REC6 = { kind: "rolling", months: 6, time: "07:00" }, RC6 = { kind: "rolling", months: 6, time: "08:00" };
  const have = new Set(window.SITES.map(s => s.id));
  const add = (label, park, region, o) => {
    let id = slug(o.agencyKey + "-" + park + "-" + label), n = 2; while (have.has(id)) id = slug(o.agencyKey + "-" + park + "-" + label) + "-" + n++;
    have.add(id);
    window.SITES.push({ id, name: label, park, region, agency: o.agency, system: o.system, rule: o.rule, open: o.open || null, openNote: o.openNote || "", peak: null, peakNote: "", walkup: o.walkup || null, walkupNote: o.walkupNote || "",
      status: o.status, conf: "assumed", check: o.check || ["season", "peak", "walkup"], notes: o.note || "", sources: o.sources });
  };

  /* ---------- California State Parks (ReserveCalifornia, 6 months, 8:00 AM Pacific) ---------- */
  const SP = { agency: "California State Parks", agencyKey: "sp", system: "rc", rule: RC6, sources: [S("California State Parks", "https://www.parks.ca.gov/"), S("ReserveCalifornia", "https://www.reservecalifornia.com/")] };
  [
    ["Patrick's Point", "Patrick's Point State Park", "North Coast"], ["Humboldt Lagoons", "Humboldt Lagoons State Park", "North Coast"],
    ["Burlington / Albee Creek / Hidden Springs", "Humboldt Redwoods State Park", "North Coast"], ["Richardson Grove", "Richardson Grove State Park", "North Coast"],
    ["Standish-Hickey", "Standish-Hickey State Recreation Area", "North Coast"], ["Benbow Lake", "Benbow Lake State Recreation Area", "North Coast"],
    ["Gold Bluffs Beach", "Prairie Creek Redwoods State Park", "North Coast"], ["MacKerricher", "MacKerricher State Park", "North Coast"],
    ["Russian Gulch", "Russian Gulch State Park", "North Coast"], ["Van Damme", "Van Damme State Park", "North Coast"], ["Hendy Woods", "Hendy Woods State Park", "North Coast"],
    ["Salt Point", "Salt Point State Park", "North Coast"], ["Reef Campground", "Fort Ross State Historic Park", "North Coast"],
    ["Bodega Dunes / Wright's Beach", "Sonoma Coast State Park", "North Coast"], ["Austin Creek", "Austin Creek State Recreation Area", "North Coast"],
    ["Clear Lake", "Clear Lake State Park", "North Coast"], ["Sugarloaf Ridge", "Sugarloaf Ridge State Park", "Bay Area"], ["Bothe-Napa Valley", "Bothe-Napa Valley State Park", "Bay Area"],
    ["McArthur-Burney Falls", "McArthur-Burney Falls Memorial State Park", "Cascades"], ["Castle Crags", "Castle Crags State Park", "Cascades"],
    ["Lake Oroville", "Lake Oroville State Recreation Area", "Central Valley"], ["Woodson Bridge", "Woodson Bridge State Recreation Area", "Central Valley"],
    ["Millerton Lake", "Millerton Lake State Recreation Area", "Central Valley"], ["Basalt / Medeiros", "San Luis Reservoir State Recreation Area", "Central Valley"],
    ["Brannan Island", "Brannan Island State Recreation Area", "Central Valley"],
    ["Plumas-Eureka", "Plumas-Eureka State Park", "Sierra Nevada"], ["Beals Point / Peninsula", "Folsom Lake State Recreation Area", "Sierra Nevada"],
    ["South Yuba River", "South Yuba River State Park", "Sierra Nevada"], ["Chute Hill", "Malakoff Diggins State Historic Park", "Sierra Nevada"],
    ["Donner Memorial", "Donner Memorial State Park", "Sierra Nevada"], ["Grover Hot Springs", "Grover Hot Springs State Park", "Sierra Nevada"],
    ["D.L. Bliss", "D.L. Bliss State Park", "Sierra Nevada"], ["Eagle Point", "Emerald Bay State Park", "Sierra Nevada"], ["Sugar Pine Point", "Sugar Pine Point State Park", "Sierra Nevada"],
    ["North Grove / Oak Hollow", "Calaveras Big Trees State Park", "Sierra Nevada"],
    ["Mount Diablo", "Mount Diablo State Park", "Bay Area"], ["Samuel P. Taylor", "Samuel P. Taylor State Park", "Bay Area"], ["Pantoll / Steep Ravine", "Mount Tamalpais State Park", "Bay Area"],
    ["Environmental camps", "Angel Island State Park", "Bay Area"], ["China Camp", "China Camp State Park", "Bay Area"], ["Francis Beach", "Half Moon Bay State Beach", "Bay Area"],
    ["Butano", "Butano State Park", "Bay Area"], ["Portola Redwoods", "Portola Redwoods State Park", "Bay Area"],
    ["Big Basin", "Big Basin Redwoods State Park", "Bay Area", "Damaged in the 2020 CZU fire and reopening in stages. Check whether camping is open."],
    ["Henry Cowell Redwoods", "Henry Cowell Redwoods State Park", "Bay Area"], ["New Brighton", "New Brighton State Beach", "Bay Area"], ["Sunset", "Sunset State Beach", "Bay Area"],
    ["Seacliff", "Seacliff State Beach", "Bay Area"], ["Manresa Uplands", "Manresa Uplands State Beach", "Bay Area"], ["Dowdy Ranch / Hunting Hollow", "Henry W. Coe State Park", "Bay Area"],
    ["Fremont Peak", "Fremont Peak State Park", "Central Coast"], ["Andrew Molera", "Andrew Molera State Park", "Central Coast"],
    ["Walk-in sites", "Julia Pfeiffer Burns State Park", "Central Coast", "Two primitive walk-in sites above McWay Cove."], ["Limekiln", "Limekiln State Park", "Central Coast"],
    ["Washburn / San Simeon Creek", "Hearst San Simeon State Park", "Central Coast"], ["Morro Bay", "Morro Bay State Park", "Central Coast"], ["Morro Strand", "Morro Strand State Beach", "Central Coast"],
    ["Montaña de Oro", "Montaña de Oro State Park", "Central Coast"], ["North Beach / Oceano", "Pismo State Beach", "Central Coast"], ["Oceano Dunes", "Oceano Dunes State Vehicular Recreation Area", "Central Coast"],
    ["Gaviota", "Gaviota State Park", "Central Coast"], ["Refugio", "Refugio State Beach", "Central Coast"], ["El Capitan", "El Capitan State Beach", "Central Coast"], ["Carpinteria", "Carpinteria State Beach", "Central Coast"],
    ["McGrath", "McGrath State Beach", "Southern California"], ["Thornhill Broome / Sycamore Canyon", "Point Mugu State Park", "Southern California"], ["Leo Carrillo", "Leo Carrillo State Park", "Southern California"],
    ["Malibu Creek", "Malibu Creek State Park", "Southern California", "Popular sites may be allocated by drawing instead of first-come booking; check the park notice."],
    ["El Moro", "Crystal Cove State Park", "Southern California"], ["Doheny", "Doheny State Beach", "Southern California"], ["San Clemente", "San Clemente State Beach", "Southern California"],
    ["San Mateo", "San Onofre State Beach", "Southern California"], ["San Onofre Bluffs", "San Onofre State Beach", "Southern California"], ["South Carlsbad", "South Carlsbad State Beach", "Southern California"],
    ["San Elijo", "San Elijo State Beach", "Southern California"], ["Silver Strand", "Silver Strand State Beach", "Southern California"], ["Paso Picacho / Green Valley", "Cuyamaca Rancho State Park", "Southern California"],
    ["Idyllwild / Stone Creek", "Mount San Jacinto State Park", "Southern California"], ["Rolling M Ranch", "Chino Hills State Park", "Southern California"], ["Lake Perris", "Lake Perris State Recreation Area", "Southern California"],
    ["Silverwood Lake", "Silverwood Lake State Recreation Area", "Southern California"], ["Hungry Valley", "Hungry Valley State Vehicular Recreation Area", "Southern California"],
    ["Tamarisk Grove / Bow Willow / Fish Creek", "Anza-Borrego Desert State Park", "Desert"], ["Red Rock Canyon", "Red Rock Canyon State Park", "Desert"], ["Saddleback Butte", "Saddleback Butte State Park", "Desert"],
    ["Providence Mountains", "Providence Mountains State Recreation Area", "Desert"], ["Picacho", "Picacho State Recreation Area", "Desert"], ["Mecca Beach / Corvina Beach", "Salton Sea State Recreation Area", "Desert"],
    ["Ocotillo Wells", "Ocotillo Wells State Vehicular Recreation Area", "Desert"]
  ].forEach(r => add(r[0], r[1], r[2], Object.assign({}, SP, { note: r[3] || "" })));

  /* ---------- National Park Service units (Recreation.gov) ---------- */
  const NPS = { agency: "NPS", agencyKey: "nps", system: "rec", rule: REC6, check: ["rule", "season", "peak", "walkup"], sources: [S("Recreation.gov", "https://www.recreation.gov/"), S("National Park Service", "https://www.nps.gov/")] };
  const FC = Object.assign({}, NPS, { system: "fcfs", rule: { kind: "none" }, walkup: "only", walkupNote: "Believed first-come, first-served; confirm", check: ["season", "peak", "walkup"] });
  [
    ["Crane Flat", "Yosemite National Park", "Sierra Nevada"], ["White Wolf", "Yosemite National Park", "Sierra Nevada"], ["Yosemite Creek", "Yosemite National Park", "Sierra Nevada"],
    ["Porcupine Flat", "Yosemite National Park", "Sierra Nevada"], ["Bridalveil Creek", "Yosemite National Park", "Sierra Nevada", "Closed for the rest of the 2026 season (news report)."],
    ["Potwisha", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"], ["Buckeye Flat", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"], ["South Fork", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"],
    ["Sentinel", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"], ["Sheep Creek", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"], ["Canyon View", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"],
    ["Moraine", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"], ["Sunset", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"], ["Crystal Springs", "Sequoia & Kings Canyon National Parks", "Sierra Nevada"],
    ["Ryan", "Joshua Tree National Park", "Desert"], ["Cottonwood", "Joshua Tree National Park", "Desert"],
    ["Butte Lake", "Lassen Volcanic National Park", "Cascades"], ["Warner Valley", "Lassen Volcanic National Park", "Cascades"], ["Crags", "Lassen Volcanic National Park", "Cascades"],
    ["Water Canyon", "Channel Islands National Park (Santa Rosa Island)", "Channel Islands"], ["Cuyler Harbor", "Channel Islands National Park (San Miguel Island)", "Channel Islands"],
    ["Landing Cove", "Channel Islands National Park (Santa Barbara Island)", "Channel Islands"], ["Del Norte (backcountry)", "Channel Islands National Park (Santa Cruz Island)", "Channel Islands"],
    ["Devils Postpile Campground", "Devils Postpile National Monument", "Sierra Nevada"], ["Brandy Creek / Dry Creek group", "Whiskeytown National Recreation Area", "Cascades"],
    ["Rob Hill Campground (Presidio)", "Golden Gate National Recreation Area", "Bay Area", "Search results say it opens 6 months ahead."],
    ["Circle X Ranch group camp", "Santa Monica Mountains National Recreation Area", "Southern California", "Listed as closed on the park page (old information)."]
  ].forEach(r => add(r[0], r[1], r[2], Object.assign({}, NPS, { note: r[3] || "" })));
  add("Kirby Cove", "Golden Gate National Recreation Area", "Bay Area", Object.assign({}, NPS, { rule: { kind: "rolling", months: 3, time: "07:00" }, note: "Search results say Golden Gate and Point Reyes reservations open 3 months ahead at 7 a.m.", check: ["rule", "season", "peak", "walkup"] }));
  [["Mesquite Spring", "Death Valley National Park", "Desert"], ["Emigrant", "Death Valley National Park", "Desert"], ["Wildrose", "Death Valley National Park", "Desert"],
    ["Thorndike / Mahogany Flat", "Death Valley National Park", "Desert"]].forEach(r => add(r[0], r[1], r[2], Object.assign({}, FC, { note: "NPS says Furnace Creek is the only reservable campground in Death Valley." })));

  /* ---------- National forests in California (Recreation.gov) ---------- */
  const USFS = { agency: "USFS", agencyKey: "usfs", system: "rec", rule: REC6, walkup: "some", walkupNote: "Many Forest Service campgrounds are first-come, first-served", check: ["rule", "season", "peak"],
    note: "Campground-by-campground rules vary. The Forest Service's regional FAQ says individual sites can be booked up to 240 days ahead and group sites 360 days ahead, while many sites are first-come. Treat the 6-month rule here as a placeholder.",
    sources: [S("Recreation.gov", "https://www.recreation.gov/"), S("Forest Service, Pacific Southwest Region FAQ", "https://www.fs.usda.gov/r05/about-area/faqs")] };
  [["Angeles National Forest", "Southern California"], ["Cleveland National Forest", "Southern California"], ["San Bernardino National Forest", "Southern California"], ["Los Padres National Forest", "Central Coast"],
    ["Inyo National Forest", "Sierra Nevada"], ["Sierra National Forest", "Sierra Nevada"], ["Sequoia National Forest", "Sierra Nevada"], ["Stanislaus National Forest", "Sierra Nevada"], ["Eldorado National Forest", "Sierra Nevada"],
    ["Tahoe National Forest", "Sierra Nevada"], ["Plumas National Forest", "Sierra Nevada"], ["Lake Tahoe Basin Management Unit", "Sierra Nevada"], ["Lassen National Forest", "Cascades"], ["Shasta-Trinity National Forest", "Cascades"],
    ["Modoc National Forest", "Cascades"], ["Klamath National Forest", "North Coast"], ["Six Rivers National Forest", "North Coast"], ["Mendocino National Forest", "North Coast"]
  ].forEach(r => add(r[0], "All campgrounds in the forest (rules vary)", r[1], Object.assign({}, USFS)));
})();
