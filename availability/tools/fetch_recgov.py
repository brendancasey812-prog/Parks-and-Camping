# All California campgrounds on Recreation.gov: list, then details (booking rules, season text). Writes fed.json.
import json,sys,time,re,urllib.request
S=sys.argv[1]; UA={"User-Agent":"Mozilla/5.0 (parks-and-camping catalog)"}
def get(url):
  for i in range(4):
    try:
      with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=15) as r: return json.load(r)
    except Exception as e: err=str(e); time.sleep(2*(i+1))
  return {"_error":err}
rows=[];start=0
while True:
  d=get(f"https://www.recreation.gov/api/search?fq=entity_type%3Acampground&fq=state_code%3ACalifornia&size=50&start={start}")
  res=d.get("results") or []
  for r in res: rows.append({k:r.get(k) for k in ["entity_id","name","parent_name","parent_type","org_name","campsites_count","reservable","latitude","longitude","city","type","description","campsite_reserve_type","has_lottery"]})
  start+=50
  if not res or start>=(d.get("total") or 0): break
  time.sleep(0.3)
print("listed",len(rows),flush=True)
from concurrent.futures import ThreadPoolExecutor
def det(r):
  cg=get(f"https://www.recreation.gov/api/camps/campgrounds/{r['entity_id']}").get("campground",{}) or {}
  fr=cg.get("facility_rules") or {}; rw=fr.get("reservationWindow") or {}
  txt=re.sub(r"\s+"," "," ".join(re.sub(r"<[^>]+>"," ",v or "") for v in (cg.get("facility_description_map") or {}).values()))
  r.update(got=bool(cg),window=[rw.get("value"),rw.get("units")],block_day=(fr.get("blockReleaseDay") or {}).get("value"),deactivated=cg.get("is_deactivated"),
    org=cg.get("org_code") or r.get("org_name"),text=txt[:4000],notices=[re.sub(r"<[^>]+>"," ",n.get("notice_text",""))[:300] for n in (cg.get("notices") or []) if n.get("active")][:6])
  return 1
n=0
with ThreadPoolExecutor(6) as ex:
  for _ in ex.map(det,rows):
    n+=1
    if n%100==0: print("details",n,flush=True)
json.dump(rows,open(S+"/fed.json","w"))
print("done",len(rows))
