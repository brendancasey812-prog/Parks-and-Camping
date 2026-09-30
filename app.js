(function(){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
             set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

const STATE_NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",AS:"American Samoa",PR:"Puerto Rico",VI:"U.S. Virgin Islands",GU:"Guam",MP:"Northern Mariana Islands"};
const parks=window.PARKS_RAW.map(r=>({id:r[5],name:r[0],title:r[0],d:r[1],states:r[2].map(s=>STATE_NAMES[s]||s),code:r[5],lat:r[3],lng:r[4],url:r[6],approx:!!r[7],
  blurb:window.PARK_BLURBS[r[0]]||""}));
parks.forEach(p=>{const dt=(window.NAT_DETAILS||{})[p.code]||["",""];p.kind="nps";p.city=dt[0];p.hl=dt[1]});
const caParks=(window.CA_PARKS||[]).map(r=>({id:"CA:"+r[0]+"|"+r[1],name:r[0],title:r[0],
  d:r[1],states:["California"],code:"",lat:r[3],lng:r[4],url:"",approx:false,blurb:"",kind:"ca",city:r[2],hl:r[5]}));
caParks.forEach(p=>{p.title=p.name.endsWith(p.d.replace("State ","").split(" ")[0])?p.name:p.name+" "+p.d});
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
multiSelect($("#fDesig"),"Designation",DESIG.map(d=>({value:d,text:d,n:[...parks,...caParks].filter(p=>p.d===d).length})),filt.d);
multiSelect($("#fVisited"),"Status",[{value:"1",text:"Checked"},{value:"0",text:"Unchecked"}],filt.v);
function visible(src=parks){
  const q=filt.q.toLowerCase().trim();
  return src.filter(p=>(!q||(p.title+" "+p.d+" "+p.code+" "+p.states.join(" ")).toLowerCase().includes(q))
    &&(!filt.st.size||p.states.some(s=>filt.st.has(s)))&&(!filt.d.size||filt.d.has(p.d))
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
    ${p.city?`<div class="meta">Near ${esc(p.city)}</div>`:""}${p.blurb?`<p>${p.blurb}</p>`:""}</div></article>`).join("");
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

// ---------- list format (spreadsheet view) ----------
let dataset=store.get("dataset","nps"), sortKey="name", sortDir=1, editAll=false;
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
function setDataset(d){dataset=d;store.set("dataset",d);$$("#dataset button").forEach(b=>b.classList.toggle("on",b.dataset.ds===d));renderList()}
$$("#dataset button").forEach(b=>b.onclick=()=>setDataset(b.dataset.ds));
function renderList(){
  const src=dataset==="ca"?caParks:parks;
  const list=visible(src).slice().sort((x,y)=>{
    const g=p=>sortKey==="visited"?(checked.has(p.id)?1:0):sortKey==="year"?(+fld(p,"year")||0):String(fld(p,sortKey)).toLowerCase();
    const A=g(x),B=g(y);return (A>B?1:A<B?-1:0)*sortDir});
  $("#lcount").textContent=`${list.length} of ${src.length} ${dataset==="ca"?"California state park units":"NPS units"} shown`;
  $$("#ltable th").forEach(th=>th.dataset.dir=th.dataset.k===sortKey?(sortDir>0?"▲":"▼"):"");
  const ed=editAll?' contenteditable="true"':"";
  $("#lbody").innerHTML=list.map(p=>`<tr data-id="${esc(p.id)}">
    <td class="nm"${ed} data-f="name">${esc(fld(p,"name"))}</td><td${ed} data-f="d">${esc(fld(p,"d"))}</td>
    <td contenteditable="true" data-f="city">${esc(fld(p,"city"))}</td>
    <td class="c"><input type="checkbox" class="vis" ${checked.has(p.id)?"checked":""} aria-label="Visited"></td>
    <td class="c"><input type="number" class="yr" min="1800" max="2100" value="${esc(fld(p,"year"))}" placeholder="—" aria-label="Year last visited"></td>
    <td contenteditable="true" data-f="hl">${esc(fld(p,"hl"))}</td></tr>`).join("");
}
$("#ltable thead").onclick=e=>{const th=e.target.closest("th");if(!th)return;const k=th.dataset.k;sortDir=sortKey===k?-sortDir:1;sortKey=k;renderList()};
$("#lbody").addEventListener("change",e=>{const tr=e.target.closest("tr");if(!tr)return;const id=tr.dataset.id;
  if(e.target.classList.contains("vis")){e.target.checked?checked.add(id):checked.delete(id);save();
    if(e.target.checked&&!(edits[id]&&edits[id].year)){(edits[id]=edits[id]||{}).year=new Date().getFullYear();saveEdits()}
    refresh();}
  else if(e.target.classList.contains("yr")){(edits[id]=edits[id]||{}).year=e.target.value;saveEdits()}});
$("#lbody").addEventListener("focusout",e=>{const td=e.target.closest("td[data-f]");if(!td)return;
  const id=td.closest("tr").dataset.id,f=td.dataset.f,v=td.textContent.trim();
  const p=byId.get(id),orig=f==="name"?p.name:f==="d"?p.d:p[f];
  if(v!==String(fld(p,f))){(edits[id]=edits[id]||{})[f]=v===orig?undefined:v;saveEdits()}});
$("#lbody").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.isContentEditable){e.preventDefault();e.target.blur()}});
$("#editAll").onchange=e=>{editAll=e.target.checked;renderList()};
$("#resetEdits").onclick=()=>{if(confirm("Discard all text/year edits in the list? (Visited checks are kept.)")){edits={};saveEdits();refresh()}};
$("#csv").onclick=()=>{
  const src=(dataset==="ca"?caParks:parks);
  const rows=[["Name","Designation","Nearest City / Community","Visited","Year Last Visited","Highlights"]].concat(
    visible(src).map(p=>[fld(p,"name"),fld(p,"d"),fld(p,"city"),checked.has(p.id)?"TRUE":"FALSE",fld(p,"year"),fld(p,"hl")]));
  const csv=rows.map(r=>r.map(c=>'"'+String(c??"").replace(/"/g,'""')+'"').join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=(dataset==="ca"?"california-state-parks":"nps-units")+".csv";a.click();
};

// ---------- refresh ----------
function refresh(){
  const list=visible();
  $("#count").textContent=`${list.length} of ${parks.length} NPS units${showCA?" (+ CA state parks on map)":""} · ${[...checked].length} checked`;
  renderGrid(list);renderMap(mapList());renderVisited();renderList();
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
