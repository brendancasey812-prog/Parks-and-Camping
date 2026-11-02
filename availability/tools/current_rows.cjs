// Rows on the site before data/federal.js is applied (sites, roster, seasons, campgrounds); used by build_federal.py to avoid duplicates.
// node tools/current_rows.cjs <out.json>   (run from availability/)
const fs = require("fs"), vm = require("vm"), path = require("path");
const D = path.join(__dirname, ".."), w = {}; w.window = w; const ctx = vm.createContext(w);
for (const f of ["sites", "roster", "permits", "seasons", "campgrounds"]) vm.runInContext(fs.readFileSync(path.join(D, "data", f + ".js"), "utf8"), ctx);
fs.writeFileSync(process.argv[2], JSON.stringify(w.SITES.map(s => ({ id: s.id, name: s.name, park: s.park, agency: s.agency, system: s.system, region: s.region }))));
console.log(w.SITES.length + " rows");
