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
const official=(p,k)=>k==="name"?p.name:k==="d"?p.d:k==="year"?"":(p[k]??"");
const isEdited=(p,k)=>k!=="visited"&&String(fld(p,k)??"")!==String(official(p,k));
const disp=p=>(edits[p.id]&&edits[p.id].name)?edits[p.id].name:p.title;     // name shown on cards, map and visited list
const pstates=p=>{const e=edits[p.id]&&edits[p.id].state;return e?[...new Set(p.states.concat(String(e).split(/\s*[\/,]\s*/).filter(Boolean)))]:p.states};
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
multiSelect($("#fDesig"),"Designation",[{value:"__NP63",text:"★ National Parks — the 63",n:parks.filter(p=>p.np63).length}].concat(DESIG.map(d=>({value:d,text:d,n:[...parks,...caParks].filter(p=>p.d===d).length}))),filt.d);
multiSelect($("#fVisited"),"Status",[{value:"1",text:"Checked"},{value:"0",text:"Unchecked"}],filt.v);
function visible(src=parks){
  const q=filt.q.toLowerCase().trim();
  return src.filter(p=>(!q||(disp(p)+" "+fld(p,"name")+" "+fld(p,"d")+" "+fld(p,"city")+" "+fld(p,"state")+" "+p.code+" "+pstates(p).join(" ")).toLowerCase().includes(q))
    &&(!filt.st.size||pstates(p).some(s=>filt.st.has(s)))&&(!filt.d.size||filt.d.has(fld(p,"d"))||(filt.d.has("__NP63")&&p.np63))
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
  document.body.classList.toggle("map-mode",t==="map");
  if(t==="map"){initMap();setTimeout(()=>map.invalidateSize(),60)}
  if(t==="about")renderEditsPanel();
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
    <div class="body"><h3><a href="${esc(p.url||infoUrl(p))}" target="_blank" rel="noopener">${esc(disp(p))}</a>${isEdited(p,"name")?' <span class="ed" title="Official: '+esc(p.title)+'">edited</span>':""}</h3>
    <div class="meta">${esc(fld(p,"d"))} · ${p.states.slice(0,4).join(", ")}${p.states.length>4?" +"+(p.states.length-4):""}</div>
    ${fld(p,"year")?`<div class="meta yr">Last visited ${esc(fld(p,"year"))}</div>`:""}${fld(p,"city")?`<div class="meta">Near ${esc(fld(p,"city"))}${fld(p,"state")?", "+esc(fld(p,"state")):""}</div>`:""}${p.blurb?`<p>${p.blurb}</p>`:""}</div></article>`).join("");
}
$("#grid").onclick=e=>{const d=e.target.closest(".dot");if(d)toggle(d.closest(".card").dataset.id)};
$("#grid").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){const d=e.target.closest(".dot");if(d){e.preventDefault();toggle(d.closest(".card").dataset.id)}}};

// ---------- visited list ----------
function renderVisited(){
  const list=[...parks,...caParks].filter(p=>checked.has(p.id));
  $("#vcount").textContent=`${list.length} checked`;
  $("#vlist").innerHTML=list.map(p=>`<li data-id="${p.id}"><span class="dot on" style="cursor:pointer"></span>${esc(disp(p))}${fld(p,"year")?` <small class="yrs">· ${esc(fld(p,"year"))}</small>`:""}</li>`).join("")||"<li>Nothing checked yet.</li>";
}
$("#vlist").onclick=e=>{const li=e.target.closest("li[data-id]");if(li&&e.target.closest(".dot"))toggle(li.dataset.id)};

// ---------- map (self-hosted terrain tiles + vector overlays; no external services) ----------
const views={lower48:[[24.5,-125.5],[49.8,-66]],ak:[[51,-170],[71.8,-129]],hi:[[18.8,-160.6],[22.4,-154.6]],terr:[[-15,-171.5],[19.5,-64]]};
let markers=new Map(),group,roseCtl;
const coarse=matchMedia("(pointer:coarse)").matches;
const radius=()=>Math.max(coarse?6:3,(2+map.getZoom()*0.9)*dotScale);
const style=p=>({...(checked.has(p.id)?{fillColor:"#e5383b",color:"#ffffff",fillOpacity:1,weight:2}
                                :{fillColor:"#8a949b",color:"#ffffff",fillOpacity:.92,weight:1.6}),dashArray:p.approx?"2 2":null,...(p.kind==="ca"?{color:"#1b6d73",weight:2.4}:{})});
const infoUrl=p=>p.url||("https://www.google.com/search?q="+encodeURIComponent(p.name+" "+(p.kind==="ca"?"California State Parks":"")));
const typeLine=p=>`<div class="tt">${esc(fld(p,"d")||"Unit")} · ${esc(p.states.slice(0,2).join(", ")||"")}${p.states.length>2?" +"+(p.states.length-2)+" more":""}</div>`+(isEdited(p,"name")?`<div class="tt ed2">Official name: ${esc(p.title)}</div>`:"");
const tipName=p=>`<a class="lnk" href="${esc(infoUrl(p))}" target="_blank" rel="noopener" title="Open info page">${esc(disp(p))}</a>`+(p.kind==="ca"?" <small>(CA State Parks)</small>":"")+(p.approx?" <small>(approx.)</small>":"");
const tipFull=p=>tipName(p)+typeLine(p);

// 512px tiles pre-rendered from NASA/USGS elevation data and shipped with the site. Missing tiles fall back to a scaled parent tile.
const LocalTiles=L.GridLayer.extend({
  createTile(coords,done){
    const size=this.getTileSize(),tile=document.createElement("canvas");tile.width=size.x;tile.height=size.y;
    const z=coords.z-1;                                   // pyramid level = map zoom - 1 (512px tiles)
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
function addVectors(){
  const G=window.GEO||{};
  map.createPane("water").style.zIndex=250;map.createPane("lines").style.zIndex=260;map.createPane("place").style.zIndex=270;
  const water=L.canvas({pane:"water",padding:.4}),lines=L.canvas({pane:"lines",padding:.4});
  if(G.lakes)L.geoJSON(G.lakes,{pane:"water",renderer:water,interactive:false,style:{fillColor:"#c4dae6",fillOpacity:1,color:"#9dc0d3",weight:.7}}).addTo(map);
  const rivers=G.rivers&&L.geoJSON(G.rivers,{pane:"water",renderer:water,interactive:false,style:{color:"#9fc6da",weight:1,opacity:.95}}).addTo(map);
  if(G.statesTopo&&window.topojson){
    const mesh=topojson.mesh(G.statesTopo,G.statesTopo.objects.states,(x,y)=>x!==y);
    L.geoJSON(mesh,{pane:"lines",renderer:lines,interactive:false,style:{color:"#3c5d50",weight:1,opacity:.6,dashArray:"5 3"}}).addTo(map);
  }
  if(G.borders)L.geoJSON(G.borders,{pane:"lines",renderer:lines,interactive:false,style:{color:"#27423a",weight:1.5,opacity:.8}}).addTo(map);
  // labels
  const stLabels=(G.stateLabels||[]).filter(s=>!/^(Commonwealth|United States Virgin)/.test(s[0])).map(s=>L.marker([s[2],s[1]],{pane:"place",interactive:false,keyboard:false,
    icon:L.divIcon({className:"stlab",html:s[0],iconSize:[0,0]})}));
  const cities=(G.cities||[]).map(c=>({pop:c[3],m:L.marker([c[2],c[1]],{pane:"place",interactive:false,keyboard:false,icon:L.divIcon({className:"city",html:`<i></i><span>${esc(c[0])}</span>`,iconSize:[0,0]})})}));
  const stG=L.layerGroup(stLabels),ctG=L.layerGroup();
  function update(){
    const z=map.getZoom(),sn=$("#stnames").checked,cn=$("#citynames").checked;
    (sn&&z>=3.4&&z<7.6)?stG.addTo(map):stG.remove();
    ctG.clearLayers();if(cn&&z>=4.6){const min=z<5.6?2e6:z<6.6?8e5:z<7.6?4e5:0;cities.filter(c=>c.pop>=min).forEach(c=>ctG.addLayer(c.m));ctG.addTo(map)}else ctG.remove();
    const w=Math.max(.7,Math.min(2.2,(z-3)*.35));rivers&&rivers.setStyle({weight:w});
  }
  map.on("zoomend",update);$("#stnames").onchange=e=>{store.set("stnames",e.target.checked);update()};$("#citynames").onchange=e=>{store.set("citynames",e.target.checked);update()};
  update();
}
// Hover card: sits above the dot, stays open while the pointer is on it, and lingers ~1.2 s after leaving so links are easy to reach.
let hoverCard=null,hoverTimer=null,hoverId=null;
function hoverHtml(p){return tipFull(p)+`<div class="pp mini"><button type="button" data-id="${esc(p.id)}">${checked.has(p.id)?"✓ Visited · undo":"Mark visited"}</button></div>`}
function showHover(p,m){
  if($("#labels").checked)return;                    // with Names on, the labels themselves are the links
  clearTimeout(hoverTimer);hoverId=p.id;
  if(!hoverCard){
    hoverCard=L.popup({className:"hovercard",closeButton:false,autoPan:false,closeOnClick:false,autoClose:false,offset:[0,-16],maxWidth:260,minWidth:140});
    hoverCard.on("add",()=>{const el=hoverCard.getElement();if(el&&!el._wired){el._wired=1;el.addEventListener("mouseenter",()=>clearTimeout(hoverTimer));el.addEventListener("mouseleave",()=>hideHover(500))}});
  }
  hoverCard.setLatLng(m.getLatLng()).setContent(hoverHtml(p));
  if(!map.hasLayer(hoverCard))hoverCard.addTo(map);
}
function hideHover(delay){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(hoverCard&&map.hasLayer(hoverCard))map.removeLayer(hoverCard);hoverId=null},delay)}
function initMap(){
  if(map)return;
  map=L.map("map",{minZoom:2,maxZoom:13,worldCopyJump:true,preferCanvas:true,zoomSnap:0,zoomDelta:.75,scrollWheelZoom:false,
    touchZoom:true,bounceAtZoomLimits:false,inertia:true,inertiaDeceleration:2600,zoomAnimation:true,markerZoomAnimation:true,tapTolerance:12,boxZoom:true,keyboard:true,zoomControl:true,attributionControl:true});
  map.attributionControl.setPrefix(false);window.parksMap=map;
  new LocalTiles({tileSize:512,minZoom:2,maxZoom:13,maxNativeZoom:8,keepBuffer:6,updateWhenIdle:false,updateInterval:60,
    attribution:'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a> (NASA SRTM, USGS 3DEP, GEBCO) · Natural Earth · US Census'}).addTo(map);
  addVectors();
  group=L.layerGroup().addTo(map);
  [...parks,...caParks].forEach(p=>{
    const m=L.circleMarker([p.lat,p.lng],{radius:6,bubblingMouseEvents:false,...style(p)});
    if(!coarse){m.on("mouseover",()=>showHover(p,m));m.on("mouseout",()=>hideHover(1200))}
    m.on("click",()=>{                 // desktop: click toggles; touch: tap opens a card
      if(!coarse){toggle(p.id);return}
      L.popup({autoPanPadding:[24,70],maxWidth:260}).setLatLng(m.getLatLng()).setContent(
        `<strong>${esc(disp(p))}</strong>${typeLine(p)}<div class="pp"><button type="button" data-id="${esc(p.id)}">${checked.has(p.id)?"✓ Visited – tap to undo":"Mark as visited"}</button>
         <a href="${esc(infoUrl(p))}" target="_blank" rel="noopener">Info page ↗</a></div>`).openOn(map);});
    markers.set(p.id,m);
  });
  const RoseCtl=L.Control.extend({onAdd(){const d=L.DomUtil.create("button","rose");d.id="roseEl";d.type="button";d.title="North is up · click to reset the view";d.setAttribute("aria-label","Compass: reset view");
    d.innerHTML=`<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="46" class="rg"/>
      <g class="tk">${[...Array(24)].map((_,i)=>`<line x1="0" y1="-46" x2="0" y2="${i%6===0?-39:-42.5}" transform="rotate(${i*15})"/>`).join("")}</g>
      <path class="nn" d="M0-25 7 0 0-4 -7 0Z"/><path class="ns" d="M0 25 7 0 0 4 -7 0Z"/><circle r="2.4" class="hub"/>
      <text y="-30" class="nl" text-anchor="middle">N</text></svg>`;
    L.DomEvent.disableClickPropagation(d);d.onclick=()=>map.flyToBounds(views[store.get("view","lower48")]||views.lower48,{duration:.8,padding:[10,10]});return d}});
  new RoseCtl({position:"bottomleft"}).addTo(map);
  const Legend=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","maplegend");d.innerHTML='<span><i class="dot off"></i>Not visited</span><span><i class="dot on"></i>Visited</span><span class="lg-ca"><i class="dot ca"></i>CA State Park</span><span class="lg-ap"><i class="dot ap"></i>Approx. spot</span>';L.DomEvent.disableClickPropagation(d);return d}});
  new Legend({position:"bottomright"}).addTo(map);
  ["click","dblclick","mousedown"].forEach(t=>map.getContainer().addEventListener(t,e=>{if(e.target.closest&&e.target.closest("a.lnk"))e.stopPropagation()},true)); // link clicks must not toggle the dot
  map.getContainer().addEventListener("click",e=>{const b=e.target.closest(".pp button[data-id]");if(b){toggle(b.dataset.id);map.closePopup();hideHover(0)}});
  setupZoomInput();
  map.on("zoomend",restyle);
  map.fitBounds(views[store.get("view","lower48")]||views.lower48);
  applyLabels();$("#rose").onchange({target:$("#rose")});
  refresh();
}
// Zoom input: wheel, trackpad scroll, trackpad pinch (Chrome/Edge/Firefox) and Safari pinch gestures, scaled by the 1-5 sensitivity setting.
const ZOOM_K=[0.003,0.005,0.008,0.012,0.018];                       // zoom levels per scrolled pixel
const zoomK=()=>ZOOM_K[clamp(+store.get("zoomSens",4),1,5)-1];
function setupZoomInput(){
  const el=map.getContainer();let acc=0,raf=0,at=null;
  el.addEventListener("wheel",e=>{
    e.preventDefault();
    let dy=e.deltaY;if(e.deltaMode===1)dy*=33;else if(e.deltaMode===2)dy*=300;
    acc+=-dy*zoomK()*(e.ctrlKey?4:1);at=map.mouseEventToLatLng(e);
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;const d=clamp(acc,-2.5,2.5);acc=0;
      const z=clamp(map.getZoom()+d,map.getMinZoom(),map.getMaxZoom());if(z!==map.getZoom())map.setZoomAround(at,z,{animate:false})});
  },{passive:false});
  let z0=0;                                                          // Safari trackpad pinch
  el.addEventListener("gesturestart",e=>{e.preventDefault();z0=map.getZoom()});
  el.addEventListener("gesturechange",e=>{e.preventDefault();const boost=0.5+zoomK()*60;map.setZoomAround(map.mouseEventToLatLng(e)||map.getCenter(),clamp(z0+Math.log2(e.scale)*boost,map.getMinZoom(),map.getMaxZoom()),{animate:false})});
  el.addEventListener("gestureend",e=>e.preventDefault());
}
function restyle(){markers.forEach((m,id)=>{const p=byId.get(id);m.setStyle(style(p));m.setRadius(radius())})}
$$("#jump button").forEach(b=>b.onclick=()=>{initMap();store.set("view",b.dataset.v);map.flyToBounds(views[b.dataset.v],{duration:.8,padding:[10,10]})});
const mapList=()=>visible().concat(showCA?visible(caParks):[]);
function renderMap(list){
  if(!map)return;
  group.clearLayers();
  list.forEach(p=>group.addLayer(markers.get(p.id)));
  restyle();
  const keep=list.filter(p=>checked.has(p.id));   // draw checked on top
  keep.forEach(p=>markers.get(p.id).bringToFront());
}
// labels / compass / state parks toggles
$("#labels").onchange=e=>{store.set("labels",e.target.checked);applyLabels()};
function applyLabels(){if(!map)return;const on=$("#labels").checked;
  markers.forEach((m,id)=>{const q=byId.get(id);m.unbindTooltip();
    if(m._po){m.off("mouseover",m._po);m.off("mouseout",m._pu);m._po=m._pu=null}
    if(on){m.bindTooltip(()=>tipName(q),{className:"lbl",interactive:true,permanent:true,direction:"right",offset:[6,0]});
      m._po=()=>m.setTooltipContent(tipFull(q));m._pu=()=>m.setTooltipContent(tipName(q));m.on("mouseover",m._po);m.on("mouseout",m._pu)}
  });if(on&&hoverCard)hideHover(0);renderMap(mapList());}
function refreshTips(ids){if(!map)return;const on=$("#labels").checked;ids.forEach(id=>{const m=markers.get(id),q=byId.get(id);if(m&&on)m.setTooltipContent(tipName(q))})}
$("#showCA").onchange=e=>{showCA=e.target.checked;store.set("showCA",showCA);document.body.classList.toggle("show-ca",showCA);refresh()};
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
let onlyEdited=false, colFilt={}, rows=[], sel={r0:0,c0:0,r1:0,c1:0}, act={r:0,c:0}, editing=null, hist=[], redoS=[], dragging=false;
const visIdx=()=>COLS.findIndex(c=>c.k==="visited");
const wrap=$("#tablewrap"), tbody=$("#lbody");

function computeRows(){
  let l=visible(baseSrc());
  for(const k in colFilt){const f=colFilt[k];if(!f)continue;const t=f.text.trim().toLowerCase();
    l=l.filter(p=>{const v=cellVal(p,k);return (!f.vals||f.vals.has(v))&&(!t||v.toLowerCase().includes(t))})}
  if(onlyEdited)l=l.filter(p=>COLS.some(c=>isEdited(p,c.k)));
  const yr=s=>Math.max(0,...(String(s).match(/\b(?:18|19|20)\d\d\b/g)||[0]).map(Number));
  const g=p=>sortKey==="year"?yr(cellVal(p,"year")):cellVal(p,sortKey).toLowerCase();
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
    const ed=isEdited(p,c.k);
    return `<td data-c="${ci}" class="k-${c.k} ${ci===0?"nm ":""}${c.k==="visited"||c.k==="year"?"c":""}${ed?" edited":""}"${ed?` title="Official: ${esc(official(p,c.k)||"(blank)")}"`:""}>`+(c.k==="visited"?`<input type="checkbox" tabindex="-1" ${v==="TRUE"?"checked":""} aria-label="Visited">`:esc(v))+"</td>"}).join("")+"</tr>").join("");
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
  if(k==="year"&&v.length>40)return;                       // free text is fine: "2019", "2019, 2022", "Summer 2021"
  const old=cellVal(p,k);if(old===v)return;
  put(p,k,v);batch.push({id:p.id,k,old,val:v});
  const td=cell(r,c);if(td){if(k==="visited")td.querySelector("input").checked=v==="TRUE";else{td.textContent=v;const ed=isEdited(p,k);td.classList.toggle("edited",ed);if(ed)td.title="Official: "+(official(p,k)||"(blank)");else td.removeAttribute("title")}}
}
function finish(batch){if(!batch.length)return;hist.push(batch);redoS.length=0;saveEdits();refreshOthers();refreshTips(batch.map(x=>x.id));renderEditsPanel();applySel()}
function applyBatch(batch,dir){ // dir: 'old' for undo, 'val' for redo
  (dir==="old"?batch.slice().reverse():batch).forEach(x=>put(byId.get(x.id),x.k,x[dir]));saveEdits();renderList(true);refreshOthers();refreshTips(batch.map(x=>x.id));renderEditsPanel()}
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
  if(coarse&&td.dataset.c&&!td.classList.contains("rn")&&act.r===r&&act.c===+td.dataset.c&&!e.target.matches("input")&&sel.r0===sel.r1&&sel.c0===sel.c1){startEdit(r,+td.dataset.c);return}
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
  const b=[];setCell(r,visIdx(),e.target.checked?"TRUE":"FALSE",b);finish(b);});

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
  const th=e.target.closest("th[data-k]");if(!th||justDragged)return;e.stopPropagation();const k=th.dataset.k;
  if(e.target.closest(".fbtn")){menuK===k?closeMenu():openMenu(k,e.target.closest(".fbtn"))}
  else{sortDir=sortKey===k?-sortDir:1;sortKey=k;renderList(true)}});
document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target))closeMenu()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
$("#clearColFilters").onclick=()=>{colFilt={};renderList(true)};


// ----- drag headers to reorder columns (mouse, trackpad and touch)
const DEFAULT_ORDER=COLS.map(c=>c.k);
function applyColOrder(order){
  const want=(order||[]).filter(k=>DEFAULT_ORDER.includes(k));DEFAULT_ORDER.forEach(k=>{if(!want.includes(k))want.push(k)});
  const byKey=Object.fromEntries(COLS.map(c=>[c.k,c]));COLS.splice(0,COLS.length,...want.map(k=>byKey[k]));
  const tr=$("#ltable thead tr");want.forEach(k=>tr.appendChild(tr.querySelector(`th[data-k="${k}"]`)));
}
applyColOrder(store.get("colOrder",null));
$("#resetCols").onclick=()=>{store.set("colOrder",null);applyColOrder(DEFAULT_ORDER);colFilt={...colFilt};renderList(false)};
let drag=null,justDragged=false;
$("#ltable thead").addEventListener("pointerdown",e=>{
  const th=e.target.closest("th[data-k]");if(!th||e.target.closest(".fbtn")||e.button>0)return;
  drag={k:th.dataset.k,th,x:e.clientX,y:e.clientY,on:false,id:e.pointerId};
});
document.addEventListener("pointermove",e=>{
  if(!drag)return;
  if(!drag.on){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;
    drag.on=true;drag.th.classList.add("dragging");document.body.classList.add("col-dragging");
    drag.ghost=document.createElement("div");drag.ghost.className="colghost";drag.ghost.textContent=drag.th.querySelector(".ht").textContent;document.body.appendChild(drag.ghost);
    drag.mark=document.createElement("div");drag.mark.className="colmark";wrap.appendChild(drag.mark)}
  drag.ghost.style.left=e.clientX+12+"px";drag.ghost.style.top=e.clientY+12+"px";
  const over=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n.matches&&n.matches("#ltable th[data-k]"));
  if(over&&over!==drag.th){const r=over.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;drag.target=over.dataset.k;drag.after=after;
    const w=wrap.getBoundingClientRect();drag.mark.style.display="block";drag.mark.style.left=(after?r.right:r.left)-w.left+wrap.scrollLeft-1+"px";drag.mark.style.height=wrap.clientHeight+"px";drag.mark.style.top=wrap.scrollTop+"px"}
  else{drag.target=null;if(drag.mark)drag.mark.style.display="none"}
  // keep the pointer in reach: auto-scroll when near the edges
  const w=wrap.getBoundingClientRect();if(e.clientX>w.right-50)wrap.scrollLeft+=14;else if(e.clientX<w.left+50)wrap.scrollLeft-=14;
});
document.addEventListener("pointerup",()=>{
  if(!drag)return;const d=drag;drag=null;
  if(!d.on)return;
  d.th.classList.remove("dragging");document.body.classList.remove("col-dragging");d.ghost.remove();d.mark.remove();justDragged=true;setTimeout(()=>justDragged=false,0);
  if(!d.target||d.target===d.k)return;
  const order=COLS.map(c=>c.k).filter(k=>k!==d.k);let i=order.indexOf(d.target);if(d.after)i++;order.splice(i,0,d.k);
  store.set("colOrder",order);applyColOrder(order);renderList(false);
});


// ----- list settings menu (hamburger): opens on hover, click pins it open, tap works on touch
{
  const hamb=$("#hamb"),hb=hamb.querySelector(".hamb-btn"),hm=hamb.querySelector(".hamb-menu");let timer=0,pinned=false;
  const open=()=>{clearTimeout(timer);hm.hidden=false;hb.setAttribute("aria-expanded","true")};
  const close=(d=0)=>{clearTimeout(timer);timer=setTimeout(()=>{hm.hidden=true;pinned=false;hb.setAttribute("aria-expanded","false")},d)};
  hamb.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")open()});
  hamb.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!pinned)close(450)});
  hb.addEventListener("click",()=>{if(hm.hidden){open();pinned=true}else if(!pinned){pinned=true}else close(0)});
  document.addEventListener("click",e=>{if(!hamb.contains(e.target)&&!hm.hidden)close(0)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!hm.hidden){close(0);hb.focus()}});
  hm.addEventListener("click",e=>{const b=e.target.closest("button,label");if(!b||b.hasAttribute("data-keep")||b.disabled)return;close(120)});
}

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


// ----- compare with official: revert selection, edited-only view, review panel
$("#onlyEdited").onchange=e=>{onlyEdited=e.target.checked;renderList(false)};
$("#revert").onclick=()=>{const {r0,r1,c0,c1}=rect(),b=[];
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const p=rows[r],k=COLS[c].k;if(p&&k!=="visited"&&isEdited(p,k))setCell(r,c,official(p,k),b)}
  finish(b)};
const FIELD={name:"Name",d:"Designation",city:"Nearest city",state:"State",hl:"Highlights",year:"Year visited"};
function editedList(){const out=[];for(const id in edits){const p=byId.get(id);if(!p)continue;
  for(const k in FIELD)if(edits[id][k]!==undefined&&isEdited(p,k))out.push({p,id,k,off:official(p,k),mine:edits[id][k]})}
  return out.sort((x,y)=>disp(x.p).localeCompare(disp(y.p)))}
function renderEditsPanel(){
  const body=$("#editsBody");if(!body)return;const l=editedList();
  $("#editsCount").textContent=l.length?`${l.length} change${l.length>1?"s":""} from the official values`:"No changes: everything matches the official values.";
  body.innerHTML=l.map(x=>`<tr><td><b>${esc(x.p.title)}</b><br><small>${esc(x.p.d)}</small></td><td>${FIELD[x.k]}</td><td class="off">${esc(x.off||"(blank)")}</td><td class="mine">${esc(x.mine||"(blank)")}</td>
    <td><button type="button" data-id="${esc(x.id)}" data-k="${x.k}">Revert</button></td></tr>`).join("");
}
function revertField(id,k){const p=byId.get(id);if(!p||!edits[id])return;delete edits[id][k];if(!Object.keys(edits[id]).length)delete edits[id]}
$("#editsBody")?.addEventListener("click",e=>{const b=e.target.closest("button[data-id]");if(!b)return;revertField(b.dataset.id,b.dataset.k);saveEdits();renderList(true);refreshOthers();refreshTips([b.dataset.id]);renderEditsPanel()});
$("#revertAll")?.addEventListener("click",()=>{if(!editedList().length||!confirm("Revert every edited field to its official value?"))return;const ids=Object.keys(edits);edits={};saveEdits();renderList(true);refreshOthers();refreshTips(ids);renderEditsPanel()});
$("#editsCsv")?.addEventListener("click",()=>{
  const rows=[["Unit (official)","Designation (official)","Field","Official value","Your value"]].concat(editedList().map(x=>[x.p.title,x.p.d,FIELD[x.k],x.off,x.mine]));
  const csv=rows.map(r=>r.map(c=>'"'+String(c??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="edits-vs-official.csv";a.click()});
// backup / move to another device (a JSON file you can AirDrop, email or keep in iCloud / Drive)
$("#backupOut")?.addEventListener("click",()=>{
  const data={app:"parks-and-camping",v:1,savedAt:new Date().toISOString(),checked:[...checked],edits,customRows,settings:{dot:dotScale,cols,showCA,dataset,theme:store.get("theme","system")}};
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:"application/json"}));a.download="parks-backup-"+new Date().toISOString().slice(0,10)+".json";a.click()});
$("#backupIn")?.addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const d=JSON.parse(await f.text());if(d.app!=="parks-and-camping")throw 0;
    if(!confirm(`Replace this browser's data with the backup from ${d.savedAt?.slice(0,10)||"unknown date"}?\n${(d.checked||[]).length} visited, ${Object.keys(d.edits||{}).length} edited units.`))return;
    store.set("checked",d.checked||[]);store.set("edits",d.edits||{});store.set("customRows",d.customRows||[]);
    const s=d.settings||{};if(s.dot)store.set("dot",s.dot);if(s.cols)store.set("cols",s.cols);if(s.theme)store.set("theme",s.theme);store.set("showCA",!!s.showCA);if(s.dataset)store.set("dataset",s.dataset);
    location.reload()}catch(err){alert("That file is not a Parks & Camping backup.")}});

// ---------- refresh ----------
function refresh(){refreshOthers();renderList(true)}
function refreshOthers(){
  const list=visible();
  $("#count").textContent=`${list.length} of ${parks.length} NPS units${showCA?" (+ CA state parks on map)":""} · ${[...checked].length} checked`;
  renderGrid(list);renderMap(mapList());renderVisited();
}
$("#export").onclick=()=>{
  const txt=parks.filter(p=>checked.has(p.id)).map(p=>disp(p)+" ("+p.states.join("/")+")").join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download="checked-parks.txt";a.click();
};
$("#reset").onclick=()=>{if(confirm("Uncheck everything?")){checked.clear();save();refresh()}};

$("#labels").checked=store.get("labels",false);$("#rose").checked=store.get("rose",true);$("#stnames").checked=store.get("stnames",true);$("#citynames").checked=store.get("citynames",true);
$("#showCA").checked=showCA;document.body.classList.toggle("show-ca",showCA);setDataset(dataset);
{const zs=$("#zoomSens"),zo=$("#zoomSensOut"),names=["gentle","relaxed","balanced","quick","very fast"];
  const show=()=>{zo.textContent=zs.value+" · "+names[zs.value-1]};zs.value=clamp(+store.get("zoomSens",4),1,5);show();zs.oninput=()=>{store.set("zoomSens",+zs.value);show()}}
setDot(dotScale);setCols(cols);refresh();showTab(store.get("tab","grid"));renderEditsPanel();
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
