/* Dashboard: an iPhone-style home screen of widgets and app shortcuts.
   Layout (columns 1-4, order, sizes) is saved in localStorage under "dash"; favorites under "favorites"; trip countdown under "countdown". */
(function(){
const A=window.DashAPI;if(!A)return;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const root=$("#dashGrid");if(!root)return;
const reduce=matchMedia("(prefers-reduced-motion: reduce)");

// ---------- widget catalogue ----------
const APPS=[["explore","▦","Explore","Table and map together"],["grid","▤","Park Info","Park cards"],["list","☰","Park List","Editable list"],["map","◉","Park Map","Full-screen map"],["visited","✓","Visited","Everything you've checked"],["about","⚙","Settings","Settings, backup, about"],["backup","⇩","Backup","Save a backup file"]];
const T={
  clock:{name:"Clock & date",desc:"Time and today's date",sizes:[[2,1],[4,1],[2,2]],def:[2,1]},
  calendar:{name:"Calendar",desc:"This month",sizes:[[2,2],[4,2]],def:[2,2]},
  progress:{name:"National parks progress",desc:"Visited of the 63 national parks",sizes:[[2,2],[2,1],[4,2]],def:[2,2]},
  statVisited:{name:"Visited overall",desc:"Every place you've checked",sizes:[[1,1],[2,1]],def:[1,1]},
  statLeft:{name:"Parks left",desc:"National parks still to go",sizes:[[1,1],[2,1]],def:[1,1]},
  statStates:{name:"States visited",desc:"States with a visited place",sizes:[[1,1],[2,1]],def:[1,1]},
  favorites:{name:"Favorite parks",desc:"Your favorites; add as many as you like",sizes:[[2,2],[2,1],[4,2]],def:[2,2]},
  potd:{name:"Park of the day",desc:"A new national park every day",sizes:[[2,2],[4,2]],def:[2,2]},
  countdown:{name:"Trip countdown",desc:"Days until your next trip",sizes:[[2,1],[1,1],[4,1]],def:[2,1]},
  recent:{name:"Recently visited",desc:"Latest years from your list",sizes:[[2,2],[4,2]],def:[2,2]},
  topStates:{name:"Top states",desc:"Where you've visited most",sizes:[[2,2],[4,2]],def:[2,2]},
  app:{name:"App shortcut",desc:"Jump to a part of the site",sizes:[[2,1],[1,1]],def:[2,1]}
};
const uid=()=>Math.random().toString(36).slice(2,8);
const mk=(type,cfg)=>({id:type+"-"+uid(),type,w:T[type].def[0],h:T[type].def[1],cfg:cfg||{}});
const DEFAULT=()=>({v:1,cols:4,items:[mk("clock"),mk("statVisited"),mk("statStates"),mk("progress"),mk("favorites"),mk("calendar"),mk("potd"),mk("recent"),mk("topStates"),mk("countdown"),
  ...APPS.map(a=>{const it=mk("app",{target:a[0]});if(a[0]==="backup")it.w=1;return it})]});   // the main apps are large, Backup is the small one
let st=A.store.get("dash",null);if(!st||!Array.isArray(st.items)||![1,2,3,4].includes(st.cols))st=DEFAULT();
if((st.v||1)<2){st.v=2;st.items.forEach(it=>{if(it.type==="app"&&it.cfg&&it.cfg.target!=="backup"){it.w=2;it.h=1}});A.store.set("dash",st)}   // v2: main app shortcuts became large tiles
const save=()=>A.store.set("dash",st);
let editing=false,visible=false,timer=0;

// ---------- data helpers ----------
const nps63=()=>A.parks.filter(p=>p.np63);
const visitedAll=()=>A.visited();
const yearOf=s=>Math.max(0,...(String(s||"").match(/\b(?:19|20)\d\d\b/g)||[0]).map(Number));
const favs=()=>A.store.get("favorites",[]).filter(id=>A.byId.has(id));
function openPark(id){A.focusOnMap(id)}
const pad=n=>String(n).padStart(2,"0");

// ---------- rendering ----------
const body={
  clock(){return `<div class="w-clock"><div class="w-time" data-live="time"></div><div class="w-date" data-live="date"></div></div>`},
  calendar(){const d=new Date(),y=d.getFullYear(),m=d.getMonth(),first=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate();
    let cells="";for(let i=0;i<first;i++)cells+="<i></i>";for(let k=1;k<=n;k++)cells+=`<b${k===d.getDate()?' class="today" aria-current="date"':""}>${k}</b>`;
    return `<div class="w-cal"><div class="w-cal-h">${esc(d.toLocaleDateString([],{month:"long",year:"numeric"}))}</div><div class="w-cal-g" aria-hidden="true">${"SMTWTFS".split("").map(c=>`<span>${c}</span>`).join("")}${cells}</div></div>`},
  progress(){const np=nps63(),v=np.filter(p=>A.isChecked(p.id)).length,pc=np.length?v/np.length:0,R=42,C=2*Math.PI*R;
    return `<div class="w-prog"><svg viewBox="0 0 100 100" role="img" aria-label="${v} of ${np.length} national parks visited"><circle cx="50" cy="50" r="${R}" class="trk"/><circle cx="50" cy="50" r="${R}" class="bar" stroke-dasharray="${(C*pc).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="49" text-anchor="middle" class="big">${v}</text><text x="50" y="65" text-anchor="middle" class="sm">of ${np.length}</text></svg>
      <div class="w-prog-t"><b>National parks</b><span>${Math.round(pc*100)}% visited</span><span>${np.length-v} to go</span></div></div>`},
  statVisited(){return `<div class="w-stat"><b>${visitedAll().length}</b><span>Visited overall</span></div>`},
  statLeft(){const np=nps63();return `<div class="w-stat"><b>${np.filter(p=>!A.isChecked(p.id)).length}</b><span>Parks left</span></div>`},
  statStates(){const s=new Set();visitedAll().forEach(p=>p.states.forEach(x=>s.add(x)));return `<div class="w-stat"><b>${s.size}</b><span>States visited</span></div>`},
  favorites(tile){const f=favs().map(id=>A.byId.get(id)),big=f[0];
    const rows=f.slice(big?1:0).map(p=>`<li><button type="button" data-open="${esc(p.id)}">${esc(A.disp(p))}</button><button type="button" class="x" data-unfav="${esc(p.id)}" aria-label="Remove ${esc(A.disp(p))} from favorites">✕</button></li>`).join("");
    return `<div class="w-fav"><div class="w-h">★ Favorite parks</div>${big?`<div class="w-fav-top"><button type="button" class="w-fav-name" data-open="${esc(big.id)}">${esc(A.disp(big))}</button><span>${esc(A.fld(big,"d"))} · ${esc(big.states.slice(0,2).join(", "))}</span>${A.isChecked(big.id)?'<em>✓ Visited</em>':'<em class="no">Not visited yet</em>'}<button type="button" class="x" data-unfav="${esc(big.id)}" aria-label="Remove ${esc(A.disp(big))} from favorites">✕</button></div>`:`<p class="w-empty">No favorites yet. Add the parks you love most.</p>`}
      ${rows?`<ul class="w-fav-l">${rows}</ul>`:""}<button type="button" class="w-btn" data-act="addfav">+ Add favorite</button></div>`},
  potd(){const np=nps63(),d=new Date(),i=(d.getFullYear()*372+d.getMonth()*31+d.getDate())%np.length,p=np[i];
    return `<div class="w-potd"><div class="w-h">Park of the day</div><b>${esc(A.disp(p))}</b><span>${esc(p.states.slice(0,2).join(", "))}</span><p>${esc((A.fld(p,"hl")||p.blurb||"").slice(0,140))}</p><div class="w-row"><button type="button" class="w-btn" data-open="${esc(p.id)}">Show on map</button><button type="button" class="w-btn" data-fav="${esc(p.id)}">${favs().includes(p.id)?"★ Favorite":"☆ Favorite"}</button></div></div>`},
  countdown(tile){const c=A.store.get("countdown",null);let main='<p class="w-empty">No trip planned yet.</p>';
    if(c&&c.date){const days=Math.round((new Date(c.date+"T00:00:00")-new Date(new Date().toDateString()))/864e5);
      main=days>=0?`<div class="w-cd"><b>${days}</b><span>${days===1?"day":"days"} until</span></div><div class="w-cd-t">${esc(c.title||"Your trip")}</div>`:`<div class="w-cd-t">${esc(c.title||"Your trip")} was ${-days} day${days===-1?"":"s"} ago</div>`}
    return `<div class="w-count"><div class="w-h">Trip countdown</div>${main}<button type="button" class="w-btn" data-act="trip">${c&&c.date?"Change trip":"Set a trip"}</button></div>`},
  recent(){const l=visitedAll().map(p=>({p,y:yearOf(A.fld(p,"year"))})).filter(x=>x.y).sort((a,b)=>b.y-a.y).slice(0,5);
    return `<div class="w-rec"><div class="w-h">Recently visited</div>${l.length?`<ul>${l.map(x=>`<li><button type="button" data-open="${esc(x.p.id)}">${esc(A.disp(x.p))}</button><span>${x.y}</span></li>`).join("")}</ul>`:`<p class="w-empty">Add a year in the list's "Year Last Visited" column to see your latest trips here.</p>`}</div>`},
  topStates(){const m=new Map();visitedAll().forEach(p=>{const s=p.states[0];if(s)m.set(s,(m.get(s)||0)+1)});const l=[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5),mx=l[0]?l[0][1]:1;
    return `<div class="w-top"><div class="w-h">Top states</div>${l.length?`<ul>${l.map(([s,n])=>`<li><span>${esc(s)}</span><i style="--w:${Math.round(n/mx*100)}%"></i><b>${n}</b></li>`).join("")}</ul>`:`<p class="w-empty">Mark places as visited to see your top states.</p>`}</div>`},
  app(tile){const a=APPS.find(x=>x[0]===tile.cfg.target)||APPS[0],lg=tile.w>=2;return `<button type="button" class="w-app${lg?" lg":""}" data-go="${a[0]}"><span class="ico">${a[1]}</span><span class="alb">${esc(a[2])}${lg?`<small>${esc(a[3])}</small>`:""}</span></button>`}
};
function tileHtml(it,i,n){
  const t=T[it.type],name=it.type==="app"?(APPS.find(x=>x[0]===it.cfg.target)||APPS[0])[2]:t.name;
  const w=Math.min(it.w,st.cols),h=it.h;
  return `<section class="dw dw-${it.type}${it.type==="app"&&it.w>=2?" lg":""}" data-id="${esc(it.id)}" style="grid-column:span ${w};grid-row:span ${h}" aria-label="${esc(name)}">
    ${body[it.type](it)}
    <div class="dw-edit"><button type="button" class="dw-rm" data-edit="rm" aria-label="Remove ${esc(name)}">−</button>
      ${t.sizes.length>1?`<button type="button" class="dw-sz" data-edit="size" aria-label="Change size of ${esc(name)}">⤡</button>`:""}
      <span class="dw-mv"><button type="button" data-edit="prev" aria-label="Move ${esc(name)} earlier"${i===0?" disabled":""}>◀</button><button type="button" data-edit="next" aria-label="Move ${esc(name)} later"${i===n-1?" disabled":""}>▶</button></span></div></section>`}
function layout(){
  const wrap=$("#dashWrap"),W=wrap.clientWidth||360,gap=10,cols=st.cols;
  const cell=(W-gap*(cols-1))/cols,rowh=Math.min(cell,cols>=3?132:118);
  root.style.setProperty("--cols",cols);root.style.setProperty("--rowh",Math.max(64,rowh).toFixed(1)+"px");
  wrap.style.maxWidth={1:"430px",2:"600px",3:"720px",4:"820px"}[cols];
}
function render(){
  root.innerHTML=st.items.map((it,i)=>tileHtml(it,i,st.items.length)).join("");
  root.classList.toggle("editing",editing);layout();tick();
  $$("#dashCols button").forEach(b=>{const on=+b.dataset.c===st.cols;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)});
}
function tick(){
  const d=new Date();
  $$("[data-live=time]").forEach(e=>e.textContent=d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));
  $$("[data-live=date]").forEach(e=>e.textContent=d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}));
}

// ---------- editing ----------
function setEditing(on){editing=on;document.body.classList.toggle("dash-editing",on);$("#dashEdit").textContent=on?"Done":"Edit";$("#dashEdit").setAttribute("aria-pressed",on);
  $("#dashTools").hidden=!on;render()}
$("#dashEdit").onclick=()=>setEditing(!editing);
$$("#dashCols button").forEach(b=>b.onclick=()=>{st.cols=+b.dataset.c;save();render();toast(`${st.cols} across`)});
const toast=m=>{const t=$("#toast");t.innerHTML="<span></span>";t.firstChild.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2500)};
$("#dashReset").onclick=()=>{if(confirm("Put the dashboard back to the default layout? Your favorites and trip stay."))  {st=DEFAULT();save();render()}};
root.addEventListener("click",e=>{
  const ed=e.target.closest("[data-edit]");
  if(ed){const tile=ed.closest(".dw"),i=st.items.findIndex(x=>x.id===tile.dataset.id),it=st.items[i],k=ed.dataset.edit;
    if(k==="rm"){const sn=st.items.slice();st.items.splice(i,1);save();render();const tt=$("#toast");tt.innerHTML='<span>Removed</span><button type="button">Undo</button>';tt.querySelector("button").onclick=()=>{st.items=sn;save();render();tt.hidden=true};tt.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>tt.hidden=true,6000);return}
    if(k==="size"){const sz=T[it.type].sizes,j=sz.findIndex(s=>s[0]===it.w&&s[1]===it.h),nx=sz[(j+1)%sz.length];it.w=nx[0];it.h=nx[1];save();render();return}
    if(k==="prev"||k==="next"){const j=i+(k==="prev"?-1:1);if(j<0||j>=st.items.length)return;[st.items[i],st.items[j]]=[st.items[j],st.items[i]];save();render();const nb=root.querySelector(`[data-id="${CSS.escape(it.id)}"] [data-edit=${k}]`)||root.querySelector(`[data-id="${CSS.escape(it.id)}"] [data-edit]`);nb&&nb.focus();return}
  }
  if(editing)return;                       // controls only act outside edit mode
  const go=e.target.closest("[data-go]");if(go){const t=go.dataset.go;if(t==="backup")A.backup();else A.showTab(t);return}
  const op=e.target.closest("[data-open]");if(op){openPark(op.dataset.open);return}
  const uf=e.target.closest("[data-unfav]");if(uf){A.store.set("favorites",favs().filter(x=>x!==uf.dataset.unfav));render();return}
  const fv=e.target.closest("[data-fav]");if(fv){const id=fv.dataset.fav,f=favs();A.store.set("favorites",f.includes(id)?f.filter(x=>x!==id):[...f,id]);render();return}
  const ac=e.target.closest("[data-act]");if(ac){if(ac.dataset.act==="addfav")openPicker();else if(ac.dataset.act==="trip")openTrip()}
});

// drag to reorder (edit mode): grab a tile and move it over another
{let drag=null;
  root.addEventListener("pointerdown",e=>{if(!editing||e.button>0||e.target.closest("button"))return;const tile=e.target.closest(".dw");if(!tile)return;
    drag={tile,x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};tile.setPointerCapture(e.pointerId)});
  root.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<8)return;if(!drag.moved){drag.moved=true;drag.tile.classList.add("dragging")}
    drag.tile.style.transform="";const r=drag.tile.getBoundingClientRect();drag.tile.style.transform=`translate(${e.clientX-drag.x}px,${e.clientY-drag.y}px) scale(1.04)`;
    const under=[...root.querySelectorAll(".dw")].find(t=>{if(t===drag.tile)return false;const b=t.getBoundingClientRect();return e.clientX>b.left&&e.clientX<b.right&&e.clientY>b.top&&e.clientY<b.bottom});
    if(under){const kids=[...root.children],a=kids.indexOf(drag.tile),b=kids.indexOf(under);
      const before=r.left,beforeT=r.top;root.insertBefore(drag.tile,a<b?under.nextSibling:under);
      drag.tile.style.transform="";const r2=drag.tile.getBoundingClientRect();drag.x+=r2.left-before;drag.y+=r2.top-beforeT;   // keep the tile under the finger after the grid reflows
      drag.tile.style.transform=`translate(${e.clientX-drag.x}px,${e.clientY-drag.y}px) scale(1.04)`}});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;d.tile.classList.remove("dragging");d.tile.style.transform="";
    if(d.moved){const order=[...root.children].map(t=>t.dataset.id);st.items.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));save();render()}};
  root.addEventListener("pointerup",end);root.addEventListener("pointercancel",end)}

// ---------- dialogs ----------
const addDlg=$("#dashAdd");
$("#dashAddBtn").onclick=()=>{
  const w=Object.entries(T).filter(([k])=>k!=="app").map(([k,t])=>`<li><div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div><button type="button" data-add="${k}">Add</button></li>`).join("");
  const a=APPS.map(x=>`<li><div><b>${x[1]} ${esc(x[2])}</b><span>${esc(x[3])}</span></div><button type="button" data-addapp="${x[0]}">Add</button></li>`).join("");
  $("#dashAddList").innerHTML=`<h3>Widgets</h3><ul>${w}</ul><h3>App shortcuts</h3><ul>${a}</ul>`;addDlg.showModal()};
addDlg.addEventListener("click",e=>{const b=e.target.closest("button[data-add],button[data-addapp]");if(!b)return;
  st.items.push(b.dataset.add?mk(b.dataset.add):mk("app",{target:b.dataset.addapp}));save();render();addDlg.close();toast("Added to the end of your dashboard");
  setTimeout(()=>{const last=root.lastElementChild;last&&last.scrollIntoView({block:"center",behavior:reduce.matches?"auto":"smooth"})},60)});
const pick=$("#dashPick");
function openPicker(){$("#dashPickQ").value="";drawPick();pick.showModal();setTimeout(()=>$("#dashPickQ").focus(),30)}
function drawPick(){const q=$("#dashPickQ").value.toLowerCase().trim(),f=new Set(favs());
  const list=[...A.parks,...A.caParks].filter(p=>!q||(A.disp(p)+" "+A.fld(p,"state")).toLowerCase().includes(q)).sort((a,b)=>(b.np63-a.np63)||A.disp(a).localeCompare(A.disp(b))).slice(0,150);
  $("#dashPickList").innerHTML=list.map(p=>`<li><button type="button" data-pick="${esc(p.id)}" aria-pressed="${f.has(p.id)}"><span>${f.has(p.id)?"★":"☆"}</span><b>${esc(A.disp(p))}</b><i>${esc(A.fld(p,"d"))} · ${esc(A.fld(p,"state")||p.states[0]||"")}</i></button></li>`).join("")||"<li class='w-empty'>No matches</li>"}
$("#dashPickQ").oninput=drawPick;
$("#dashPickList").onclick=e=>{const b=e.target.closest("[data-pick]");if(!b)return;const id=b.dataset.pick,f=favs();A.store.set("favorites",f.includes(id)?f.filter(x=>x!==id):[...f,id]);drawPick();render()};
$("#dashPickDone").onclick=()=>pick.close();
const trip=$("#dashTrip");
function openTrip(){const c=A.store.get("countdown",{})||{};$("#tripTitle").value=c.title||"";$("#tripDate").value=c.date||"";trip.showModal()}
$("#tripSave").onclick=e=>{e.preventDefault();const date=$("#tripDate").value;if(!date){$("#tripDate").focus();return}A.store.set("countdown",{title:$("#tripTitle").value.trim(),date});trip.close();render()};
$("#tripClear").onclick=()=>{A.store.set("countdown",null);trip.close();render()};
$("#tripCancel").onclick=()=>trip.close();

// ---------- lifecycle ----------
window.Dashboard={
  show(){visible=true;render();clearInterval(timer);timer=setInterval(tick,1000)},
  hide(){visible=false;clearInterval(timer);if(editing)setEditing(false)}
};
A.subscribe(()=>{if(visible&&!editing)render()});
if(document.body.classList.contains("dash"))window.Dashboard.show();   // app.js may have opened this tab before this file loaded
window.addEventListener("resize",()=>{if(visible)layout()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&editing&&visible&&!document.querySelector("dialog[open]"))setEditing(false)});
})();
