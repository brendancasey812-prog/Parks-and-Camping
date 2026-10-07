/* Trails: NPS trail data store + Trail Map layer + Trail Information dialog (see TRAILS-MODULE.md).
   The map itself, the park dots, hover cards, zoom, compass and taskbar filters come from the shared app (window.ParksBridge).
   This file loads the NPS Public Trails data for the parks the taskbar is showing, turns it into named trail records for
   the Trail Info grid and Trail List, and draws it on the Trail Map with names and clickable trails. */
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
const PAGE=2000, BULK_LIMIT=40000, VIEW_CAP=16000, VIEW_ZOOM=8, NAME_ZOOM=9.5, BULK_OFFSET=0.004;
const unitOf=p=>UNIT_ALIAS[p.code]||p.code;

const S={colorBy:st.get("colorBy",""),width:st.get("width",3),opacity:st.get("opacity",.95),casing:st.get("casing",true),legend:st.get("legend",true),
         relief:st.get("relief",35),dim:st.get("dim",true),trails:st.get("trails",true),names:st.get("names",true)};
const PALETTE=["#e6194b","#f58231","#7b2ff7","#0072ce","#00a86b","#d81b8a","#ffb300","#00acc1","#8d6e63","#43a047"];
const SOLO="#e11d74";
const catColors=new Map();
let B=null,map=null,ready=false,meta=null,fields={unit:"UNITCODE",name:null,cats:[],all:[]};
let trailGroup,casingGroup,labelGroup,hiGroup,legendCtl,noteCtl,rendT,rendC;
let bulk={key:"",features:[],records:[],total:0,tooMany:false,loading:null};   // everything for the taskbar's parks
let current=[],drawRecs=[],currentInfo={label:"",total:0,mode:""},token=0,ctrl=null,timer=0,labelTimer=0,loadedBucket=-1;
const recByKey=new Map();

/* ---------------------------------------------------------------- helpers */
function parkName(code){const ps=B.parks.filter(p=>unitOf(p)===code);if(!ps.length)return code;return code==="SEKI"?"Sequoia & Kings Canyon":B.disp(ps[0])}
function say(t,err){if(noteCtl){noteCtl.el.hidden=!t;noteCtl.el.textContent=t||"";noteCtl.el.classList.toggle("err",!!err)}}
function currentUnits(){return [...new Set(B.visibleParks().map(unitOf))].sort()}
function whereFor(units){
  const all=new Set(B.parks.map(unitOf));
  if(units.length>=all.size)return "1=1";
  return `${fields.unit} IN (${units.map(c=>`'${String(c).replace(/'/g,"")}'`).join(",")})`;
}
const q=(params)=>new URLSearchParams({f:"geojson",outSR:"4326",outFields:"*",returnGeometry:"true",...params});
async function getJSON(url,signal){const r=await fetch(url,{signal});if(!r.ok)throw new Error("HTTP "+r.status);const g=await r.json();if(g.error)throw new Error(g.error.message||"service error");return g}
async function countOf(where,geom,signal){const g=await getJSON(SERVICE+"/query?"+new URLSearchParams({where,returnCountOnly:"true",f:"json",...geom}),signal);return g.count??0}
async function fetchAll(where,geom,total,offsetDeg,signal,onProgress){
  const pages=[];for(let o=0;o<total;o+=PAGE)pages.push(o);
  const out=[];let next=0;
  const worker=async()=>{while(next<pages.length){const o=pages[next++];
    const g=await getJSON(SERVICE+"/query?"+q({where,resultOffset:String(o),resultRecordCount:String(PAGE),...(offsetDeg?{maxAllowableOffset:String(offsetDeg)}:{}),...geom}),signal);
    out.push(...(g.features||[]));onProgress&&onProgress(out.length,total)}};
  await Promise.all([worker(),worker(),worker(),worker()]);
  return out;
}
async function getMeta(){
  if(meta)return meta;
  try{const r=await fetch(SERVICE+"?f=json");meta=await r.json()}catch(e){meta={fields:[]}}
  const f=(meta.fields||[]).map(x=>x.name),find=re=>f.find(n=>re.test(n))||null;
  fields.all=f;
  fields.unit=find(/^unit_?code$/i)||find(/unit.*code/i)||"UNITCODE";
  fields.name=find(/^trl_?name$/i)||find(/^trail_?name$/i)||find(/^name$/i)||f.find(n=>/name/i.test(n)&&!/unit|map|region|maint|alt|park|state|owner|source/i.test(n))||null;
  fields.cats=f.filter(n=>/^(trl_?class|trl_?type|trl_?use|trl_?surface|trl_?status|seasonal|maintainer|trl_?cond)/i.test(n));
  const sel=$("#tmColorBy");sel.innerHTML='<option value="">One color (stand-out)</option><option value="__park">Park</option>'+fields.cats.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  sel.value=(S.colorBy==="__park"||fields.cats.includes(S.colorBy))?S.colorBy:"";if(sel.value!==S.colorBy)S.colorBy="";
  const info=$("#tmFieldInfo");if(info)info.textContent=f.length?`Trail data: ${f.length} fields · name field: ${fields.name||"none found (trails show as unnamed)"} · park field: ${fields.unit}`:"Trail data: field list unavailable (the service did not answer)";
  return meta;
}
function nameKeyFor(features){                      // the layer metadata may be unavailable; learn the name field from the data itself
  if(fields.name)return fields.name;
  const p=(features.find(f=>f.properties)||{}).properties||{};
  const k=Object.keys(p).find(n=>/^(trl_?name|trail_?name|name)$/i.test(n))||Object.keys(p).find(n=>/name/i.test(n)&&!/unit|map|region|maint|alt|park|state|owner|source/i.test(n));
  if(k)fields.name=k;return fields.name;
}

/* ---------------------------------------------------------------- aggregate segments into named trails */
function hav(a,b){const R=3958.8,p=Math.PI/180,dLat=(b[1]-a[1])*p,dLon=(b[0]-a[0])*p;const x=Math.sin(dLat/2)**2+Math.cos(a[1]*p)*Math.cos(b[1]*p)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function lines(g){if(!g)return[];return g.type==="LineString"?[g.coordinates]:g.type==="MultiLineString"?g.coordinates:[]}
function aggregate(features){
  const nk=nameKeyFor(features),map=new Map();
  for(const f of features){
    const p=f.properties||{},unit=String(p[fields.unit]||"?"),raw=nk?String(p[nk]??"").trim():"",name=raw||"";
    const key=unit+"|"+name.toLowerCase();let r=map.get(key);
    if(!r){r={key,unit,name,len:0,segs:0,cats:{},attrs:p,best:0,mid:null,b:[90,180,-90,-180]};map.set(key,r)}
    r.segs++;
    for(const ln of lines(f.geometry)){
      let seg=0;for(let i=1;i<ln.length;i++)seg+=hav(ln[i-1],ln[i]);
      r.len+=seg;if(seg>=r.best&&ln.length){r.best=seg;r.mid=ln[Math.floor(ln.length/2)]}
      for(const c of ln){r.b[0]=Math.min(r.b[0],c[1]);r.b[1]=Math.min(r.b[1],c[0]);r.b[2]=Math.max(r.b[2],c[1]);r.b[3]=Math.max(r.b[3],c[0])}
    }
    for(const k of fields.cats){const v=p[k];if(v!=null&&v!==""){(r.cats[k]=r.cats[k]||{})[v]=(r.cats[k][v]||0)+1}}
  }
  const top=o=>o?Object.entries(o).sort((a,b)=>b[1]-a[1])[0][0]:"";
  return [...map.values()].map(r=>{
    const ps=B.parks.filter(p=>unitOf(p)===r.unit),pk=ps[0];
    const states=[...new Set(ps.flatMap(p=>p.states))];
    const labelBits=fields.cats.slice(0,2).map(k=>top(r.cats[k])).filter(Boolean);
    const surface=fields.cats.find(k=>/surface/i.test(k));
    return {id:"T:"+r.key,key:r.key,kind:"trail",name:r.name||"Unnamed trails",title:r.name||"Unnamed trails",named:!!r.name,code:r.unit,
      parkD:pk?B.fld(pk,"d"):"",np63:ps.some(p=>p.np63),states,city:parkName(r.unit),state:states.join(" / "),
      d:labelBits.join(" · ")||"Trail",hl:`${r.len.toFixed(1)} mi · ${r.segs} segment${r.segs===1?"":"s"}${surface&&top(r.cats[surface])?" · "+top(r.cats[surface]):""}`,
      lat:r.mid?r.mid[1]:(pk?pk.lat:0),lng:r.mid?r.mid[0]:(pk?pk.lng:0),len:r.len,segs:r.segs,bounds:r.b,attrs:r.attrs,url:"",approx:false};
  }).sort((a,b)=>a.title.localeCompare(b.title));
}

/* ---------------------------------------------------------------- bulk data for the grid, the list and the map's wide views */
function ensureLoaded(){
  if(!window.ParksBridge)return Promise.resolve();
  B=window.ParksBridge;
  const units=currentUnits(),key=units.join(",");
  if(bulk.key===key&&(bulk.loading||bulk.records.length||bulk.tooMany||bulk.done))return bulk.loading||Promise.resolve();
  bulk.key=key;bulk.done=false;bulk.tooMany=false;
  const my=++token;ctrl&&ctrl.abort();ctrl=new AbortController();const signal=ctrl.signal;
  bulk.loading=(async()=>{
    try{
      await getMeta();
      if(!units.length){bulk.features=[];bulk.records=[];B.setTrails([],"No parks match the taskbar filters");return}
      B.setTrails([],"Loading trails…");say("Counting trails…");
      const where=whereFor(units),total=await countOf(where,{},signal);if(my!==token)return;
      bulk.total=total;
      if(total>BULK_LIMIT){bulk.features=[];bulk.records=[];bulk.tooMany=true;
        B.setTrails([],`${total.toLocaleString()} trail segments match. Narrow with the taskbar filters (state, park, designation).`);
        say(`${total.toLocaleString()} trail segments match. Zoom in, or narrow the taskbar filters.`);return}
      const feats=await fetchAll(where,{},total,BULK_OFFSET,signal,(n,t)=>{if(my===token){say(`Loading trails… ${n.toLocaleString()} of ${t.toLocaleString()}`)}});
      if(my!==token)return;
      bulk.features=feats;bulk.records=aggregate(feats);recByKey.clear();bulk.records.forEach(r=>recByKey.set(r.key,r));
      bulk.done=true;
      B.setTrails(bulk.records,`${total.toLocaleString()} segments`);
      say("");
    }catch(e){if(e.name==="AbortError")return;B.setTrails([],"NPS trails are unavailable right now ("+(e.message||"network")+")");say("NPS trails are unavailable right now ("+(e.message||"network")+"). The map still works.",true)}
    finally{if(my===token)bulk.loading=null}
  })();
  return bulk.loading;
}

/* ---------------------------------------------------------------- map drawing */
function catOf(f){if(!S.colorBy)return null;const p=f.properties||{};if(S.colorBy==="__park")return parkName(p[fields.unit]||"?");return String(p[S.colorBy]??"(blank)")}
function colorOf(v){if(v==null)return SOLO;if(!catColors.has(v))catColors.set(v,PALETTE[catColors.size%PALETTE.length]);return catColors.get(v)}
function recKeyOf(f){const p=f.properties||{},nk=fields.name;return String(p[fields.unit]||"?")+"|"+String(nk?(p[nk]??""):"").trim().toLowerCase()}
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
function drawNothing(total){current=[];drawRecs=[];trailGroup.clearLayers();casingGroup.clearLayers();labelGroup.clearLayers();currentInfo={label:"",total:total||0,mode:""};renderLegend()}
function draw(features,quiet){
  current=features;trailGroup.clearLayers();casingGroup.clearLayers();
  drawRecs=features.length?(currentInfo.mode==="all"&&bulk.features===features?bulk.records:aggregate(features)):[];
  const w=S.width*(map.getZoom()<7?.75:1),big=features.length>8000;
  if(features.length){
    const make=(style,tip)=>L.geoJSON({type:"FeatureCollection",features},{style,onEachFeature:tip?(f,l)=>{
      const p=f.properties||{},unit=p[fields.unit]||"",nm=(fields.name&&p[fields.name])||"";
      const extra=fields.cats.slice(0,3).map(k=>p[k]!=null&&p[k]!==""?`${esc(k)}: ${esc(p[k])}`:"").filter(Boolean).join(" · ");
      l.bindTooltip(`<b>${esc(nm||"Unnamed trail")}</b><div class="tt">${esc(parkName(unit))}</div>${extra?`<div class="tt">${extra}</div>`:""}<div class="tt">Click for trail information</div>`,{className:"lbl",sticky:true});
      l.on("click",e=>{L.DomEvent.stopPropagation(e);openInfo(recKeyOf(f))});
    }:undefined});
    if(S.casing&&!big)make({color:"#ffffff",weight:w+3.2,opacity:Math.min(.9,S.opacity),lineCap:"round",lineJoin:"round"},false).addTo(casingGroup);
    make(f=>({color:colorOf(catOf(f)),weight:w,opacity:S.opacity,lineCap:"round",lineJoin:"round"}),true).addTo(trailGroup);
    B.view.group&&B.view.group.eachLayer(l=>l.bringToFront&&l.bringToFront());   // park dots stay on top of the trails
  }
  if(!quiet){const n=features.length,t=currentInfo.total;
    say(n?`${n.toLocaleString()} trail segment${n===1?"":"s"} · ${currentInfo.label}${currentInfo.mode==="view"?" in view":""}${t>n&&currentInfo.mode==="view"&&n>=VIEW_CAP?" (zoom in for the rest)":""}`:`No trails found for ${currentInfo.label}`)}
  renderLegend();updateNames();
}
/* trail names beside the trails (one label per named trail, no overlaps) */
function updateNames(){
  labelGroup.clearLayers();if(!S.names||!S.trails||map.getZoom()<NAME_ZOOM||!drawRecs.length)return;
  const b=map.getBounds().pad(.05),cells=new Set(),out=[];
  const cand=drawRecs.filter(r=>r.named&&r.lat&&b.contains([r.lat,r.lng])).sort((a,c)=>c.len-a.len);
  for(const r of cand){
    const pt=map.latLngToContainerPoint([r.lat,r.lng]),cx=Math.round(pt.x/130),cy=Math.round(pt.y/26),k=cx+","+cy;
    if(cells.has(k))continue;cells.add(k);out.push(r);if(out.length>=90)break;
  }
  out.forEach(r=>{
    const m=L.marker([r.lat,r.lng],{pane:"tm-labels",keyboard:false,icon:L.divIcon({className:"trlab",html:`<span>${esc(r.name)}</span>`,iconSize:[0,0]})});
    m.on("click",e=>{L.DomEvent.stopPropagation(e);openInfo(r.key||r.id.slice(2))});labelGroup.addLayer(m)});
}
/* ---------------------------------------------------------------- what the map loads */
async function reload(){
  if(!S.trails){drawNothing();say("");return}
  const my=++token;ctrl&&ctrl.abort();ctrl=new AbortController();
  await getMeta();
  const units=currentUnits();
  if(!units.length){drawNothing();say("No parks match the taskbar filters");return}
  const z=map.getZoom();
  try{
    const wasKey=bulk.key;await ensureLoaded();if(wasKey!==bulk.key&&my!==token){}
    if(bulk.key!==units.join(","))return;
    if(bulk.done&&z<VIEW_ZOOM){loadedBucket=Math.floor(z/2);currentInfo={label:units.length+" park"+(units.length===1?"":"s"),total:bulk.total,mode:"all"};draw(bulk.features);return}
    if(bulk.tooMany&&z<VIEW_ZOOM-1){drawNothing(bulk.total);say(`${bulk.total.toLocaleString()} trail segments match. Zoom in, or narrow the taskbar filters (state, park, designation).`);return}
    // detailed (or very large): just the area in view
    const my2=++token;ctrl&&ctrl.abort();ctrl=new AbortController();const signal=ctrl.signal;
    const where=whereFor(units),bb=map.getBounds().pad(.15),geom={geometry:[bb.getWest(),bb.getSouth(),bb.getEast(),bb.getNorth()].join(","),geometryType:"esriGeometryEnvelope",inSR:"4326",spatialRel:"esriSpatialRelIntersects"};
    say("Loading trails in view…");
    const n=Math.min(await countOf(where,geom,signal),VIEW_CAP);if(my2!==token)return;
    const zb=z<9?8:z<11?10:12,off=360/(512*2**zb)/1.5;
    const feats=await fetchAll(where,geom,n,off,signal,(k,t)=>my2===token&&say(`Loading trails in view… ${k.toLocaleString()} of ${t.toLocaleString()}`));
    if(my2!==token)return;loadedBucket=Math.floor(z/2);currentInfo={label:units.length+" park"+(units.length===1?"":"s"),total:n,mode:"view"};draw(feats);
  }catch(e){if(e.name==="AbortError")return;say("NPS trails are unavailable right now ("+(e.message||"network")+"). The map still works.",true)}
}
function schedule(ms=350){clearTimeout(timer);timer=setTimeout(reload,ms)}

/* ---------------------------------------------------------------- trail information dialog */
function findRec(key){
  return recByKey.get(key)||drawRecs.find(r=>(r.key||r.id.slice(2))===key)||(B.trailRecords().find(r=>r.id==="T:"+key))||null;
}
const LABELS={trlname:"Trail name",trailname:"Trail name",unitcode:"Park code",unitname:"Park",trlclass:"Trail class",trlsurface:"Surface",trluse:"Allowed use",trltype:"Trail type",trlstatus:"Status",trlcond:"Condition",
  seasonal:"Seasonal",maintainer:"Maintained by",trlalttype:"Alternate type",trlaltname:"Other name",regioncode:"Region",stateabbr:"State",statename:"State",shape_length:"Length (map units)"};
function labelFor(k){const l=LABELS[k.toLowerCase().replace(/_/g,"")]||LABELS[k.toLowerCase()];if(l)return l;
  return k.replace(/^(TRL|TRAIL)_?/i,"Trail ").replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
function openInfo(keyOrId){
  const key=keyOrId.startsWith("T:")?keyOrId.slice(2):keyOrId;
  const rec=findRec(key);if(!rec)return;
  const pk=B.parks.find(p=>unitOf(p)===rec.code);
  const skip=/^(objectid|globalid|shape|shape_|created|last_edited|geometry|gis_|source_|dataaccess)/i;
  const attrs=Object.entries(rec.attrs||{}).filter(([k,v])=>v!=null&&v!==""&&!skip.test(k)).slice(0,24);
  const d=$("#trailDlg"),id=rec.id;
  $("#trailDlgBody").innerHTML=`<div class="in"><h2>${esc(B.disp(rec))}</h2>
    <div class="sub">${esc(rec.city)}${rec.state?" · "+esc(rec.state):""}${pk?" · "+esc(B.fld(pk,"d")):""}</div>
    <div class="stats"><div class="stat"><b>${rec.len.toFixed(1)} mi</b>approx. length</div><div class="stat"><b>${rec.segs}</b>segment${rec.segs===1?"":"s"}</div><div class="stat"><b>${esc(rec.d)}</b>class / use</div></div>
    <table>${attrs.map(([k,v])=>`<tr><td>${esc(labelFor(k))}</td><td>${esc(v)}</td></tr>`).join("")||"<tr><td colspan=2>No further details were published for this trail.</td></tr>"}</table>
    <div class="act"><label><input type="checkbox" id="tdHiked" ${B.isChecked(id)?"checked":""}> Hiked</label>
      <label>Year <input type="text" id="tdYear" maxlength="40" placeholder="—" value="${esc(B.fld(rec,"year"))}"></label></div>
    <div class="act"><button type="button" class="pri" id="tdMap">Show on map</button><button type="button" id="tdOnly">Only this park</button>${pk?`<a href="${esc(B.infoUrl(pk))}" target="_blank" rel="noopener">Park page ↗</a>`:""}</div></div>`;
  $("#tdHiked").onchange=()=>{B.toggle(id)};
  $("#tdYear").onchange=e=>B.setField(id,"year",e.target.value.trim());
  $("#tdMap").onclick=()=>{d.close();showOnMap(rec)};
  $("#tdOnly").onclick=()=>{d.close();B.setUnitFilter([...new Set(B.parks.filter(p=>unitOf(p)===rec.code).map(p=>p.code))])};
  if(!d.open)d.showModal();
}
function showOnMap(rec){
  B.tabs.showTab("trails");
  const go=()=>{
    const b=rec.bounds;if(b&&b[0]<90){map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{maxZoom:13,padding:[80,80]})}
    hiGroup.clearLayers();
    const feats=bulk.features.filter(f=>recKeyOf(f)===(rec.key||rec.id.slice(2)));
    if(feats.length){L.geoJSON({type:"FeatureCollection",features:feats},{pane:"tm-hi",style:{color:"#ffd400",weight:7,opacity:.95,lineCap:"round"},interactive:false}).addTo(hiGroup);
      setTimeout(()=>hiGroup.clearLayers(),9000)}
  };
  setTimeout(go,150);
}

/* ---------------------------------------------------------------- wiring */
function init(){
  if(ready)return;B=window.ParksBridge;map=B.view.map;if(!map)return;
  map.createPane("tm-hi").style.zIndex="262";
  map.createPane("tm-labels").style.zIndex="430";map.getPane("tm-labels").style.pointerEvents="auto";
  trailGroup=L.layerGroup().addTo(map);casingGroup=L.layerGroup().addTo(map);labelGroup=L.layerGroup().addTo(map);hiGroup=L.layerGroup().addTo(map);
  const Note=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","trailnote");d.hidden=true;this.el=d;return d}});
  noteCtl=new Note({position:"topright"}).addTo(map);
  const Leg=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","tm-legend");L.DomEvent.disableClickPropagation(d);L.DomEvent.disableScrollPropagation(d);this.el=d;return d}});
  legendCtl=new Leg({position:"bottomright"}).addTo(map);
  setTimeout(()=>{const c=legendCtl.getContainer();c.parentNode.insertBefore(c,c.parentNode.firstChild)},0);   // the trails legend sits above the parks legend
  const bind=(id,key,out,fmt,after)=>{const el=$(id);el.value=S[key];const show=()=>{if(out)$(out).textContent=fmt(el.value)};show();el.oninput=()=>{S[key]=+el.value;st.set(key,S[key]);show();after()}};
  bind("#tmWidth","width","#tmWidthOut",v=>v+" px",()=>draw(current,true));
  bind("#tmOpacity","opacity","#tmOpacityOut",v=>Math.round(v*100)+"%",()=>draw(current,true));
  bind("#tmRelief","relief","#tmReliefOut",v=>v+"%",applyTerrainLook);
  const chk=(id,key,after)=>{const el=$(id);el.checked=!!S[key];el.onchange=()=>{S[key]=el.checked;st.set(key,S[key]);after()}};
  chk("#tmCasing","casing",()=>draw(current,true));chk("#tmDim","dim",applyTerrainLook);chk("#tmLegend","legend",renderLegend);
  chk("#tmTrails","trails",()=>{if(S.trails)reload();else{drawNothing();say("");renderLegend()}});
  chk("#tmNames","names",updateNames);
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
  map.on("moveend",()=>{if(B.tab()!=="trails")return;clearTimeout(labelTimer);labelTimer=setTimeout(updateNames,120);const z=map.getZoom();if(currentInfo.mode==="all"&&z<VIEW_ZOOM&&Math.floor(z/2)===loadedBucket)return;schedule()});
  applyTerrainLook();renderLegend();
  ready=true;reload();
}
let lastKey="";
function onBridgeChange(){
  if(!B)return;const tab=B.tab();if(!/^(tgrid|tlist|trails)$/.test(tab))return;
  const k=currentUnits().join(",");
  if(k!==lastKey){lastKey=k;ensureLoaded().then(()=>{if(B.tab()==="trails"&&ready)schedule(100)})}
}
function wireBridge(){if(window.ParksBridge&&!B){B=window.ParksBridge;B.subscribe(onBridgeChange)}}
wireBridge();
window.TrailsMap={
  ensureLoaded(){wireBridge();if(!B)return Promise.resolve();lastKey=currentUnits().join(",");return ensureLoaded()},
  show(){wireBridge();init();if(ready){setTimeout(()=>{map.invalidateSize()},60);lastKey=currentUnits().join(",");ensureLoaded().then(()=>schedule(100))}},
  openInfo:id=>{wireBridge();openInfo(id)},
  showOnMap:rec=>{wireBridge();showOnMap(rec)}
};
// the page may have opened straight onto a trails tab (before this file existed)
if(B){const t0=B.tab();if(t0==="trails")window.TrailsMap.show();else if(t0==="tgrid"||t0==="tlist")window.TrailsMap.ensureLoaded()}
})();
