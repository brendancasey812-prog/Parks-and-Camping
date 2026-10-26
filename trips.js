/* Trip Planner: camping + hiking plans on the left, a Google-style calendar (day / week / month) on the right.
   Plans are saved in localStorage under "trips". Booking-site links live in TripIntegrations (see docs/INTEGRATIONS.md). */
(function(){
const A=window.DashAPI;if(!A)return;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
if(!$("#tab-trips"))return;
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const reduce=matchMedia("(prefers-reduced-motion: reduce)");
const narrow=matchMedia("(max-width:900px)");

// ---------- dates ----------
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const [y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1,12)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const diff=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const weekStart=d=>addDays(d,-d.getDay());
const todayIso=()=>iso(new Date());
const MONTHS=["january","february","march","april","may","june","july","august","september","october","november","december"];
const fmtRange=(s,e)=>{const a=parse(s),b=parse(e||s),o={month:"short",day:"numeric"};
  if(s===(e||s))return a.toLocaleDateString([],{...o,year:"numeric"});
  return a.toLocaleDateString([],o)+" – "+b.toLocaleDateString([],a.getFullYear()===b.getFullYear()?o:{...o,year:"numeric"})+(a.getFullYear()===b.getFullYear()?", "+a.getFullYear():"")};
const fmtTime=t=>{if(!t)return"";const [h,m]=t.split(":").map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})};
const mins=t=>{const [h,m]=t.split(":").map(Number);return h*60+(m||0)};

// ---------- data ----------
const TYPES={camp:{label:"Camping",icon:"⛺"},hike:{label:"Hiking",icon:"🥾"}};
const STATUS={idea:"Idea",planned:"Planned",booked:"Booked",done:"Done",cancelled:"Cancelled"};
const PROVIDERS={"":"Not booked / none","recreation.gov":"Recreation.gov",reserveamerica:"ReserveAmerica",reservecalifornia:"ReserveCalifornia",hipcamp:"Hipcamp",alltrails:"AllTrails",other:"Other"};
const load=()=>{const t=A.store.get("trips",[]);return Array.isArray(t)?t.filter(x=>x&&x.id&&x.start):[]};
let trips=load();
const save=()=>{A.store.set("trips",trips);fireChange()};
const subs=[];const fireChange=()=>subs.forEach(f=>{try{f()}catch(e){}});
const uid=()=>"tp-"+Math.random().toString(36).slice(2,9);
const blank=(type,start)=>({id:uid(),title:"",type,parkId:"",place:"",start,end:type==="camp"?iso(addDays(parse(start),2)):start,startTime:"",endTime:"",status:"idea",party:2,trip:"",notes:"",
  res:{provider:"",confirmation:"",url:"",facility:"",site:""},hike:{trail:"",miles:"",gain:""}});
const titleOf=t=>t.title||(t.type==="camp"?"Camping trip":"Hike");
const parkName=t=>{const p=t.parkId&&A.byId.get(t.parkId);return p?A.disp(p):""};
const ev=t=>({t,s:t.start,e:t.end&&t.end>=t.start?t.end:t.start});
const isTimed=e=>e.s===e.e&&!!e.t.startTime;
const nights=t=>Math.max(0,diff(t.start,t.end||t.start));

// ---------- state ----------
let view=A.store.get("tripView","month"),cursor=new Date(),selected=null,query="",typeOn={camp:true,hike:true},scope="upcoming",pane="list",editingNew=false;
cursor.setHours(12,0,0,0);
const text=t=>(titleOf(t)+" "+parkName(t)+" "+t.place+" "+t.notes+" "+t.trip+" "+(t.res.confirmation||"")+" "+(t.hike.trail||"")+" "+TYPES[t.type].label+" "+STATUS[t.status]).toLowerCase();
const visibleTrips=()=>{const q=query.trim().toLowerCase();return trips.filter(t=>typeOn[t.type]&&(!q||text(t).includes(q)||/^\d{4}/.test(q)&&false))};
const sorted=l=>l.slice().sort((a,b)=>a.start.localeCompare(b.start)||(a.end||a.start).localeCompare(b.end||b.start)||titleOf(a).localeCompare(titleOf(b)));

// ---------- smart search: dates, months, weeks, or text ----------
function parseDateQuery(q){
  q=q.trim().toLowerCase();if(!q)return null;
  const now=new Date();now.setHours(12,0,0,0);
  if(q==="today")return{date:now,view:"day",label:"Today"};
  if(q==="tomorrow")return{date:addDays(now,1),view:"day",label:"Tomorrow"};
  if(q==="this week")return{date:now,view:"week",label:"This week"};
  if(q==="next week")return{date:addDays(now,7),view:"week",label:"Next week"};
  if(q==="this month")return{date:now,view:"month",label:"This month"};
  if(q==="next month")return{date:new Date(now.getFullYear(),now.getMonth()+1,1,12),view:"month",label:"Next month"};
  let m=q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return{date:new Date(+m[1],m[2]-1,+m[3],12),view:"day",label:fmtRange(q)};
  m=q.match(/^(\d{4})-(\d{1,2})$/);if(m)return{date:new Date(+m[1],m[2]-1,1,12),view:"month",label:MONTHS[m[2]-1]&&(MONTHS[m[2]-1][0].toUpperCase()+MONTHS[m[2]-1].slice(1)+" "+m[1])};
  m=q.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);if(m){const y=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):now.getFullYear();return{date:new Date(y,m[1]-1,+m[2],12),view:"day",label:new Date(y,m[1]-1,+m[2]).toLocaleDateString([],{month:"long",day:"numeric",year:"numeric"})}}
  const mi=s=>MONTHS.findIndex(x=>x.startsWith(s.slice(0,3))&&x.startsWith(s));
  m=q.match(/^([a-z]{3,9})\.?(?:\s+(\d{1,2}))?(?:,?\s+(\d{4}))?$/);
  if(m&&mi(m[1])>=0){const mo=mi(m[1]),y=m[3]?+m[3]:now.getFullYear();if(m[2]&&+m[2]<=31)return{date:new Date(y,mo,+m[2],12),view:"day",label:new Date(y,mo,+m[2]).toLocaleDateString([],{month:"long",day:"numeric",year:"numeric"})};
    if(!m[2])return{date:new Date(y,mo,1,12),view:"month",label:MONTHS[mo][0].toUpperCase()+MONTHS[mo].slice(1)+" "+y}}
  m=q.match(/^(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?$/);if(m&&mi(m[2])>=0){const mo=mi(m[2]),y=m[3]?+m[3]:now.getFullYear();return{date:new Date(y,mo,+m[1],12),view:"day",label:new Date(y,mo,+m[1]).toLocaleDateString([],{month:"long",day:"numeric",year:"numeric"})}}
  m=q.match(/^week of (.+)$/);if(m){const r=parseDateQuery(m[1]);if(r)return{date:r.date,view:"week",label:"Week of "+r.label}}
  return null;
}

// ---------- calendar rendering ----------
const cal=$("#tpCal");
function visibleRange(){
  if(view==="day")return[iso(cursor),iso(cursor)];
  if(view==="week"){const s=weekStart(cursor);return[iso(s),iso(addDays(s,6))]}
  const f=new Date(cursor.getFullYear(),cursor.getMonth(),1,12),s=weekStart(f),last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0,12),weeks=Math.ceil((f.getDay()+last.getDate())/7);
  return[iso(s),iso(addDays(s,weeks*7-1))]}
function title(){
  if(view==="day")return cursor.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  if(view==="week"){const s=weekStart(cursor),e=addDays(s,6),o={month:"short",day:"numeric"};return s.toLocaleDateString([],o)+" – "+(s.getMonth()===e.getMonth()?e.getDate():e.toLocaleDateString([],o))+", "+e.getFullYear()}
  return cursor.toLocaleDateString([],{month:"long",year:"numeric"})}
function packLanes(evs,startCol){ // evs sorted; returns [{e,a,b,lane}]; a,b are 1-based grid-column start / end(exclusive)
  const lanes=[],out=[];
  evs.forEach(x=>{let l=0;while(lanes[l]!==undefined&&lanes[l]>=x.a)l++;lanes[l]=x.b-1;out.push({...x,lane:l})});
  return out}
function barHtml(x,maxLanes){
  const t=x.e.t,cls=`bar ${t.type} st-${t.status}${selected===t.id?" sel":""}${x.cl?" cl":""}${x.cr?" cr":""}`;
  const lab=`${TYPES[t.type].icon} ${titleOf(t)}${t.status==="booked"?" ✓":t.status==="idea"?" ?":""}`;
  const aria=`${TYPES[t.type].label}: ${titleOf(t)}, ${fmtRange(x.e.s,x.e.e)}, ${STATUS[t.status]}${parkName(t)?", "+parkName(t):""}`;
  return `<button type="button" class="${cls}" data-ev="${esc(t.id)}" style="grid-column:${x.a}/${x.b};grid-row:${x.lane+1}" title="${esc(aria)}" aria-label="${esc(aria)}">${esc(lab)}</button>`}
function weekBars(evs,ws,maxLanes){ // evs overlapping week starting ws (Date); returns html + lane count + overflow per day
  const w0=iso(ws),w1=iso(addDays(ws,6));
  const items=evs.filter(x=>x.e>=w0&&x.s<=w1).map(x=>{const a=Math.max(0,diff(w0,x.s)),b=Math.min(6,diff(w0,x.e));return{e:x,a:a+1,b:b+2,cl:x.s<w0,cr:x.e>w1,len:b-a}})
    .sort((p,q)=>p.a-q.a||q.len-p.len||p.e.t.id.localeCompare(q.e.t.id));
  const packed=packLanes(items),lanes=packed.reduce((m,x)=>Math.max(m,x.lane+1),0),over=Array(7).fill(0);
  const shown=packed.filter(x=>{if(x.lane<maxLanes)return true;for(let c=x.a-1;c<x.b-1;c++)over[c]++;return false});
  return{html:shown.map(x=>barHtml(x)).join(""),lanes:Math.min(lanes,maxLanes),over}}
function renderMonth(evs){
  const f=new Date(cursor.getFullYear(),cursor.getMonth(),1,12),[r0,r1]=visibleRange(),weeks=(diff(r0,r1)+1)/7,td=todayIso(),max=narrow.matches?2:4;
  let h=`<div class="mo" role="group" aria-label="${esc(title())}"><div class="mo-h">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<span>${d}</span>`).join("")}</div>`;
  for(let w=0;w<weeks;w++){const ws=addDays(parse(r0),w*7),wb=weekBars(evs,ws,max);
    h+=`<div class="mw" style="--lanes:${Math.max(wb.lanes,1)}"><div class="mw-days">`+Array.from({length:7},(_,i)=>{const d=addDays(ws,i),k=iso(d),n=evs.filter(x=>x.s<=k&&x.e>=k).length,
      cls=`md${k===td?" today":""}${d.getMonth()!==cursor.getMonth()?" out":""}${(i===0||i===6)?" we":""}${k===iso(cursor)?" cur":""}`;
      return `<button type="button" class="${cls}" data-day="${k}" tabindex="${k===iso(cursor)?0:-1}" aria-label="${esc(d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})+(n?`, ${n} plan${n>1?"s":""}`:"")+(k===td?", today":""))}"><span class="n">${d.getDate()===1?d.toLocaleDateString([],{month:"short",day:"numeric"}):d.getDate()}</span>${wb.over[i]?`<span class="more">+${wb.over[i]} more</span>`:""}</button>`}).join("")+`</div><div class="mw-bars">${wb.html}</div></div>`}
  cal.innerHTML=h+"</div>";
}
const HOUR=48;
function renderTime(evs,days){
  const td=todayIso(),n=days.length,ds=days.map(iso);
  const allday=evs.filter(x=>!isTimed(x)),timed=evs.filter(x=>isTimed(x));
  // for day view: weekBars works from the start of the single day
  let h=`<div class="tw${n===1?" one":""}" style="--n:${n}"><div class="tw-h"><span class="gut"></span>`+days.map(d=>`<button type="button" class="th${iso(d)===td?" today":""}" data-day="${iso(d)}" aria-label="${esc(d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}))}"><small>${d.toLocaleDateString([],{weekday:"short"})}</small><b>${d.getDate()}</b></button>`).join("")+"</div>";
  if(allday.length||true){const items=allday.filter(x=>x.e>=ds[0]&&x.s<=ds[n-1]).map(x=>{const a=Math.max(0,diff(ds[0],x.s)),b=Math.min(n-1,diff(ds[0],x.e));return{e:x,a:a+1,b:b+2,cl:x.s<ds[0],cr:x.e>ds[n-1],len:b-a}}).sort((p,q)=>p.a-q.a||q.len-p.len);
    const packed=packLanes(items),lanes=packed.reduce((m,x)=>Math.max(m,x.lane+1),0);
    h+=`<div class="tw-ad"><span class="gut">all-day</span><div class="tw-adg" style="--n:${n};--lanes:${Math.max(lanes,1)}">${packed.map(x=>barHtml(x)).join("")}</div></div>`}
  h+=`<div class="tw-sc" id="twSc"><div class="tw-g" style="height:${24*HOUR}px"><div class="gut">`+Array.from({length:24},(_,i)=>`<span style="top:${i*HOUR}px">${i===0?"":new Date(2000,0,1,i).toLocaleTimeString([],{hour:"numeric"})}</span>`).join("")+`</div>`;
  days.forEach(d=>{const k=iso(d),col=timed.filter(x=>x.s===k).map(x=>({e:x,a:mins(x.t.startTime),b:mins(x.t.endTime||"")||mins(x.t.startTime)+60})).sort((p,q)=>p.a-q.a);
    const lanes=[];col.forEach(x=>{let l=0;while(lanes[l]!==undefined&&lanes[l]>x.a)l++;lanes[l]=Math.max(x.b,x.a+30);x.lane=l});const L=Math.max(1,lanes.length);
    h+=`<div class="tc${k===td?" today":""}" data-day="${k}">`+col.map(x=>{const t=x.e.t,top=x.a/60*HOUR,hh=Math.max(22,(x.b-x.a)/60*HOUR-2);
      return `<button type="button" class="tev ${t.type} st-${t.status}${selected===t.id?" sel":""}" data-ev="${esc(t.id)}" style="top:${top}px;height:${hh}px;left:calc(${x.lane}/${L}*100% + 2px);width:calc(100%/${L} - 4px)" title="${esc(titleOf(t))}"><b>${TYPES[t.type].icon} ${esc(titleOf(t))}</b><span>${esc(fmtTime(t.startTime))}${t.endTime?" – "+esc(fmtTime(t.endTime)):""}</span></button>`}).join("");
    if(k===td){const now=new Date();h+=`<i class="nowline" style="top:${(now.getHours()*60+now.getMinutes())/60*HOUR}px"></i>`}h+="</div>"});
  h+="</div></div></div>";cal.innerHTML=h;
  const sc=$("#twSc");if(sc)sc.scrollTop=(timed.length?Math.max(0,Math.min(...timed.map(x=>mins(x.t.startTime)))/60-1):7)*HOUR;
}
function renderCal(){
  const evs=visibleTrips().map(ev);
  $("#tpTitle").textContent=title();
  $$("#tpView button").forEach(b=>{const on=b.dataset.v===view;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});
  if(view==="month")renderMonth(evs);else renderTime(evs,view==="day"?[cursor]:Array.from({length:7},(_,i)=>addDays(weekStart(cursor),i)));
  const [ra,rb]=visibleRange(),n=evs.filter(x=>x.e>=ra&&x.s<=rb).length;
  $("#tpCalCount").textContent=`${n} plan${n===1?"":"s"} in view`;
}

// ---------- list + editor ----------
const listEl=$("#tpList");
function rowSummary(t){const park=parkName(t)||t.place;return `<span class="ic" aria-hidden="true">${TYPES[t.type].icon}</span><span class="tx"><b>${esc(titleOf(t))}</b><small>${esc(fmtRange(t.start,t.end))}${t.type==="camp"&&nights(t)?` · ${nights(t)} night${nights(t)>1?"s":""}`:""}${t.startTime?` · ${esc(fmtTime(t.startTime))}`:""}</small>${park?`<small>${esc(park)}${parkName(t)&&t.place?" · "+esc(t.place):""}</small>`:""}</span><span class="pill st-${t.status}">${STATUS[t.status]}</span>`}
function select(id,opts={}){
  selected=id;renderList();renderCal();
  const t=trips.find(x=>x.id===id);
  if(t&&opts.goto!==false){const [a,b]=visibleRange();if(t.end<a||t.start>b){cursor=parse(t.start);renderCal()}}
  if(narrow.matches&&opts.fromCal)setPane("list");
  const li=listEl.querySelector(`[data-id="${CSS.escape(id||"")}"]`);if(li&&!opts.noscroll)li.scrollIntoView({block:"nearest",behavior:reduce.matches?"auto":"smooth"});
}
function listItems(){const td=todayIso();let l=visibleTrips().filter(t=>scope==="all"||(scope==="upcoming"?(t.end||t.start)>=td:(t.end||t.start)<td));return scope==="past"?sorted(l).reverse():sorted(l)}
function renderList(){
  const l=listItems();
  $$("#tpScope button").forEach(b=>{const on=b.dataset.s===scope;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});
  $("#tpListCount").textContent=`${l.length} plan${l.length===1?"":"s"}`;
  if(!l.length){listEl.innerHTML=`<li class="tp-empty"><p>${trips.length?"No plans match this filter.":"No camping or hiking plans yet."}</p><div class="tp-emptyb"><button type="button" data-new="camp">⛺ Plan a camping trip</button><button type="button" data-new="hike">🥾 Plan a hike</button><button type="button" data-import>Import a booking confirmation</button></div></li>`;return}
  let h="",cur="";
  l.forEach(t=>{const m=parse(t.start).toLocaleDateString([],{month:"long",year:"numeric"});if(m!==cur){cur=m;h+=`<li class="tp-month">${esc(m)}</li>`}
    h+=`<li class="tpi${selected===t.id?" sel":""} ${t.type} st-${t.status}" data-id="${esc(t.id)}"><button type="button" class="tpi-main" data-sel="${esc(t.id)}" aria-expanded="${selected===t.id}">${rowSummary(t)}</button>${selected===t.id?editorHtml(t):""}</li>`});
  listEl.innerHTML=h;
}
function opts(map,sel){return Object.entries(map).map(([k,v])=>`<option value="${esc(k)}"${k===sel?" selected":""}>${esc(typeof v==="object"?v.label:v)}</option>`).join("")}
function editorHtml(t){
  const pk=[...A.parks.filter(p=>p.np63),...A.parks.filter(p=>!p.np63),...A.caParks];
  const groups=[...new Set(trips.map(x=>x.trip).filter(Boolean))];
  const prov=t.res.provider,link=bookingLinks(t);
  return `<form class="tped" data-form="${esc(t.id)}" autocomplete="off">
   <div class="g2"><label>Title<input name="title" value="${esc(t.title)}" placeholder="${t.type==="camp"?"e.g. Yosemite – Upper Pines":"e.g. Half Dome day hike"}"></label>
   <label>Type<select name="type">${opts(TYPES,t.type)}</select></label></div>
   <div class="g2"><label>Park / unit<input name="park" list="tpParks" value="${esc(parkName(t))}" placeholder="Start typing a park…"></label>
   <label>${t.type==="camp"?"Campground / site":"Trailhead / area"}<input name="place" value="${esc(t.place)}"></label></div>
   <div class="g3"><label>${t.type==="camp"?"Check-in":"Date"}<input type="date" name="start" value="${esc(t.start)}"></label>
   ${t.type==="camp"?`<label>Check-out<input type="date" name="end" value="${esc(t.end||t.start)}"></label>`:`<label>Start time<input type="time" name="startTime" value="${esc(t.startTime)}"></label>`}
   ${t.type==="camp"?`<label>Party size<input type="number" name="party" min="1" max="99" value="${esc(t.party)}"></label>`:`<label>End time<input type="time" name="endTime" value="${esc(t.endTime)}"></label>`}</div>
   <div class="g2"><label>Status<select name="status">${opts(STATUS,t.status)}</select></label>
   <label>Trip group<input name="trip" list="tpGroups" value="${esc(t.trip)}" placeholder="optional, e.g. Summer road trip"></label></div>
   ${t.type==="hike"?`<fieldset><legend>Hike details</legend><div class="g3"><label>Trail<input name="h_trail" value="${esc(t.hike.trail)}"></label><label>Miles<input type="number" step="0.1" name="h_miles" value="${esc(t.hike.miles)}"></label><label>Elevation gain (ft)<input type="number" name="h_gain" value="${esc(t.hike.gain)}"></label></div><label>Party size<input type="number" name="party" min="1" max="99" value="${esc(t.party)}"></label></fieldset>`:""}
   <fieldset><legend>Booking</legend><div class="g2"><label>Booked through<select name="r_provider">${opts(PROVIDERS,prov)}</select></label><label>Confirmation #<input name="r_confirmation" value="${esc(t.res.confirmation)}"></label></div>
   <div class="g3"><label>Site / loop<input name="r_site" value="${esc(t.res.site)}"></label><label>Facility ID<input name="r_facility" value="${esc(t.res.facility)}" placeholder="Recreation.gov ID"></label><label>Reservation link<input type="url" name="r_url" value="${esc(t.res.url)}" placeholder="https://"></label></div>
   <div class="links">${link.map(x=>`<a href="${esc(x.href)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a>`).join("")}<button type="button" data-conn>Booking sites…</button></div></fieldset>
   <label>Notes<textarea name="notes" rows="3" placeholder="Gear, permits, who's driving, reminders…">${esc(t.notes)}</textarea></label>
   <div class="acts"><button type="button" class="pri" data-done>Done</button>${t.parkId?`<button type="button" data-map>Show on map</button>`:""}<button type="button" data-dup>Duplicate</button><button type="button" class="danger" data-del>Delete</button></div>
   <datalist id="tpParks">${pk.map(p=>`<option value="${esc(A.disp(p))}">`).join("")}</datalist><datalist id="tpGroups">${groups.map(g=>`<option value="${esc(g)}">`).join("")}</datalist></form>`}
function bookingLinks(t){
  const q=encodeURIComponent(parkName(t)||t.place||"campground"),out=[];
  if(t.res.url)out.push({label:"Open reservation",href:t.res.url});
  if(t.res.facility)out.push({label:"Recreation.gov campground page",href:"https://www.recreation.gov/camping/campgrounds/"+encodeURIComponent(t.res.facility)});
  const p=t.res.provider;
  if(t.type==="camp"){
    if(!p||p==="recreation.gov")out.push({label:"Find campgrounds on Recreation.gov",href:"https://www.recreation.gov/search?q="+q});
    if(p==="reserveamerica")out.push({label:"Search ReserveAmerica",href:"https://www.reserveamerica.com/"});
    if(p==="reservecalifornia")out.push({label:"Open ReserveCalifornia",href:"https://www.reservecalifornia.com/"});
    if(p==="hipcamp")out.push({label:"Search Hipcamp",href:"https://www.hipcamp.com/en-US/search?q="+q});
  }else out.push({label:"Find trails on AllTrails",href:"https://www.alltrails.com/search?q="+encodeURIComponent((t.hike.trail||parkName(t)||t.place||"hike"))});
  return out}

// form edits: text fields update live; date/status/type changes re-sort
listEl.addEventListener("input",e=>{const f=e.target.closest("form[data-form]");if(!f)return;const t=trips.find(x=>x.id===f.dataset.form);if(!t)return;const n=e.target.name;if(n==="type")return;if(!apply(t,n,e.target.value))return;save();patchRow(t);renderCal();
  if(n==="start"||n==="end"){const ei=f.querySelector("[name=end]");if(ei&&ei.value!==t.end)ei.value=t.end}});
listEl.addEventListener("change",e=>{const f=e.target.closest("form[data-form]");if(!f)return;const t=trips.find(x=>x.id===f.dataset.form);if(!t)return;const n=e.target.name;
  if(!["type","start","end","status"].includes(n))return;               // text fields were already saved and patched on input
  if(n==="type"){t.type=e.target.value;if(t.type==="camp"&&t.end===t.start)t.end=iso(addDays(parse(t.start),2));if(t.type==="hike"){t.end=t.start}}
  const domOrder=[...listEl.querySelectorAll(".tpi")].map(x=>x.dataset.id).join();save();
  if(n==="type")renderList();
  else if(listItems().map(x=>x.id).join()!==domOrder)renderListKeepForm();                   // only rebuild the list when the order changed, so clicks on the editor are never lost
  else patchRow(t);
  renderCal();const li=listEl.querySelector(`[data-id="${CSS.escape(t.id)}"]`);li&&li.scrollIntoView({block:"nearest"})});
function renderListKeepForm(){
  const f=listEl.querySelector("form[data-form]");if(!f){renderList();return}
  renderList();const nf=listEl.querySelector(`form[data-form="${CSS.escape(f.dataset.form)}"]`);if(nf)nf.replaceWith(f)}
function apply(t,n,v){
  if(n==="park"){const p=[...A.parks,...A.caParks].find(x=>A.disp(x).toLowerCase()===v.trim().toLowerCase());t.parkId=p?p.id:"";return true}
  if(n.startsWith("r_")){t.res[n.slice(2)]=v;return true}
  if(n.startsWith("h_")){t.hike[n.slice(2)]=v;return true}
  if(n==="party"){t.party=Math.max(1,Math.min(99,+v||1));return true}
  if(n==="start"){if(!v)return false;const dur=Math.max(0,diff(t.start,t.end||t.start));t.start=v;t.end=iso(addDays(parse(v),dur));return true}   // moving the start keeps the length of the trip
  if(n==="end"){if(!v)return false;t.end=v<t.start?t.start:v;return true}
  if(["title","place","startTime","endTime","status","trip","notes"].includes(n)){t[n]=v;return true}
  return false}
function patchRow(t){const b=listEl.querySelector(`[data-id="${CSS.escape(t.id)}"] .tpi-main`);if(b)b.innerHTML=rowSummary(t)}
listEl.addEventListener("click",e=>{
  const n=e.target.closest("[data-new]");if(n){newPlan(n.dataset.new);return}
  if(e.target.closest("[data-import]")){openImport();return}
  const s=e.target.closest("[data-sel]");if(s){select(selected===s.dataset.sel?null:s.dataset.sel,{noscroll:false});return}
  const f=e.target.closest("form[data-form]");if(!f)return;const t=trips.find(x=>x.id===f.dataset.form);if(!t)return;
  if(e.target.closest("[data-done]")){select(null);return}
  if(e.target.closest("[data-map]")){A.focusOnMap(t.parkId);return}
  if(e.target.closest("[data-conn]")){openConn();return}
  if(e.target.closest("[data-dup]")){const c=JSON.parse(JSON.stringify(t));c.id=uid();c.title=(t.title||titleOf(t))+" (copy)";c.status="idea";trips.push(c);save();select(c.id);A.toast("Plan duplicated");return}
  if(e.target.closest("[data-del]")){const sn=trips.slice();trips=trips.filter(x=>x.id!==t.id);selected=null;save();renderList();renderCal();
    A.toast("Plan deleted","Undo",()=>{trips=sn;save();renderList();renderCal()})}
});
listEl.addEventListener("keydown",e=>{if(e.key==="Escape"&&e.target.closest("form[data-form]")){e.stopPropagation();select(null)}});

function newPlan(type,start){
  const t=blank(type,start||(view==="month"||view==="week"||view==="day"?iso(cursor):todayIso()));
  if(!start&&iso(cursor)<todayIso())t.start=t.end=todayIso();if(type==="camp")t.end=iso(addDays(parse(t.start),2));
  trips.push(t);save();scope="all";query=$("#tpQ").value="";if(narrow.matches)setPane("list");select(t.id);
  setTimeout(()=>{const i=listEl.querySelector('form[data-form] [name=title]');i&&i.focus()},50);return t}

// ---------- toolbar, views, search ----------
function go(d,v){cursor=d;cursor.setHours(12,0,0,0);if(v)view=v;A.store.set("tripView",view);renderCal()}
function step(dir){const d=new Date(cursor);if(view==="month")d.setMonth(d.getMonth()+dir,1);else d.setDate(d.getDate()+dir*(view==="week"?7:1));go(d)}
$("#tpToday").onclick=()=>go(new Date());$("#tpPrev").onclick=()=>step(-1);$("#tpNext").onclick=()=>step(1);
$$("#tpView button").forEach(b=>b.onclick=()=>go(cursor,b.dataset.v));
$$("#tpScope button").forEach(b=>b.onclick=()=>{scope=b.dataset.s;renderList()});
$$("#tpTypes input").forEach(i=>i.onchange=()=>{typeOn[i.dataset.t]=i.checked;renderList();renderCal()});
$("#tpGoto").onchange=e=>{if(e.target.value){go(parse(e.target.value),view==="month"?"month":view)}};
$("#tpNewCamp").onclick=()=>newPlan("camp");$("#tpNewHike").onclick=()=>newPlan("hike");
document.addEventListener("keydown",e=>{if(!$("#tab-trips").classList.contains("active")||e.target.closest("input,textarea,select,dialog"))return;
  if(e.key==="t"||e.key==="T")go(new Date());else if(e.key==="ArrowLeft"&&e.altKey)step(-1);else if(e.key==="ArrowRight"&&e.altKey)step(1);
  else if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&["d","w","m"].includes(e.key.toLowerCase())){go(cursor,{d:"day",w:"week",m:"month"}[e.key.toLowerCase()])}});
const sug=$("#tpSug");
function renderSug(){
  const q=$("#tpQ").value.trim();query=q;let h="";const dq=parseDateQuery(q);
  if(dq)h+=`<li><button type="button" data-jump="${iso(dq.date)}" data-v="${dq.view}">📅 Go to <b>${esc(dq.label)}</b> <small>${dq.view} view</small></button></li>`;
  if(q){const l=sorted(visibleTrips()).slice(0,8);h+=l.map(t=>`<li><button type="button" data-hit="${esc(t.id)}">${TYPES[t.type].icon} <b>${esc(titleOf(t))}</b> <small>${esc(fmtRange(t.start,t.end))}${parkName(t)?" · "+esc(parkName(t)):""}</small></button></li>`).join("");
    if(!l.length&&!dq)h+=`<li class="none">No plans match "${esc(q)}". Try a date like "June 2027", "jun 14" or "next week".</li>`}
  sug.innerHTML=h;sug.hidden=!h;$("#tpQClear").hidden=!q;renderList();renderCal()}
$("#tpQ").addEventListener("input",renderSug);
$("#tpQ").addEventListener("keydown",e=>{if(e.key==="Enter"){const dq=parseDateQuery($("#tpQ").value);if(dq){e.preventDefault();go(dq.date,dq.view);sug.hidden=true}else{const f=sug.querySelector("[data-hit]");if(f){e.preventDefault();f.click()}}}else if(e.key==="Escape"){sug.hidden=true}});
$("#tpQClear").onclick=()=>{$("#tpQ").value="";renderSug();$("#tpQ").focus()};
sug.addEventListener("click",e=>{const j=e.target.closest("[data-jump]");if(j){go(parse(j.dataset.jump),j.dataset.v);sug.hidden=true;return}const h=e.target.closest("[data-hit]");if(h){sug.hidden=true;scope="all";const t=trips.find(x=>x.id===h.dataset.hit);cursor=parse(t.start);select(t.id)}});
document.addEventListener("click",e=>{if(!e.target.closest(".tp-search"))sug.hidden=true;if(!e.target.closest("#tpPop")&&!e.target.closest("[data-day]"))pop.hidden=true});

// calendar interactions
const pop=$("#tpPop");
cal.addEventListener("click",e=>{
  const b=e.target.closest("[data-ev]");if(b){select(b.dataset.ev,{fromCal:true,goto:false});return}
  const d=e.target.closest("[data-day]");if(!d)return;const day=d.dataset.day;
  if(d.classList.contains("th")){go(parse(day),"day");return}
  cursor=parse(day);$$("#tpCal .md").forEach(x=>x.classList.toggle("cur",x.dataset.day===day));
  const r=d.getBoundingClientRect();pop.hidden=false;pop.dataset.day=day;pop.innerHTML=`<b>${esc(parse(day).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}))}</b><button type="button" data-padd="camp">⛺ Camping plan</button><button type="button" data-padd="hike">🥾 Hike plan</button><button type="button" data-pday>Open day</button>`;
  const x=Math.min(r.left,innerWidth-230),y=Math.min(r.bottom+4,innerHeight-170);pop.style.left=Math.max(8,x)+"px";pop.style.top=Math.max(8,y)+"px";pop.querySelector("button").focus()});
cal.addEventListener("dblclick",e=>{const d=e.target.closest(".md");if(d)go(parse(d.dataset.day),"day")});
cal.addEventListener("keydown",e=>{const d=e.target.closest(".md");if(!d)return;const k={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(!k)return;e.preventDefault();
  const nd=addDays(parse(d.dataset.day),k);cursor=nd;if(nd.getMonth()!==parse(d.dataset.day).getMonth()||k)renderCal();const nb=cal.querySelector(`[data-day="${iso(nd)}"]`);nb&&nb.focus()});
pop.addEventListener("click",e=>{const a=e.target.closest("[data-padd]");if(a){pop.hidden=true;newPlan(a.dataset.padd,pop.dataset.day);return}if(e.target.closest("[data-pday]")){pop.hidden=true;go(parse(pop.dataset.day),"day")}});
pop.addEventListener("keydown",e=>{if(e.key==="Escape"){pop.hidden=true}});

// mobile: Plans | Calendar
function setPane(p){pane=p;$(".tp").dataset.pane=p;$$("#tpPane button").forEach(b=>{const on=b.dataset.p===p;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})}
$$("#tpPane button").forEach(b=>b.onclick=()=>setPane(b.dataset.p));

// ---------- export (.ics) ----------
const ics=()=>{const esc2=s=>String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");const d8=s=>s.replace(/-/g,""),stamp=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Parks and Camping//Trip Planner//EN","CALSCALE:GREGORIAN"];
  sorted(trips).forEach(t=>{const e=ev(t);L.push("BEGIN:VEVENT","UID:"+t.id+"@parks-and-camping","DTSTAMP:"+stamp);
    if(isTimed(e)){L.push("DTSTART:"+d8(e.s)+"T"+t.startTime.replace(":","")+"00","DTEND:"+d8(e.s)+"T"+(t.endTime||t.startTime).replace(":","")+"00")}
    else L.push("DTSTART;VALUE=DATE:"+d8(e.s),"DTEND;VALUE=DATE:"+d8(iso(addDays(parse(e.e),1))));
    L.push("SUMMARY:"+esc2(TYPES[t.type].icon+" "+titleOf(t)+(t.status!=="booked"&&t.status!=="done"?" ("+STATUS[t.status]+")":"")));
    const loc=[t.place,parkName(t)].filter(Boolean).join(", ");if(loc)L.push("LOCATION:"+esc2(loc));
    const desc=[t.res.confirmation&&"Confirmation: "+t.res.confirmation,t.res.provider&&"Booked through: "+(PROVIDERS[t.res.provider]||t.res.provider),t.res.site&&"Site: "+t.res.site,t.res.url,t.notes].filter(Boolean).join("\n");if(desc)L.push("DESCRIPTION:"+esc2(desc));
    L.push("STATUS:"+(t.status==="cancelled"?"CANCELLED":t.status==="booked"||t.status==="done"?"CONFIRMED":"TENTATIVE"),"END:VEVENT")});
  L.push("END:VCALENDAR");return L.join("\r\n")};
$("#tpIcs").onclick=()=>{if(!trips.length){A.toast("Add a plan first, then export it");return}const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics()],{type:"text/calendar"}));a.download="camping-hiking-plans.ics";a.click();A.toast("Calendar file saved. Import it into Google Calendar, Apple Calendar or Outlook.")};

// ---------- import from a booking confirmation (paste an email or a link) ----------
const imp=$("#tpImport");
function openImport(){$("#tpImportText").value="";$("#tpImportOut").hidden=true;imp.showModal();setTimeout(()=>$("#tpImportText").focus(),30)}
function parseConfirmation(txt){
  const out={start:"",end:"",confirmation:"",url:"",place:"",provider:""};
  const mURL=txt.match(/https?:\/\/[^\s"'<>)]+/);if(mURL)out.url=mURL[0];
  const lower=txt.toLowerCase();out.provider=lower.includes("recreation.gov")?"recreation.gov":lower.includes("reserveamerica")?"reserveamerica":lower.includes("reservecalifornia")?"reservecalifornia":lower.includes("hipcamp")?"hipcamp":"";
  const cands=[...txt.matchAll(/(?:confirmation|reservation|order)\s*(?:number|no\.?|#|id)?\s*[:#]?\s*([A-Z0-9-]{6,})/gi)].map(m=>m[1]).filter(x=>/\d/.test(x));const mC=cands[0]||(txt.match(/\b(\d{9,12})\b/)||[])[0];if(mC)out.confirmation=mC;
  const dates=[];const push=d=>{if(d&&!isNaN(d))dates.push(d)};
  [...txt.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)].forEach(m=>push(new Date(+m[1],m[2]-1,+m[3],12)));
  [...txt.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)].forEach(m=>push(new Date(+m[3],m[1]-1,+m[2],12)));
  [...txt.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi)].forEach(m=>push(new Date(+m[3],MONTHS.findIndex(x=>x.startsWith(m[1].toLowerCase())),+m[2],12)));
  const ci=txt.match(/check[- ]?in[^\n]*/i),co=txt.match(/check[- ]?out[^\n]*/i);
  const one=s=>{if(!s)return null;const p=parseConfirmationDates(s[0]);return p};
  const a=one(ci),b=one(co);
  if(a)out.start=iso(a);if(b)out.end=iso(b);
  if(!out.start&&dates.length){dates.sort((x,y)=>x-y);out.start=iso(dates[0]);out.end=iso(dates[dates.length-1])}
  const mP=txt.match(/(?:campground|facility|park|location)\s*[:\-]\s*([^\n]{3,80})/i);if(mP)out.place=mP[1].trim();
  return out}
function parseConfirmationDates(s){let m=s.match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],m[2]-1,+m[3],12);
  m=s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return new Date(+m[3],m[1]-1,+m[2],12);
  m=s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);if(m)return new Date(+m[3],MONTHS.findIndex(x=>x.startsWith(m[1].toLowerCase())),+m[2],12);return null}
let parsed=null;
$("#tpImportRead").onclick=()=>{const p=parseConfirmation($("#tpImportText").value);parsed=p;const rows=[["Check-in",p.start],["Check-out",p.end],["Confirmation #",p.confirmation],["Booked through",PROVIDERS[p.provider]||""],["Campground / place",p.place],["Link",p.url]].filter(r=>r[1]);
  $("#tpImportOut").hidden=false;$("#tpImportFound").innerHTML=rows.length?rows.map(r=>`<li><b>${esc(r[0])}</b> ${esc(r[1])}</li>`).join(""):"<li>Nothing recognised. You can still create an empty plan and fill it in.</li>";$("#tpImportMake").disabled=false};
$("#tpImportMake").onclick=()=>{const p=parsed||parseConfirmation("");const t=blank("camp",p.start||todayIso());if(p.end&&p.end>=t.start)t.end=p.end;t.place=p.place;t.res={...t.res,provider:p.provider,confirmation:p.confirmation,url:p.url};t.status=p.confirmation?"booked":"idea";
  trips.push(t);save();imp.close();scope="all";select(t.id);A.toast("Plan created from your confirmation. Check the details.")};
$("#tpImportCancel").onclick=()=>imp.close();

// ---------- connections to booking sites ----------
const conn=$("#tpConn");
const SITES=[
 {id:"recreation.gov",name:"Recreation.gov",what:"Campground search, availability and your reservations (federal parks and forests).",open:"https://www.recreation.gov/",api:"RIDB API key",tier:"Links now · automatic sync planned"},
 {id:"reserveamerica",name:"ReserveAmerica",what:"State park and private campground reservations.",open:"https://www.reserveamerica.com/",tier:"Links now · automatic sync planned"},
 {id:"reservecalifornia",name:"ReserveCalifornia",what:"California State Parks campsites (the state parks on your map).",open:"https://www.reservecalifornia.com/",tier:"Links now · automatic sync planned"},
 {id:"hipcamp",name:"Hipcamp",what:"Private land, glamping and unique campsites.",open:"https://www.hipcamp.com/",tier:"Links now · automatic sync planned"},
 {id:"alltrails",name:"AllTrails",what:"Trail details, distance and elevation for your hikes.",open:"https://www.alltrails.com/",tier:"Links now · automatic sync planned"},
 {id:"nps",name:"NPS.gov",what:"Park alerts, closures and permits for your dates.",open:"https://www.nps.gov/findapark/index.htm",tier:"Links now · alerts planned"},
 {id:"gcal",name:"Google / Apple / Outlook Calendar",what:"Put your plans on your phone calendar.",open:"",tier:"Works now: export a calendar file",ics:true}
];
const integ=()=>A.store.get("integrations",{})||{};
function drawConn(){const s=integ();$("#tpConnList").innerHTML=SITES.map(x=>`<li class="cn"><div><b>${esc(x.name)}</b><span>${esc(x.what)}</span><em class="${x.ics?"ok":""}">${esc(x.tier)}</em></div><div class="cn-a">${x.open?`<a href="${esc(x.open)}" target="_blank" rel="noopener">Open ↗</a>`:`<button type="button" data-cics>Export .ics</button>`}
   ${x.api?`<label>${esc(x.api)} <input type="password" data-key="${x.id}" value="${esc(s[x.id]&&s[x.id].key||"")}" placeholder="optional, saved only in this browser" autocomplete="off"></label>`:""}</div></li>`).join("")}
$("#tpConnList").addEventListener("input",e=>{const k=e.target.dataset.key;if(!k)return;const s=integ();s[k]={...(s[k]||{}),key:e.target.value};A.store.set("integrations",s)});
$("#tpConnList").addEventListener("click",e=>{if(e.target.closest("[data-cics]")){conn.close();$("#tpIcs").click()}});
function openConn(){drawConn();conn.showModal()}
$("#tpConnBtn").onclick=openConn;$("#tpImportBtn").onclick=openImport;
$(".tp-more").addEventListener("click",e=>{if(e.target.closest("button"))setTimeout(()=>$(".tp-more").removeAttribute("open"),0)});
document.addEventListener("click",e=>{const m=$(".tp-more");if(m.open&&!m.contains(e.target))m.removeAttribute("open")});

// Adapter registry: the place future automatic links plug in (see docs/INTEGRATIONS.md)
const notYet=name=>()=>Promise.reject(new Error(name+" is not connected yet"));
const adapters=new Map();
window.TripIntegrations={
  adapters,
  register(a){adapters.set(a.id,{status:"planned",searchCampgrounds:notYet(a.id),getAvailability:notYet(a.id),listReservations:notYet(a.id),...a})},
  get:id=>adapters.get(id),
  list:()=>[...adapters.values()]
};
SITES.filter(s=>!s.ics).forEach(s=>TripIntegrations.register({id:s.id,name:s.name,status:"planned",openUrl:s.open}));

// ---------- public API for the dashboard widget ----------
window.Trips={
  upcoming(n=3){const td=todayIso();return sorted(trips.filter(t=>(t.end||t.start)>=td&&t.status!=="cancelled"&&t.status!=="done")).slice(0,n)},
  all:()=>trips.slice(),
  count:()=>trips.length,
  subscribe:f=>subs.push(f),
  open(id){A.showTab("trips");if(id){scope="all";const t=trips.find(x=>x.id===id);if(t){cursor=parse(t.start);select(id)}}},
  create(type){A.showTab("trips");return newPlan(type)},
  daysUntil:t=>diff(todayIso(),t.start),
  label:{fmtRange,TYPES,STATUS,parkName,titleOf,nights}
};

// ---------- lifecycle ----------
let timer=0;
function show(){trips=load();renderList();renderCal();setPane(pane);clearInterval(timer);timer=setInterval(()=>{if(view!=="month"&&$("#tab-trips").classList.contains("active"))renderCal()},60000)}
window.TripsApp={show,hide(){clearInterval(timer);pop.hidden=true}};
narrow.addEventListener("change",()=>{if($("#tab-trips").classList.contains("active"))renderCal()});
window.addEventListener("resize",()=>{});
if(document.body.classList.contains("trips"))show();
})();
