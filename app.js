(function(){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
             set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

const STATE_NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",AS:"American Samoa",PR:"Puerto Rico",VI:"U.S. Virgin Islands",GU:"Guam",MP:"Northern Mariana Islands"};
const parks=window.PARKS_RAW.map(r=>({id:r[5],name:r[0],title:r[0],d:r[1],states:r[2],lat:r[3],lng:r[4],url:r[6],approx:!!r[7],
  blurb:r[1]==="National Park"?(window.PARK_BLURBS[r[0]]||""):""}));
const DESIG=[...new Set(parks.map(p=>p.d))].sort();

let checked=new Set(store.get("checked",[]));
const save=()=>store.set("checked",[...checked]);
const filt={q:"",st:"",d:"",v:""};

// ---------- filters ----------
const stSel=$("#fState"),dSel=$("#fDesig");
[...new Set(parks.flatMap(p=>p.states))].sort((a,b)=>(STATE_NAMES[a]||a).localeCompare(STATE_NAMES[b]||b))
  .forEach(s=>stSel.add(new Option(STATE_NAMES[s]||s,s)));
DESIG.forEach(d=>dSel.add(new Option(d+" ("+parks.filter(p=>p.d===d).length+")",d)));
function visible(){
  const q=filt.q.toLowerCase();
  return parks.filter(p=>(!q||p.title.toLowerCase().includes(q)||p.states.some(s=>(STATE_NAMES[s]||s).toLowerCase().includes(q)))
    &&(!filt.st||p.states.includes(filt.st))&&(!filt.d||p.d===filt.d)
    &&(filt.v===""||(filt.v==="1")===checked.has(p.id)));
}
function bind(el,key,ev){el.addEventListener(ev,()=>{filt[key]=el.value;refresh()})}
bind($("#q"),"q","input");bind(stSel,"st","change");bind(dSel,"d","change");bind($("#fVisited"),"v","change");
$("#clear").onclick=()=>{["#q","#fState","#fDesig","#fVisited"].forEach(s=>$(s).value="");Object.assign(filt,{q:"",st:"",d:"",v:""});refresh()};

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
const hue=p=>{let h=0;for(const c of p.d)h=(h*31+c.charCodeAt(0))%360;return h};
function toggle(id){checked.has(id)?checked.delete(id):checked.add(id);save();refresh()}
function renderGrid(list){
  $("#grid").innerHTML=list.map(p=>`<article class="card" data-id="${p.id}">
    <div class="banner" style="--h1:hsl(${hue(p)},35%,32%);--h2:hsl(${hue(p)+40},45%,55%)">
      <span class="dot ${checked.has(p.id)?"on":"off"}" role="checkbox" aria-checked="${checked.has(p.id)}" tabindex="0" title="Check / uncheck"></span></div>
    <div class="body"><h3><a href="${p.url}" target="_blank" rel="noopener">${p.title}</a></h3>
    <div class="meta">${p.d} · ${p.states.map(s=>STATE_NAMES[s]||s).slice(0,4).join(", ")}${p.states.length>4?" +"+(p.states.length-4):""}</div>
    ${p.blurb?`<p>${p.blurb}</p>`:""}</div></article>`).join("");
}
$("#grid").onclick=e=>{const d=e.target.closest(".dot");if(d)toggle(d.closest(".card").dataset.id)};
$("#grid").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){const d=e.target.closest(".dot");if(d){e.preventDefault();toggle(d.closest(".card").dataset.id)}}};

// ---------- visited list ----------
function renderVisited(){
  const list=parks.filter(p=>checked.has(p.id));
  $("#vcount").textContent=`${list.length} of ${parks.length} checked`;
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
                                :{fillColor:"#9aa0a6",color:"#5f6368",fillOpacity:.85,weight:1.2}),dashArray:p.approx?"3 2":null});
function initMap(){
  if(map)return;
  map=L.map("map",{minZoom:2,worldCopyJump:true,zoomSnap:.5});
  const base=Object.fromEntries(Object.entries(layers).map(([k,f])=>[k,f()]));
  base[store.get("base","Esri Topographic")]?.addTo(map)||base["Esri Topographic"].addTo(map);
  L.control.layers(base,null,{position:"topright"}).addTo(map);
  map.on("baselayerchange",e=>store.set("base",e.name));
  group=L.layerGroup().addTo(map);
  parks.forEach(p=>{
    const m=L.circleMarker([p.lat,p.lng],{radius:6,...style(p)});
    m.bindTooltip(p.title+(p.approx?" (approx. location)":""),{className:"lbl"});
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
function restyle(){markers.forEach((m,id)=>{const p=parks.find(x=>x.id===id);m.setStyle(style(p));m.setRadius(radius())})}
$$("#jump button").forEach(b=>b.onclick=()=>{initMap();map.fitBounds(views[b.dataset.v])});
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
  markers.forEach((m,id)=>{const t=parks.find(p=>p.id===id).title;m.unbindTooltip();
    m.bindTooltip(t,{className:"lbl",permanent:on,direction:"right",offset:[6,0]});});renderMap(visible());}
$("#rose").onchange=e=>{store.set("rose",e.target.checked);$("#roseEl")&&($("#roseEl").style.display=e.target.checked?"":"none")};

// ---------- refresh ----------
function refresh(){
  const list=visible();
  $("#count").textContent=`${list.length} of ${parks.length} units · ${[...checked].length} checked`;
  renderGrid(list);renderMap(list);renderVisited();
}
$("#export").onclick=()=>{
  const txt=parks.filter(p=>checked.has(p.id)).map(p=>p.title+" ("+p.states.join("/")+")").join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download="checked-parks.txt";a.click();
};
$("#reset").onclick=()=>{if(confirm("Uncheck everything?")){checked.clear();save();refresh()}};

$("#labels").checked=store.get("labels",false);$("#rose").checked=store.get("rose",true);setMH(store.get("mh","100"));
setDot(dotScale);setCols(cols);refresh();showTab(store.get("tab","grid"));
})();
