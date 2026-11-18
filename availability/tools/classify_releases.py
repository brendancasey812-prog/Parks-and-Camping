# Classify how each Recreation.gov campground releases nights, from two readings of its booking calendar taken on different days.
#   python3 -I tools/classify_releases.py <reading1.jsonl> <release-day1> <reading2.jsonl> <release-day2> <out.json>
# A release day is the last day whose 5:00 AM Pacific release had happened when that reading was taken.
# Recreation.gov lets a stay that starts inside the window run up to its maximum stay (usually 14 nights) past it, so the first
# "not yet released" (NYR) night of a rolling window sits 1-15 nights after the window's last arrival date.
#   rolling   the first NYR night is 1-15 nights past release-day + N months in BOTH readings, and moved with the calendar
#   block     the edge (last released night, next night NYR) did not move between readings: a fixed block is open, the next one is not
#   season    every night of the coming season is already open and nothing later is open or unreleased: the next release cannot be seen yet
#   upcoming  nothing of the coming season is released yet (its first night is beyond the window): window not measurable until it is
#   fcfs      every night is listed as not reservable
#   none      no booking calendar
import json, sys, calendar, datetime as d, collections
r1, d1, r2, d2, out = sys.argv[1], d.date.fromisoformat(sys.argv[2]), sys.argv[3], d.date.fromisoformat(sys.argv[4]), sys.argv[5]
A = {json.loads(l)["id"]: json.loads(l)["r"] for l in open(r1)}
B = {json.loads(l)["id"]: json.loads(l)["r"] for l in open(r2)}
def add_months(t, n):
    y, m = t.year + (t.month - 1 + n) // 12, (t.month - 1 + n) % 12 + 1
    return d.date(y, m, min(t.day, calendar.monthrange(y, m)[1]))
D = lambda s: d.date.fromisoformat(s) if s else None
N_CAND = (1, 2, 3, 4, 5, 6, 9, 12, 13)
def months_fit(rel, F):
    return [n for n in N_CAND if 1 <= (F - add_months(rel, n)).days <= 15]
res, cnt = {}, collections.Counter()
for k, b in B.items():
    a = A.get(k, {})
    sb = set(b.get("statuses") or [])
    L1, F1, L2, F2 = D(a.get("last_released")), D(a.get("first_nyr")), D(b.get("last_released")), D(b.get("first_nyr"))
    c = {"name": b["name"], "park": b["park"], "agency": b["agency"], "L1": str(L1), "F1": str(F1), "L2": str(L2), "F2": str(F2)}
    if not sb: c["cls"] = "none"
    elif not (sb & {"Available", "Reserved", "NYR"}): c["cls"] = "fcfs"
    elif L2 and F2 and (F2 - L2).days == 1 and L1 and F1 and (F1 - L1).days == 1 and L1 == L2:
        c.update(cls="block", through=str(L2))
    elif F2 and F1 and months_fit(d2, F2) and months_fit(d1, F1) and set(months_fit(d2, F2)) & set(months_fit(d1, F1)) and 6 <= (F2 - F1).days <= 10:
        n = sorted(set(months_fit(d2, F2)) & set(months_fit(d1, F1)))
        c.update(cls="rolling", months=n[0] if len(n) == 1 else n)
    elif F2 and months_fit(d2, F2) and L2 and L2 > d2 and (not F1 or F1 != F2):
        n = months_fit(d2, F2); c.update(cls="rolling", months=n[0] if len(n) == 1 else n, note="first reading inside a closed season")
    elif F2 and len(months_fit(d2, F2)) == 1 and (F1 is None or F1 < F2):
        # in the second reading the first unreleased night is exactly N months (+ stay allowance) out, past where it stood before
        # (the first reading's edge was the season's opening day): a longer window would have released it, a shorter one would stop at opening day
        c.update(cls="rolling", months=months_fit(d2, F2)[0], note="edge passed the season opening between readings")
    elif L1 and L2 and L1 == L2 and F1 and F2 and F1 == F2 and L2 > d2 and F2 <= add_months(d2, 6):
        c.update(cls="block", through=str(L2))                       # a fixed block (closed nights between it and the next one)
    elif F1 and F2 and F1 == F2 and not L2 and F2 <= add_months(d2, 6) - d.timedelta(1):
        c.update(cls="block", through=None)                          # nothing of next season released though a 6-month window would have
    elif not F2 and L2 and L2 >= add_months(d2, 12) - d.timedelta(1) and L1 and (L2 - L1).days >= 6:
        c.update(cls="rolling", months=12)
    elif not F2 and L2 and L2 > add_months(d2, 6) + d.timedelta(15) and L2 < add_months(d2, 12) - d.timedelta(1):
        c.update(cls="season", through=str(L2))                      # released beyond any 6-month window, nothing unreleased in sight
    elif not F2 and L2 and L1 and L2 <= L1 + d.timedelta(1) and L2 > add_months(d2, 6):
        c.update(cls="season", through=str(L2))
    elif F2 and (not L2 or L2 <= d2 + d.timedelta(1)) and F2 > add_months(d2, 6) + d.timedelta(15):
        c.update(cls="upcoming", first=str(F2))
    elif F2 and F1 and F2 == F1:
        c.update(cls="upcoming", first=str(F2))
    else:
        c["cls"] = "unclear"
    res[k] = c; cnt[(c["cls"], json.dumps(c.get("months")))] += 1
json.dump(res, open(out, "w"), indent=0)
for k, v in cnt.most_common(): print(v, k)
