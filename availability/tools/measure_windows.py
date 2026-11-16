# Run from availability/: python3 -I tools/measure_windows.py data/federal.js <tmp>/windows.json  (writes <tmp>/windows.json.jsonl, then run tools/booking_windows.py)
# Measure each Recreation.gov campground's real booking window from its availability calendar.
# For each campground: the last night already released (Available / Reserved / cut off) and the first night "NYR" (not yet released).
# Usage: python3 -I windows.py <federal.js> <out.json>
import json, re, sys, time, datetime as dt, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
src, out = sys.argv[1], sys.argv[2]
txt = open(src).read()
rows = [json.loads(l.strip().rstrip(",")) for l in txt.split("\n") if l.startswith("  {")]
match = json.loads(re.search(r"window\.RECGOV_MATCH = (\{.*?\});", txt).group(1))
ids = {r["rg"]: {"name": r["name"], "park": r["park"], "agency": r["agency"], "system": r["system"]} for r in rows}
for sid, rg in match.items():
    ids.setdefault(rg, {"name": sid, "park": "(already on site)", "agency": "matched", "system": "rec"})
UA = {"User-Agent": "Mozilla/5.0 (parks-and-camping catalog)"}
RELEASED = {"Available", "Reserved", "Not Available Cutoff", "Not Available"}   # "Not Available" = released but blocked/closed; only used if next to NYR
NYR = {"NYR"}
def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if 400 <= e.code < 500 and e.code != 429: return {}      # no calendar for this campground: nothing to retry
            time.sleep(2 * (i + 1))
        except Exception as e:
            time.sleep(1.5 * (i + 1))
    return None
def month(eid, ym):
    d = get(f"https://www.recreation.gov/api/camps/availability/campground/{eid}/month?start_date={ym}-01T00%3A00%3A00.000Z")
    if d is None: return None
    days = {}
    for s in (d.get("campsites") or {}).values():
        for day, v in (s.get("availabilities") or {}).items():
            days.setdefault(day[:10], set()).add(v)
    return days
MONTHS = [f"{y}-{m:02d}" for y, m in [(2026, 11), (2026, 12)] + [(2027, k) for k in range(1, 13)]]
def probe(eid):
    seen = {}
    order = ["2027-05", "2027-06", "2027-04"]
    def load(ym):
        if ym not in seen: seen[ym] = month(eid, ym)
        return seen[ym]
    for ym in order: load(ym)
    budget = [5]
    def summary():
        rel, nyr = [], []
        for ym, days in seen.items():
            for day, vs in (days or {}).items():
                if vs & NYR and not (vs & {"Available", "Reserved"}): nyr.append(day)
                elif vs & {"Available", "Reserved", "Not Available Cutoff"}: rel.append(day)
        return (max(rel) if rel else None), (min(nyr) if nyr else None)
    last, first = summary()
    # widen the search until the edge between released and not-yet-released is found, or the year runs out
    i = MONTHS.index("2027-06")
    while first is None and i + 1 < len(MONTHS) and budget[0] > 0:
        i += 1; budget[0] -= 1; load(MONTHS[i]); last, first = summary()
    j = MONTHS.index("2027-04")
    while last is None and j - 1 >= 0 and budget[0] > 0:
        j -= 1; budget[0] -= 1; load(MONTHS[j]); last, first = summary()
    if first and (last is None or last > first):
        # NYR before some released night: look earlier for the true edge
        while j - 1 >= 0 and (last is None or last > first) and budget[0] > 0:
            j -= 1; budget[0] -= 1; load(MONTHS[j]); last, first = summary()
    statuses = sorted({v for days in seen.values() if days for vs in days.values() for v in vs})
    return {"last_released": last, "first_nyr": first, "statuses": statuses, "months": sorted(k for k, v in seen.items() if v)}
res = {}
import os
done = {}
if os.path.exists(out + ".jsonl"):
    for l in open(out + ".jsonl"):
        try: x = json.loads(l); done[x["id"]] = x["r"]
        except Exception: pass
res.update(done)
LOG = open(out + ".jsonl", "a")
def job(eid):
    if eid in done: return
    try: r = dict(ids[eid], **probe(eid))
    except Exception as e: r = dict(ids[eid], error=str(e))
    res[eid] = r; LOG.write(json.dumps({"id": eid, "r": r}) + "\n"); LOG.flush()
with ThreadPoolExecutor(10) as ex:
    for n, _ in enumerate(ex.map(job, list(ids)), 1):
        if n % 100 == 0: print("done", n, flush=True)
json.dump({"measured": dt.datetime.utcnow().isoformat() + "Z", "rows": res}, open(out, "w"), indent=0)
print("finished", len(res))
