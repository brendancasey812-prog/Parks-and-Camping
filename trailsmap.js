/* Trails Map tab: NPS trails drawn on the SAME map view as the Map tab (see TRAILS-MODULE.md).
   This file only adds the trails layer, its legend and its settings. Everything else (terrain, labels, park dots, hover cards,
   zoom, compass, visited toggles, taskbar filters) comes from the shared map view in app.js through window.ParksBridge. */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const KEY="tm_";
const st={get(k,d){try{const v=localStorage.getItem(KEY+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
          set(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const SERVICE="https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/MapServer/0";
const UNIT_ALIAS={SEQU:"SEKI",KICA:"SEKI"};           // Sequoia and Kings Canyon share one NPS unit code in the trails data
const PAGE=2000, BULK_LIMIT=40000, VIEW_CAP=16000, VIEW_ZOOM=8;
const unitOf=p=>UNIT_ALIAS[p.code]||p.code;

const S={colorBy:st.get("colorBy",""),width:st.get("width",3),opacity:st.get("opacity",.95),casing:st.get("casing",true),legend:st.get("legend",true),
         relief:st.get("relief",35),dim:st.get("dim",true),trails:st.get("trails",true)};
const PALETTE=["#e6194b","#f58231","#7b2ff7","#0072ce","#00a86b","#d81b8a","#ffb300","#00acc1","#8d6e63","#43a047"];
const SOLO="#e11d74";
const catColors=new Map();
let B=null,map=null,ready=false,meta=null,fields={unit:"UNITCODE",name:null,cats:[]};
let trailGroup,casingGroup,legendCtl,noteCtl,rendT,rendC;
let current=[],currentInfo={label:"",total:0,mode:""},token=0,ctrl=null,timer=0,lastKey="",loadedBucket=-1;
const cache=new Map();

/* ---------------------------------------------------------------- UI */
function status(t,err){if(noteCtl){noteCtl.el.hidden=!t;noteCtl.el.textContent=t||"";noteCtl.el.classList.toggle("err",!!err)}}
function parkName(code){const ps=B.parks.filter(p=>unitOf(p)===code);if(!ps.length)return code;return ps.length>1&&code==="SEKI"?"Sequoia & Kings Canyon":B.disp(ps[0])}
function catOf(f){if(!S.colorBy)return null;const p=f.properties||{};if(S.colorBy==="__park")return parkName(p[fields.unit]||"?");return String(p[S.colorBy]??"(blank)")}
function colorOf(v){if(v==null)return SOLO;if(!catColors.has(v))catColors.set(v,PALETTE[catColors.size%PALETTE.length]);return catColors.get(v)}
function elevRamp(){
  const stops=[[0,"#98be96"],[200,"#a6c898"],[600,"#bad09a"],[1100,"#ccd49e"],[1700,"#d6c894"],[2400,"#c4aa84"],[3100,"#b09a82"],[3800,"#c4bcb2"],[4400,"#eeece8"]];
  return `linear-gradient(90deg,#b8d2e0 0%,${stops.map(([e,c])=>`${c} ${(8+e/4400*92).toFixed(1)}%`).join(",")})`;
}
function renderLegend(){
  if(!legendCtl)return;const el=legendCtl.el;el.style.display=(S.legend&&S.trails)?"":"none";if(!S.legend||!S.trails)return;
  let h='<div class="sec"><h5>NPS trails</h5>';
  if(S.colorBy){
    const counts=new Map();current.forEach(f=>{const v=catOf(f);counts.set(v,(counts.get(v)||0)+1)});
    const rows=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,10);
    h+=rows.map(([v,c])=>`<div class="it"><span class="ln" style="border-color:${colorOf(v)}"></span><span>${esc(v)}</span><span>${c.toLocaleString()}</span></div>`).join("")||'<div class="it"><span>None loaded</span></div>';
    h+=`<div class="it" style="opacity:.6"><span>colored by ${S.colorBy==="__park"?"park":esc(S.colorBy)}</span></div>`;
  }else h+=`<div class="it"><span class="ln" style="border-color:${SOLO}"></span><span>Trail${current.length?"":" (none loaded)"}</span><span>${current.length?current.length.toLocaleString():""}</span></div>`;
  h+=`</div><div class="sec"><h5>Elevation</h5><div class="ramp" style="background:${elevRamp()}"></div><div class="rl"><span>sea level</span><span>1,700 m</span><span>4,400 m+</span></div></div>`;
  el.innerHTML=h;
}
function applyTerrainLook(){
  const r=S.relief/100,sat=1+r*.55-(S.dim?.28:0),con=1+r*.45,br=S.dim?.97:1;
  map.getPane("tilePane").style.filter=`contrast(${con.toFixed(2)}) saturate(${sat.toFixed(2)}) brightness(${br})`;
}

/* ---------------------------------------------------------------- service access */
async function getMeta(){
  if(meta)return meta;
  try{const r=await fetch(SERVICE+"?f=json");meta=await r.json()}catch(e){meta={fields:[]}}
  const f=(meta.fields||[]).map(x=>x.name),find=re=>f.find(n=>re.test(n))||null;
  fields.unit=find(/^unit_?code$/i)||find(/unit.*code/i)||"UNITCODE";
  fields.name=find(/^trl_?name$/i)||find(/^name$/i)||find(/trl.*name/i);
  fields.cats=f.filter(n=>/^(trl_?class|trl_?type|trl_?use|trl_?surface|trl_?status|seasonal|maintainer|trl_?cond)/i.test(n));
  const sel=$("#tmColorBy");sel.innerHTML='<option value="">One color (stand-out)</option><option value="__park">Park</option>'+fields.cats.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  sel.value=(S.colorBy==="__park"||fields.cats.includes(S.colorBy))?S.colorBy:"";if(sel.value!==S.colorBy)S.colorBy="";
  return meta;
}
const q=(params)=>new URLSearchParams({f:"geojson",outSR:"4326",outFields:"*",returnGeometry:"true",...params});
async function getJSON(url){const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)throw new Error("HTTP "+r.status);const g=await r.json();if(g.error)throw new Error(g.error.message||"service error");return g}
async function countOf(where,geom){const g=await getJSON(SERVICE+"/query?"+new URLSearchParams({where,returnCountOnly:"true",f:"json",...geom}));return g.count??0}
async function fetchAll(where,geom,total,offsetDeg,onProgress){
  const pages=[];for(let o=0;o<total;o+=PAGE)pages.push(o);
  const out=[];let next=0,done=0;
  const worker=async()=>{while(next<pages.length){const o=pages[next++];
    const g=await getJSON(SERVICE+"/query?"+q({where,resultOffset:String(o),resultRecordCount:String(PAGE),...(offsetDeg?{maxAllowableOffset:String(offsetDeg)}:{}),...geom}));
    out.push(...(g.features||[]));done++;onProgress&&onProgress(out.length,total)}};
  await Promise.all([worker(),worker(),worker(),worker()]);
  return out;
}

/* ---------------------------------------------------------------- what to load */
function currentUnits(){return [...new Set(B.visibleParks().map(unitOf))]}
function whereFor(units){
  const allUnits=new Set(B.parks.map(unitOf));
  if(units.length>=allUnits.size)return "1=1";
  return `${fields.unit} IN (${units.map(c=>`'${c.replace(/'/g,"")}'`).join(",")})`;
}
function detailOffset(z){const zb=z<5?4:z<7?6:z<9?8:z<11?10:12;return 360/(512*2**zb)/1.5}   // generalise lines to roughly the pixel size
async function reload(){
  if(!S.trails){drawNothing();status("");return}
  const my=++token;ctrl&&ctrl.abort();ctrl=new AbortController();
  await getMeta();
  const units=currentUnits();
  if(!units.length){drawNothing();status("No parks match the taskbar filters");return}
  const where=whereFor(units),z=map.getZoom();
  try{
    status("Counting trails…");
    const total=await countOf(where,{});
    if(my!==token)return;
    let features,mode;
    if(total<=BULK_LIMIT&&z<VIEW_ZOOM){                   // everything for the filtered parks, lightly generalised
      const key=`${where}|${Math.floor(z/2)}`;
      if(cache.has(key))features=cache.get(key);
      else{features=await fetchAll(where,{},total,detailOffset(z),(n,t)=>my===token&&status(`Loading trails… ${n.toLocaleString()} of ${t.toLocaleString()}`));
        if(my!==token)return;cache.set(key,features);if(cache.size>6)cache.delete(cache.keys().next().value)}
      mode="all";
    }else{                                                // detailed or very large: just the area in view
      if(z<VIEW_ZOOM-1&&total>BULK_LIMIT){drawNothing(total);status(`${total.toLocaleString()} trail segments match. Zoom in, or narrow the taskbar filters (state, park, designation).`);return}
      const b=map.getBounds().pad(.15),geom={geometry:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(","),geometryType:"esriGeometryEnvelope",inSR:"4326",spatialRel:"esriSpatialRelIntersects"};
      const n=Math.min(await countOf(where,geom),VIEW_CAP);if(my!==token)return;
      features=await fetchAll(where,geom,n,detailOffset(z),(k,t)=>my===token&&status(`Loading trails in view… ${k.toLocaleString()} of ${t.toLocaleString()}`));
      if(my!==token)return;mode="view";
    }
    loadedBucket=Math.floor(z/2);currentInfo={label:units.length+" park"+(units.length===1?"":"s"),total,mode};
    draw(features);
  }catch(e){if(e.name==="AbortError")return;status("NPS trails are unavailable right now ("+(e.message||"network")+"). The map still works.",true)}
}
function schedule(ms=350){clearTimeout(timer);timer=setTimeout(reload,ms)}

/* ---------------------------------------------------------------- drawing */
function drawNothing(total){current=[];trailGroup.clearLayers();casingGroup.clearLayers();currentInfo={label:"",total:total||0,mode:""};renderLegend()}
function draw(features,quiet){
  current=features;trailGroup.clearLayers();casingGroup.clearLayers();
  const w=S.width*(map.getZoom()<7?.75:1),big=features.length>8000;
  if(features.length){
    const make=(style,pane,renderer,tip)=>L.geoJSON({type:"FeatureCollection",features},{pane,renderer,style,onEachFeature:tip?(f,l)=>{
      const p=f.properties||{},unit=p[fields.unit]||"",nm=(fields.name&&p[fields.name])||"Trail";
      const extra=fields.cats.slice(0,3).map(k=>p[k]!=null&&p[k]!==""?`${esc(k)}: ${esc(p[k])}`:"").filter(Boolean).join(" · ");
      l.bindTooltip(`<b>${esc(nm)}</b><div class="tt">${esc(parkName(unit))}</div>${extra?`<div class="tt">${extra}</div>`:""}`,{className:"lbl",sticky:true});
      l.on("click",e=>{L.DomEvent.stopPropagation(e);openTrailCard(e.latlng,nm,unit,extra)});
    }:undefined});
    if(S.casing&&!big)make({color:"#ffffff",weight:w+3.2,opacity:Math.min(.9,S.opacity),lineCap:"round",lineJoin:"round"},"tm-casing",rendC,false).addTo(casingGroup);
    make(f=>({color:colorOf(catOf(f)),weight:w,opacity:S.opacity,lineCap:"round",lineJoin:"round"}),"tm-trails",rendT,true).addTo(trailGroup);
  }
  if(!quiet){const n=features.length,t=currentInfo.total;
    status(n?`${n.toLocaleString()} trail segment${n===1?"":"s"} · ${currentInfo.label}${currentInfo.mode==="view"?" in view":""}${t>n&&currentInfo.mode==="view"&&n>=VIEW_CAP?" (zoom in for the rest)":""}`:`No trails found for ${currentInfo.label}`)}
  renderLegend();
}
function openTrailCard(latlng,name,unit,extra){
  const pk=B.parks.find(p=>unitOf(p)===unit);
  L.popup({autoPanPadding:[24,70],maxWidth:270}).setLatLng(latlng).setContent(
    `<strong>${esc(name)}</strong><div class="tt">${esc(parkName(unit))}${pk?" · "+esc(B.fld(pk,"d")):""}</div>${extra?`<div class="tt">${extra}</div>`:""}
     <div class="pp"><button type="button" data-tm="only" data-unit="${esc(unit)}">Show only this park</button>${pk?`<a href="${esc(B.infoUrl(pk))}" target="_blank" rel="noopener">Park page ↗</a>`:""}</div>`).openOn(map);
}

/* ---------------------------------------------------------------- wiring */
function init(){
  if(ready)return;B=window.ParksBridge;map=B.view.map;if(!map)return;
  ["casing","trails"].forEach((n,i)=>{map.createPane("tm-"+n).style.zIndex=String(262+i*4)});
  rendC=L.canvas({pane:"tm-casing",padding:.3});rendT=L.canvas({pane:"tm-trails",padding:.3});
  trailGroup=L.layerGroup().addTo(map);casingGroup=L.layerGroup().addTo(map);
  const Note=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","trailnote");d.hidden=true;this.el=d;return d}});
  noteCtl=new Note({position:"topright"}).addTo(map);
  const Leg=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","tm-legend");L.DomEvent.disableClickPropagation(d);L.DomEvent.disableScrollPropagation(d);this.el=d;return d}});
  legendCtl=new Leg({position:"bottomright"}).addTo(map);
  // the trails legend sits above the parks legend
  setTimeout(()=>{const c=legendCtl.getContainer();c.parentNode.insertBefore(c,c.parentNode.firstChild)},0);
  map.getContainer().addEventListener("click",e=>{const b=e.target.closest("button[data-tm=only]");if(b){map.closePopup();B.setUnitFilter([...new Set(B.parks.filter(p=>unitOf(p)===b.dataset.unit).map(p=>p.code))])}});
  // settings
  const bind=(id,key,out,fmt,after)=>{const el=$(id);el.value=S[key];const show=()=>{if(out)$(out).textContent=fmt(el.value)};show();
    el.oninput=()=>{S[key]=+el.value;st.set(key,S[key]);show();after()}};
  bind("#tmWidth","width","#tmWidthOut",v=>v+" px",()=>draw(current,true));
  bind("#tmOpacity","opacity","#tmOpacityOut",v=>Math.round(v*100)+"%",()=>draw(current,true));
  bind("#tmRelief","relief","#tmReliefOut",v=>v+"%",applyTerrainLook);
  const chk=(id,key,after)=>{const el=$(id);el.checked=!!S[key];el.onchange=()=>{S[key]=el.checked;st.set(key,S[key]);after()}};
  chk("#tmCasing","casing",()=>draw(current,true));chk("#tmDim","dim",applyTerrainLook);chk("#tmLegend","legend",renderLegend);
  chk("#tmTrails","trails",()=>{if(S.trails)reload();else{drawNothing();status("");renderLegend()}});
  $("#tmColorBy").onchange=e=>{S.colorBy=e.target.value;st.set("colorBy",S.colorBy);catColors.clear();draw(current,true)};
  // hamburger (same behaviour as the List Format menu)
  const hamb=$("#tmHamb"),hb=hamb.querySelector(".hamb-btn"),hm=hamb.querySelector(".hamb-menu");let tt=0,pinned=false;
  const open=()=>{clearTimeout(tt);hm.hidden=false;hb.setAttribute("aria-expanded","true")};
  const close=(d=0)=>{clearTimeout(tt);tt=setTimeout(()=>{hm.hidden=true;pinned=false;hb.setAttribute("aria-expanded","false")},d)};
  hamb.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")open()});
  hamb.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!pinned)close(450)});
  hb.addEventListener("click",()=>{if(hm.hidden){open();pinned=true}else if(!pinned)pinned=true;else close(0)});
  document.addEventListener("click",e=>{if(!hamb.contains(e.target)&&!hm.hidden)close(0)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!hm.hidden)close(0)});
  // reload whenever the taskbar filters change which parks are in play, or the view changes enough
  lastKey=currentUnits().sort().join(",");
  B.subscribe(()=>{if(!$("#tab-trails").classList.contains("active"))return;const k=currentUnits().sort().join(",");if(k!==lastKey){lastKey=k;schedule(200)}});
  map.on("moveend",()=>{if(!$("#tab-trails").classList.contains("active"))return;const z=map.getZoom();if(currentInfo.mode==="all"&&z<VIEW_ZOOM&&Math.floor(z/2)===loadedBucket)return;schedule()});
  map.on("zoomend",()=>{ if(current.length&&currentInfo.mode==="all")draw(current,true)});
  applyTerrainLook();renderLegend();
  ready=true;reload();
}
window.TrailsMap={show(){init();if(ready){setTimeout(()=>{map.invalidateSize()},60);const k=currentUnits().sort().join(",");if(k!==lastKey){lastKey=k;schedule(100)}}}};
})();
