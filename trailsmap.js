/* Trails Map tab - a self-contained module (see TRAILS-MODULE.md for how to move it to another site).
   Needs: Leaflet, topojson-client, data/geo.js (state lines, lakes, rivers, cities), the /tiles terrain pyramid, trailsmap.css,
   and either window.ParksBridge (shared visited checks / edits from the main app) or window.PARKS_RAW (standalone fallback). */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const KEY="tm_";
const st={get(k,d){try{const v=localStorage.getItem(KEY+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
          set(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------------------------------------------------------------- data access */
const SERVICE="https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/MapServer/0";
const UNIT_ALIAS={SEQU:"SEKI",KICA:"SEKI"};          // Sequoia and Kings Canyon share one NPS unit code in the trails data
const PAGE=2000, CAP=16000;                           // service page size, and the most trail segments we draw at once
function fallbackBridge(){                            // used only if this module is moved to a site without the main app
  const ST={AK:"Alaska",AL:"Alabama",AR:"Arkansas",AZ:"Arizona",CA:"California",CO:"Colorado",CT:"Connecticut",DC:"District of Columbia",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",IA:"Iowa",ID:"Idaho",IL:"Illinois",IN:"Indiana",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",MA:"Massachusetts",MD:"Maryland",ME:"Maine",MI:"Michigan",MN:"Minnesota",MO:"Missouri",MS:"Mississippi",MT:"Montana",NC:"North Carolina",ND:"North Dakota",NE:"Nebraska",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NV:"Nevada",NY:"New York",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VA:"Virginia",VT:"Vermont",WA:"Washington",WI:"Wisconsin",WV:"West Virginia",WY:"Wyoming",PR:"Puerto Rico",VI:"U.S. Virgin Islands",GU:"Guam",AS:"American Samoa",MP:"Northern Mariana Islands"};
  const parks=(window.PARKS_RAW||[]).map(r=>({id:r[5],code:r[5],name:r[0],title:r[0],d:r[1],states:r[2].map(s=>ST[s]||s),lat:r[3],lng:r[4],url:r[6],city:"",state:"",kind:"nps"}));
  let checked=new Set((()=>{try{return JSON.parse(localStorage.getItem("checked"))||[]}catch(e){return[]}})());const subs=[];
  return {parks,caParks:[],fld:(p,k)=>p[k]??"",disp:p=>p.title,official:(p,k)=>p[k]??"",isChecked:id=>checked.has(id),
    toggle(id){checked.has(id)?checked.delete(id):checked.add(id);try{localStorage.setItem("checked",JSON.stringify([...checked]))}catch(e){}subs.forEach(f=>f())},
    setField(){},subscribe:f=>subs.push(f),infoUrl:p=>p.url,zoomSens:()=>0.012};
}
let B=null;                                           // the bridge, resolved on first show()
const unitCode=p=>UNIT_ALIAS[p.code]||p.code;
const parkByCode=c=>B.parks.find(p=>p.code===c);

/* ---------------------------------------------------------------- state */
const S={ // persisted settings
  colorBy:st.get("colorBy",""),width:st.get("width",3),opacity:st.get("opacity",.95),casing:st.get("casing",true),dim:st.get("dim",true),
  relief:st.get("relief",35),dots:st.get("dots",true),names:st.get("names",false),states:st.get("states",true),cities:st.get("cities",true),
  rose:st.get("rose",true),legend:st.get("legend",true),collapsed:st.get("collapsed",null)
};
const selParks=new Set(st.get("parks",[]));           // park codes picked in the filter
const selStates=new Set(st.get("stateSel",[]));
let map=null,ready=false,meta=null,fields={unit:null,name:null,cats:[]};
let trailGroup=null,casingGroup=null,dotLayer=null,labelLayers={},legendCtl=null,noteCtl=null,roseEl=null;
let loadToken=0,ctrl=null,viewTimer=0;
const cache=new Map();                                // unit code -> [features]
let current=[];                                       // features currently drawn
const dotMarkers=new Map();
const PALETTE=["#e6194b","#f58231","#7b2ff7","#0072ce","#00a86b","#d81b8a","#ffb300","#00acc1","#8d6e63","#43a047"];
const SOLO="#e11d74";
const catColors=new Map();

/* ---------------------------------------------------------------- tiles (same pyramid as the main map) */
const LocalTiles=L.GridLayer.extend({
  createTile(coords,done){
    const size=this.getTileSize(),tile=document.createElement("canvas");tile.width=size.x;tile.height=size.y;
    const z=coords.z-1;
    const attempt=lv=>{
      const zz=z-lv;if(zz<0){done(null,tile);return}
      const im=new Image();
      im.onload=()=>{const ctx=tile.getContext("2d");
        if(lv===0)ctx.drawImage(im,0,0,size.x,size.y);
        else{const n=2**lv,s=im.width/n;ctx.drawImage(im,(coords.x%n)*s,(coords.y%n)*s,s,s,0,0,size.x,size.y)}
        done(null,tile)};
      im.onerror=()=>attempt(lv+1);
      im.src=`tiles/${zz}/${coords.x>>lv}/${coords.y>>lv}.webp`;
    };
    attempt(0);return tile;
  }
});
const VIEWS={lower48:[[24.5,-125.5],[49.8,-66]],ak:[[51,-170],[71.8,-129]],hi:[[18.8,-160.6],[22.4,-154.6]]};

/* ---------------------------------------------------------------- multi-select (searchable) */
function multi(root,label,getOptions,set,onChange){
  root.classList.add("ms");
  root.innerHTML=`<button type="button" class="ms-btn"><span class="ms-label"></span><span class="ms-badge" hidden></span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
  <div class="ms-panel" hidden><input type="search" class="ms-search" placeholder="Search ${label.toLowerCase()}…" aria-label="Search ${label}">
  <div class="ms-actions"><button type="button" data-a="all">Select shown</button><button type="button" data-a="none">Clear</button></div><ul class="ms-list"></ul></div>`;
  const btn=root.querySelector(".ms-btn"),panel=root.querySelector(".ms-panel"),search=root.querySelector(".ms-search"),list=root.querySelector(".ms-list"),badge=root.querySelector(".ms-badge"),lab=root.querySelector(".ms-label");
  const shown=()=>getOptions().filter(o=>o.text.toLowerCase().includes(search.value.toLowerCase()));
  function draw(){
    list.innerHTML=shown().map(o=>`<li><label><input type="checkbox" value="${esc(o.value)}" ${set.has(o.value)?"checked":""}><span>${esc(o.text)}</span>${o.n!=null?`<em>${esc(o.n)}</em>`:""}</label></li>`).join("")||"<li class='ms-empty'>No matches</li>";
    lab.textContent=label;badge.hidden=!set.size;badge.textContent=set.size}
  const close=()=>{panel.hidden=true;root.classList.remove("open")};
  btn.onclick=e=>{e.stopPropagation();const open=panel.hidden;document.dispatchEvent(new CustomEvent("tm-close"));if(open){panel.hidden=false;root.classList.add("open");search.value="";draw();search.focus()}};
  panel.onclick=e=>e.stopPropagation();
  list.onchange=e=>{e.target.checked?set.add(e.target.value):set.delete(e.target.value);draw();onChange()};
  search.oninput=draw;
  panel.querySelector(".ms-actions").onclick=e=>{const a=e.target.dataset.a;if(!a)return;if(a==="all")shown().forEach(o=>set.add(o.value));else set.clear();draw();onChange()};
  document.addEventListener("click",close);document.addEventListener("tm-close",close);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  draw();return {draw};
}

/* ---------------------------------------------------------------- map setup */
function buildMap(){
  map=L.map("tmap",{minZoom:2,maxZoom:14,worldCopyJump:true,preferCanvas:true,zoomSnap:0,zoomDelta:.75,scrollWheelZoom:false,touchZoom:true,bounceAtZoomLimits:false,
    inertia:true,inertiaDeceleration:2600,tapTolerance:12,boxZoom:true,keyboard:true});
  map.attributionControl.setPrefix(false);window.trailsMap=map;
  new LocalTiles({tileSize:512,minZoom:2,maxZoom:14,maxNativeZoom:8,keepBuffer:6,updateWhenIdle:false,updateInterval:60,
    attribution:'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a> · Trails: National Park Service · Natural Earth · US Census'}).addTo(map);
  addVectors();
  ["casing","trails","dots","place","note"].forEach((n,i)=>{const p=map.createPane("tm-"+n);p.style.zIndex=String(262+i*4)});
  map.getPane("tm-place").style.zIndex="300";map.getPane("tm-dots").style.zIndex="450";
  const rend=L.canvas({pane:"tm-trails",padding:.3}),rendC=L.canvas({pane:"tm-casing",padding:.3});
  trailGroup=L.layerGroup().addTo(map);casingGroup=L.layerGroup().addTo(map);trailGroup._r=rend;casingGroup._r=rendC;
  dotLayer=L.layerGroup().addTo(map);
  // controls
  const Rose=L.Control.extend({onAdd(){const d=L.DomUtil.create("button","rose");d.type="button";d.title="North is up · click to reset the view";d.setAttribute("aria-label","Compass: reset view");
    d.innerHTML=`<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="46" class="rg"/><g class="tk">${[...Array(24)].map((_,i)=>`<line x1="0" y1="-46" x2="0" y2="${i%6===0?-39:-42.5}" transform="rotate(${i*15})"/>`).join("")}</g><path class="nn" d="M0-25 7 0 0-4 -7 0Z"/><path class="ns" d="M0 25 7 0 0 4 -7 0Z"/><circle r="2.4" class="hub"/><text y="-30" class="nl" text-anchor="middle">N</text></svg>`;
    L.DomEvent.disableClickPropagation(d);d.onclick=()=>fitHome();roseEl=d;return d}});
  new Rose({position:"bottomleft"}).addTo(map);
  const Note=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","trailnote");d.hidden=true;this.el=d;return d}});
  noteCtl=new Note({position:"topright"}).addTo(map);
  const Leg=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","tm-legend");L.DomEvent.disableClickPropagation(d);L.DomEvent.disableScrollPropagation(d);this.el=d;return d}});
  legendCtl=new Leg({position:"bottomright"}).addTo(map);
  setupZoomInput();
  map.on("zoomend",()=>{restyleDots();updateLabels();if(!selParks.size)scheduleView()});
  map.on("moveend",()=>{if(!selParks.size)scheduleView()});
  fitHome(true);
}
function addVectors(){
  const G=window.GEO||{};
  ["tm-water","tm-lines"].forEach((n,i)=>{map.createPane(n).style.zIndex=String(250+i*5)});
  const water=L.canvas({pane:"tm-water",padding:.4}),lines=L.canvas({pane:"tm-lines",padding:.4});
  if(G.lakes)L.geoJSON(G.lakes,{pane:"tm-water",renderer:water,interactive:false,style:{fillColor:"#c4dae6",fillOpacity:1,color:"#9dc0d3",weight:.7}}).addTo(map);
  if(G.rivers)labelLayers.rivers=L.geoJSON(G.rivers,{pane:"tm-water",renderer:water,interactive:false,style:{color:"#9fc6da",weight:1,opacity:.95}}).addTo(map);
  if(G.statesTopo&&window.topojson){const mesh=topojson.mesh(G.statesTopo,G.statesTopo.objects.states,(a,b)=>a!==b);
    L.geoJSON(mesh,{pane:"tm-lines",renderer:lines,interactive:false,style:{color:"#3c5d50",weight:1,opacity:.55,dashArray:"5 3"}}).addTo(map)}
  if(G.borders)L.geoJSON(G.borders,{pane:"tm-lines",renderer:lines,interactive:false,style:{color:"#27423a",weight:1.5,opacity:.8}}).addTo(map);
  map.createPane("tm-labels").style.zIndex="300";
  labelLayers.states=L.layerGroup((G.stateLabels||[]).filter(s=>!/^(Commonwealth|United States Virgin)/.test(s[0])).map(s=>L.marker([s[2],s[1]],{pane:"tm-labels",interactive:false,keyboard:false,icon:L.divIcon({className:"stlab",html:s[0],iconSize:[0,0]})})));
  labelLayers.cityData=(G.cities||[]).map(c=>({pop:c[3],m:L.marker([c[2],c[1]],{pane:"tm-labels",interactive:false,keyboard:false,icon:L.divIcon({className:"city",html:`<i></i><span>${esc(c[0])}</span>`,iconSize:[0,0]})})}));
  labelLayers.cities=L.layerGroup();
}
function setupZoomInput(){
  const el=map.getContainer();let acc=0,raf=0,at=null;
  const k=()=>B.zoomSens();
  el.addEventListener("wheel",e=>{e.preventDefault();let dy=e.deltaY;if(e.deltaMode===1)dy*=33;else if(e.deltaMode===2)dy*=300;
    acc+=-dy*k()*(e.ctrlKey?4:1);at=map.mouseEventToLatLng(e);
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;const d=clamp(acc,-2.5,2.5);acc=0;const z=clamp(map.getZoom()+d,map.getMinZoom(),map.getMaxZoom());if(z!==map.getZoom())map.setZoomAround(at,z,{animate:false})})},{passive:false});
  let z0=0;
  el.addEventListener("gesturestart",e=>{e.preventDefault();z0=map.getZoom()});
  el.addEventListener("gesturechange",e=>{e.preventDefault();map.setZoomAround(map.mouseEventToLatLng(e)||map.getCenter(),clamp(z0+Math.log2(e.scale)*(.5+k()*60),map.getMinZoom(),map.getMaxZoom()),{animate:false})});
  el.addEventListener("gestureend",e=>e.preventDefault());
}
function fitHome(instant){
  const sel=selectedParkPoints();
  if(sel.length){map.fitBounds(L.latLngBounds(sel).pad(.5),{maxZoom:9,animate:!instant});return}
  map.fitBounds(VIEWS.lower48,{animate:!instant});
}
function selectedParkPoints(){
  const out=[];
  selParks.forEach(c=>{B.parks.filter(p=>unitCode(p)===c||p.code===c).forEach(p=>out.push([p.lat,p.lng]))});
  if(!out.length&&selStates.size){B.parks.filter(p=>p.states.some(s=>selStates.has(s))).forEach(p=>out.push([p.lat,p.lng]))}
  return out;
}

/* ---------------------------------------------------------------- park dots */
const dotStyle=p=>B.isChecked(p.id)?{fillColor:"#e5383b",color:"#fff",fillOpacity:1,weight:2}:{fillColor:"#8a949b",color:"#fff",fillOpacity:.92,weight:1.6};
const dotRadius=()=>Math.max(4,(2+map.getZoom()*.9)*1);
function buildDots(){
  dotLayer.clearLayers();dotMarkers.clear();
  B.parks.forEach(p=>{
    const m=L.circleMarker([p.lat,p.lng],{pane:"tm-dots",radius:6,bubblingMouseEvents:false,...dotStyle(p)});
    m.bindTooltip(()=>`<b>${esc(B.disp(p))}</b><div class="tt">${esc(B.fld(p,"d"))}${p.states[0]?" · "+esc(p.states.slice(0,2).join(", ")):""}</div><div class="tt">Click to show this park's trails</div>`,{className:"lbl",direction:"top",offset:[0,-4]});
    m.on("click",()=>{const c=unitCode(p);selParks.has(c)?selParks.delete(c):selParks.add(c);persistSel();parkMs.draw();onFilterChange(true)});
    m._p=p;dotMarkers.set(p.id,m);
  });
  syncDotVisibility();
}
function syncDotVisibility(){
  dotLayer.clearLayers();if(!S.dots&&!S.names)return;
  const only=selParks.size||selStates.size;
  B.parks.forEach(p=>{
    if(only){const okP=selParks.size&&selParks.has(unitCode(p)),okS=selStates.size&&p.states.some(s=>selStates.has(s));if(!(okP||okS))return}
    const m=dotMarkers.get(p.id);if(m)dotLayer.addLayer(m)});
  restyleDots();updateLabels();
}
function restyleDots(){
  dotMarkers.forEach(m=>{const p=m._p;const sel=selParks.has(unitCode(p));
    m.setStyle({...dotStyle(p),weight:sel?3:dotStyle(p).weight,color:sel?"#0f3b30":"#fff"});m.setRadius(S.dots?(dotRadius()+(sel?2:0)):0.01)})}
function updateLabels(){
  dotMarkers.forEach(m=>{m.unbindTooltip();const p=m._p;
    if(S.names&&map.getZoom()>=5)m.bindTooltip(esc(B.disp(p)),{className:"lbl",permanent:true,direction:"right",offset:[6,0]});
    else m.bindTooltip(()=>`<b>${esc(B.disp(p))}</b><div class="tt">${esc(B.fld(p,"d"))}${p.states[0]?" · "+esc(p.states.slice(0,2).join(", ")):""}</div><div class="tt">Click to show this park's trails</div>`,{className:"lbl",direction:"top",offset:[0,-4]})});
}
function updatePlaceLabels(){
  const z=map.getZoom();
  (S.states&&z>=3.4&&z<7.6)?labelLayers.states.addTo(map):labelLayers.states.remove();
  labelLayers.cities.clearLayers();
  if(S.cities&&z>=4.6){const min=z<5.6?2e6:z<6.6?8e5:z<7.6?4e5:0;labelLayers.cityData.filter(c=>c.pop>=min).forEach(c=>labelLayers.cities.addLayer(c.m));labelLayers.cities.addTo(map)}else labelLayers.cities.remove();
  labelLayers.rivers&&labelLayers.rivers.setStyle({weight:Math.max(.7,Math.min(2.2,(z-3)*.35))});
}

/* ---------------------------------------------------------------- NPS trails service */
function status(t,err){const el=$("#tmStatus");el.textContent=t||"";el.classList.toggle("err",!!err);
  if(noteCtl){noteCtl.el.hidden=!t;noteCtl.el.textContent=t||""}}
async function getMeta(){
  if(meta)return meta;
  try{const r=await fetch(SERVICE+"?f=json");meta=await r.json()}catch(e){meta={fields:[]}}
  const f=(meta.fields||[]).map(x=>x.name);const find=re=>f.find(n=>re.test(n))||null;
  fields.unit=find(/^unit_?code$/i)||find(/unit.*code/i)||"UNITCODE";
  fields.name=find(/^trl_?name$/i)||find(/^name$/i)||find(/trl.*name/i);
  fields.cats=f.filter(n=>/^(trl_?class|trl_?type|trl_?use|trl_?surface|trl_?status|seasonal|maintainer|trl_?cond)/i.test(n));
  const sel=$("#tmColorBy");sel.innerHTML='<option value="">One color (stand-out)</option>'+fields.cats.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  if(S.colorBy&&fields.cats.includes(S.colorBy))sel.value=S.colorBy;else{S.colorBy="";sel.value=""}
  return meta;
}
async function fetchPages(params,token,progress){
  const out=[];let offset=0;
  for(;;){
    const q=new URLSearchParams({where:"1=1",outFields:"*",returnGeometry:"true",outSR:"4326",resultOffset:String(offset),resultRecordCount:String(PAGE),f:"geojson",...params});
    const r=await fetch(SERVICE+"/query?"+q,{signal:ctrl.signal});if(!r.ok)throw new Error("HTTP "+r.status);
    const g=await r.json();if(g.error)throw new Error(g.error.message||"service error");
    if(token!==loadToken)return null;
    const fs=g.features||[];out.push(...fs);progress&&progress(out.length);
    if(!(g.exceededTransferLimit||fs.length>=PAGE)||out.length>=CAP)return {features:out,capped:out.length>=CAP};
    offset+=PAGE;
  }
}
async function loadTrails(){
  const token=++loadToken;ctrl&&ctrl.abort();ctrl=new AbortController();
  await getMeta();
  try{
    if(selParks.size){                                    // exact parks: query by unit code, cached per park
      const codes=[...selParks],need=codes.filter(c=>!cache.has(c));
      if(need.length){status("Loading trails for "+need.length+" park"+(need.length>1?"s":"")+"…");
        for(const c of need){
          let res;try{res=await fetchPages({where:`${fields.unit}='${c}'`},token,n=>status(`Loading ${c}… ${n.toLocaleString()} segments`))}
          catch(e){if(e.name==="AbortError")return;res=await fallbackByBox(c,token)}
          if(res===null)return;cache.set(c,res.features);if(res.capped)status("Capped at "+CAP.toLocaleString()+" segments for "+c)}}
      if(token!==loadToken)return;
      draw(codes.flatMap(c=>cache.get(c)||[]),`${codes.length} park${codes.length>1?"s":""}`);
      return;
    }
    const z=map.getZoom();
    if(z<9.5){draw([],"");status("Pick a park or state above, or zoom in to browse NPS trails anywhere");return}
    const b=map.getBounds().pad(.1);status("Loading trails in view…");
    const res=await fetchPages({geometry:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(","),geometryType:"esriGeometryEnvelope",inSR:"4326",spatialRel:"esriSpatialRelIntersects",maxAllowableOffset:String(360/(512*2**z))},token);
    if(res===null)return;draw(res.features,"this view");
  }catch(e){if(e.name==="AbortError")return;status("NPS trails are unavailable right now ("+(e.message||"network")+"). The map still works.",true)}
}
async function fallbackByBox(code,token){       // if the unit-code field query is rejected, fall back to a box around the park
  const ps=B.parks.filter(p=>unitCode(p)===code);if(!ps.length)return {features:[],capped:false};
  const p=ps[0],d=.35;
  return fetchPages({geometry:[p.lng-d,p.lat-d,p.lng+d,p.lat+d].join(","),geometryType:"esriGeometryEnvelope",inSR:"4326",spatialRel:"esriSpatialRelIntersects"},token);
}
function scheduleView(){clearTimeout(viewTimer);viewTimer=setTimeout(loadTrails,350)}

/* ---------------------------------------------------------------- drawing + legend */
function catOf(f){return S.colorBy?String((f.properties||{})[S.colorBy]??"(blank)"):null}
function colorOf(v){if(v==null)return SOLO;if(!catColors.has(v))catColors.set(v,PALETTE[catColors.size%PALETTE.length]);return catColors.get(v)}
function draw(features,label,quiet){
  current=features;trailGroup.clearLayers();casingGroup.clearLayers();
  const w=S.width*(map.getZoom()<8?.75:1);
  if(features.length){
    const geo=(style,pane,renderer,withTip)=>L.geoJSON({type:"FeatureCollection",features},{pane,renderer,style,onEachFeature:withTip?(f,l)=>{
      const p=f.properties||{};const nm=(fields.name&&p[fields.name])||"Trail";
      const unit=p[fields.unit]||"",pk=parkByCode(unit)||B.parks.find(x=>unitCode(x)===unit);
      const extra=fields.cats.slice(0,3).map(k=>p[k]!=null&&p[k]!==""?`${esc(k)}: ${esc(p[k])}`:"").filter(Boolean).join(" · ");
      l.bindTooltip(`<b>${esc(nm)}</b><div class="tt">${esc(pk?B.disp(pk):unit)}</div>${extra?`<div class="tt">${extra}</div>`:""}`,{className:"lbl",sticky:true})}:undefined});
    if(S.casing)geo({color:"#ffffff",weight:w+3.2,opacity:Math.min(.9,S.opacity),lineCap:"round",lineJoin:"round"},"tm-casing",casingGroup._r,false).addTo(casingGroup);
    geo(f=>({color:colorOf(catOf(f)),weight:w,opacity:S.opacity,lineCap:"round",lineJoin:"round"}),"tm-trails",trailGroup._r,true).addTo(trailGroup);
  }
  const n=features.length;
  if(quiet){renderLegend();return}
  status(n?`${n.toLocaleString()} trail segment${n===1?"":"s"} · ${label}${n>=PAGE&&!selParks.size?" (first "+PAGE.toLocaleString()+" in view · zoom in for more)":""}`:(label?`No trails found for ${label}`:""));
  renderLegend();
}
function elevRamp(){ // matches the colors baked into the terrain tiles
  const st=[[0,"#98be96"],[200,"#a6c898"],[600,"#bad09a"],[1100,"#ccd49e"],[1700,"#d6c894"],[2400,"#c4aa84"],[3100,"#b09a82"],[3800,"#c4bcb2"],[4400,"#eeece8"]];
  return `linear-gradient(90deg,#b8d2e0 0%,${st.map(([e,c])=>`${c} ${(8+e/4400*92).toFixed(1)}%`).join(",")})`;
}
function renderLegend(){
  if(!legendCtl)return;const el=legendCtl.el;el.style.display=S.legend?"":"none";if(!S.legend)return;
  let h='<div class="sec"><h5>NPS trails</h5>';
  if(S.colorBy){
    const counts=new Map();current.forEach(f=>{const v=catOf(f);counts.set(v,(counts.get(v)||0)+1)});
    const rows=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,10);
    h+=rows.map(([v,c])=>`<div class="it"><span class="ln" style="border-color:${colorOf(v)}"></span><span>${esc(v)}</span><span>${c.toLocaleString()}</span></div>`).join("")||'<div class="it"><span>Load a park to see categories</span></div>';
    h+=`<div class="it" style="opacity:.6"><span>by ${esc(S.colorBy)}</span></div>`;
  }else h+=`<div class="it"><span class="ln" style="border-color:${SOLO}"></span><span>Trail${current.length?"":" (none loaded)"}</span><span>${current.length?current.length.toLocaleString():""}</span></div>`;
  h+='</div><div class="sec"><h5>Parks</h5><div class="it"><span class="dt" style="background:#8a949b"></span><span>Not visited</span></div><div class="it"><span class="dt" style="background:#e5383b"></span><span>Visited</span></div></div>';
  h+=`<div class="sec"><h5>Elevation</h5><div class="ramp" style="background:${elevRamp()}"></div><div class="rl"><span>sea level</span><span>1,700 m</span><span>4,400 m+</span></div></div>`;
  el.innerHTML=h;
}

/* ---------------------------------------------------------------- panel: filters, settings, logistics */
let parkMs=null,stateMs=null;
function parkOptions(){
  const ps=B.parks.filter(p=>!selStates.size||p.states.some(s=>selStates.has(s)));
  const seen=new Map();ps.forEach(p=>{const c=unitCode(p);if(!seen.has(c))seen.set(c,{value:c,text:c==="SEKI"?"Sequoia & Kings Canyon":B.disp(p),n:B.fld(p,"d")})});
  return [...seen.values()].sort((a,b)=>a.text.localeCompare(b.text));
}
function stateOptions(){const m=new Map();B.parks.forEach(p=>p.states.forEach(s=>m.set(s,(m.get(s)||0)+1)));return [...m].sort((a,b)=>a[0].localeCompare(b[0])).map(([s,n])=>({value:s,text:s,n}))}
function persistSel(){st.set("parks",[...selParks]);st.set("stateSel",[...selStates])}
function onFilterChange(fit){
  persistSel();parkMs&&parkMs.draw();stateMs&&stateMs.draw();syncDotVisibility();renderCards();
  if(fit&&(selParks.size||selStates.size)){const pts=selectedParkPoints();if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(.6),{maxZoom:selParks.size?9.5:7,animate:true})}
  loadTrails();
}
function renderCards(){
  const box=$("#tmParks"),codes=[...selParks];$("#tmCount").textContent=codes.length?`(${codes.length})`:"";
  if(!codes.length){box.innerHTML='<p class="tm-empty">No parks selected. Pick one above, or click a park dot on the map.</p>';return}
  box.innerHTML=codes.map(c=>{
    const ps=B.parks.filter(p=>unitCode(p)===c);if(!ps.length)return "";
    return ps.map(p=>{const n=cache.get(c)?cache.get(c).length:null;
      return `<div class="tm-card" data-id="${esc(p.id)}" data-code="${esc(c)}">
        <h4><a href="${esc(B.infoUrl(p))}" target="_blank" rel="noopener">${esc(B.disp(p))}</a></h4>
        <div class="m">${esc(B.fld(p,"d"))} · ${esc(p.states.join(", "))}${B.fld(p,"city")?`<br>Near ${esc(B.fld(p,"city"))}${B.fld(p,"state")?", "+esc(B.fld(p,"state")):""}`:""}${B.fld(p,"hl")?`<br>${esc(B.fld(p,"hl"))}`:""}</div>
        <div class="r"><label><input type="checkbox" data-a="vis" ${B.isChecked(p.id)?"checked":""}> Visited</label>
          <label>Year <input type="text" data-a="yr" value="${esc(B.fld(p,"year"))}" placeholder="—" maxlength="40"></label>
          <button type="button" class="z" data-a="zoom">Zoom</button><button type="button" class="x" data-a="rm" title="Remove from filter">✕</button></div>
        ${n!=null?`<div class="tn">${n.toLocaleString()} trail segments</div>`:""}</div>`}).join("")}).join("");
}
function wirePanel(){
  parkMs=multi($("#tmPark"),"Park / unit",parkOptions,selParks,()=>onFilterChange(true));
  stateMs=multi($("#tmState"),"State / locale",stateOptions,selStates,()=>{
    // narrowing by state also drops selected parks that are outside it
    if(selStates.size)[...selParks].forEach(c=>{const ps=B.parks.filter(p=>unitCode(p)===c);if(ps.length&&!ps.some(p=>p.states.some(s=>selStates.has(s))))selParks.delete(c)});
    onFilterChange(true)});
  $("#tmClear").onclick=()=>{selParks.clear();selStates.clear();onFilterChange(false);fitHome()};
  $("#tmFit").onclick=()=>{const pts=selectedParkPoints();if(pts.length){const L_=L.latLngBounds(pts);const fb=current.length?trailBounds():null;map.fitBounds((fb||L_).pad(.15),{maxZoom:12})}else fitHome()};
  $("#tmCollapse").onclick=()=>setCollapsed(true);$("#tmOpen").onclick=()=>setCollapsed(false);
  $("#tmParks").addEventListener("click",e=>{
    const card=e.target.closest(".tm-card");if(!card)return;const a=e.target.dataset.a;
    if(a==="rm"){selParks.delete(card.dataset.code);onFilterChange(false)}
    else if(a==="zoom"){const pb=trailBoundsFor(card.dataset.code);const p=B.parks.find(x=>x.id===card.dataset.id);
      if(pb)map.fitBounds(pb.pad(.15),{maxZoom:13});else if(p)map.setView([p.lat,p.lng],10)}});
  $("#tmParks").addEventListener("change",e=>{
    const card=e.target.closest(".tm-card");if(!card)return;const id=card.dataset.id,a=e.target.dataset.a;
    if(a==="vis")B.toggle(id);else if(a==="yr")B.setField(id,"year",e.target.value.trim())});
  // settings
  const bind=(id,key,out,fmt,after)=>{const el=$(id);el.value=S[key];const show=()=>{if(out)$(out).textContent=fmt?fmt(el.value):el.value};show();
    el.oninput=()=>{S[key]=+el.value;st.set(key,S[key]);show();after&&after()}};
  bind("#tmWidth","width","#tmWidthOut",v=>v+" px",()=>draw(current,"",true));
  bind("#tmOpacity","opacity","#tmOpacityOut",v=>Math.round(v*100)+"%",()=>draw(current,"",true));
  bind("#tmRelief","relief","#tmReliefOut",v=>v+"%",applyTerrainLook);
  const chk=(id,key,after)=>{const el=$(id);el.checked=!!S[key];el.onchange=()=>{S[key]=el.checked;st.set(key,S[key]);after&&after()}};
  chk("#tmCasing","casing",()=>draw(current,"",true));chk("#tmDim","dim",applyTerrainLook);
  chk("#tmDots","dots",syncDotVisibility);chk("#tmNames","names",()=>{syncDotVisibility();updateLabels()});
  chk("#tmStates","states",updatePlaceLabels);chk("#tmCities","cities",updatePlaceLabels);
  chk("#tmRose","rose",()=>{roseEl&&(roseEl.style.display=S.rose?"":"none")});chk("#tmLegend","legend",renderLegend);
  $("#tmColorBy").onchange=e=>{S.colorBy=e.target.value;st.set("colorBy",S.colorBy);catColors.clear();draw(current,"",true)};
}
function trailBounds(){const b=L.latLngBounds([]);trailGroup.eachLayer(g=>g.getBounds&&b.extend(g.getBounds()));return b.isValid()?b:null}
function trailBoundsFor(code){const b=L.latLngBounds([]);(cache.get(code)||[]).forEach(f=>{const g=f.geometry;if(!g)return;const walk=c=>{if(typeof c[0]==="number")b.extend([c[1],c[0]]);else c.forEach(walk)};walk(g.coordinates)});return b.isValid()?b:null}
function setCollapsed(v){S.collapsed=v;st.set("collapsed",v);$("#tmWrap").classList.toggle("collapsed",v);setTimeout(()=>map&&map.invalidateSize(),280)}
function applyTerrainLook(){
  const r=S.relief/100,sat=1+r*.55-(S.dim?.28:0),con=1+r*.45,br=S.dim?.97:1;
  map.getPane("tilePane").style.filter=`contrast(${con.toFixed(2)}) saturate(${sat.toFixed(2)}) brightness(${br})`;
}

/* ---------------------------------------------------------------- public API */
function init(){
  if(ready)return;B=window.ParksBridge||fallbackBridge();
  buildMap();buildDots();wirePanel();
  B.subscribe(()=>{restyleDots();if($("#tab-trails").classList.contains("active")){renderCards();renderLegend()}});
  const narrow=matchMedia("(max-width:820px)").matches;setCollapsed(S.collapsed==null?narrow:S.collapsed);
  updatePlaceLabels();map.on("zoomend",updatePlaceLabels);
  roseEl&&(roseEl.style.display=S.rose?"":"none");applyTerrainLook();renderCards();renderLegend();
  ready=true;
  if(selParks.size||selStates.size){const pts=selectedParkPoints();if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(.6),{maxZoom:selParks.size?9.5:7,animate:false})}
  loadTrails();
}
window.TrailsMap={show(){init();setTimeout(()=>{map.invalidateSize();if(!selParks.size)scheduleView()},80)}};
})();
