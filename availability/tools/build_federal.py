# Build availability/data/federal.js: every California campground on Recreation.gov, minus the ones already on the site.
# Run from availability/ (Python 3, no packages; Recreation.gov's public API needs no key):
#   python3 -I tools/fetch_recgov.py /tmp/rg          -> /tmp/rg/fed.json   (about 2 minutes)
#   node tools/current_rows.cjs /tmp/rg/cur.json
#   python3 -I tools/build_federal.py /tmp/rg/fed.json /tmp/rg/cur.json data/federal.js YYYY-MM-DD
# Then run the tests. Names, matches (SAME), region rules and the season-phrase reader live below.
import json, re, sys
fed = json.load(open(sys.argv[1])); cur = json.load(open(sys.argv[2])); OUT = sys.argv[3]; DAY = sys.argv[4]

SMALL = {"and", "of", "the", "at", "on", "in", "a", "to", "by", "for"}
KEEP = {"RV", "NF", "BLM", "OHV", "SRA", "NRA", "USFS", "II", "III", "IV", "KOA", "CCC", "ADA", "ATV", "YMCA"}
def title(s):
    s = re.sub(r"\s+", " ", (s or "").strip())
    out = []
    for i, w in enumerate(s.split(" ")):
        core = re.sub(r"[^A-Za-z]", "", w).upper()
        if core in KEEP: out.append(w.upper()); continue
        lw = w.lower()
        if i and lw in SMALL: out.append(lw); continue
        # capitalise each part of hyphenated / parenthesised / slash words; keep Mc/O' names readable
        lw = re.sub(r"(^|[-/(\"'.])([a-z])", lambda m: m.group(1) + m.group(2).upper(), lw)
        lw = re.sub(r"^Mc([a-z])", lambda m: "Mc" + m.group(1).upper(), lw)
        lw = re.sub(r"'S\b", "'s", lw)
        out.append(lw)
    return " ".join(out)

def clean_name(n, park=""):
    n = title(n)
    pk = park.lower()
    n = re.sub(r"^\((.*?)\)\s*(.+)$", r"\2 (\1)", n)                       # "(Lake Alpine) Lodgepole" -> "Lodgepole (Lake Alpine)"
    n = re.sub(r"\s*[-–]\s*(?:Us Forest Service\s+)?[A-Za-z .-]*(?:National Forest|\bNF)\b.*$", "", n)
    n = re.sub(r"\s+[A-Z][a-z]+ NF$|\s+Shasta-Trinity$", "", n)
    n = re.sub(r"-\s*Napa,\s*Ca\b", "", n, flags=re.I)
    n = re.sub(r"\s*\((?:Bor|BOR)\)", "", n)
    def par(m):
        inner = m.group(1); words = [w for w in re.split(r"[^a-z]+", inner.lower()) if w and w not in ("national", "forest", "nf", "ca")]
        return "" if (re.search(r"National Forest|\bNF\b|^CA$", inner) or (words and all(w in pk for w in words))) else m.group(0)
    n = re.sub(r"\s*\(([^)]*)\)", par, n)
    n = re.sub(r"\s+(?:Family\s+)?Cg\b", "", n)
    n = re.sub(r"\s+Campground(?=\s*[-(]|\s+(?:Group|Mid))", "", n)
    n = re.sub(r"\s*\((?:CA|Ca|California)\)$", "", n)
    n = re.sub(r"\s+(Campground|Campgrounds|Cg|Camp Ground)$", "", n, flags=re.I)
    n = re.sub(r"\b(Ca|Ca\.)\)", "CA)", n)
    return n.strip(" -,")

AG = {"NPS": "NPS", "USFS": "USFS", "FS": "USFS", "BLM": "BLM", "USACE": "USACE", "BOR": "BOR", "FWS": "FWS", "PT": "Presidio Trust"}
def agency(r):
    o = (r.get("org") or r.get("org_name") or "").strip()
    on = (r.get("org_name") or "").lower()
    if "forest" in on or o in ("USFS", "FS", "131"): return "USFS"
    if "park service" in on or o == "NPS" or o == "128": return "NPS"
    if "land management" in on or o in ("BLM", "126"): return "BLM"
    if "corps" in on or o in ("USACE", "130"): return "USACE"
    if "reclamation" in on or o in ("BOR", "129"): return "BOR"
    if "fish" in on: return "FWS"
    if "presidio" in on: return "Presidio Trust"
    return AG.get(o, r.get("org_name") or o or "Federal")

# rough region from coordinates, matching the regions the site already uses
VALLEY = [(-122.5, 40.6), (-121.9, 40.6), (-121.6, 39.6), (-121.0, 38.6), (-120.2, 37.6), (-119.0, 36.6), (-118.8, 35.4), (-119.2, 35.0),
          (-119.8, 35.6), (-120.8, 36.8), (-121.6, 37.6), (-122.1, 38.2), (-122.4, 39.2)]
def inside(x, y, poly):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
def region(r):
    p = (r.get("parent_name") or "")
    if "Channel Islands" in p: return "Channel Islands"
    y, x = r.get("latitude"), r.get("longitude")
    try: y, x = float(y), float(x)
    except Exception: return "Statewide"
    if not y or not x: return "Statewide"
    if y >= 38.6 and x < -122.6: return "North Coast"
    if 38.6 <= y < 40.3 and x < -122.2: return "North Coast"
    if y >= 40.3 or (y >= 39.8 and x < -121.4): return "Cascades"
    if inside(x, y, VALLEY): return "Central Valley"
    if (x > -116.4 and y < 35.8) or (34.4 < y < 35.8 and x > -118.0) or (x > -117.6 and y < 37.3 and y >= 35.8): return "Desert"
    if y < 34.85 and x > -119.5: return "Southern California"
    if 36.9 <= y < 38.6 and x < -121.5: return "Bay Area"
    if x < -119.5 and y < 37.0 and (x < -120.0 or y < 35.4): return "Central Coast"
    return "Sierra Nevada"

MON = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?"
DAYN = r"(?:\s+\d{1,2}(?:st|nd|rd|th)?)?"
QUAL = r"(?:(?:early|mid|late|the end of|end of|beginning of)[- ]+)?"
RANGE = rf"({QUAL}{MON}{DAYN})\s*(?:-|–|—|to|through|thru|until)\s*({QUAL}{MON}{DAYN})"
SEASON = [re.compile(rf"\b(?:open(?:s|ed)?|season(?:\s+of\s+use)?|operat(?:es|ing|ional)|available)\b[^.]{{0,60}}?\b(?:from\s+)?{RANGE}", re.I),
          re.compile(rf"\b{RANGE}[^.]{{0,25}}\bseason\b", re.I)]
YEAR_ROUND = re.compile(r"\b(?:open|available|operates?)\s+(?:all\s+year|year[- ]round|year round)\b|\byear[- ]round (?:campground|camping|access)\b", re.I)
def norm_mon(s):
    s = re.sub(r"\s+", " ", s.strip())
    m = re.match(rf"({QUAL})({MON})(\s+\d{{1,2}})?", s, re.I)
    if not m: return s
    q = m.group(1).strip().lower().replace("the ", "")
    mon = m.group(2)[:3].title(); d = (m.group(3) or "").strip()
    q = {"early": "Early ", "mid": "Mid-", "mid-": "Mid-", "late": "Late ", "end of": "End of ", "beginning of": "Early "}.get(q.rstrip("- "), "")
    return (q + mon + (" " + d if d else "")).strip()
def season(text):
    t = text or ""
    for rx in SEASON:
        m = rx.search(t)
        if m:
            return norm_mon(m.group(1)) + " – " + norm_mon(m.group(2)), m.group(0)
    m = YEAR_ROUND.search(t)
    if m: return "Year-round", m.group(0)
    return "", ""

def rule(r):
    v, u = (r.get("window") or [None, None])
    try: v = int(v)
    except Exception: v = None
    u = (u or "").upper()
    bd = r.get("block_day")
    if v and u.startswith("MONTH"):
        if bd: return {"kind": "monthly", "blockStart": int(bd), "monthsAhead": v, "time": "07:00"}, True
        return {"kind": "rolling", "months": v, "time": "07:00"}, True
    if v and u.startswith("DAY"): return {"kind": "days", "days": v, "time": "07:00"}, True
    if v and u.startswith("WEEK"): return {"kind": "days", "days": v * 7, "time": "07:00"}, True
    return {"kind": "rolling", "months": 6, "time": "07:00"}, False

def nkey(s):
    s = (s or "").lower()
    s = re.sub(r"\((?:ca|california)\)", "", s)
    s = re.sub(r"\b(campground|campgrounds|camp ground|cg|loop|walk-in|walk in|tent|the)\b", "", s)
    return re.sub(r"[^a-z0-9]", "", s)

# rows already on the site, matched by campground name (and park, where the name is generic)
have = {}
for c in cur:
    if c["agency"] in ("California State Parks",) or c["id"].startswith("sys-"): continue
    have.setdefault(nkey(c["name"]), []).append(c)

# Recreation.gov facilities that are the same campground as a row already on the site, under a different name
SAME = {"232460": ["seki-dorst"], "232461": ["seki-lodgepole"], "232498": ["chis-scorpion"], "10190967": ["chis-prisoners-harbor-santa-cruz-island"],
  "232501": ["nps-channel-islands-national-park-san-miguel-island-cuyler-harbor"], "232500": ["nps-channel-islands-national-park-santa-barbara-island-landing-cove"],
  "232499": ["nps-channel-islands-national-park-santa-cruz-island-del-norte-backcountry"], "232497": ["nps-channel-islands-national-park-santa-rosa-island-water-canyon"],
  "232455": ["nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-group--dry-creek-group"],
  "272247": ["nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-crystal-creek"], "272244": ["nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-horse-camp"],
  "272248": ["nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-peltier-bridge"], "272243": ["nps-whiskeytown-national-recreation-area-brandy-creek-dry-creek-sheep-camp"],
  "259181": ["sp-prairie-creek-redwoods-state-park-gold-bluffs-beach"], "259179": ["sp-jedediah-smith"], "10172170": ["nps-golden-gate-national-recreation-area-rob-hill-campground-presidio"],
  "233381": ["nps-santa-monica-mountains-national-recreation-area-circle-x-ranch-group-camp"],
  "233359": ["pore-backcountry--coast-camp", "pore-backcountry--glen-camp", "pore-backcountry--sky-camp", "pore-backcountry--wildcat-camp"]}
NOTCAMP = re.compile(r"picnic|day use|anchoring", re.I)
FOREST_REGION = {c["name"]: c["region"] for c in cur if c["park"].startswith("All campgrounds in the forest")}
FOREST_REGION.update({c["park"]: c["region"] for c in cur if c["region"] != "Statewide"})
FOREST_REGION.update({"Lake Berryessa": "Bay Area", "Stanislaus River Parks": "Central Valley"})
rows, matched, skipped = [], {}, []
seen_ids = set()
# Recreation.gov sometimes keeps an old first-come listing beside the reservable one for the same campground: keep the reservable one
def ckey(r):
    try: return (round(float(r["latitude"]), 3), round(float(r["longitude"]), 3), nkey(clean_name(r["name"], title(r.get("parent_name") or ""))))
    except Exception: return ("id", r["entity_id"])
fed0 = list(fed)
best = {}
for r in fed:
    k = ckey(r)
    if k not in best or (r.get("reservable") and not best[k].get("reservable")): best[k] = r
for r in fed:
    if best[ckey(r)] is not r: skipped.append((str(r["entity_id"]), r["name"], "duplicate listing"))
fed = [r for r in fed if best[ckey(r)] is r]
for r in fed:
    eid = str(r["entity_id"])
    if eid in seen_ids: continue
    seen_ids.add(eid)
    if r.get("deactivated"): skipped.append((eid, r["name"], "deactivated")); continue
    if eid in SAME:
        for sid in SAME[eid]: matched[sid] = eid
        continue
    if NOTCAMP.search(r["name"]): skipped.append((eid, r["name"], "not a campground")); continue
    k = nkey(r["name"])
    hit = None
    for c in have.get(k, []):
        if (r.get("parent_name") or "")[:8].lower() in c["park"].lower() or c["park"][:8].lower() in (r.get("parent_name") or "").lower(): hit = c; break
    if hit: matched[hit["id"]] = eid; continue
    ag = agency(r); rl, known = rule(r)
    reservable = bool(r.get("reservable"))
    rt = " ".join(r.get("campsite_reserve_type") or []) if isinstance(r.get("campsite_reserve_type"), list) else str(r.get("campsite_reserve_type") or "")
    fcfs_too = bool(re.search(r"first", rt, re.I))
    op, ev = season((r.get("text") or "") + " " + (r.get("description") or ""))
    note = ""
    for n in r.get("notices") or []:
        n = re.sub(r"\s+", " ", n).strip()
        if n and re.search(r"\b(?:is|are|will be|remains?|currently|temporarily) (?:temporarily |currently )?closed\b|\bclosed (?:for|until|due|through)\b|\bclosures? (?:of|for|until|due|through)\b|\breopen|until further notice|\bconstruction\b|\bdamage|\bno (?:potable |drinking )?water\b|water is (?:off|not available|unavailable)|potable water is not available", n[:200], re.I): note = n[:220] + ("…" if len(n) > 220 else ""); break
    # an active Recreation.gov notice that says the campground is closed wins over any season phrase
    for n in r.get("notices") or []:
        n2 = re.sub(r"\s+", " ", n)
        if re.search(r"\b(?:this|the) (?:campground|facility) (?:is|will be|remains) (?:currently |temporarily )*CLOSED\b", n2, re.I):
            m = re.search(r"\b(?:as of|effective|beginning|starting)\s+(\d{1,2}/\d{1,2}/\d{4})", n2, re.I)
            op, ev = "Closed" + (" from " + m.group(1) if m else "") + " (Recreation.gov notice)", n2.strip()[:160]
            if n2 != note: note = n2.strip()[:300] + ("…" if len(n2.strip()) > 300 else "")
            break
    sites = r.get("campsites_count")
    try: sites = int(sites) if sites not in (None, "", 0, "0") else None
    except Exception: sites = None
    park = re.sub(r" Headquarters$", "", title(r.get("parent_name") or "")) or {"BLM": "Bureau of Land Management"}.get(ag, ag)
    park = park.replace("National Forest", "National Forest").strip()
    if ag == "BLM" and "land management" not in park.lower() and "BLM" not in park: park += " (BLM)"
    if ag == "USACE" and "corps" not in park.lower(): park += " (Army Corps)"
    if ag == "BOR" and "reclamation" not in park.lower(): park += " (Reclamation)"
    rows.append({
        "rg": eid, "name": clean_name(r["name"], title(r.get("parent_name") or "")), "park": park, "region": (lambda g: FOREST_REGION.get(re.sub(r" Headquarters$", "", r.get("parent_name") or ""), "Statewide") if g == "Statewide" else g)(region(r)), "agency": ag,
        "system": "rec" if reservable else "fcfs",
        "rule": rl if reservable else {"kind": "none"}, "ruleKnown": known,
        "walkup": ("some" if fcfs_too else None) if reservable else "only",
        "sites": sites, "city": title(r.get("city") or ""), "open": op, "openEv": ev[:160], "note": note,
        "lat": r.get("latitude"), "lng": r.get("longitude"),
    })

import collections as _c
dup = _c.Counter((x["park"], x["name"]) for x in rows)
for x in rows:
    if dup[(x["park"], x["name"])] > 1: x["name"] += " (" + (x["city"] or "Recreation.gov " + x["rg"]) + ")"
dup = _c.Counter((x["park"], x["name"]) for x in rows)
for x in rows:
    if dup[(x["park"], x["name"])] > 1: x["name"] += " #" + x["rg"]
rows.sort(key=lambda x: (x["park"], x["name"]))
js = ["/* Every California campground listed on Recreation.gov (public search and campground data, read " + DAY + ").",
      "   Generated; do not edit by hand. Rows already on the site (matched by name and park) are not repeated; they get a",
      "   Recreation.gov link instead (window.RECGOV_MATCH). Season dates come only from the campground's own Recreation.gov",
      "   description, where it states them; otherwise they are left blank (shown as not verified). Peak seasons are not",
      "   published there and are left blank. Loaded after campgrounds.js. */",
      "window.RECGOV_CHECKED = " + json.dumps(DAY) + ";",
      "window.RECGOV_MATCH = " + json.dumps(matched, separators=(",", ":")) + ";",
      "window.RECGOV_CITY = " + json.dumps({sid: title(next((r.get("city") or "" for r in fed0 if str(r["entity_id"]) == eid), "")) for sid, eid in matched.items()}, separators=(",", ":")) + ";",
      "window.RECGOV = ["]
for x in rows:
    js.append("  " + json.dumps(x, ensure_ascii=False, separators=(",", ":")) + ",")
js.append("];")
js.append(open(__file__.replace("build_federal.py", "fedloader.js")).read())
open(OUT, "w").write("\n".join(js) + "\n")
import collections
print("rows", len(rows), "matched", len(matched), "skipped", len(skipped))
print(collections.Counter(x["agency"] for x in rows))
print(collections.Counter(x["region"] for x in rows))
print("with season", sum(1 for x in rows if x["open"]), "rule known", sum(1 for x in rows if x["ruleKnown"] and x["system"] == "rec"), "fcfs", sum(1 for x in rows if x["system"] == "fcfs"))
