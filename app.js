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
const filt={q:"",st:new Set(),u:new Set(),d:new Set(["__NP63"]),v:new Set()};   // opens on the 63 national parks; "Clear filters" shows everything
const msInstances=[];
function multiSelect(root,label,options,set,onPick){
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
  list.onchange=e=>{const c=e.target;c.checked?set.add(c.value):set.delete(c.value);draw();refresh();onPick&&onPick()};
  search.oninput=draw;
  panel.querySelector(".ms-actions").onclick=e=>{const a=e.target.dataset.a;if(!a)return;
    if(a==="all")shown().forEach(o=>set.add(o.value));else set.clear();draw();refresh();onPick&&onPick()};
  msInstances.push({close(){panel.hidden=true;root.classList.remove("open")},draw});
  draw();
}
document.addEventListener("click",()=>msInstances.forEach(m=>m.close()));
document.addEventListener("keydown",e=>{if(e.key==="Escape")msInstances.forEach(m=>m.close())});
const stateList=[...new Set(parks.flatMap(p=>p.states))].sort((a,b)=>a.localeCompare(b));
multiSelect($("#fState"),"States / territories",stateList.map(s=>({value:s,text:s,n:parks.filter(p=>p.states.includes(s)).length})),filt.st,()=>zoomToFilter());
multiSelect($("#fUnit"),"Park / unit",[...parks].sort((x,y)=>x.title.localeCompare(y.title)).map(p=>({value:p.code,text:p.title,n:p.d})),filt.u,()=>zoomToFilter());
multiSelect($("#fDesig"),"Designation",[{value:"__NP63",text:"★ National Parks — the 63",n:parks.filter(p=>p.np63).length}].concat(DESIG.map(d=>({value:d,text:d,n:[...parks,...caParks].filter(p=>p.d===d).length}))),filt.d);
multiSelect($("#fVisited"),"Status",[{value:"1",text:"Checked"},{value:"0",text:"Unchecked"}],filt.v);
function visible(src=parks){
  const q=filt.q.toLowerCase().trim();
  const UA=new Set([...filt.u].map(c=>c==="SEQU"||c==="KICA"?"SEKI":c));            // trail data uses one code for Sequoia + Kings Canyon
  return src.filter(p=>{
    const trail=p.kind==="trail";
    return (!q||(disp(p)+" "+fld(p,"name")+" "+fld(p,"d")+" "+fld(p,"city")+" "+fld(p,"state")+" "+fld(p,"hl")+" "+p.code+" "+pstates(p).join(" ")).toLowerCase().includes(q))
    &&(!filt.st.size||pstates(p).some(s=>filt.st.has(s)))
    &&(!filt.u.size||(trail?UA.has(p.code):filt.u.has(p.code)))
    &&(!filt.d.size||(trail?(filt.d.has(p.parkD)||(filt.d.has("__NP63")&&p.np63)):(filt.d.has(fld(p,"d"))||(filt.d.has("__NP63")&&p.np63))))
    &&(!filt.v.size||filt.v.has(checked.has(p.id)?"1":"0"));
  });
}
$("#q").addEventListener("input",e=>{filt.q=e.target.value;refresh()});
$("#clear").onclick=()=>{$("#q").value="";filt.q="";filt.st.clear();filt.u.clear();filt.d.clear();filt.v.clear();msInstances.forEach(m=>m.draw());refresh()};

// ---------- tabs ----------
const TAB_SECTION={explore:"explore",grid:"grid",tgrid:"grid",list:"list",tlist:"list",map:"map",trails:"trails",visited:"visited",about:"about"};
const TAB_GROUP={explore:"parks",grid:"parks",list:"parks",map:"parks",tgrid:"trails",tlist:"trails",trails:"trails"};
let currentTab="grid",gridMode="parks";
function showTab(t){
  if(t==="about"){toggleDrawer(!document.body.classList.contains("drawer-open"));return}
  if(!TAB_SECTION[t])t="explore";currentTab=t;const sec=TAB_SECTION[t],grp=TAB_GROUP[t];
  toggleDrawer(false);
  $$(".tabitem").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
  $$(".tab[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
  $$(".tab.grp").forEach(b=>b.classList.toggle("active",b.dataset.group===grp&&t!=="explore"));
  $$(".panel").forEach(p=>p.classList.toggle("active",sec==="explore"?(p.id==="tab-list"||p.id==="tab-map"):p.id==="tab-"+sec));
  document.body.classList.toggle("explore",t==="explore");
  document.body.classList.toggle("map-mode",t==="map"||t==="trails"||t==="explore");
  document.body.dataset.group=grp||"";
  gridMode=t==="tgrid"?"trails":"parks";
  if(t==="tlist")setDataset("trails");else if(sec==="list")setDataset(store.get("dataset","nps")==="ca"?"ca":"nps");
  if(grp==="trails"&&window.TrailsMap)window.TrailsMap.ensureLoaded();
  if(sec==="grid"){refreshOthers()}
  if(t==="explore"){setDataset(store.get("dataset","nps")==="ca"?"ca":"nps");mainView.init();setPane(store.get("pane","table"),true);setTimeout(()=>{mainView.map.invalidateSize();zoomToFilter(true)},80)}
  if(t==="map"){mainView.init();setTimeout(()=>{mainView.map.invalidateSize();zoomToFilter(true)},80)}
  if(t==="trails"){trailsView.init();setTimeout(()=>{trailsView.map.invalidateSize();zoomToFilter(true)},80);window.TrailsMap&&window.TrailsMap.show()}
  store.set("tab",t);
}
// Settings / backup / edits / about live in a side drawer so the table + map stay on screen
function toggleDrawer(open){
  const b=document.body,was=b.classList.contains("drawer-open");b.classList.toggle("drawer-open",open);
  const btn=$('.tab[data-tab="about"]');btn&&btn.setAttribute("aria-expanded",open);
  if(open&&!was){renderEditsPanel();setTimeout(()=>$("#drawerClose").focus(),30)}
  if(!open&&was&&btn)btn.focus();
}
$("#drawerClose").onclick=()=>toggleDrawer(false);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("drawer-open"))toggleDrawer(false)});
// narrow screens: Table / Map toggle for the Explore view
function setPane(p,quiet){
  document.body.dataset.pane=p;store.set("pane",p);
  $$("#paneSeg button").forEach(b=>{const on=b.dataset.pane===p;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});
  if(!quiet&&p==="map"&&mainView.map)setTimeout(()=>{mainView.map.invalidateSize();zoomToFilter(true)},60);
}
$$("#paneSeg button").forEach(b=>b.onclick=()=>setPane(b.dataset.pane));
window.addEventListener("resize",()=>{if(currentTab==="explore"&&mainView.map)mainView.map.invalidateSize()});
// "Filters" button reveals the State / Park / Designation dropdowns on narrow screens
$("#moreBtn").onclick=()=>{const o=document.body.classList.toggle("more-open");$("#moreBtn").setAttribute("aria-expanded",o)};
// Layers menus close on outside click / Esc
document.addEventListener("click",e=>$$("details.layers[open]").forEach(d=>{if(!d.contains(e.target))d.open=false}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")$$("details.layers[open]").forEach(d=>{d.open=false;d.querySelector("summary").focus()})});
// "/" jumps to search
document.addEventListener("keydown",e=>{if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)&&!e.target.isContentEditable){e.preventDefault();$("#q").focus()}});
$$(".tab[data-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
// dropdown groups: open on hover (mouse), tap/click to pin (touch)
$$(".tabgroup").forEach(g=>{
  const btn=g.querySelector(".grp"),menu=g.querySelector(".tabmenu");let timer=0,pinned=false;
  const open=()=>{$$(".tabgroup").forEach(o=>{if(o!==g)o._close&&o._close()});clearTimeout(timer);menu.hidden=false;btn.setAttribute("aria-expanded","true")};
  const close=(d=0)=>{clearTimeout(timer);timer=setTimeout(()=>{menu.hidden=true;pinned=false;btn.setAttribute("aria-expanded","false")},d)};
  g._close=()=>close(0);
  g.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")open()});
  g.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!pinned)close(350)});
  btn.addEventListener("click",()=>{if(menu.hidden){open();pinned=true}else if(!pinned)pinned=true;else close(0)});
  menu.addEventListener("click",e=>{const b=e.target.closest(".tabitem");if(b){showTab(b.dataset.tab);close(0)}});
  document.addEventListener("click",e=>{if(!g.contains(e.target)&&!menu.hidden)close(0)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden)close(0)});
});

// ---------- theme ----------
function setTheme(t){const r=document.documentElement;t==="light"||t==="dark"?r.dataset.theme=t:delete r.dataset.theme;
  store.set("theme",t);$$("#theme button").forEach(b=>b.classList.toggle("on",b.dataset.t===t))}
$$("#theme button").forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
setTheme(store.get("theme","system"));

// ---------- dot size (site wide) ----------
let dotScale=store.get("dot",1);
function setDot(v){dotScale=+v;document.documentElement.style.setProperty("--dot",v);store.set("dot",v);
  $$(".dotsize").forEach(i=>i.value=v);mapViews&&mapViews.forEach(v=>v.restyle());}
$$(".dotsize").forEach(i=>i.oninput=()=>setDot(i.value));

// ---------- grid ----------
let cols=store.get("cols",4);
function setCols(c){cols=c;$("#grid").style.setProperty("--cols",c);store.set("cols",c);
  $$("#cols button").forEach(b=>b.classList.toggle("on",+b.dataset.c===c));}
$$("#cols button").forEach(b=>b.onclick=()=>setCols(+b.dataset.c));
const hue=p=>{let h=0;for(const c of p.name)h=(h*31+c.charCodeAt(0))%45;return 128+h}; // greens to blues
let trailRecords=[],trailMsg="",trailMeta=store.get("trailMeta",{});
function toggle(id){
  checked.has(id)?checked.delete(id):checked.add(id);
  if(id.startsWith("T:")&&checked.has(id)&&byId.has(id)){const r=byId.get(id);trailMeta[id]={name:r.title,park:r.city};store.set("trailMeta",trailMeta)}
  save();refresh()}
function renderGrid(list){
  if(gridMode==="trails"){
    if(!list.length){$("#grid").innerHTML=`<p class="gridmsg">${esc(trailMsg||"No trails match the taskbar filters. Pick a park or state above.")}</p>`;return}
    const shown=list.slice(0,1500);
    $("#grid").innerHTML=shown.map(p=>`<article class="card trail" data-id="${esc(p.id)}">
      <div class="banner" style="--h1:hsl(${hue({name:p.city})},48%,14%);--h2:hsl(${hue({name:p.city})+10},40%,30%)">
        <span class="dot ${checked.has(p.id)?"on":"off"}" role="checkbox" aria-checked="${checked.has(p.id)}" tabindex="0" title="Mark as hiked"></span></div>
      <div class="body"><h3><a href="#" data-open="${esc(p.id)}">${esc(disp(p))}</a>${isEdited(p,"name")?' <span class="ed" title="Official: '+esc(p.title)+'">edited</span>':""}</h3>
      <div class="meta">${esc(fld(p,"d"))}</div>
      <div class="meta">${esc(fld(p,"city"))}${fld(p,"state")?" · "+esc(fld(p,"state")):""}</div>
      ${fld(p,"year")?`<div class="meta yr">Last hiked ${esc(fld(p,"year"))}</div>`:""}
      <p>${esc(fld(p,"hl"))}</p><button type="button" class="mapbtn" data-map="${esc(p.id)}">📍 Show on map</button></div></article>`).join("")+(list.length>shown.length?`<p class="gridmsg">Showing the first ${shown.length.toLocaleString()} of ${list.length.toLocaleString()} trails. Narrow with the taskbar filters.</p>`:"");
    return;
  }
  $("#grid").innerHTML=list.map(p=>`<article class="card" data-id="${p.id}">
    <div class="banner" style="--h1:hsl(${hue(p)},48%,14%);--h2:hsl(${hue(p)+10},40%,30%)">
      <span class="dot ${checked.has(p.id)?"on":"off"}" role="checkbox" aria-checked="${checked.has(p.id)}" tabindex="0" title="Check / uncheck"></span></div>
    <div class="body"><h3><a href="${esc(p.url||infoUrl(p))}" target="_blank" rel="noopener">${esc(disp(p))}</a>${isEdited(p,"name")?' <span class="ed" title="Official: '+esc(p.title)+'">edited</span>':""}</h3>
    <div class="meta">${esc(fld(p,"d"))} · ${p.states.slice(0,4).join(", ")}${p.states.length>4?" +"+(p.states.length-4):""}</div>
    ${fld(p,"year")?`<div class="meta yr">Last visited ${esc(fld(p,"year"))}</div>`:""}${fld(p,"city")?`<div class="meta">Near ${esc(fld(p,"city"))}${fld(p,"state")?", "+esc(fld(p,"state")):""}</div>`:""}${p.blurb?`<p>${p.blurb}</p>`:""}<button type="button" class="mapbtn" data-map="${esc(p.id)}">📍 Show on map</button></div></article>`).join("");
}
$("#grid").onclick=e=>{const mb=e.target.closest("[data-map]");if(mb){focusOnMap(mb.dataset.map);return}const o=e.target.closest("a[data-open]");if(o){e.preventDefault();window.TrailsMap&&window.TrailsMap.openInfo(o.dataset.open);return}const d=e.target.closest(".dot");if(d)toggle(d.closest(".card").dataset.id)};
$("#grid").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){const d=e.target.closest(".dot");if(d){e.preventDefault();toggle(d.closest(".card").dataset.id)}}};

// ---------- visited list ----------
function renderVisited(){
  const list=[...parks,...caParks].filter(p=>checked.has(p.id));
  const trails=[...checked].filter(id=>id.startsWith("T:")).map(id=>byId.get(id)||(trailMeta[id]&&{id,title:trailMeta[id].name,name:trailMeta[id].name,city:trailMeta[id].park,d:"Trail",states:[],kind:"trail"})).filter(Boolean);
  $("#vcount").textContent=`${list.length+trails.length} checked`+(trails.length?` (${trails.length} trail${trails.length>1?"s":""})`:"");
  $("#vlist").innerHTML=[...list,...trails].map(p=>`<li data-id="${esc(p.id)}"><span class="dot on" style="cursor:pointer"></span>${esc(disp(p))}${p.kind==="trail"&&fld(p,"city")?` <small class="yrs">· ${esc(fld(p,"city"))}</small>`:""}${fld(p,"year")?` <small class="yrs">· ${esc(fld(p,"year"))}</small>`:""}</li>`).join("")||"<li>Nothing checked yet.</li>";
}
$("#vlist").onclick=e=>{const li=e.target.closest("li[data-id]");if(li&&e.target.closest(".dot"))toggle(li.dataset.id)};

// ---------- map views: the Map tab and the Trails Map tab are two instances of the SAME map code ----------
const VIEW_BOUNDS={lower48:[[24.5,-125.5],[49.8,-66]],ak:[[51,-170],[71.8,-129]],hi:[[18.8,-160.6],[22.4,-154.6]],terr:[[-15,-171.5],[19.5,-64]]};
const coarse=matchMedia("(pointer:coarse)").matches;
const style=p=>({...(checked.has(p.id)?{fillColor:"#e5383b",color:"#ffffff",fillOpacity:1,weight:2}
                                :{fillColor:"#8a949b",color:"#ffffff",fillOpacity:.92,weight:1.6}),dashArray:p.approx?"2 2":null,...(p.kind==="ca"?{color:"#1b6d73",weight:2.4}:{})});
const infoUrl=p=>p.url||("https://www.google.com/search?q="+encodeURIComponent(p.name+" "+(p.kind==="ca"?"California State Parks":"")));
const typeLine=p=>`<div class="tt">${esc(fld(p,"d")||"Unit")} · ${esc(p.states.slice(0,2).join(", ")||"")}${p.states.length>2?" +"+(p.states.length-2)+" more":""}</div>`+(isEdited(p,"name")?`<div class="tt ed2">Official name: ${esc(p.title)}</div>`:"");
const nearLine=p=>fld(p,"city")?`<div class="tt">Near ${esc(fld(p,"city"))}${fld(p,"state")?", "+esc(fld(p,"state")):""}${fld(p,"year")?" · visited "+esc(fld(p,"year")):""}</div>`:"";
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
// Zoom input: wheel, trackpad scroll, trackpad pinch (Chrome/Edge/Firefox) and Safari pinch gestures, scaled by the 1-5 sensitivity setting.
const ZOOM_K=[0.003,0.005,0.008,0.012,0.018];                       // zoom levels per scrolled pixel
const zoomK=()=>ZOOM_K[clamp(+store.get("zoomSens",4),1,5)-1];
function setupZoomInput(map){
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
const mapList=()=>visible().concat(showCA?visible(caParks):[]);
const mapViews=[];
function createMapView(c){
  const V={map:null,markers:new Map(),group:null,hoverCard:null,hoverTimer:null,cfg:c,readyCbs:[]};
  const el=k=>$(c.ctl[k]);
  const K=k=>c.key+k;
  const radius=()=>Math.max(coarse?6:3,(2+V.map.getZoom()*0.9)*dotScale);
  function addVectors(map){
    const G=window.GEO||{};
    map.createPane("water").style.zIndex=250;map.createPane("lines").style.zIndex=260;map.createPane("place").style.zIndex=410;
    const water=L.canvas({pane:"water",padding:.4}),lines=L.canvas({pane:"lines",padding:.4});
    if(G.lakes)L.geoJSON(G.lakes,{pane:"water",renderer:water,interactive:false,style:{fillColor:"#c4dae6",fillOpacity:1,color:"#9dc0d3",weight:.7}}).addTo(map);
    const rivers=G.rivers&&L.geoJSON(G.rivers,{pane:"water",renderer:water,interactive:false,style:{color:"#9fc6da",weight:1,opacity:.95}}).addTo(map);
    if(G.statesTopo&&window.topojson){
      const mesh=topojson.mesh(G.statesTopo,G.statesTopo.objects.states,(x,y)=>x!==y);
      L.geoJSON(mesh,{pane:"lines",renderer:lines,interactive:false,style:{color:"#3c5d50",weight:1,opacity:.6,dashArray:"5 3"}}).addTo(map);
    }
    if(G.borders)L.geoJSON(G.borders,{pane:"lines",renderer:lines,interactive:false,style:{color:"#27423a",weight:1.5,opacity:.8}}).addTo(map);
    const stBounds={};
    if(G.statesTopo&&window.topojson)topojson.feature(G.statesTopo,G.statesTopo.objects.states).features.forEach(f=>{stBounds[f.properties.name]=L.geoJSON(f).getBounds()});
    const stLabels=(G.stateLabels||[]).filter(s=>!/^(Commonwealth|United States Virgin)/.test(s[0])).map(s=>{
      const m=L.marker([s[2],s[1]],{pane:"place",interactive:true,keyboard:false,title:"Zoom to "+s[0],icon:L.divIcon({className:"stlab click",html:s[0],iconSize:[0,0]})});
      m.on("click",e=>{L.DomEvent.stopPropagation(e);const b=stBounds[s[0]];if(b)map.flyToBounds(b,{maxZoom:7.5,padding:[40,40],duration:.8})});return m});
    const cities=(G.cities||[]).map(q=>({pop:q[3],m:L.marker([q[2],q[1]],{pane:"place",interactive:false,keyboard:false,icon:L.divIcon({className:"city",html:`<i></i><span>${esc(q[0])}</span>`,iconSize:[0,0]})})}));
    const stG=L.layerGroup(stLabels),ctG=L.layerGroup();
    function update(){
      const z=map.getZoom(),sn=el("stn").checked,cn=el("cities").checked;
      (sn&&z>=3.4&&z<7.6)?stG.addTo(map):stG.remove();
      ctG.clearLayers();if(cn&&z>=4.6){const min=z<5.6?2e6:z<6.6?8e5:z<7.6?4e5:0;cities.filter(q=>q.pop>=min).forEach(q=>ctG.addLayer(q.m));ctG.addTo(map)}else ctG.remove();
      const w=Math.max(.7,Math.min(2.2,(z-3)*.35));rivers&&rivers.setStyle({weight:w});
    }
    map.on("zoomend",update);V.updatePlaceLabels=update;update();
  }
  // Hover card: sits above the dot, stays open while the pointer is on it, and lingers ~1.2 s after leaving so links are easy to reach.
  const hoverHtml=p=>tipFull(p)+nearLine(p)+`<div class="pp mini"><button type="button" data-id="${esc(p.id)}">${checked.has(p.id)?"✓ Visited · undo":"Mark visited"}</button><button type="button" class="alt" data-zoom="${esc(p.id)}">Zoom here</button></div>`;
  function showHover(p,m){
    if(el("labels").checked)return;
    clearTimeout(V.hoverTimer);
    if(!V.hoverCard){
      V.hoverCard=L.popup({className:"hovercard",closeButton:false,autoPan:false,closeOnClick:false,autoClose:false,offset:[0,-16],maxWidth:260,minWidth:140});
      V.hoverCard.on("add",()=>{const e=V.hoverCard.getElement();if(e&&!e._wired){e._wired=1;e.addEventListener("mouseenter",()=>clearTimeout(V.hoverTimer));e.addEventListener("mouseleave",()=>hideHover(500))}});
    }
    V.hoverCard.setLatLng(m.getLatLng()).setContent(hoverHtml(p));
    if(!V.map.hasLayer(V.hoverCard))V.hoverCard.addTo(V.map);
  }
  function hideHover(delay){clearTimeout(V.hoverTimer);V.hoverTimer=setTimeout(()=>{if(V.hoverCard&&V.map.hasLayer(V.hoverCard))V.map.removeLayer(V.hoverCard)},delay)}
  V.hideHover=hideHover;
  V.fly=()=>V.map.flyToBounds(VIEW_BOUNDS[store.get(K("view"),"lower48")]||VIEW_BOUNDS.lower48,{duration:.8,padding:[10,10]});
  V.init=function(){
    if(V.map)return V.map;
    const map=V.map=L.map(c.el,{minZoom:2,maxZoom:14,worldCopyJump:true,renderer:L.canvas({tolerance:5,padding:.3}),zoomSnap:0,zoomDelta:.75,scrollWheelZoom:false,
      touchZoom:true,bounceAtZoomLimits:false,inertia:true,inertiaDeceleration:2600,zoomAnimation:true,markerZoomAnimation:true,tapTolerance:12,boxZoom:true,keyboard:true,zoomControl:true,attributionControl:true});
    map.attributionControl.setPrefix(false);window[c.global]=map;
    new LocalTiles({tileSize:512,minZoom:2,maxZoom:14,maxNativeZoom:8,keepBuffer:6,updateWhenIdle:false,updateInterval:60,
      attribution:'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a> (NASA SRTM, USGS 3DEP, GEBCO) · Natural Earth · US Census'}).addTo(map);
    addVectors(map);
    V.group=L.layerGroup().addTo(map);V.clusters=L.layerGroup().addTo(map);V.inner=L.layerGroup().addTo(map);
    [...parks,...caParks].forEach(p=>{
      const m=L.circleMarker([p.lat,p.lng],{radius:6,bubblingMouseEvents:false,...style(p)});
      if(!coarse){m.on("mouseover",()=>{showHover(p,m);rowHover(p.id,true)});m.on("mouseout",()=>{hideHover(1200);rowHover(p.id,false)})}
      m.on("click",()=>{selectRowById(p.id);                 // desktop: click toggles; touch: tap opens a card
        if(!coarse){toggle(p.id);return}
        L.popup({autoPanPadding:[24,70],maxWidth:260}).setLatLng(m.getLatLng()).setContent(
          `<strong>${esc(disp(p))}</strong>${typeLine(p)}${nearLine(p)}<div class="pp"><button type="button" data-id="${esc(p.id)}">${checked.has(p.id)?"✓ Visited – tap to undo":"Mark as visited"}</button>
           <a href="${esc(infoUrl(p))}" target="_blank" rel="noopener">Info page ↗</a></div>`).openOn(map);});
      V.markers.set(p.id,m);
    });
    const Rose=L.Control.extend({onAdd(){const d=L.DomUtil.create("button","rose");d.type="button";d.title="North is up · click to reset the view";d.setAttribute("aria-label","Compass: reset view");
      d.innerHTML=`<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="46" class="rg"/>
        <g class="tk">${[...Array(24)].map((_,i)=>`<line x1="0" y1="-46" x2="0" y2="${i%6===0?-39:-42.5}" transform="rotate(${i*15})"/>`).join("")}</g>
        <path class="nn" d="M0-25 7 0 0-4 -7 0Z"/><path class="ns" d="M0 25 7 0 0 4 -7 0Z"/><circle r="2.4" class="hub"/>
        <text y="-30" class="nl" text-anchor="middle">N</text></svg>`;
      L.DomEvent.disableClickPropagation(d);d.onclick=()=>V.fly();return d}});
    new Rose({position:"bottomleft"}).addTo(map);
    const Legend=L.Control.extend({onAdd(){const d=L.DomUtil.create("div","maplegend");d.innerHTML='<span><i class="dot off"></i>Not visited</span><span><i class="dot on"></i>Visited ✓</span><span class="lg-ca"><i class="dot ca"></i>CA State Park</span><span class="lg-ap"><i class="dot ap"></i>Approx. spot</span>';L.DomEvent.disableClickPropagation(d);return d}});
    new Legend({position:"bottomright"}).addTo(map);
    ["click","dblclick","mousedown"].forEach(t=>map.getContainer().addEventListener(t,e=>{if(e.target.closest&&e.target.closest("a.lnk"))e.stopPropagation()},true)); // link clicks must not toggle the dot
    map.getContainer().addEventListener("click",e=>{const z=e.target.closest(".pp button[data-zoom]");if(z){const p=byId.get(z.dataset.zoom);if(p)map.flyTo([p.lat,p.lng],Math.max(map.getZoom(),10),{duration:.8});return}const b=e.target.closest(".pp button[data-id]");if(b){toggle(b.dataset.id);map.closePopup();hideHover(0)}});
    setupZoomInput(map);
    map.on("zoomend",()=>{if(V.clusterOn||map.getZoom()<4.4)V.render();else V.restyle()});
    map.fitBounds(VIEW_BOUNDS[store.get(K("view"),"lower48")]||VIEW_BOUNDS.lower48);
    V.applyLabels();el("rose").onchange();
    V.readyCbs.forEach(f=>f(map));
    V.render();
    return map;
  };
  V.fitPoints=(pts,opt={})=>{V.init();if(!pts.length)return;const bb=L.latLngBounds(pts);
    const max=opt.maxZoom||(pts.length===1?10:8);
    opt.instant?V.map.fitBounds(bb,{maxZoom:max,padding:[60,60],animate:false}):V.map.flyToBounds(bb,{maxZoom:max,padding:[60,60],duration:.9})};
  V.focus=p=>{V.init();V.map.flyTo([p.lat,p.lng],10,{duration:.9});const m=V.markers.get(p.id);if(m&&!coarse)setTimeout(()=>showHover(p,m),1000)};
  V.onReady=f=>{V.map?f(V.map):V.readyCbs.push(f)};
  V.restyle=()=>{if(!V.map)return;V.markers.forEach((m,id)=>{const p=byId.get(id);m.setStyle(style(p));m.setRadius(radius())});
    V.inner&&V.inner.eachLayer(l=>l.setRadius(Math.max(1.6,radius()*.42)));V.ring&&V.ring.setRadius(radius()+6)};
  // ring around the dot of the row selected in the table
  V.highlight=p=>{
    if(!V.map)return;V.ringId=p?p.id:null;
    const m=p&&V.markers.get(p.id);
    if(!m||!V.group.hasLayer(m)){V.ring&&V.map.hasLayer(V.ring)&&V.ring.remove();return}
    const ll=m.getLatLng();if(!V.ring)V.ring=L.circleMarker(ll,{interactive:false,fill:false,color:"#0b5cd5",weight:3,opacity:1});
    V.ring.setLatLng(ll).setRadius(radius()+6);if(!V.map.hasLayer(V.ring))V.ring.addTo(V.map);V.ring.bringToFront();
    if(!V.map.getBounds().pad(-.08).contains(ll))V.map.panTo(ll);
  };
  // at low zoom, nearby dots merge into numbered clusters (no extra library)
  V.render=()=>{
    if(!V.map)return;
    const list=mapList(),z=V.map.getZoom();
    V.group.clearLayers();V.clusters.clearLayers();V.inner.clearLayers();
    V.clusterOn=z<4.4&&list.length>60&&!el("labels").checked;
    let singles=list;
    if(V.clusterOn){
      const cells=new Map();singles=[];
      list.forEach(p=>{const pt=V.map.project([p.lat,p.lng],z),k=Math.floor(pt.x/44)+","+Math.floor(pt.y/44);let g=cells.get(k);if(!g)cells.set(k,g=[]);g.push(p)});
      cells.forEach(g=>{
        if(g.length===1){singles.push(g[0]);return}
        const vn=g.filter(p=>checked.has(p.id)).length,lat=g.reduce((t,p)=>t+p.lat,0)/g.length,lng=g.reduce((t,p)=>t+p.lng,0)/g.length;
        const m=L.marker([lat,lng],{icon:L.divIcon({className:"clu"+(vn?" hasv":""),html:`<span>${g.length}${vn?"<i>✓</i>":""}</span>`,iconSize:[34,34]}),
          title:`${g.length} units${vn?` · ${vn} visited`:""} – click to zoom in`,alt:`${g.length} units`,riseOnHover:true});
        m.on("click",()=>V.map.flyToBounds(L.latLngBounds(g.map(p=>[p.lat,p.lng])),{padding:[70,70],maxZoom:Math.max(z+2.5,5),duration:.8}));
        V.clusters.addLayer(m)});
    }
    singles.forEach(p=>V.group.addLayer(V.markers.get(p.id)));
    V.restyle();
    singles.filter(p=>checked.has(p.id)).forEach(p=>{V.markers.get(p.id).bringToFront();    // checked on top, with a white centre so it is not colour-only
      V.inner.addLayer(L.circleMarker([p.lat,p.lng],{interactive:false,stroke:false,fillColor:"#fff",fillOpacity:1,radius:Math.max(1.6,radius()*.42)}))});
    V.inner.eachLayer(l=>l.bringToFront());
    V.ringId&&V.highlight(byId.get(V.ringId));
  };
  V.applyLabels=()=>{
    if(!V.map)return;const on=el("labels").checked;
    V.markers.forEach((m,id)=>{const q=byId.get(id);m.unbindTooltip();
      if(m._po){m.off("mouseover",m._po);m.off("mouseout",m._pu);m._po=m._pu=null}
      if(on){m.bindTooltip(()=>tipName(q),{className:"lbl",interactive:true,permanent:true,direction:"right",offset:[6,0]});
        m._po=()=>m.setTooltipContent(tipFull(q));m._pu=()=>m.setTooltipContent(tipName(q));m.on("mouseover",m._po);m.on("mouseout",m._pu)}
    });if(on)hideHover(0);V.render();
  };
  V.refreshTips=ids=>{if(!V.map)return;const on=el("labels").checked;ids.forEach(id=>{const m=V.markers.get(id),q=byId.get(id);if(m&&on)m.setTooltipContent(tipName(q))})};
  // toolbar wiring (works before the map is created)
  el("labels").checked=store.get(K("labels"),false);el("rose").checked=store.get(K("rose"),true);
  el("stn").checked=store.get(K("stnames"),true);el("cities").checked=store.get(K("citynames"),true);
  el("labels").onchange=e=>{store.set(K("labels"),e.target.checked);V.applyLabels()};
  el("stn").onchange=e=>{store.set(K("stnames"),e.target.checked);V.updatePlaceLabels&&V.updatePlaceLabels()};
  el("cities").onchange=e=>{store.set(K("citynames"),e.target.checked);V.updatePlaceLabels&&V.updatePlaceLabels()};
  el("rose").onchange=e=>{store.set(K("rose"),el("rose").checked);const r=V.map&&V.map.getContainer().querySelector(".rose");if(r)r.style.display=el("rose").checked?"":"none"};
  el("ca").onchange=e=>{showCA=e.target.checked;store.set("showCA",showCA);document.body.classList.toggle("show-ca",showCA);refresh()};
  $$(c.ctl.jump+" button").forEach(b=>b.onclick=()=>{V.init();store.set(K("view"),b.dataset.v);V.map.flyToBounds(VIEW_BOUNDS[b.dataset.v],{duration:.8,padding:[10,10]})});
  mapViews.push(V);return V;
}
const mainView=createMapView({el:"map",global:"parksMap",key:"",ctl:{labels:"#labels",ca:"#showCA",stn:"#stnames",cities:"#citynames",rose:"#rose",jump:"#jump"}});
const trailsView=createMapView({el:"tmap",global:"trailsMap",key:"t_",ctl:{labels:"#t_labels",ca:"#t_showCA",stn:"#t_stnames",cities:"#t_citynames",rose:"#t_rose",jump:"#t_jump"}});
function refreshTips(ids){mapViews.forEach(v=>v.refreshTips(ids))}
// picking a state or park in the taskbar flies the open map to that place
function zoomToFilter(instant){
  const v=currentTab==="map"||currentTab==="explore"?mainView:currentTab==="trails"?trailsView:null;if(!v||!v.map)return;
  if(!filt.u.size&&!filt.st.size){if(!instant)v.fly();return}
  const pts=visible().map(p=>[p.lat,p.lng]);if(!pts.length)return;
  v.fitPoints(pts,{instant,maxZoom:filt.u.size&&pts.length<=3?10:8});
}
// "show this on the map" from cards and the list
function focusOnMap(id){
  const p=byId.get(id);if(!p)return;
  if(p.kind==="trail"){window.TrailsMap&&window.TrailsMap.showOnMap(p);return}
  if(p.kind==="ca"&&!showCA){showCA=true;store.set("showCA",true);syncCAChecks();refresh()}
  if(currentTab==="explore")setPane("map");else showTab("map");setTimeout(()=>mainView.focus(p),120);
}
function syncCAChecks(){mapViews.forEach(v=>{v.cfg&&$(v.cfg.ctl.ca)&&($(v.cfg.ctl.ca).checked=showCA)});document.body.classList.toggle("show-ca",showCA)}

// ---------- list format (Google-Sheets-style grid) ----------
const COLS=[{k:"name",t:"Name"},{k:"d",t:"Designation"},{k:"city",t:"Nearest City / Community"},{k:"state",t:"State"},{k:"visited",t:"Visited"},{k:"year",t:"Year Last Visited"},{k:"hl",t:"Highlights"}];
let dataset=store.get("dataset","nps"), sortKey="name", sortDir=1;
let customRows=store.get("customRows",[]);
const saveCustom=()=>store.set("customRows",customRows);
const mkCustom=r=>({id:r.id,name:"",title:"",d:"",states:[],code:"",kind:"custom",city:"",state:"",hl:"",lat:null,lng:null,url:"",approx:false,blurb:""});
customRows.forEach(r=>byId.set(r.id,mkCustom(r)));
const cellVal=(p,k)=>k==="visited"?(checked.has(p.id)?"TRUE":"FALSE"):String(fld(p,k)??"");
const baseSrc=()=>(dataset==="trails"?trailRecords:dataset==="ca"?caParks:parks).concat(customRows.filter(r=>r.ds===dataset).map(r=>byId.get(r.id)));
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
  $("#lcount").textContent=dataset==="trails"?`${rows.length.toLocaleString()} of ${total.toLocaleString()} trails${trailMsg?" · "+trailMsg:""}`:`${rows.length} of ${total} rows · ${dataset==="ca"?"California State Parks":"National Park Service"}`;
  $$("#ltable th[data-k]").forEach(th=>{const k=th.dataset.k,f=colFilt[k];
    th.querySelector(".fbtn").classList.toggle("on",!!f&&(!!f.vals||!!f.text));
    th.dataset.dir=k===sortKey?(sortDir>0?"▲":"▼"):""});
  tbody.innerHTML=rows.map((p,r)=>`<tr data-r="${r}"><td class="rn">${r+1}</td>`+COLS.map((c,ci)=>{
    const v=cellVal(p,c.k);
    const ed=isEdited(p,c.k);
    return `<td data-c="${ci}" class="k-${c.k} ${ci===0?"nm ":""}${c.k==="visited"||c.k==="year"?"c":""}${ed?" edited":""}"${ed?` title="Edited. Official: ${esc(official(p,c.k)||"(blank)")}"`:""}>`+(c.k==="visited"?`<input type="checkbox" tabindex="-1" ${v==="TRUE"?"checked":""} aria-label="Visited">`:esc(v))+"</td>"}).join("")+"</tr>").join("");
  if(!keep){sel={r0:0,c0:0,r1:0,c1:0};act={r:0,c:0}}
  clampSel();applySel();
  if(cardMQ.matches)renderCards();
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
  if(currentTab==="explore"&&mainView.map&&(linkFlag||wrap.contains(document.activeElement)))mainView.highlight(rows[act.r]);
}
let linkFlag=false;
function rowHover(id,on){if(currentTab!=="explore")return;const r=rows.findIndex(p=>p.id===id);if(r<0)return;
  (tbody.rows[r]||{classList:{toggle(){}}}).classList.toggle("maphl",on);const c=$('#cardlist .rc[data-r="'+r+'"]');c&&c.classList.toggle("maphl",on)}
function selectRowById(id){if(currentTab!=="explore")return;const r=rows.findIndex(p=>p.id===id);if(r<0)return;
  act={r,c:0};sel={r0:r,c0:0,r1:r,c1:COLS.length-1};linkFlag=true;applySel();linkFlag=false;
  if(cardMQ.matches)$('#cardlist .rc[data-r="'+r+'"]')?.scrollIntoView({block:"center"});else cell(r,0)?.scrollIntoView({block:"center"})}
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
  const td=cell(r,c);if(td){if(k==="visited")td.querySelector("input").checked=v==="TRUE";else{td.textContent=v;const ed=isEdited(p,k);td.classList.toggle("edited",ed);if(ed)td.title="Edited. Official: "+(official(p,k)||"(blank)");else td.removeAttribute("title")}}
}
function finish(batch){if(!batch.length)return;hist.push(batch);if(batch.length>1)toast(`Changed ${batch.length} cells`,"Undo",undo);redoS.length=0;saveEdits();refreshOthers();refreshTips(batch.map(x=>x.id));renderEditsPanel();applySel()}
function applyBatch(batch,dir){ // dir: 'old' for undo, 'val' for redo
  (dir==="old"?batch.slice().reverse():batch).forEach(x=>put(byId.get(x.id),x.k,x[dir]));saveEdits();renderList(true);refreshOthers();refreshTips(batch.map(x=>x.id));renderEditsPanel()}
function describe(b){const p=byId.get(b[0].id),t=COLS.find(c=>c.k===b[0].k);return b.length===1?`${t?t.t:b[0].k} of ${p?disp(p):"row"}`:`${b.length} changes`}
function undo(){const b=hist.pop();if(!b)return;redoS.push(b);applyBatch(b,"old");toast("Undone: "+describe(b),"Redo",redo)}
function redo(){const b=redoS.pop();if(!b)return;hist.push(b);applyBatch(b,"val");toast("Redone: "+describe(b),"Undo",undo)}
// toasts (polite live region)
let toastT=0;
function toast(msg,label,fn){const t=$("#toast");t.innerHTML=`<span></span>${label?`<button type="button"></button>`:""}`;t.firstChild.textContent=msg;
  if(label){const b=t.querySelector("button");b.textContent=label;b.onclick=()=>{t.hidden=true;fn()}}
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},6000)}

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

// ----- card view (narrow screens): rows as expandable cards, bottom-sheet editor
const cardMQ=matchMedia("(max-width:700px)"),openCards=new Set();
cardMQ.addEventListener("change",()=>renderList(true));
function renderCards(){
  const host=$("#cardlist");
  host.innerHTML=rows.map((p,r)=>{const open=openCards.has(p.id),ed=COLS.some(c=>isEdited(p,c.k));
    return `<article class="rc${open?" open":""}${ed?" edited":""}" data-r="${r}">
    <div class="rc-h"><label class="rc-v"><input type="checkbox" ${checked.has(p.id)?"checked":""} aria-label="Visited: ${esc(disp(p))}"></label>
    <button type="button" class="rc-t" aria-expanded="${open}"><b>${esc(cellVal(p,"name")||"(unnamed)")}</b><span>${esc([cellVal(p,"d"),cellVal(p,"city"),cellVal(p,"state")].filter(Boolean).join(" · "))}</span></button>${ed?`<span class="ed" title="Edited from the official value">edited</span>`:""}</div>
    ${open?`<div class="rc-b"><p><b>${esc(COLS[5].t)}:</b> ${esc(cellVal(p,"year"))||"—"}</p><p><b>${esc(COLS[6].t)}:</b> ${esc(cellVal(p,"hl"))||"—"}</p>
    <div class="rc-a"><button type="button" data-a="edit" class="pri">Edit</button>${p.lat?`<button type="button" data-a="map">Show on map</button>`:""}</div></div>`:""}</article>`}).join("")||`<p class="gridmsg">No rows match.</p>`;
}
$("#cardlist").addEventListener("click",e=>{
  const art=e.target.closest(".rc");if(!art)return;const r=+art.dataset.r,p=rows[r];
  if(e.target.matches("input[type=checkbox]")){const b=[];setCell(r,visIdx(),e.target.checked?"TRUE":"FALSE",b);finish(b);return}
  if(e.target.closest(".rc-t")){openCards.has(p.id)?openCards.delete(p.id):openCards.add(p.id);renderCards();return}
  const a=e.target.dataset.a;if(a==="edit")openSheet(r);else if(a==="map")focusOnMap(p.id);
});
$("#cardSort").onchange=e=>{sortKey=e.target.value;sortDir=1;renderList(true)};
let sheetR=-1;
function openSheet(r){
  sheetR=r;const p=rows[r],f=$("#sheetFields");
  f.innerHTML=["name","d","city","state","year","hl"].map(k=>{const ci=COLS.findIndex(c=>c.k===k);
    return `<label>${esc(COLS[ci].t)}${k==="hl"?`<textarea name="${k}" rows="3">${esc(cellVal(p,k))}</textarea>`:`<input name="${k}" value="${esc(cellVal(p,k))}">`}</label>`}).join("");
  $("#sheetTitle").textContent=cellVal(p,"name")||"Edit row";$("#sheet").showModal();
}
$("#sheetForm").onsubmit=e=>{e.preventDefault();const b=[];
  new FormData($("#sheetForm")).forEach((v,k)=>{const ci=COLS.findIndex(c=>c.k===k);if(ci>=0)setCell(sheetR,ci,v,b)});
  finish(b);$("#sheet").close();renderCards()};
$("#sheetCancel").onclick=()=>$("#sheet").close();
$("#keysBtn").onclick=()=>$("#keysDlg").showModal();
document.addEventListener("keydown",e=>{if(e.key==="?"&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)&&!e.target.isContentEditable&&!e.target.closest("#tablewrap")){e.preventDefault();$("#keysDlg").showModal()}});

// ----- keyboard
function move(dr,dc,ext){
  if(ext){sel.r1=clamp(sel.r1+dr,0,rows.length-1);sel.c1=clamp(sel.c1+dc,0,COLS.length-1);act.r=act.r}
  else{act.r=clamp(act.r+dr,0,rows.length-1);act.c=clamp(act.c+dc,0,COLS.length-1);sel={r0:act.r,c0:act.c,r1:act.r,c1:act.c}}
  applySel();scrollTo();
}
function clearSel(){const {r0,r1,c0,c1}=rect(),b=[];for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)setCell(r,c,"",b);finish(b)}
function fillDown(){const {r0,r1,c0,c1}=rect(),b=[];for(let c=c0;c<=c1;c++){const v=cellVal(rows[r0],COLS[c].k);for(let r=r0+1;r<=r1;r++)setCell(r,c,v,b)}finish(b)}
wrap.addEventListener("keydown",e=>{
  if(e.target.closest("thead"))return;                       // header buttons (sort / filter) keep their own keys
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
  else if(k==="Tab"){const first=act.r===0&&act.c===0,last=act.r===rows.length-1&&act.c===COLS.length-1;
    if(e.shiftKey?first:last)return;                         // leave the grid at its edges instead of trapping Tab
    e.preventDefault();move(0,e.shiftKey?-1:1,false)}
  else if(k==="Escape"){sel={r0:act.r,c0:act.c,r1:act.r,c1:act.c};applySel()}
  else if(k==="?"){e.preventDefault();$("#keysDlg").showModal()}
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
const COL_TITLES={parks:{name:"Name",d:"Designation",city:"Nearest City / Community",state:"State",visited:"Visited",year:"Year Last Visited",hl:"Highlights"},
                  trails:{name:"Trail",d:"Class / use",city:"Park",state:"State",visited:"Hiked",year:"Year Last Hiked",hl:"Details & Notes"}};
function setDataset(d){
  const was=dataset;dataset=d;if(d!=="trails")store.set("dataset",d);
  $$("#dataset button").forEach(b=>b.classList.toggle("on",b.dataset.ds===d));
  $("#dataset").style.display=d==="trails"?"none":"";$("#dsTrails").hidden=d!=="trails";
  const T=COL_TITLES[d==="trails"?"trails":"parks"];COLS.forEach(c=>{c.t=T[c.k]});$$("#ltable th[data-k] .ht").forEach(s=>{s.textContent=T[s.closest("th").dataset.k]});
  $("#listHint").firstChild&&($("#listHint").dataset.mode=d);
  if(was!==d){colFilt={};hist=[];redoS=[]}
  renderList()}
$$("#dataset button").forEach(b=>b.onclick=()=>setDataset(b.dataset.ds));
$("#mapSel").onclick=()=>{const {r0,r1}=rect(),sel=rows.slice(r0,r1+1).filter(p=>p&&p.lat);if(!sel.length)return;
  if(sel.length===1){focusOnMap(sel[0].id);return}
  const trails=sel[0].kind==="trail";if(!trails&&currentTab==="explore")setPane("map");else showTab(trails?"trails":"map");setTimeout(()=>(trails?trailsView:mainView).fitPoints(sel.map(p=>[p.lat,p.lng])),150)};
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
// active-filter chips + progress summary
function renderChips(){
  const out=[],desc={"__NP63":"National Parks (63)"};
  if(filt.q.trim())out.push(["q","",`Search: “${filt.q.trim()}”`]);
  filt.st.forEach(v=>out.push(["st",v,v]));
  filt.u.forEach(v=>{const p=parks.find(x=>x.code===v);out.push(["u",v,p?p.title:v])});
  filt.d.forEach(v=>out.push(["d",v,desc[v]||v]));
  filt.v.forEach(v=>out.push(["v",v,v==="1"?"Checked":"Unchecked"]));
  $("#chips").innerHTML=out.map(([k,v,t])=>`<button type="button" class="chip" data-k="${k}" data-v="${esc(v)}" aria-label="Remove filter: ${esc(t)}">${esc(t)} <span aria-hidden="true">✕</span></button>`).join("");
  $("#chips").hidden=!out.length;
  const m=filt.st.size+filt.u.size+filt.d.size;$("#moreBadge").hidden=!m;$("#moreBadge").textContent=m;
  const np=parks.filter(p=>p.np63),vn=np.filter(p=>checked.has(p.id)).length;
  $("#progress").textContent=`${vn} of ${np.length} national parks visited`;
}
$("#chips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;const k=c.dataset.k,v=c.dataset.v;
  if(k==="q"){$("#q").value="";filt.q=""}else filt[k].delete(v);
  msInstances.forEach(m=>m.draw());refresh();if(k==="st"||k==="u")zoomToFilter()};
$("#progress").onclick=()=>{filt.d.clear();filt.d.add("__NP63");filt.v.clear();filt.v.add("0");msInstances.forEach(m=>m.draw());refresh()};
function refreshOthers(){
  const list=visible();
  const inTrails=document.body.dataset.group==="trails";
  if(inTrails){const tl=visible(trailRecords);$("#count").textContent=`${tl.length.toLocaleString()} of ${trailRecords.length.toLocaleString()} trails · ${list.length} parks selected`+(trailMsg?` · ${trailMsg}`:"")}
  else $("#count").textContent=`${list.length} of ${parks.length} NPS units${showCA?" (+ CA state parks on map)":""} · ${[...checked].length} checked`;
  renderGrid(gridMode==="trails"?visible(trailRecords):list);mapViews.forEach(v=>v.render());syncCAChecks();renderVisited();
  renderChips();
  bridgeSubs.forEach(f=>{try{f()}catch(e){}});
}

// Small bridge so self-contained modules (the Trails Map tab) can share parks, visited checks and edits.
const bridgeSubs=[];
window.ParksBridge={
  parks,caParks,view:trailsView,
  fld,disp,official,
  isChecked:id=>checked.has(id),
  toggle,
  setField(id,k,v){const p=byId.get(id);if(!p)return;put(p,k,String(v));saveEdits();renderList(true);refreshOthers();renderEditsPanel()},
  subscribe:f=>bridgeSubs.push(f),
  infoUrl,
  visibleParks:()=>visible(),
  tab:()=>currentTab,
  setTrails(recs,msg){trailRecords=recs;trailMsg=msg||"";recs.forEach(r=>byId.set(r.id,r));refreshOthers();renderList(true);renderVisited()},
  trailRecords:()=>trailRecords,
  tabs:{showTab},                              // parks passing every taskbar filter
  setUnitFilter(codes){filt.u.clear();codes.forEach(c=>filt.u.add(c));msInstances.forEach(m=>m.draw());refresh()},
  zoomSens:()=>zoomK()
};
$("#export").onclick=()=>{
  const txt=parks.filter(p=>checked.has(p.id)).map(p=>disp(p)+" ("+p.states.join("/")+")").join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download="checked-parks.txt";a.click();
};
$("#reset").onclick=()=>{if(confirm("Uncheck everything?")){checked.clear();save();refresh()}};

syncCAChecks();setDataset(dataset);
{const zs=$("#zoomSens"),zo=$("#zoomSensOut"),names=["gentle","relaxed","balanced","quick","very fast"];
  const show=()=>{zo.textContent=zs.value+" · "+names[zs.value-1]};zs.value=clamp(+store.get("zoomSens",4),1,5);show();zs.oninput=()=>{store.set("zoomSens",+zs.value);show()}}
setDot(dotScale);setCols(cols);refresh();showTab(store.get("tab","explore")==="about"?"explore":store.get("tab","explore"));renderEditsPanel();
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
