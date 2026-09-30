(function(){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
             set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

const STATE_NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",AS:"American Samoa",PR:"Puerto Rico",VI:"U.S. Virgin Islands",GU:"Guam",MP:"Northern Mariana Islands"};
const parks=window.PARKS_RAW.map(r=>({id:r[5],name:r[0],title:r[0],d:r[1],states:r[2].map(s=>STATE_NAMES[s]||s),code:r[5],lat:r[3],lng:r[4],url:r[6],approx:!!r[7],
  blurb:window.PARK_BLURBS[r[0]]||""}));
const ABBR_TO_NAME=STATE_NAMES;
function splitCity(str,fallbackStates){
  const segs=String(str||"").split(/\s*\/\s*/).filter(Boolean).map(s=>{const m=s.match(/^(.*?),\s*([A-Z]{2})$/);return m?{c:m[1],s:ABBR_TO_NAME[m[2]]||m[2]}:{c:s,s:""}});
  for(let i=segs.length-2;i>=0;i--)if(!segs[i].s)segs[i].s=segs[i+1].s;   // "Ventura / Santa Barbara, CA"
  const sts=[...new Set(segs.map(x=>x.s).filter(Boolean))];
  return {city:segs.map(x=>x.c).join(" / "),state:(sts.length?sts:fallbackStates.slice(0,2)).join(" / ")};
}
const NP_DESIG=new Set(["National Park","National Park and Preserve","National Parks","National and State Parks"]);
parks.forEach(p=>{p.np63=NP_DESIG.has(p.d)&&p.code!=="WOTR"});   // Wolf Trap is a "National Park for the Performing Arts", not one of the 63
parks.forEach(p=>{const dt=(window.NAT_DETAILS||{})[p.code]||["",""];p.kind="nps";const cs=splitCity(dt[0],p.states);p.city=cs.city;p.state=cs.state;p.hl=dt[1]});
const caParks=(window.CA_PARKS||[]).map(r=>({id:"CA:"+r[0]+"|"+r[1],name:r[0],title:r[0],
  d:r[1],states:["California"],code:"",lat:r[3],lng:r[4],url:"",approx:false,blurb:"",kind:"ca",city:r[2],state:"California",hl:r[5]}));
caParks.forEach(p=>{p.title=p.name.endsWith(p.d.replace("State ","").split(" ")[0])?p.name:p.name+" "+p.d});
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const byId=new Map([...parks,...caParks].map(p=>[p.id,p]));
const DESIG=[...new Set([...parks,...caParks].map(p=>p.d))].sort();
// user edits (list format tab) persisted locally
let edits=store.get("edits",{});
const saveEdits=()=>store.set("edits",edits);
const fld=(p,k)=>(edits[p.id]&&edits[p.id][k]!==undefined)?edits[p.id][k]:(k==="year"?"":k==="name"?p.name:k==="d"?p.d:p[k]);
let showCA=store.get("showCA",false);

let checked=new Set(store.get("checked",[]));
const save=()=>store.set("checked",[...checked]);

// ---------- filters (multi-select dropdowns with search) ----------
const filt={q:"",st:new Set(),d:new Set(),v:new Set()};
const msInstances=[];
function multiSelect(root,label,options,set){
  root.classList.add("ms");
  root.innerHTML=`<button type="button" class="ms-btn"><span class="ms-label"></span><span class="ms-badge" hidden></span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
  <div class="ms-panel" hidden><input type="search" class="ms-search" placeholder="Search ${label.toLowerCase()}…" aria-label="Search ${label}">
  <div class="ms-actions"><button type="button" data-a="all">Select shown</button><button type="button" data-a="none">Clear</button></div>
  <ul class="ms-list"></ul></div>`;
  const btn=root.querySelector(".ms-btn"),panel=root.querySelector(".ms-panel"),search=root.querySelector(".ms-search"),list=root.querySelector(".ms-list"),badge=root.querySelector(".ms-badge");
  const lab=root.querySelector(".ms-label");
  const shown=()=>options.filter(o=>o.text.toLowerCase().includes(search.value.toLowerCase()));
  function draw(){
    list.innerHTML=shown().map(o=>`<li><label><input type="checkbox" value="${o.value.replace(/"/g,"&quot;")}" ${set.has(o.value)?"checked":""}><span>${o.text}</span>${o.n!=null?`<em>${o.n}</em>`:""}</label></li>`).join("")||"<li class='ms-empty'>No matches</li>";
    lab.textContent=label;badge.hidden=!set.size;badge.textContent=set.size;
  }
  btn.onclick=e=>{e.stopPropagation();const open=panel.hidden;msInstances.forEach(m=>m.close());if(open){panel.hidden=false;root.classList.add("open");search.value="";draw();search.focus()}};
  panel.onclick=e=>e.stopPropagation();
  list.onchange=e=>{const c=e.target;c.checked?set.add(c.value):set.delete(c.value);draw();refresh()};
  search.oninput=draw;
  panel.querySelector(".ms-actions").onclick=e=>{const a=e.target.dataset.a;if(!a)return;
    if(a==="all")shown().forEach(o=>set.add(o.value));else set.clear();draw();refresh()};
  msInstances.push({close(){panel.hidden=true;root.classList.remove("open")},draw});
  draw();
}
document.addEventListener("click",()=>msInstances.forEach(m=>m.close()));
document.addEventListener("keydown",e=>{if(e.key==="Escape")msInstances.forEach(m=>m.close())});
const stateList=[...new Set(parks.flatMap(p=>p.states))].sort((a,b)=>a.localeCompare(b));
multiSelect($("#fState"),"States / territories",stateList.map(s=>({value:s,text:s,n:parks.filter(p=>p.states.includes(s)).length})),filt.st);
multiSelect($("#fDesig"),"Designation",[{value:"__NP63",text:"★ National Parks — the 63 (Sequoia & Kings Canyon count as 2)",n:parks.filter(p=>p.np63).length}].concat(DESIG.map(d=>({value:d,text:d,n:[...parks,...caParks].filter(p=>p.d===d).length}))),filt.d);
multiSelect($("#fVisited"),"Status",[{value:"1",text:"Checked"},{value:"0",text:"Unchecked"}],filt.v);
function visible(src=parks){
  const q=filt.q.toLowerCase().trim();
  return src.filter(p=>(!q||(fld(p,"name")+" "+fld(p,"d")+" "+fld(p,"city")+" "+fld(p,"state")+" "+p.code+" "+p.states.join(" ")).toLowerCase().includes(q))
    &&(!filt.st.size||p.states.some(s=>filt.st.has(s)))&&(!filt.d.size||filt.d.has(p.d)||(filt.d.has("__NP63")&&p.np63))
    &&(!filt.v.size||filt.v.has(checked.has(p.id)?"1":"0")));
}
$("#q").addEventListener("input",e=>{filt.q=e.target.value;refresh()});
$("#clear").onclick=()=>{$("#q").value="";filt.q="";filt.st.clear();filt.d.clear();filt.v.clear();msInstances.forEach(m=>m.draw());refresh()};

// ---------- tabs ----------
let map;
function showTab(t){
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
  $$(".panel").forEach(p=>p.classList.toggle("active",p.id==="tab-"+t));
  $("#filters").style.display=t==="about"?"none":"";
  if(t==="map"){initMap();setTimeout(()=>map.invalidateSize(),50)}
  store.set("tab",t);
}
$$(".tab").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

// ---------- theme ----------
function setTheme(t){const r=document.documentElement;t==="light"||t==="dark"?r.dataset.theme=t:delete r.dataset.theme;
  store.set("theme",t);$$("#theme button").forEach(b=>b.classList.toggle("on",b.dataset.t===t))}
$$("#theme button").forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
setTheme(store.get("theme","system"));

// ---------- dot size (site wide) ----------
let dotScale=store.get("dot",1);
function setDot(v){dotScale=+v;document.documentElement.style.setProperty("--dot",v);store.set("dot",v);
  $$(".dotsize").forEach(i=>i.value=v);if(map)restyle();}
$$(".dotsize").forEach(i=>i.oninput=()=>setDot(i.value));

// ---------- grid ----------
let cols=store.get("cols",4);
function setCols(c){cols=c;$("#grid").style.setProperty("--cols",c);store.set("cols",c);
  $$("#cols button").forEach(b=>b.classList.toggle("on",+b.dataset.c===c));}
$$("#cols button").forEach(b=>b.onclick=()=>setCols(+b.dataset.c));
const hue=p=>{let h=0;for(const c of p.name)h=(h*31+c.charCodeAt(0))%45;return 128+h}; // greens to blues
function toggle(id){checked.has(id)?checked.delete(id):checked.add(id);save();refresh()}
function renderGrid(list){
  $("#grid").innerHTML=list.map(p=>`<article class="card" data-id="${p.id}">
    <div class="banner" style="--h1:hsl(${hue(p)},48%,14%);--h2:hsl(${hue(p)+10},40%,30%)">
      <span class="dot ${checked.has(p.id)?"on":"off"}" role="checkbox" aria-checked="${checked.has(p.id)}" tabindex="0" title="Check / uncheck"></span></div>
    <div class="body"><h3><a href="${p.url}" target="_blank" rel="noopener">${p.title}</a></h3>
    <div class="meta">${p.d} · ${p.states.slice(0,4).join(", ")}${p.states.length>4?" +"+(p.states.length-4):""}</div>
    ${fld(p,"city")?`<div class="meta">Near ${esc(fld(p,"city"))}${fld(p,"state")?", "+esc(fld(p,"state")):""}</div>`:""}${p.blurb?`<p>${p.blurb}</p>`:""}</div></article>`).join("");
}
$("#grid").onclick=e=>{const d=e.target.closest(".dot");if(d)toggle(d.closest(".card").dataset.id)};
$("#grid").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){const d=e.target.closest(".dot");if(d){e.preventDefault();toggle(d.closest(".card").dataset.id)}}};

// ---------- visited list ----------
function renderVisited(){
  const list=[...parks,...caParks].filter(p=>checked.has(p.id));
  $("#vcount").textContent=`${list.length} checked`;
  $("#vlist").innerHTML=list.map(p=>`<li data-id="${p.id}"><span class="dot on" style="cursor:pointer"></span>${p.title}</li>`).join("")||"<li>Nothing checked yet.</li>";
}
$("#vlist").onclick=e=>{const li=e.target.closest("li[data-id]");if(li&&e.target.closest(".dot"))toggle(li.dataset.id)};

// ---------- map ----------
const layers={
 "Esri Topographic":()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles © Esri, USGS, NOAA, HERE, Garmin, OpenStreetMap contributors"}),
 "USGS Topo":()=>L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,attribution:"Map data: USGS The National Map"}),
 "USGS Shaded Relief":()=>L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,attribution:"Map data: USGS The National Map"}),
 "Esri Shaded Relief":()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",{maxZoom:13,attribution:"Tiles © Esri"}),
 "OpenTopoMap":()=>L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:"© OpenTopoMap (CC-BY-SA), OpenStreetMap contributors, SRTM"})
};
const views={lower48:[[24.5,-125],[49.5,-66.5]],ak:[[51,-170],[71.5,-129]],hi:[[18.8,-160.5],[22.4,-154.7]],terr:[[-15,-171],[19,-64]]};
let markers=new Map(),group;
const radius=()=>Math.max(3,(2+map.getZoom()*0.9)*dotScale);
const style=p=>({...(checked.has(p.id)?{fillColor:"#d32f2f",color:"#7f1414",fillOpacity:.95,weight:1.5}
                                :{fillColor:"#9aa0a6",color:"#5f6368",fillOpacity:.85,weight:1.2}),dashArray:p.approx?"3 2":null,...(p.kind==="ca"?{color:checked.has(p.id)?"#7f1414":"#1b6d73",weight:2.5}:{})});
function initMap(){
  if(map)return;
  map=L.map("map",{minZoom:2,worldCopyJump:true,zoomSnap:.5});
  const base=Object.fromEntries(Object.entries(layers).map(([k,f])=>[k,f()]));
  base[store.get("base","Esri Topographic")]?.addTo(map)||base["Esri Topographic"].addTo(map);
  L.control.layers(base,null,{position:"topright"}).addTo(map);
  map.on("baselayerchange",e=>store.set("base",e.name));
  group=L.layerGroup().addTo(map);
  [...parks,...caParks].forEach(p=>{
    const m=L.circleMarker([p.lat,p.lng],{radius:6,...style(p)});
    m.bindTooltip(p.title+(p.kind==="ca"?" (CA State Parks)":"")+(p.approx?" (approx. location)":""),{className:"lbl"});
    m.on("click",()=>toggle(p.id));   // click a dot to check / uncheck
    markers.set(p.id,m);
  });
  const RoseCtl=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","rose");d.id="roseEl";
    d.innerHTML='<svg viewBox="-50 -50 100 100"><circle r="47" fill="none" stroke="#22302a" stroke-width="1"/><path d="M0-42L7 0 0 42-7 0Z" fill="#fff" stroke="#22302a"/><path d="M-42 0L0-7 42 0 0 7Z" fill="#fff" stroke="#22302a"/><path d="M0-42L7 0-7 0Z" fill="#d32f2f"/><path d="M0 42L7 0-7 0Z" fill="#22302a"/><path d="M-30-30L0-4 30-30 4 0 30 30 0 4-30 30-4 0Z" fill="#9aa0a6" opacity=".55"/><text y="-44" text-anchor="middle" font-size="14" font-weight="700" fill="#22302a" transform="translate(0,-2)">N</text><text y="52" text-anchor="middle" font-size="10" fill="#22302a">S</text><text x="-50" y="4" font-size="10" fill="#22302a">W</text><text x="42" y="4" font-size="10" fill="#22302a">E</text></svg>';return d}});
  new RoseCtl({position:"bottomleft"}).addTo(map);
  map.on("zoomend",restyle);
  map.fitBounds(views.lower48);
  applyLabels();$("#rose").onchange({target:$("#rose")});
  refresh();
}
function restyle(){markers.forEach((m,id)=>{const p=byId.get(id);m.setStyle(style(p));m.setRadius(radius())})}
$$("#jump button").forEach(b=>b.onclick=()=>{initMap();map.fitBounds(views[b.dataset.v])});
const mapList=()=>visible().concat(showCA?visible(caParks):[]);
function renderMap(list){
  if(!map)return;
  group.clearLayers();
  list.forEach(p=>group.addLayer(markers.get(p.id)));
  restyle();
  const keep=list.filter(p=>checked.has(p.id));   // draw checked on top
  keep.forEach(p=>markers.get(p.id).bringToFront());
}

// map size / labels / compass
function setMH(v){document.documentElement.style.setProperty("--mh",v);store.set("mh",v);
  $$("#msize button").forEach(b=>b.classList.toggle("on",b.dataset.h==v));if(map)map.invalidateSize()}
$$("#msize button").forEach(b=>b.onclick=()=>setMH(b.dataset.h));
$("#labels").onchange=e=>{store.set("labels",e.target.checked);applyLabels()};
function applyLabels(){if(!map)return;const on=$("#labels").checked;
  markers.forEach((m,id)=>{const t=byId.get(id).title;m.unbindTooltip();
    m.bindTooltip(t,{className:"lbl",permanent:on,direction:"right",offset:[6,0]});});renderMap(mapList());}
$("#showCA").onchange=e=>{showCA=e.target.checked;store.set("showCA",showCA);refresh()};
$("#rose").onchange=e=>{store.set("rose",e.target.checked);$("#roseEl")&&($("#roseEl").style.display=e.target.checked?"":"none")};

// ---------- list format (Google-Sheets-style grid) ----------
const COLS=[{k:"name",t:"Name"},{k:"d",t:"Designation"},{k:"city",t:"Nearest City / Community"},{k:"state",t:"State"},{k:"visited",t:"Visited"},{k:"year",t:"Year Last Visited"},{k:"hl",t:"Highlights"}];
let dataset=store.get("dataset","nps"), sortKey="name", sortDir=1;
let customRows=store.get("customRows",[]);
const saveCustom=()=>store.set("customRows",customRows);
const mkCustom=r=>({id:r.id,name:"",title:"",d:"",states:[],code:"",kind:"custom",city:"",state:"",hl:"",lat:null,lng:null,url:"",approx:false,blurb:""});
customRows.forEach(r=>byId.set(r.id,mkCustom(r)));
const cellVal=(p,k)=>k==="visited"?(checked.has(p.id)?"TRUE":"FALSE"):String(fld(p,k)??"");
const baseSrc=()=>(dataset==="ca"?caParks:parks).concat(customRows.filter(r=>r.ds===dataset).map(r=>byId.get(r.id)));
let colFilt={}, rows=[], sel={r0:0,c0:0,r1:0,c1:0}, act={r:0,c:0}, editing=null, hist=[], redoS=[], dragging=false;
const VIS=COLS.findIndex(c=>c.k==="visited");
const wrap=$("#tablewrap"), tbody=$("#lbody");

function computeRows(){
  let l=visible(baseSrc());
  for(const k in colFilt){const f=colFilt[k];if(!f)continue;const t=f.text.trim().toLowerCase();
    l=l.filter(p=>{const v=cellVal(p,k);return (!f.vals||f.vals.has(v))&&(!t||v.toLowerCase().includes(t))})}
  const g=p=>sortKey==="year"?(+cellVal(p,"year")||0):cellVal(p,sortKey).toLowerCase();
  return l.sort((x,y)=>{const A=g(x),B=g(y);return (A>B?1:A<B?-1:0)*sortDir});
}
function renderList(keep){
  rows=computeRows();
  const total=baseSrc().length;
  $("#lcount").textContent=`${rows.length} of ${total} rows · ${dataset==="ca"?"California State Parks":"National Park Service"}`;
  $$("#ltable th[data-k]").forEach(th=>{const k=th.dataset.k,f=colFilt[k];
    th.querySelector(".fbtn").classList.toggle("on",!!f&&(!!f.vals||!!f.text));
    th.dataset.dir=k===sortKey?(sortDir>0?"▲":"▼"):""});
  tbody.innerHTML=rows.map((p,r)=>`<tr data-r="${r}"><td class="rn">${r+1}</td>`+COLS.map((c,ci)=>{
    const v=cellVal(p,c.k);
    return `<td data-c="${ci}" class="${ci===0?"nm ":""}${c.k==="visited"||c.k==="year"?"c":""}">`+(c.k==="visited"?`<input type="checkbox" tabindex="-1" ${v==="TRUE"?"checked":""} aria-label="Visited">`:esc(v))+"</td>"}).join("")+"</tr>").join("");
  if(!keep){sel={r0:0,c0:0,r1:0,c1:0};act={r:0,c:0}}
  clampSel();applySel();
}
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function clampSel(){const R=rows.length-1;act.r=clamp(act.r,0,Math.max(R,0));sel.r0=clamp(sel.r0,0,Math.max(R,0));sel.r1=clamp(sel.r1,0,Math.max(R,0))}
const cell=(r,c)=>tbody.rows[r]?.cells[c+1];
function applySel(){
  tbody.querySelectorAll(".sel,.act").forEach(t=>t.classList.remove("sel","act"));
  const r0=Math.min(sel.r0,sel.r1),r1=Math.max(sel.r0,sel.r1),c0=Math.min(sel.c0,sel.c1),c1=Math.max(sel.c0,sel.c1);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)cell(r,c)?.classList.add("sel");
  cell(act.r,act.c)?.classList.add("act");
  $$("#lbody .rn").forEach((t,r)=>t.classList.toggle("on",r>=r0&&r<=r1));
  $("#delRows").disabled=!(rows.slice(r0,r1+1).some(p=>p.kind==="custom"));
  $("#undo").disabled=!hist.length;$("#redo").disabled=!redoS.length;
}
const rect=()=>({r0:Math.min(sel.r0,sel.r1),r1:Math.max(sel.r0,sel.r1),c0:Math.min(sel.c0,sel.c1),c1:Math.max(sel.c0,sel.c1)});
function scrollTo(){cell(act.r,act.c)?.scrollIntoView({block:"nearest",inline:"nearest"})}

// ----- writing values (with undo history)
function put(p,k,val){
  if(k==="visited"){/^(true|yes|1|x|✓)$/i.test(String(val).trim())?checked.add(p.id):checked.delete(p.id);save();return}
  const orig=k==="name"?p.name:k==="d"?p.d:(p[k]??"");const e=edits[p.id]=edits[p.id]||{};
  if(k!=="year"&&String(val)===String(orig))delete e[k];else e[k]=val;
}
function setCell(r,c,val,batch){
  const p=rows[r];if(!p)return;const k=COLS[c].k;let v=String(val).replace(/\s+/g," ").trim();
  if(k==="visited")v=/^(true|yes|1|x|✓)$/i.test(v)?"TRUE":"FALSE";
  if(k==="year"&&v&&!/^\d{4}$/.test(v))return;
  const old=cellVal(p,k);if(old===v)return;
  put(p,k,v);batch.push({id:p.id,k,old,val:v});
  const td=cell(r,c);if(td){if(k==="visited")td.querySelector("input").checked=v==="TRUE";else td.textContent=v}
}
function finish(batch){if(!batch.length)return;hist.push(batch);redoS.length=0;saveEdits();refreshOthers();applySel()}
function applyBatch(batch,dir){ // dir: 'old' for undo, 'val' for redo
  (dir==="old"?batch.slice().reverse():batch).forEach(x=>put(byId.get(x.id),x.k,x[dir]));saveEdits();renderList(true);refreshOthers()}
function undo(){const b=hist.pop();if(!b)return;redoS.push(b);applyBatch(b,"old")}
function redo(){const b=redoS.pop();if(!b)return;hist.push(b);applyBatch(b,"val")}

// ----- editing a cell
function startEdit(r,c,initial){
  if(COLS[c].k==="visited"){const b=[];setCell(r,c,cellVal(rows[r],"visited")==="TRUE"?"FALSE":"TRUE",b);finish(b);return}
  const td=cell(r,c);if(!td)return;editing={r,c,orig:td.textContent};
  td.contentEditable="true";if(initial!==undefined)td.textContent=initial;td.focus();
  const rg=document.createRange();rg.selectNodeContents(td);rg.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(rg);
}
function endEdit(commit,dr=0,dc=0){
  if(!editing)return;const {r,c,orig}=editing,td=cell(r,c);editing=null;
  const text=td.textContent;td.contentEditable="false";td.removeAttribute("contenteditable");
  const b=[];if(commit){td.textContent=orig;setCell(r,c,text,b);if(!b.length)td.textContent=orig}else td.textContent=orig;
  finish(b);wrap.focus({preventScroll:true});
  if(dr||dc){act.r=clamp(act.r+dr,0,rows.length-1);act.c=clamp(act.c+dc,0,COLS.length-1);sel={r0:act.r,c0:act.c,r1:act.r,c1:act.c}}
  applySel();scrollTo();
}
tbody.addEventListener("focusout",e=>{if(editing&&e.target===cell(editing.r,editing.c))endEdit(true)});

// ----- mouse selection
tbody.addEventListener("mousedown",e=>{
  const td=e.target.closest("td");if(!td||e.button!==0)return;const tr=td.parentElement,r=+tr.dataset.r;
  if(editing&&td===cell(editing.r,editing.c))return;if(editing)endEdit(true);
  if(td.classList.contains("rn")){act={r,c:0};sel={r0:r,c0:0,r1:r,c1:COLS.length-1};if(e.shiftKey){sel.r0=Math.min(sel.r0,act.r)}applySel();wrap.focus();e.preventDefault();return}
  const c=+td.dataset.c;
  if(e.target.matches("input")){act={r,c};sel={r0:r,c0:c,r1:r,c1:c};return}
  if(e.shiftKey){sel.r1=r;sel.c1=c}else{act={r,c};sel={r0:r,c0:c,r1:r,c1:c}}
  dragging=true;applySel();wrap.focus({preventScroll:true});e.preventDefault();
});
tbody.addEventListener("mouseover",e=>{if(!dragging)return;const td=e.target.closest("td[data-c]");if(!td)return;sel.r1=+td.parentElement.dataset.r;sel.c1=+td.dataset.c;applySel()});
document.addEventListener("mouseup",()=>{dragging=false});
tbody.addEventListener("dblclick",e=>{const td=e.target.closest("td[data-c]");if(td&&!e.target.matches("input"))startEdit(+td.parentElement.dataset.r,+td.dataset.c)});
tbody.addEventListener("click",e=>{ // checkbox in the Visited column
  if(!e.target.matches("input[type=checkbox]"))return;const td=e.target.closest("td");const r=+td.parentElement.dataset.r;
  const b=[];setCell(r,VIS,e.target.checked?"TRUE":"FALSE",b);finish(b);});

// ----- keyboard
function move(dr,dc,ext){
  if(ext){sel.r1=clamp(sel.r1+dr,0,rows.length-1);sel.c1=clamp(sel.c1+dc,0,COLS.length-1);act.r=act.r}
  else{act.r=clamp(act.r+dr,0,rows.length-1);act.c=clamp(act.c+dc,0,COLS.length-1);sel={r0:act.r,c0:act.c,r1:act.r,c1:act.c}}
  applySel();scrollTo();
}
function clearSel(){const {r0,r1,c0,c1}=rect(),b=[];for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)setCell(r,c,"",b);finish(b)}
function fillDown(){const {r0,r1,c0,c1}=rect(),b=[];for(let c=c0;c<=c1;c++){const v=cellVal(rows[r0],COLS[c].k);for(let r=r0+1;r<=r1;r++)setCell(r,c,v,b)}finish(b)}
wrap.addEventListener("keydown",e=>{
  const mod=e.ctrlKey||e.metaKey;
  if(editing){
    if(e.key==="Enter"){e.preventDefault();endEdit(true,e.shiftKey?-1:1,0)}
    else if(e.key==="Tab"){e.preventDefault();endEdit(true,0,e.shiftKey?-1:1)}
    else if(e.key==="Escape"){e.preventDefault();endEdit(false)}
    return;
  }
  if(!rows.length)return;
  const k=e.key;
  if(mod&&k.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo();return}
  if(mod&&k.toLowerCase()==="y"){e.preventDefault();redo();return}
  if(mod&&k.toLowerCase()==="d"){e.preventDefault();fillDown();return}
  if(mod&&k.toLowerCase()==="a"){e.preventDefault();sel={r0:0,c0:0,r1:rows.length-1,c1:COLS.length-1};applySel();return}
  if(mod)return; // let copy / cut / paste events fire
  if(k==="ArrowDown"){e.preventDefault();move(1,0,e.shiftKey)}
  else if(k==="ArrowUp"){e.preventDefault();move(-1,0,e.shiftKey)}
  else if(k==="ArrowLeft"){e.preventDefault();move(0,-1,e.shiftKey)}
  else if(k==="ArrowRight"){e.preventDefault();move(0,1,e.shiftKey)}
  else if(k==="Tab"){e.preventDefault();move(0,e.shiftKey?-1:1,false)}
  else if(k==="Enter"||k==="F2"){e.preventDefault();startEdit(act.r,act.c)}
  else if(k==="Delete"||k==="Backspace"){e.preventDefault();clearSel()}
  else if(k===" "&&COLS[act.c].k==="visited"){e.preventDefault();startEdit(act.r,act.c)}
  else if(k.length===1&&!e.altKey){e.preventDefault();startEdit(act.r,act.c,k)}
});

// ----- clipboard (tab-separated, works with Google Sheets / Excel)
function selText(){const {r0,r1,c0,c1}=rect();const out=[];for(let r=r0;r<=r1;r++){const row=[];for(let c=c0;c<=c1;c++)row.push(cellVal(rows[r],COLS[c].k));out.push(row.join("\t"))}return out.join("\n")}
wrap.addEventListener("copy",e=>{if(editing)return;e.clipboardData.setData("text/plain",selText());e.preventDefault()});
wrap.addEventListener("cut",e=>{if(editing)return;e.clipboardData.setData("text/plain",selText());e.preventDefault();clearSel()});
wrap.addEventListener("paste",e=>{
  if(editing)return;e.preventDefault();
  const txt=e.clipboardData.getData("text/plain").replace(/\r/g,"");if(!txt)return;
  const grid=txt.replace(/\n$/,"").split("\n").map(l=>l.split("\t")),{r0,r1,c0,c1}=rect(),b=[];
  if(grid.length===1&&grid[0].length===1&&(r1>r0||c1>c0)){for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)setCell(r,c,grid[0][0],b)}
  else grid.forEach((row,i)=>row.forEach((v,j)=>{if(r0+i<rows.length&&c0+j<COLS.length)setCell(r0+i,c0+j,v,b)}));
  finish(b);
});

// ----- column filter / sort menu
const menu=$("#colmenu");let menuK=null;
function closeMenu(){menu.hidden=true;menuK=null}
function openMenu(k,btn){
  menuK=k;const f=colFilt[k]||{vals:null,text:""};
  const counts=new Map();visible(baseSrc()).forEach(p=>{const v=cellVal(p,k);counts.set(v,(counts.get(v)||0)+1)});
  const all=[...counts.keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  menu.innerHTML=`<div class="cm-sort"><button data-a="asc">Sort A → Z</button><button data-a="desc">Sort Z → A</button></div>
   <label class="cm-l">Filter by condition</label><input type="search" class="cm-text" placeholder="Text contains…" value="${esc(f.text)}">
   <label class="cm-l">Filter by values</label><input type="search" class="cm-search" placeholder="Search values…">
   <div class="ms-actions"><button data-a="all">Select shown</button><button data-a="none">Clear</button></div>
   <ul class="ms-list cm-list"></ul><div class="cm-foot"><button data-a="reset">Clear this filter</button></div>`;
  const list=menu.querySelector(".cm-list"),search=menu.querySelector(".cm-search");
  const allowed=new Set(f.vals||all);
  const draw=()=>{list.innerHTML=all.filter(v=>(v||"(Blanks)").toLowerCase().includes(search.value.toLowerCase())).map(v=>
     `<li><label><input type="checkbox" value="${esc(v)}" ${allowed.has(v)?"checked":""}><span>${esc(v||"(Blanks)")}</span><em>${counts.get(v)}</em></label></li>`).join("")||"<li class='ms-empty'>No matches</li>"};
  const commit=()=>{const text=menu.querySelector(".cm-text").value;const vals=allowed.size===all.length?null:new Set(allowed);
    colFilt[k]=(vals||text)?{vals,text}:undefined;renderList(true)};
  draw();
  menu.onclick=e=>{e.stopPropagation();const a=e.target.dataset?.a;if(!a)return;
    if(a==="asc"||a==="desc"){sortKey=k;sortDir=a==="asc"?1:-1;renderList(true);closeMenu()}
    else if(a==="all"){[...list.querySelectorAll("input")].forEach(i=>allowed.add(i.value));draw();commit()}
    else if(a==="none"){allowed.clear();draw();commit()}
    else if(a==="reset"){colFilt[k]=undefined;renderList(true);closeMenu()}};
  list.onchange=e=>{e.target.checked?allowed.add(e.target.value):allowed.delete(e.target.value);commit()};
  search.oninput=draw;menu.querySelector(".cm-text").oninput=commit;
  const b=btn.getBoundingClientRect();menu.hidden=false;
  menu.style.top=(b.bottom+4)+"px";menu.style.left=Math.min(b.left,innerWidth-menu.offsetWidth-8)+"px";
  menu.querySelector(".cm-text").focus();
}
$("#ltable thead").addEventListener("click",e=>{
  const th=e.target.closest("th[data-k]");if(!th)return;e.stopPropagation();const k=th.dataset.k;
  if(e.target.closest(".fbtn")){menuK===k?closeMenu():openMenu(k,e.target.closest(".fbtn"))}
  else{sortDir=sortKey===k?-sortDir:1;sortKey=k;renderList(true)}});
document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target))closeMenu()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
$("#clearColFilters").onclick=()=>{colFilt={};renderList(true)};

// ----- toolbar
function setDataset(d){dataset=d;store.set("dataset",d);$$("#dataset button").forEach(b=>b.classList.toggle("on",b.dataset.ds===d));colFilt={};hist=[];redoS=[];renderList()}
$$("#dataset button").forEach(b=>b.onclick=()=>setDataset(b.dataset.ds));
$("#undo").onclick=undo;$("#redo").onclick=redo;
$("#addRow").onclick=()=>{
  const r={id:"X:"+Date.now().toString(36),ds:dataset};customRows.push(r);byId.set(r.id,mkCustom(r));saveCustom();
  sortKey="name";sortDir=1;colFilt={};renderList();act={r:0,c:0};
  const idx=rows.findIndex(p=>p.id===r.id);if(idx>=0){act={r:idx,c:0};sel={r0:idx,c0:0,r1:idx,c1:0};applySel();scrollTo();startEdit(idx,0,"")}};
$("#delRows").onclick=()=>{const {r0,r1}=rect();const ids=rows.slice(r0,r1+1).filter(p=>p.kind==="custom").map(p=>p.id);
  if(!ids.length||!confirm(`Delete ${ids.length} custom row(s)?`))return;
  customRows=customRows.filter(r=>!ids.includes(r.id));ids.forEach(id=>{byId.delete(id);delete edits[id];checked.delete(id)});saveCustom();saveEdits();save();renderList(true);refreshOthers()};
$("#resetEdits").onclick=()=>{if(confirm("Discard ALL list edits and custom rows? (Visited checks are kept.)")){
  edits={};saveEdits();customRows.forEach(r=>byId.delete(r.id));customRows=[];saveCustom();hist=[];redoS=[];renderList();refreshOthers()}};
$("#csv").onclick=()=>{
  const data=[COLS.map(c=>c.t)].concat(computeRows().map(p=>COLS.map(c=>cellVal(p,c.k))));
  const csv=data.map(r=>r.map(c=>'"'+String(c??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=(dataset==="ca"?"california-state-parks":"nps-units")+".csv";a.click();
};

// ---------- refresh ----------
function refresh(){refreshOthers();renderList(true)}
function refreshOthers(){
  const list=visible();
  $("#count").textContent=`${list.length} of ${parks.length} NPS units${showCA?" (+ CA state parks on map)":""} · ${[...checked].length} checked`;
  renderGrid(list);renderMap(mapList());renderVisited();
}
$("#export").onclick=()=>{
  const txt=parks.filter(p=>checked.has(p.id)).map(p=>p.title+" ("+p.states.join("/")+")").join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download="checked-parks.txt";a.click();
};
$("#reset").onclick=()=>{if(confirm("Uncheck everything?")){checked.clear();save();refresh()}};

$("#labels").checked=store.get("labels",false);$("#rose").checked=store.get("rose",true);setMH(store.get("mh","100"));
$("#showCA").checked=showCA;setDataset(dataset);
setDot(dotScale);setCols(cols);refresh();showTab(store.get("tab","grid"));
})();
