/* TableKit: the one table pattern used across the site.
   - Every column heading has a ▾ button that opens the same menu: sort, "text contains", and a list of values to tick.
   - Every tab has one ⚙ settings button (.hamb) holding the tab's extra filters, view options and exports.
   TableKit.colMenu(opts) opens the heading menu; TableKit.settings(el) wires a ⚙ settings button. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let menu=null,openKey=null;
function el(){
  if(!menu){menu=document.getElementById("colmenu");if(!menu){menu=document.createElement("div");menu.id="colmenu";menu.className="colmenu";menu.hidden=true}document.body.appendChild(menu);   // on body, so it shows from any tab
    document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target)&&!e.target.closest(".fbtn"))close()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden)close()})}
  return menu;
}
function close(){if(menu){menu.hidden=true;openKey=null}}
/* opts: key (unique id, a second click on the same ▾ closes), anchor (the ▾ button), values: [[value, count]...],
   filter: {vals:Set|null, text:""}, onFilter(filter|undefined), onSort(+1|-1), sortLabels: ["A → Z","Z → A"] */
function colMenu(o){
  const m=el();if(openKey===o.key&&!m.hidden){close();return}
  openKey=o.key;const f=o.filter||{vals:null,text:""},counts=new Map(o.values),all=o.values.map(v=>v[0]);
  const sl=o.sortLabels||["A → Z","Z → A"];
  m.innerHTML=`<div class="cm-sort"><button type="button" data-a="asc">Sort ${esc(sl[0])}</button><button type="button" data-a="desc">Sort ${esc(sl[1])}</button></div>
   <label class="cm-l">Filter by condition</label><input type="search" class="cm-text" placeholder="Text contains…" value="${esc(f.text||"")}">
   <label class="cm-l">Filter by values</label><input type="search" class="cm-search" placeholder="Search values…">
   <div class="ms-actions"><button type="button" data-a="all">Select shown</button><button type="button" data-a="none">Clear</button></div>
   <ul class="ms-list cm-list"></ul><div class="cm-foot"><button type="button" data-a="reset">Clear this filter</button><button type="button" data-a="done" class="cm-done">Done</button></div>`;
  const list=m.querySelector(".cm-list"),search=m.querySelector(".cm-search"),text=m.querySelector(".cm-text");
  const allowed=new Set(f.vals||all);
  const draw=()=>{list.innerHTML=all.filter(v=>(v||"(Blanks)").toLowerCase().includes(search.value.toLowerCase())).map(v=>
     `<li><label><input type="checkbox" value="${esc(v)}" ${allowed.has(v)?"checked":""}><span>${esc(v||"(Blanks)")}</span><em>${counts.get(v)}</em></label></li>`).join("")||"<li class='ms-empty'>No matches</li>"};
  const commit=()=>{const vals=allowed.size===all.length?null:new Set(allowed),t=text.value;o.onFilter((vals||t)?{vals,text:t}:undefined)};
  draw();
  m.onclick=e=>{e.stopPropagation();const a=e.target.closest("[data-a]")?.dataset.a;if(!a)return;
    if(a==="asc"||a==="desc"){o.onSort(a==="asc"?1:-1);close()}
    else if(a==="all"){[...list.querySelectorAll("input")].forEach(i=>allowed.add(i.value));draw();commit()}
    else if(a==="none"){allowed.clear();draw();commit()}
    else if(a==="reset"){o.onFilter(undefined);close()}
    else if(a==="done")close()};
  list.onchange=e=>{e.target.checked?allowed.add(e.target.value):allowed.delete(e.target.value);commit()};
  search.oninput=draw;text.oninput=commit;
  const b=o.anchor.getBoundingClientRect();m.hidden=false;
  m.style.top=Math.min(b.bottom+4,innerHeight-m.offsetHeight-8)+"px";m.style.left=Math.max(8,Math.min(b.left,innerWidth-m.offsetWidth-8))+"px";
  if(matchMedia("(pointer:fine)").matches)text.focus();
}
/* does value v (a cell's text) pass filter f */
const passes=(f,v)=>!f||((!f.vals||f.vals.has(v))&&(!f.text||!f.text.trim()||v.toLowerCase().includes(f.text.trim().toLowerCase())));
/* count each value of key over rows: [[value,count]...] sorted */
function values(rows,get){const c=new Map();rows.forEach(r=>{const v=get(r);c.set(v,(c.get(v)||0)+1)});
  return [...c.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}))}

/* ⚙ settings button: opens on hover with a mouse, click pins it open, tap works on touch; on phones it opens as a bottom sheet */
function settings(root){
  if(!root||root.dataset.tk)return;root.dataset.tk="1";
  const hb=root.querySelector(".hamb-btn"),hm=root.querySelector(".hamb-menu");let timer=0,pinned=false;
  const open=()=>{clearTimeout(timer);hm.hidden=false;hb.setAttribute("aria-expanded","true");document.body.classList.add("tk-open")};
  const close=(d=0)=>{clearTimeout(timer);timer=setTimeout(()=>{hm.hidden=true;pinned=false;hb.setAttribute("aria-expanded","false");document.body.classList.remove("tk-open")},d)};
  root.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")open()});
  root.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!pinned&&!root.contains(document.activeElement))close(450)});
  hb.addEventListener("click",()=>{if(hm.hidden){open();pinned=true}else if(!pinned){pinned=true}else close(0)});
  document.addEventListener("click",e=>{if(!root.contains(e.target)&&!hm.hidden&&!e.target.closest(".colmenu"))close(0)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!hm.hidden){close(0);hb.focus()}});
  hm.addEventListener("click",e=>{if(e.target.closest(".hm-x")){close(0);return}const b=e.target.closest("button");if(!b||b.hasAttribute("data-keep")||b.disabled)return;close(120)});
  return {open,close};
}
/* show how many settings filters are on, on the ⚙ button */
function badge(root,n){const b=root&&root.querySelector(".hm-badge");if(b){b.textContent=n||"";b.hidden=!n}}
window.TableKit={colMenu,closeMenu:close,passes,values,settings,badge,esc};
document.querySelectorAll(".hamb").forEach(settings);
})();
