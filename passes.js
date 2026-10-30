/* Passes: which California State Parks annual passes are honored where (data/passes.js), with filters.
   Passes you hold and their end month are saved in localStorage under "myPasses"; the filters under "passFilt". */
(function(){
const A=window.DashAPI;if(!A||!A.passes.length)return;
const $=s=>document.querySelector(s);
const esc=A.esc,P=A.passes,L=A.passLbl,ICON={yes:"✓",limited:"✓",no:"✕",none:"–"};
let mine=A.store.get("myPasses",{});const saveMine=()=>A.store.set("myPasses",mine);
const F={q:"",pass:"",desig:"",status:"",vis:"",mine:false,...A.store.get("passFilt",{})};const saveF=()=>A.store.set("passFilt",F);
let visible=false;

const st=(p,id)=>p.passes[id]?p.passes[id].s:"none";
const held=()=>P.filter(ps=>mine[ps.id]&&mine[ps.id].own);
const cols=()=>F.mine&&!F.pass?held():P;
// months left on a held pass: "2026-07" runs to the end of July 2026
function expiry(ps){const m=mine[ps.id];if(!m||!m.own||!m.until)return null;const [y,mo]=m.until.split("-").map(Number);
  const end=new Date(y,mo,0,23,59),days=Math.ceil((end-Date.now())/864e5);return {end,days}}

function rows(){
  const q=F.q.trim().toLowerCase(),ids=F.pass?[F.pass]:cols().map(ps=>ps.id);
  return A.caParks.filter(p=>{
    if(q&&!(A.disp(p)+" "+A.fld(p,"city")+" "+A.fld(p,"d")).toLowerCase().includes(q))return false;
    if(F.vis&&(A.isChecked(p.id)?"1":"0")!==F.vis)return false;
    if(F.desig&&A.fld(p,"d")!==F.desig)return false;
    if(F.status)return F.status==="none"?ids.every(id=>st(p,id)==="none"):ids.some(id=>st(p,id)===F.status);
    if(F.pass||F.mine)return ids.some(id=>st(p,id)!=="none");
    return true;
  }).sort((a,b)=>A.disp(a).localeCompare(A.disp(b)));
}

function renderCards(){
  $("#passCards").innerHTML=P.map(ps=>{
    const n={yes:0,limited:0,no:0},ok=[];for(const p of A.caParks){const s=st(p,ps.id);if(s!=="none")n[s]++;if(s==="yes"||s==="limited")ok.push(p)}
    const v=ok.filter(p=>A.isChecked(p.id)).length,m=mine[ps.id]||{},e=expiry(ps);
    const badge=!m.own?"":!e?`<span class="pbadge">Held</span>`:e.days<0?`<span class="pbadge bad">Expired</span>`:e.days<=30?`<span class="pbadge warn">Ends in ${e.days} day${e.days===1?"":"s"}</span>`:`<span class="pbadge">Held · to ${e.end.toLocaleDateString([],{month:"short",year:"numeric"})}</span>`;
    return `<article class="pcard${F.pass===ps.id?" on":""}${m.own?" own":""}" data-id="${ps.id}">
      <button type="button" class="pc-t" data-pick="${ps.id}" aria-pressed="${F.pass===ps.id}"><b>${esc(ps.name)}</b>${badge}<span>${esc(ps.kind)} · ${esc(ps.form)}</span></button>
      <p class="pc-n"><span class="s-yes">✓ ${n.yes} accepted</span>${n.limited?`<span class="s-limited">✓ ${n.limited} limited</span>`:""}${n.no?`<span class="s-no">✕ ${n.no} not accepted</span>`:""}</p>
      <p class="pc-v">Visited ${v} of the ${ok.length} parks that take it</p>
      <div class="pc-own"><label><input type="checkbox" data-own="${ps.id}" ${m.own?"checked":""}> I hold this pass</label>
        ${m.own?`<label>Valid through <input type="month" data-until="${ps.id}" value="${esc(m.until||"")}"></label>`:""}</div>
      <details><summary>What it covers</summary><p>${esc(ps.covers)}</p><ul>${ps.rules.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></details>
    </article>`}).join("");
}

function renderTable(){
  const list=rows(),cs=cols();
  $("#pHead").innerHTML=`<tr><th>Park</th><th>Designation</th><th>Nearest city</th>${cs.map(ps=>`<th class="c" title="${esc(ps.name)}">${esc(ps.short)}</th>`).join("")}<th class="c">Visited</th><th class="c"><span class="sr">Map</span></th></tr>`;
  $("#pBody").innerHTML=list.map(p=>`<tr data-id="${esc(p.id)}"><td class="nm"><a href="${esc(A.infoUrl(p))}" target="_blank" rel="noopener">${esc(A.disp(p))}</a></td><td>${esc(A.fld(p,"d"))}</td><td>${esc(A.fld(p,"city"))}</td>`+
    cs.map(ps=>{const r=p.passes[ps.id],s=r?r.s:"none",t=s==="none"?"Not on this pass's list":L[s]+(r.note?" – "+r.note:"");
      return `<td class="c ps s-${s}" title="${esc(ps.short)}: ${esc(t)}"><span aria-hidden="true">${ICON[s]}</span><span class="sr">${esc(t)}</span>${r&&r.note?`<small>${esc(r.note)}</small>`:""}</td>`}).join("")+
    `<td class="c"><input type="checkbox" data-vis ${A.isChecked(p.id)?"checked":""} aria-label="Visited: ${esc(A.disp(p))}"></td><td class="c">${p.lat?`<button type="button" class="pmap" data-map title="Show on map" aria-label="Show ${esc(A.disp(p))} on map">Map</button>`:""}</td></tr>`).join("")||
    `<tr><td colspan="${cs.length+5}" class="pnone">No parks match these filters.</td></tr>`;
  $("#pCount").textContent=`${list.length} of ${A.caParks.length} California state parks`;
  $("#pMap").disabled=!list.some(p=>p.lat);
  return list;
}

function syncFilters(){
  $("#pPass").innerHTML=`<option value="">Any pass</option>`+P.map(ps=>`<option value="${ps.id}">${esc(ps.name)}</option>`).join("");
  const ds=[...new Set(A.caParks.map(p=>A.fld(p,"d")))].sort();
  $("#pDesig").innerHTML=`<option value="">All types</option>`+ds.map(d=>`<option value="${esc(d)}">${esc(d)} (${A.caParks.filter(p=>A.fld(p,"d")===d).length})</option>`).join("");
  $("#pq").value=F.q;$("#pDesig").value=F.desig;$("#pPass").value=F.pass;$("#pStatus").value=F.status;$("#pVis").value=F.vis;$("#pMine").checked=F.mine;
}
function render(){if(!visible)return;renderCards();renderTable()}

$("#pq").addEventListener("input",e=>{F.q=e.target.value;saveF();renderTable()});
$("#pPass").onchange=e=>{F.pass=e.target.value;saveF();render()};
$("#pDesig").onchange=e=>{F.desig=e.target.value;saveF();renderTable()};
$("#pStatus").onchange=e=>{F.status=e.target.value;saveF();renderTable()};
$("#pVis").onchange=e=>{F.vis=e.target.value;saveF();renderTable()};
$("#pMine").onchange=e=>{F.mine=e.target.checked;saveF();renderTable()};
$("#pClear").onclick=()=>{Object.assign(F,{q:"",pass:"",desig:"",status:"",vis:"",mine:false});saveF();syncFilters();render()};
$("#pMap").onclick=()=>A.showOnMap(rows().map(p=>p.id));
$("#pCsv").onclick=()=>{
  const cs=cols(),data=[["Name","Designation","Nearest City / Community","Visited",...cs.map(ps=>ps.name)]].concat(rows().map(p=>[A.disp(p),A.fld(p,"d"),A.fld(p,"city"),A.isChecked(p.id)?"TRUE":"FALSE",
    ...cs.map(ps=>{const r=p.passes[ps.id];return r?L[r.s]+(r.note?" – "+r.note:""):""})]));
  const csv=data.map(r=>r.map(c=>'"'+String(c??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="state-park-passes.csv";a.click();
};
$("#passCards").addEventListener("click",e=>{const b=e.target.closest("[data-pick]");if(!b)return;
  F.pass=F.pass===b.dataset.pick?"":b.dataset.pick;saveF();$("#pPass").value=F.pass;render()});
$("#passCards").addEventListener("change",e=>{const t=e.target;
  if(t.dataset.own){const id=t.dataset.own;mine[id]={...(mine[id]||{}),own:t.checked};saveMine();render();A.toast(t.checked?"Pass added to the ones you hold":"Pass removed from the ones you hold")}
  else if(t.dataset.until){const id=t.dataset.until;mine[id]={...(mine[id]||{}),until:t.value};saveMine();render()}});
$("#pBody").addEventListener("click",e=>{const tr=e.target.closest("tr[data-id]");if(!tr)return;
  if(e.target.matches("[data-vis]"))A.toggle(tr.dataset.id);        // app.js re-renders us through subscribe
  else if(e.target.closest("[data-map]"))A.focusOnMap(tr.dataset.id)});

A.subscribe(render);
syncFilters();
window.PassesApp={show(){visible=true;render()},hide(){visible=false}};
if(document.body.classList.contains("passes"))window.PassesApp.show();   // app.js may have opened this tab before this file loaded
})();
