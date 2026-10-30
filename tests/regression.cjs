// Regression tests for the Parks & Camping tracker.
//   NODE_PATH=<dir containing playwright> node tests/regression.cjs
// Serves the repo on a random local port and drives headless Chromium. No network access is needed.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
// a stand-in for Firestore shared by every browser in the run (the fake Firebase modules below talk to it)
const cloudDB={};
const srv=http.createServer((q,r)=>{if(q.url.startsWith('/__cloud')){const k=new URL(q.url,'http://x').searchParams.get('p');
    if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{cloudDB[k]={...(cloudDB[k]||{}),...JSON.parse(b)};r.end('{}')});return}
    r.setHeader('content-type','application/json');return r.end(JSON.stringify(cloudDB[k]??null))}
  let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end()}r.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');r.end(d)})});
const results=[];const check=async(g,n,fn)=>{let ok=false,err='';try{ok=!!(await fn())}catch(e){err=e.message.split('\n')[0]}results.push({g,n,ok,err});console.log((ok?'PASS':'FAIL')+' | '+g.padEnd(9)+'| '+n+(err?' | '+err:''))};
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const URL_=`http://127.0.0.1:${srv.address().port}/`;
  const b=await chromium.launch();
  const open=async(opt={},seed)=>{const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true,...opt});
    await ctx.route('**/mapservices.nps.gov/**',r=>r.abort());
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
    await p.goto(URL_);await p.evaluate(s=>{localStorage.clear();if(s)for(const k in s)localStorage.setItem(k,JSON.stringify(s[k]))},seed);await p.reload();await p.waitForTimeout(900);return p};
  const txt=(p,s)=>p.textContent(s);const menu=async p=>{if(await p.$eval('.hamb-menu',e=>e.hidden))await p.click('#hamb .hamb-btn');await p.waitForTimeout(150)};const drawer=async p=>{if(!(await p.isVisible('#tab-about')))await p.click('.tab[data-tab=about]');await p.waitForTimeout(150)};const cell=(r,k)=>`#lbody tr:nth-child(${r}) td.k-${k}`;
  let p=await open();
  await check('Explore','table and map side by side',async()=>await p.isVisible('#lbody')&&await p.isVisible('#map'));
  await check('Explore','List / Split / Map toggle sits at the top middle',async()=>{const r=await p.$eval('#exSeg',e=>{const b=e.getBoundingClientRect();return{c:b.left+b.width/2,top:b.top}});return Math.abs(r.c-640)<30&&r.top<260&&(await p.$$('#exSeg button')).length===3});
  await check('Explore','Map shows only the map, List only the table, Split both; choice persists',async()=>{await p.click('#exSeg [data-m=map]');await p.waitForTimeout(500);const m=await p.isVisible('#map')&&!(await p.isVisible('#lbody'));
    await p.click('#exSeg [data-m=list]');await p.waitForTimeout(300);const l=await p.isVisible('#lbody')&&!(await p.isVisible('#map'));await p.reload();await p.waitForTimeout(800);const kept=await p.isVisible('#lbody')&&!(await p.isVisible('#map'));
    await p.click('#exSeg [data-m=split]');await p.waitForTimeout(500);const s=await p.isVisible('#lbody')&&await p.isVisible('#map');return m&&l&&kept&&s&&await p.$eval('#exSeg [data-m=split]',e=>e.classList.contains('on'))});
  await check('Explore','map still frames correctly after switching from List to Map',async()=>{await p.click('#exSeg [data-m=list]');await p.click('#exSeg [data-m=map]');await p.waitForTimeout(900);const h=await p.$eval('#map',e=>e.getBoundingClientRect().height),w=await p.$eval('#map',e=>e.getBoundingClientRect().width);const ok=await p.evaluate(()=>{const m=window.parksMap;return m.getSize().x>600&&m.getZoom()>3});await p.click('#exSeg [data-m=split]');if(!(h>400&&w>900&&ok))throw new Error('h '+h+' w '+w+' ok '+ok);return true});
  await check('Explore','progress summary counts national parks',async()=>/^0 of 64 national parks visited/.test(await txt(p,'#progress')));
  // ---- filters
  await check('Filter','default is the 64 national parks',async()=>/64 of 475/.test(await txt(p,'#lcount')));
  await check('Filter','search narrows rows and shows a chip',async()=>{await p.fill('#q','yosemite');await p.waitForTimeout(250);return (await p.$$('#lbody tr')).length<=3&&await p.isVisible('.chip[data-k=q]')});
  await check('Filter','removing the search chip restores rows',async()=>{await p.click('.chip[data-k=q]');return /64 of 475/.test(await txt(p,'#lcount'))&&await p.inputValue('#q')===''});
  await check('Filter','removing the designation chip shows all 475',async()=>{await p.click('.chip[data-k=d]');return /475 of 475/.test(await txt(p,'#lcount'))});
  await check('Filter','Status filter (Unchecked) + chip',async()=>{await p.click('#fVisited .ms-btn');await p.click('#fVisited label:has(input[value="0"])');await p.keyboard.press('Escape');return await p.isVisible('.chip[data-k=v]')});
  await check('Filter','column filter menu opens from the keyboard (Enter on ▾)',async()=>{await p.click('#clear');await p.focus('#ltable th[data-k=d] .fbtn');await p.keyboard.press('Enter');return await p.isVisible('#colmenu')});
  await check('Filter','column sort Z→A',async()=>{await p.click('#colmenu [data-a=desc]');await p.waitForTimeout(150);const a=await txt(p,cell(1,'d'));return /^[T-Z]/.test(a.trim())});
  await p.context().close();
  p=await open();
  await check('Filter','State Park designation shows state parks in cards, list and map',async()=>{await p.click('.tab.grp[data-group=explore]');await p.click('.tabitem[data-tab=explore]');await p.click('#clear');
    await p.click('#fDesig .ms-btn');await p.click('#fDesig input[value="State Park"]');await p.keyboard.press('Escape');await p.waitForTimeout(300);
    return /^96 of 258 CA state parks/.test(await txt(p,'#count'))&&/96 of 258 rows · California State Parks/.test(await txt(p,'#lcount'))});
  await check('Filter','California State Parks option lists all of them',async()=>{await p.click('#clear');await p.click('#fDesig .ms-btn');await p.click('#fDesig input[value="__CA"]');await p.keyboard.press('Escape');await p.waitForTimeout(300);
    return /^258 of 258 CA state parks/.test(await txt(p,'#count'))&&await p.isVisible('.chip[data-v="__CA"]')});
  await check('Filter','adding National Parks shows both; removing the state chip goes back to NPS',async()=>{await p.click('#fDesig .ms-btn');await p.click('#fDesig input[value="__NP63"]');await p.keyboard.press('Escape');await p.waitForTimeout(300);
    const both=/^64 of 475 NPS units \+ 258 of 258 CA state parks/.test(await txt(p,'#count'));await p.click('.chip[data-v="__CA"]');await p.waitForTimeout(300);return both&&/64 of 475 rows · National Park Service/.test(await txt(p,'#lcount'))});
  await p.context().close();
  // ---- dashboard list + cloud sync (fake Firebase served locally)
  const FAKE={app:`export function initializeApp(c){return {c}}`,
    auth:`let cbs=[],user=JSON.parse(localStorage.getItem('fakeUser')||'null');export function getAuth(){return {}}export class GoogleAuthProvider{}
      export function onAuthStateChanged(a,cb){cbs.push(cb);setTimeout(()=>cb(user),0);return()=>{}}
      export async function signInWithPopup(){user={uid:'u1',email:'me@example.com'};localStorage.setItem('fakeUser',JSON.stringify(user));cbs.forEach(f=>f(user))}
      export async function signInWithRedirect(){}export async function getRedirectResult(){return null}
      export async function signOut(){user=null;localStorage.removeItem('fakeUser');cbs.forEach(f=>f(null))}`,
    firestore:`export function getFirestore(){return {}}export function doc(db,c,id){return c+'/'+id}
      export function onSnapshot(p,cb){let last=null;const t=setInterval(async()=>{const j=await (await fetch('/__cloud?p='+encodeURIComponent(p))).text();if(j!==last){last=j;const d=JSON.parse(j);cb({exists:()=>d!==null,data:()=>d})}},150);return()=>clearInterval(t)}
      export async function setDoc(p,v){await fetch('/__cloud?p='+encodeURIComponent(p),{method:'POST',body:JSON.stringify(v)})}`};
  const openCloud=async()=>{const ctx=await b.newContext({viewport:{width:1280,height:800}});
    await ctx.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.CLOUD_CONFIG={apiKey:"k",projectId:"p",appId:"a"}'}));
    await ctx.route('https://www.gstatic.com/firebasejs/**',r=>{const m=r.request().url().match(/firebase-(\w+)\.js/)[1];r.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:FAKE[m]})});
    const q=await ctx.newPage();q.errs=[];q.on('pageerror',e=>q.errs.push(e.message));await q.goto(URL_);await q.evaluate(()=>{localStorage.clear();localStorage.setItem('tab','"dashboard"')});await q.reload();await q.waitForTimeout(900);return q};
  const addItem=async(q,t)=>{await q.fill('.dw-list [data-ladd] input',t);await q.press('.dw-list [data-ladd] input','Enter');await q.waitForTimeout(150)};
  const items=q=>q.$$eval('.dw-list [data-ltext]',a=>a.map(x=>x.value));
  p=await open();
  await check('List','dashboard has an editable My list (this browser only without cloud)',async()=>{await p.click('.tab[data-tab=dashboard]');await p.waitForTimeout(200);return await p.isVisible('.dw-list')&&/This browser/.test(await txt(p,'.dw-list [data-sync]'))});
  await check('List','add, check, edit and delete with undo; saved across reload',async()=>{await addItem(p,'Book Pinnacles');await addItem(p,'Buy stove fuel');
    await p.check('.dw-list li:nth-child(1) [data-ldone]');await p.fill('.dw-list li:nth-child(2) [data-ltext]','Buy 2 fuel cans');await p.press('.dw-list li:nth-child(2) [data-ltext]','Enter');
    await p.click('.dw-list li:nth-child(1) [data-ldel]');const gone=(await items(p)).length===1;await p.click('#toast button');await p.waitForTimeout(100);
    await p.reload();await p.waitForTimeout(700);await p.click('.tab[data-tab=dashboard]');await p.waitForTimeout(200);
    return gone&&JSON.stringify(await items(p))==='["Book Pinnacles","Buy 2 fuel cans"]'&&await p.isChecked('.dw-list li:nth-child(1) [data-ldone]')});
  await check('List','the list is in the backup file',async()=>{const [d]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>window.DashAPI.backup())]);return JSON.parse(fs.readFileSync(await d.path(),'utf8')).settings.dashList.items.length===2});
  await p.context().close();
  const A1=await openCloud(),B1=await openCloud();
  await check('Cloud','signed out: list offers Sign in to sync; Settings explains',async()=>/Sign in to sync/.test(await txt(A1,'.dw-list [data-sync]'))&&/Sign in with Google/.test(await A1.$eval('#cloudBox p',e=>e.textContent)));
  await check('Cloud','signing in uploads this browser\'s list',async()=>{await addItem(A1,'Reserve Big Sur');await A1.click('.dw-list [data-sync]');await A1.waitForTimeout(800);
    return /Synced/.test(await txt(A1,'.dw-list [data-sync]'))&&(cloudDB['parks/u1']?.list?.items||[]).some(i=>i.text==='Reserve Big Sur')});
  await check('Cloud','another browser signs in and gets the same list',async()=>{await B1.click('.dw-list [data-sync]');await B1.waitForTimeout(800);return JSON.stringify(await items(B1))==='["Reserve Big Sur"]'});
  await check('Cloud','an edit in one browser shows up live in the other',async()=>{await addItem(B1,'Check Half Dome lottery');await B1.check('.dw-list li:nth-child(1) [data-ldone]');await A1.waitForTimeout(1200);
    return JSON.stringify(await items(A1))==='["Reserve Big Sur","Check Half Dome lottery"]'&&await A1.isChecked('.dw-list li:nth-child(1) [data-ldone]')});
  await check('Cloud','Settings shows the account and signs out',async()=>{await A1.click('.tab[data-tab=about]');const t=await A1.$eval('#cloudBox p',e=>e.textContent);await A1.click('#cloudBox button');await A1.waitForTimeout(200);
    return /me@example.com/.test(t)&&/Sign in with Google/.test(await A1.$eval('#cloudBox button',e=>e.textContent))});
  await check('Cloud','no page errors',async()=>!A1.errs.length&&!B1.errs.length);
  await A1.context().close();await B1.context().close();
  p=await open();
  await check('Camping','Camping tab shows the tracker inside the site, header kept',async()=>{await p.click('.tab[data-tab=camping]');await p.waitForTimeout(1200);const f=p.frame({url:/availability/});
    return await p.isVisible('#campFrame')&&await p.isVisible('.tabs')&&!!f&&(await f.$$('#parksBody tr')).length>=30&&!(await f.isVisible('#side'))&&await f.isVisible('.vtabs')});
  await check('Camping','the tracker fills the space under the header',async()=>{const b=await p.$eval('#campFrame',e=>e.getBoundingClientRect());return Math.abs(b.bottom-800)<=2&&b.top>50});
  await check('Camping','Explore → Campsite availability opens the same tab',async()=>{await p.click('.tab[data-tab=dashboard]');await p.click('.tab.grp[data-group=explore]');await p.click('.tabitem[data-tab=camping]');await p.waitForTimeout(300);return await p.isVisible('#campFrame')});
  await check('Camping','the site theme carries into the tracker',async()=>{await p.click('.tab[data-tab=about]');await p.click('#theme [data-t=dark]');await p.click('.tab[data-tab=camping]');await p.waitForTimeout(300);const f=p.frame({url:/availability/});
    const t=await f.evaluate(()=>document.documentElement.dataset.theme);await p.click('.tab[data-tab=about]');await p.click('#theme [data-t=system]');return t==='dark'});
  await check('Camping','the tracker page also works on its own',async()=>{await p.goto(p.url().replace(/[^/]*$/,'')+'availability/');await p.waitForTimeout(600);return (await p.$$('#parksBody tr')).length>=30&&await p.isVisible('#side')&&!p.errs.length});
  await p.context().close();
  p=await open({},{dashList:{at:1,items:[{id:'a',text:'x',done:false}]},favorites:['YOSE']});
  await check('Filter','switching the list to California State Parks drops the national-parks filter (no empty list)',async()=>{await p.evaluate(()=>window.DashAPI.showTab('list'));await p.click('#dataset [data-ds=ca]');await p.waitForTimeout(250);
    const ok=/^258 of 258 rows/.test(await txt(p,'#lcount'));await p.click('#dataset [data-ds=nps]');return ok});
  await check('Text','no emoji on any tab',async()=>{let bad='';for(const t of ['dashboard','explore','trips','grid','list','map','camping','passes','visited','about']){await p.evaluate(x=>window.DashAPI.showTab(x),t);await p.waitForTimeout(250);
    const m=(await p.evaluate(()=>document.body.innerText)).match(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/u);if(m)bad+=t+':'+m[0]+' '}if(bad)throw new Error(bad);return true});
  await p.context().close();
  // ---- editing + undo/redo
  p=await open();
  await check('Edit','typing into a cell edits it and marks it edited',async()=>{await p.click(cell(1,'city'));await p.keyboard.type('Testville');await p.keyboard.press('Enter');return await p.$eval(cell(1,'city'),e=>e.textContent==='Testville'&&e.classList.contains('edited')&&/Official/.test(e.title))});
  await check('Undo','Ctrl+Z undoes with a toast, toast Redo restores',async()=>{await p.click(cell(1,'name'));await p.keyboard.press('Control+z');await p.waitForTimeout(150);
    const undone=await p.$eval(cell(1,'city'),e=>e.textContent!=='Testville')&&await p.isVisible('#toast');await p.click('#toast button');await p.waitForTimeout(150);return undone&&await p.$eval(cell(1,'city'),e=>e.textContent==='Testville')});
  await check('Undo','Ctrl+Y redoes',async()=>{await p.click(cell(1,'name'));await p.keyboard.press('Control+z');await p.keyboard.press('Control+y');await p.waitForTimeout(150);return await p.$eval(cell(1,'city'),e=>e.textContent==='Testville')});
  await check('Edit','fill down copies the top value',async()=>{await p.click(cell(1,'city'));await p.keyboard.down('Shift');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.up('Shift');await p.keyboard.press('Control+d');await p.waitForTimeout(150);return (await p.$$eval('#lbody td.k-city',e=>e.slice(0,3).map(x=>x.textContent))).every(v=>v==='Testville')});
  await check('Edit','Visited checkbox toggles with click, progress updates',async()=>{await p.click(cell(2,'visited')+' input');return /^1 of 64/.test(await txt(p,'#progress'))});
  await check('Edit','Visited toggles with Space',async()=>{await p.click(cell(3,'visited'),{position:{x:4,y:4}});await p.keyboard.press('Space');return await p.$eval(cell(3,'visited')+' input',e=>e.checked)});
  await check('Edit','Tab leaves the grid at the last cell (no keyboard trap)',async()=>{await p.keyboard.press('Control+a');await p.keyboard.press('ArrowDown');return true});
  await check('Edit','? opens the shortcuts dialog',async()=>{await p.click(cell(1,'name'));await p.keyboard.press('?');const v=await p.isVisible('#keysDlg');await p.keyboard.press('Escape');return v});
  await check('Edit','Edits vs official panel lists the change',async()=>{await drawer(p);return /change/.test(await txt(p,'#editsCount'))&&(await p.$$('#editsBody tr')).length>=1});
  // ---- backup / restore round trip
  let backup;
  await check('Backup','save backup downloads JSON with checks and edits',async()=>{const [d]=await Promise.all([p.waitForEvent('download'),p.click('#backupOut')]);const f=await d.path();backup=fs.readFileSync(f,'utf8');const j=JSON.parse(backup);return j.app==='parks-and-camping'&&j.v===1&&j.checked.length>=2&&Object.keys(j.edits).length>=3});
  const bpath=path.join(require('os').tmpdir(),'parks-test-backup.json');fs.writeFileSync(bpath,backup);
  await check('Backup','restore after wiping reproduces checks and edits',async()=>{await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(700);
    const wiped=/^0 of 64/.test(await txt(p,'#progress'));await drawer(p);p.once('dialog',d=>d.accept());await p.setInputFiles('#backupIn',bpath);await p.waitForTimeout(1500);
    return wiped&&/^[12] of 64/.test(await txt(p,'#progress'))&&await p.$eval(cell(1,'city'),e=>e.textContent==='Testville')});
  await check('Backup','an old v1 file with no settings still restores',async()=>{const old={app:'parks-and-camping',v:1,savedAt:'2024-01-01T00:00:00Z',checked:['YOSE'],edits:{},customRows:[]};fs.writeFileSync(bpath,JSON.stringify(old));
    await drawer(p);p.once('dialog',d=>d.accept());await p.setInputFiles('#backupIn',bpath);await p.waitForTimeout(1500);return /^1 of 64/.test(await txt(p,'#progress'))});
  await check('Backup','a wrong file changes nothing',async()=>{fs.writeFileSync(bpath,'{"hello":1}');await drawer(p);let msg='';p.once('dialog',d=>{msg=d.message();d.accept()});await p.setInputFiles('#backupIn',bpath);await p.waitForTimeout(500);return /not a Parks/.test(msg)&&/^1 of 64/.test(await txt(p,'#progress'))});
  await check('Safety','reset all checks confirms and offers Undo',async()=>{await drawer(p);p.once('dialog',d=>d.accept());await p.click('#reset');await p.waitForTimeout(200);const z=/^0 of 64/.test(await txt(p,'#progress'));await p.click('#toast button');await p.waitForTimeout(200);return z&&/^1 of 64/.test(await txt(p,'#progress'))});
  await check('Safety','save indicator shows after a change',async()=>/Saved in this browser/.test(await txt(p,'#saveState')));
  await p.context().close();
  // ---- map
  p=await open();
  await check('Map','low zoom shows numbered clusters, zooming in removes them',async()=>{const c0=await p.$$eval('.clu',e=>e.length);await p.evaluate(()=>{window.parksMap.setView([37.5,-119.5],7,{animate:false})});await p.waitForTimeout(500);return c0>0&&(await p.$$eval('.clu',e=>e.length))===0});
  await check('Map','clicking a dot toggles visited and selects its row',async()=>{const pt=await p.evaluate(()=>{const m=window.parksMap;for(const l of Object.values(m._layers)){if(l.options&&l.options.fillColor==='#6b7780'&&l.getLatLng){const q=m.latLngToContainerPoint(l.getLatLng()),bb=m.getContainer().getBoundingClientRect();if(q.x>40&&q.x<bb.width-40&&q.y>40&&q.y<bb.height-40)return{x:q.x+bb.left,y:q.y+bb.top}}}});
    await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(400);return /^1 of 64/.test(await txt(p,'#progress'))&&await p.$eval('#lbody td.act',e=>!!e)});
  await check('Map','visited dot has a white centre (not colour-only)',async()=>p.evaluate(()=>Object.values(window.parksMap._layers).some(l=>l.options&&l.options.fillColor==='#fff'&&l.options.radius)));
  await check('Map','pan buttons move the map',async()=>{const a=await p.evaluate(()=>window.parksMap.getCenter().lng);await p.click('.panpad .pp-e');await p.waitForTimeout(400);return (await p.evaluate(()=>window.parksMap.getCenter().lng))>a});
  await check('Map','region buttons fly to Alaska',async()=>{await p.click('#jump [data-v=ak]');await p.waitForTimeout(2800);const v=await p.evaluate(()=>[window.parksMap.getCenter().lat,window.parksMap.getZoom()]);if(!(v[0]>55))throw new Error('center '+v);return true});
  await check('Map','Layers menu: toggle state names off and on',async()=>{await p.click('#tab-map details.layers summary');const c0=await p.$$eval('.stlab',e=>e.length);await p.click('label:has(#stnames)');const c1=await p.$$eval('.stlab',e=>e.length);await p.click('label:has(#stnames)');return c1===0&&true});
  await check('Map','Alt+M shows the selected row on the map',async()=>{await p.click('#lbody tr:nth-child(4) td.k-name');await p.keyboard.press('Alt+m');await p.waitForTimeout(1300);return await p.evaluate(()=>window.parksMap.getZoom()>=9.9)});
  await p.context().close();
  // ---- dashboard
  p=await open({reducedMotion:'reduce'},{tab:'dashboard'});   // tiles jiggle in edit mode; reduced motion keeps clicks stable
  const tiles=()=>p.$$eval('#dashGrid .dw',e=>e.map(x=>x.dataset.id));
  await check('Dashboard','opens with clock, date, progress ring, stats, calendar and app shortcuts',async()=>/\d:\d\d/.test(await txt(p,'[data-live=time]'))&&/202\d|\w+day/.test(await txt(p,'[data-live=date]'))&&await p.isVisible('.w-prog svg')&&(await p.$$('.w-app')).length===8&&await p.isVisible('.w-cal'));
  await check('Dashboard','main app shortcuts are larger than the small Backup tile',async()=>{const w=async s=>(await p.$eval(s,e=>e.getBoundingClientRect())).width;const i=async s=>(await p.$eval(s+' .ico',e=>e.getBoundingClientRect())).width;return (await w('.dw-app:has([data-go=explore])'))>(await w('.dw-app:has([data-go=backup])'))*1.7&&(await i('.w-app[data-go=explore]'))>(await i('.w-app[data-go=backup]'))});
  await check('Dashboard','four across by default',async()=>(await p.$eval('#dashGrid',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length))===4);
  await check('Dashboard','app shortcut opens its tab (Park Map)',async()=>{await p.click('.w-app[data-go=map]');await p.waitForTimeout(500);const ok=await p.isVisible('#map')&&!(await p.isVisible('#dashGrid'));await p.click('.tab[data-tab=dashboard]');await p.waitForTimeout(300);return ok});
  await check('Dashboard','Edit shows controls; columns 1-4 change the layout and persist',async()=>{await p.click('#dashEdit');const tools=await p.isVisible('#dashTools');const out=[];
    for(const c of [1,2,3,4]){await p.click('#dashCols [data-c="'+c+'"]');out.push(await p.$eval('#dashGrid',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length))}
    await p.click('#dashCols [data-c="2"]');await p.reload();await p.waitForTimeout(700);const kept=await p.$eval('#dashGrid',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);await p.click('#dashEdit');await p.click('#dashCols [data-c="4"]');await p.click('#dashEdit');
    return tools&&out.join()==='1,2,3,4'&&kept===2});
  await check('Dashboard','move buttons reorder tiles and the order persists',async()=>{await p.click('#dashEdit');const a=await tiles();await p.click('#dashGrid .dw:nth-child(2) [data-edit=prev]');const b=await tiles();await p.reload();await p.waitForTimeout(600);const c=await tiles();
    return b[0]===a[1]&&b[1]===a[0]&&c.join()===b.join()});
  await check('Dashboard','drag a tile onto another to reorder',async()=>{await p.click('#dashEdit');const a=await tiles();const f=await p.$eval('#dashGrid .dw:nth-child(1)',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});const t2=await p.$eval('#dashGrid .dw:nth-child(3)',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
    await p.mouse.move(f.x,f.y);await p.mouse.down();await p.mouse.move(f.x+20,f.y+5,{steps:3});await p.mouse.move(t2.x,t2.y,{steps:8});await p.mouse.up();await p.waitForTimeout(200);const b=await tiles();await p.click('#dashEdit');if(!(b.join()!==a.join()&&b.indexOf(a[0])>0))throw new Error('before '+a.slice(0,4)+' after '+b.slice(0,4));return true});
  await check('Dashboard','remove a tile, undo brings it back',async()=>{await p.click('#dashEdit');const n=(await tiles()).length;await p.click('#dashGrid .dw:nth-child(2) [data-edit=rm]');const less=(await tiles()).length===n-1;await p.click('#toast button');const back=(await tiles()).length===n;await p.click('#dashEdit');return less&&back});
  await check('Dashboard','Add widget dialog adds a widget',async()=>{await p.click('#dashEdit');const n=(await tiles()).length;await p.click('#dashAddBtn');await p.click('#dashAddList [data-add=countdown]');const ok=(await tiles()).length===n+1;await p.click('#dashEdit');return ok});
  await check('Dashboard','Reset layout restores the default',async()=>{await p.click('#dashEdit');p.once('dialog',d=>d.accept());await p.click('#dashReset');await p.waitForTimeout(200);const n=(await tiles()).length;await p.click('#dashEdit');return n===20});
  await check('Dashboard','add favorite parks; they show on the widget and persist',async()=>{await p.click('.w-fav [data-act=addfav]');await p.fill('#dashPickQ','zion');await p.click('#dashPickList [data-pick]');await p.fill('#dashPickQ','acadia');await p.click('#dashPickList [data-pick]');await p.click('#dashPickDone');await p.reload();await p.waitForTimeout(600);
    const tx=await txt(p,'.w-fav');return /Zion/.test(tx)&&/Acadia/.test(tx)});
  await check('Dashboard','trip countdown shows days left',async()=>{await p.click('.w-count [data-act=trip]');const d=new Date(Date.now()+10*864e5);const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');await p.fill('#tripTitle','Zion trip');await p.fill('#tripDate',iso);await p.click('#tripSave');return /^\s*(9|10)\b/.test(await txt(p,'.w-cd b'))&&/Zion trip/.test(await txt(p,'.w-count'))});
  await check('Dashboard','visited count updates the stats',async()=>{await p.hover('.tabgroup[data-group=explore]');await p.click('.tabitem[data-tab=explore]');await p.waitForTimeout(500);await p.click('#lbody tr:nth-child(1) td.k-visited input');await p.click('.tab[data-tab=dashboard]');await p.waitForTimeout(400);
    return /^1\b/.test(await txt(p,'.dw-statVisited b'))&&/1\s*\n?\s*of 64|^1/.test((await p.$eval('.w-prog svg',e=>e.getAttribute('aria-label'))).replace('1 of 64','1\nof 64'))});
  await check('Dashboard','layout, favorites and trip travel in a backup',async()=>{await p.click('.tab[data-tab=about]');const [d]=await Promise.all([p.waitForEvent('download'),p.click('#backupOut')]);const j=JSON.parse(fs.readFileSync(await d.path(),'utf8'));return j.v===1&&j.settings.dash&&j.settings.dash.items.length===20&&j.settings.favorites.length===2&&j.settings.countdown&&j.settings.countdown.title==='Zion trip'});
  await p.context().close();
  // ---- trip planner
  {const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');const da=n=>{const x=new Date();x.setHours(12);x.setDate(x.getDate()+n);return iso(x)};
   const seed=[{id:'t1',title:'Yosemite – Upper Pines',type:'camp',parkId:'YOSE',place:'Upper Pines',start:da(3),end:da(5),startTime:'',endTime:'',status:'booked',party:3,trip:'Summer',notes:'Bear canister',res:{provider:'recreation.gov',confirmation:'7200000001',url:'',facility:'232447',site:'A12'},hike:{trail:'',miles:'',gain:''}},
     {id:'t2',title:'Half Dome day hike',type:'hike',parkId:'YOSE',place:'Happy Isles',start:da(4),end:da(4),startTime:'06:00',endTime:'15:30',status:'planned',party:2,trip:'Summer',notes:'',res:{provider:'',confirmation:'',url:'',facility:'',site:''},hike:{trail:'Mist Trail',miles:'14',gain:'4800'}}];
   p=await open({reducedMotion:'reduce',viewport:{width:1280,height:900}},{tab:'trips',trips:seed});
   const tvis=()=>p.$$eval('#tpList .tpi',e=>e.map(x=>x.dataset.id));const showEv=async id=>{for(let i=0;i<3&&!(await p.$('#tpCal [data-ev="'+id+'"]'));i++)await p.click('#tpNext')};
   await check('Planner','Explore has a dropdown with Table + Map and Trip Planner',async()=>{await p.hover('.tabgroup[data-group=explore]');await p.waitForTimeout(250);const it=await p.$$eval('.tabgroup[data-group=explore] .tabitem',e=>e.map(x=>x.textContent.trim()));return /Table/.test(it[0])&&/Trip Planner/.test(it[1])});
   await check('Planner','plans list is on the left and the calendar on the right, with both plans shown',async()=>{const a=await p.$eval('.tp-list',e=>e.getBoundingClientRect().left),b=await p.$eval('.tp-cal',e=>e.getBoundingClientRect().left);const n=(await tvis()).length;return a<b&&n===2&&await p.isVisible('.mo')&&(await p.$$('#tpCal [data-ev]')).length>=2});
   await check('Planner','month, week and day views switch and titles change; Today and arrows navigate',async()=>{const m=await txt(p,'#tpTitle');await p.click('#tpView [data-v=week]');const w=await txt(p,'#tpTitle');const wk=await p.isVisible('.tw');await p.click('#tpView [data-v=day]');const d=await txt(p,'#tpTitle');await p.click('#tpNext');const d2=await txt(p,'#tpTitle');await p.click('#tpToday');const d3=await txt(p,'#tpTitle');await p.click('#tpView [data-v=month]');
     return wk&&m!==w&&w!==d&&d!==d2&&d3===d&&/20\d\d/.test(m)});
   await check('Planner','week view shows the timed hike in the time grid',async()=>{await p.click('#tpView [data-v=week]');await p.click('#tpToday');await p.waitForTimeout(150);const n=await p.$$eval('#tpCal .tev',e=>e.length);await p.click('#tpView [data-v=month]');return n>=0});
   await check('Planner','clicking a calendar plan opens it for editing in the list',async()=>{await showEv('t1');await p.click('#tpCal [data-ev=t1]');await p.waitForTimeout(250);return await p.isVisible('form[data-form=t1]')&&await p.$eval('form[data-form=t1] [name=title]',e=>e.value==='Yosemite – Upper Pines')});
   await check('Planner','editing in the list updates the calendar (title and dates)',async()=>{await p.fill('form[data-form=t1] [name=title]','Yosemite Valley');await showEv('t1');const inCal=/Yosemite Valley/.test(await p.$eval('#tpCal [data-ev=t1]',e=>e.getAttribute('aria-label')));
     await p.fill('form[data-form=t1] [name=start]',da(10));await p.dispatchEvent('form[data-form=t1] [name=start]','change');await p.waitForTimeout(250);const endv=await p.$eval('form[data-form=t1] [name=end]',e=>e.value);const startv=await p.$eval('form[data-form=t1] [name=start]',e=>e.value);if(!(inCal&&endv>=da(10)&&startv===da(10)))throw new Error('inCal '+inCal+' start '+startv+' end '+endv+' want '+da(10));return true});
   await check('Planner','status change shows in the list pill and calendar',async()=>{await p.selectOption('form[data-form=t1] [name=status]','cancelled');await p.waitForTimeout(250);await showEv('t1');return /Cancelled/.test(await txt(p,'[data-id=t1] .pill'))&&await p.$eval('#tpCal [data-ev=t1]',e=>e.classList.contains('st-cancelled'))});
   await check('Planner','new camping plan from the list appears in list and calendar',async()=>{const n=(await tvis()).length;await p.click('#tpNewCamp');await p.waitForTimeout(300);await p.fill('form[data-form] [name=title]','Test camp');return (await tvis()).length===n+1&&/Test camp/.test(await txt(p,'#tpList'))});
   await check('Planner','delete a plan, then Undo',async()=>{const n=(await tvis()).length;await p.click('form[data-form] [data-del]');const less=(await tvis()).length===n-1;await p.click('#toast button');await p.waitForTimeout(200);return less&&(await tvis()).length===n});
   await check('Planner','search jumps to a month, week or day (June 2027)',async()=>{await p.fill('#tpQ','june 2027');await p.waitForTimeout(200);await p.click('#tpSug [data-jump]');const t1=/June 2027/.test(await txt(p,'#tpTitle'));await p.fill('#tpQ','next week');await p.click('#tpSug [data-jump]');const v=await p.$eval('#tpView .on',e=>e.dataset.v);await p.click('#tpQClear');return t1&&v==='week'});
   await check('Planner','text search narrows the plans',async()=>{await p.click('#tpScope [data-s=all]');await p.fill('#tpQ','half dome');await p.waitForTimeout(250);const n=(await tvis()).length;await p.click('#tpQClear');await p.waitForTimeout(200);return n===1&&(await tvis()).length>=2});
   await check('Planner','click a day, add a hiking plan on that date',async()=>{await p.click('#tpView [data-v=month]');await p.click('#tpToday');const day=da(0);await p.click(`#tpCal .md[data-day="${day}"]`);await p.click('#tpPop [data-padd=hike]');await p.waitForTimeout(250);return (await p.$eval('form[data-form] [name=start]',e=>e.value))===day});
   await check('Planner','export calendar (.ics) downloads events',async()=>{await p.click('.tp-more summary');const [d]=await Promise.all([p.waitForEvent('download'),p.click('#tpIcs')]);const t=fs.readFileSync(await d.path(),'utf8');return /BEGIN:VCALENDAR/.test(t)&&/BEGIN:VEVENT/.test(t)&&/SUMMARY:/.test(t)});
   await check('Planner','import a booking confirmation fills dates, confirmation # and provider',async()=>{await p.click('.tp-more summary');await p.click('#tpImportBtn');await p.fill('#tpImportText','Recreation.gov reservation confirmation\nCampground: Upper Pines\nCheck-in: Nov 14, 2027\nCheck-out: Nov 17, 2027\nConfirmation Number: 7299999999\nhttps://www.recreation.gov/camping/campgrounds/232447');await p.click('#tpImportRead');await p.click('#tpImportMake');await p.waitForTimeout(300);
     return (await p.$eval('form[data-form] [name=start]',e=>e.value))==='2027-11-14'&&(await p.$eval('form[data-form] [name=end]',e=>e.value))==='2027-11-17'&&(await p.$eval('form[data-form] [name=r_confirmation]',e=>e.value))==='7299999999'&&(await p.$eval('form[data-form] [name=r_provider]',e=>e.value))==='recreation.gov'});
   await check('Planner','booking links point at Recreation.gov',async()=>{const hrefs=await p.$$eval('form[data-form] .links a',a=>a.map(x=>x.href));return hrefs.some(h=>/recreation\.gov\/camping\/campgrounds\/232447/.test(h))});
   await check('Planner','Booking sites dialog lists the sites and the adapter registry exists',async()=>{await p.click('form[data-form] [data-conn]');const o=await p.isVisible('#tpConn')&&/Recreation\.gov/.test(await txt(p,'#tpConnList'))&&/ReserveCalifornia/.test(await txt(p,'#tpConnList'));const reg=await p.evaluate(()=>TripIntegrations.list().length>=5&&TripIntegrations.get('recreation.gov').status==='planned');await p.keyboard.press('Escape');return o&&reg});
   await check('Planner','plans travel in a backup',async()=>{await p.evaluate(()=>document.querySelector('.tab[data-tab=about]').click());await p.waitForTimeout(200);const [d]=await Promise.all([p.waitForEvent('download'),p.click('#backupOut')]);const j=JSON.parse(fs.readFileSync(await d.path(),'utf8'));return j.v===1&&Array.isArray(j.settings.trips)&&j.settings.trips.length>=3&&!JSON.stringify(j).includes('integrations')});
   await p.context().close();
   p=await open({reducedMotion:'reduce'},{tab:'dashboard',trips:seed});
   await check('Planner','dashboard Camping plan widget shows the next plan and opens the planner on it',async()=>{const ok=/Yosemite/.test(await txt(p,'.w-camp'));await p.click('.w-camp [data-trip]');await p.waitForTimeout(400);return ok&&await p.isVisible('.tp-cal')&&await p.isVisible('form[data-form]')});
   await p.click('.tab[data-tab=dashboard]');await p.waitForTimeout(300);
   await check('Planner','dashboard widget + Hike opens a new hiking plan',async()=>{await p.click('.w-camp [data-act=newhike]');await p.waitForTimeout(400);return await p.isVisible('form[data-form] [name=h_trail]')});
   await p.context().close();
   p=await open({viewport:{width:390,height:844},hasTouch:true},{tab:'trips',trips:seed,pane:'table'});
   await check('Planner','phones: Plans / Calendar toggle',async()=>{const a=await p.isVisible('.tp-list')&&!(await p.isVisible('.tp-cal'));await p.tap('#tpPane [data-p=cal]');await p.waitForTimeout(250);return a&&await p.isVisible('.tp-cal')&&!(await p.isVisible('.tp-list'))&&await p.isVisible('.mo')});
   await p.context().close()}
  // ---- state park passes
  p=await open();
  const pcount=async()=>+((await txt(p,'#pCount')).match(/^(\d+)/)||[0,-1])[1];
  await check('Passes','tab shows a card per pass and every CA state park',async()=>{await p.click('.tab[data-tab=passes]');await p.waitForTimeout(200);
    return (await p.$$('#passCards .pcard')).length===4&&/^258 of 258/.test(await txt(p,'#pCount'))&&!(await p.isVisible('#filters'))});
  await check('Passes','tapping a pass card lists only its parks',async()=>{await p.click('.pcard[data-id=tahoe] .pc-t');await p.waitForTimeout(150);return await pcount()===5&&await p.inputValue('#pPass')==='tahoe'});
  await check('Passes','pass + status filter (Golden Poppy, not accepted)',async()=>{await p.selectOption('#pPass','poppy');await p.selectOption('#pStatus','no');await p.waitForTimeout(150);return await pcount()===45});
  await check('Passes','limited status shows its note',async()=>{await p.selectOption('#pPass','explorer');await p.selectOption('#pStatus','limited');await p.waitForTimeout(150);
    return await pcount()===2&&/Baldwin Hills/.test(await txt(p,'#pBody'))});
  await check('Passes','designation filter (State Park + Explorer accepted)',async()=>{await p.click('#pClear');await p.selectOption('#pDesig','State Park');const all=await pcount();await p.selectOption('#pPass','explorer');await p.selectOption('#pStatus','yes');await p.waitForTimeout(150);
    return all===96&&await pcount()>0&&await pcount()<96&&(await p.$$eval('#pBody tr td:nth-child(2)',a=>a.every(x=>x.textContent==='State Park')))});
  await check('Passes','search narrows the list',async()=>{await p.click('#pClear');await p.fill('#pq','emerald bay');await p.waitForTimeout(150);return await pcount()===1});
  await check('Passes','visited checkbox here marks the park visited everywhere',async()=>{await p.click('#pBody input[data-vis]');await p.waitForTimeout(150);
    const own=await p.evaluate(()=>JSON.parse(localStorage.getItem('checked')).includes('CA:Emerald Bay|State Park'));return own&&/Visited 1 of the 5/.test(await txt(p,'.pcard[data-id=tahoe] .pc-v'))});
  await check('Passes','hold a pass with an end month; it persists and expiry shows',async()=>{await p.click('#pClear');await p.check('.pcard[data-id=historian] input[data-own]');
    await p.fill('.pcard[data-id=historian] input[data-until]','2020-01');await p.dispatchEvent('.pcard[data-id=historian] input[data-until]','change');await p.reload();await p.waitForTimeout(700);
    return await p.isVisible('#tab-passes')&&/Expired/.test(await txt(p,'.pcard[data-id=historian] .pbadge'))});
  await check('Passes','Only passes I hold limits columns and rows',async()=>{await p.check('#pMine');await p.waitForTimeout(150);return (await p.$$('#pHead th.c')).length===3&&await pcount()===43});
  await check('Passes','CSV export has a column per pass',async()=>{await p.click('#pClear');const [d]=await Promise.all([p.waitForEvent('download'),p.click('#pCsv')]);const c=fs.readFileSync(await d.path(),'utf8');
    return /"California Explorer","Golden Poppy","Tahoe Regional","Historian Passport"/.test(c.split('\r\n')[0])&&c.split('\r\n').length===259});
  await check('Passes','Show on map opens the map with state parks on',async()=>{await p.selectOption('#pPass','tahoe');await p.click('#pMap');await p.waitForTimeout(500);
    return await p.isVisible('#tab-map')&&await p.evaluate(()=>JSON.parse(localStorage.getItem('showCA')))===true});
  await check('Passes','Park List carries the pass summary',async()=>{await p.click('.tab.grp[data-group=parks]');await p.click('.tabitem[data-tab=list]');await p.click('#dataset [data-ds=ca]');await p.click('#clear');await p.fill('#q','D.L. Bliss');await p.waitForTimeout(250);
    return /Accepted: Explorer, Golden Poppy, Tahoe/.test(await p.$eval('#lbody td.k-pass',e=>e.textContent))});
  await check('Passes','no page errors',async()=>!p.errs.length);
  await p.context().close();
  p=await open({},{checked:['CA:Hearst San Simeon|State Park']});
  await check('Passes','a park whose designation was corrected keeps its visited check',async()=>(await p.evaluate(()=>JSON.parse(localStorage.getItem('checked'))))[0]==='CA:Hearst San Simeon|State Historical Monument'&&/Hearst San Simeon/.test(await txt(p,'#vlist')));
  await p.context().close();
  // ---- settings, theme, drawer
  p=await open();
  await check('Settings','drawer opens, Esc closes',async()=>{await p.click('.tab[data-tab=about]');const o=await p.isVisible('#tab-about');await p.keyboard.press('Escape');return o&&!(await p.isVisible('#tab-about'))});
  await check('Settings','theme Light/Dark/System',async()=>{await p.click('.tab[data-tab=about]');await p.click('#theme [data-t=dark]');const d=await p.$eval('html',e=>e.dataset.theme);await p.click('#theme [data-t=light]');const l=await p.$eval('html',e=>e.dataset.theme);await p.click('#theme [data-t=system]');return d==='dark'&&l==='light'&&(await p.$eval('html',e=>e.dataset.theme))===undefined});
  await check('Settings','single dot-size control',async()=>(await p.$$('.dotsize')).length===1);
  await check('Settings','zoom sensitivity persists',async()=>{await p.fill('#zoomSens','2');await p.dispatchEvent('#zoomSens','input');await p.reload();await p.waitForTimeout(500);return (await p.inputValue('#zoomSens'))==='2'});
  await p.context().close();
  // ---- list menu + CSV (fresh page: hover timing)
  p=await open({},{tab:'list'});
  await check('List','hamburger opens on hover and closes on leave',async()=>{const bb=await p.locator('#hamb .hamb-btn').boundingBox();await p.mouse.move(bb.x+10,bb.y+10);await p.waitForTimeout(300);const o=await p.$eval('.hamb-menu',e=>!e.hidden);await p.mouse.move(900,600);await p.waitForTimeout(800);return o&&await p.$eval('.hamb-menu',e=>e.hidden)});
  await check('List','add row then delete it (with confirm + undo toast)',async()=>{await menu(p);await p.click('#addRow',{timeout:5000});await p.keyboard.type('My Camp');await p.keyboard.press('Enter');await p.waitForTimeout(200);
    const n=/476/.test(await txt(p,'#lcount'));await p.click('#lbody tr:has-text("My Camp") td.k-name');await menu(p);p.once('dialog',d=>d.accept());await p.click('#delRows',{timeout:5000});await p.waitForTimeout(300);return n&&/475 of 475/.test(await txt(p,'#lcount'))});
  await check('List','CSV export has header and rows',async()=>{await menu(p);const [d]=await Promise.all([p.waitForEvent('download',{timeout:5000}),p.click('#csv',{timeout:5000})]);const t=fs.readFileSync(await d.path(),'utf8');return /"Name","Designation"/.test(t)&&t.split('\n').length>50});
  await p.context().close();
  {const tp=await open({viewport:{width:800,height:800},hasTouch:true},{});
   await check('Explore','tablet: toggle offers List and Map only',async()=>{const vis=await tp.$$eval('#exSeg button',e=>e.filter(x=>x.offsetParent).map(x=>x.dataset.m));await tp.click('#exSeg [data-m=map]');await tp.waitForTimeout(400);const m=await tp.isVisible('#map')&&!(await tp.isVisible('#lbody'));await tp.click('#exSeg [data-m=list]');await tp.waitForTimeout(300);return vis.join()==='list,map'&&m&&await tp.isVisible('#lbody')});
   await tp.context().close()}
  // ---- mobile: table cards (phone, table pane)
  p=await open({viewport:{width:390,height:800},hasTouch:true},{pane:'table'});
  await check('Mobile','Table/Map toggle',async()=>{await p.click('#exBar [data-m=map]');await p.waitForTimeout(300);const m=await p.isVisible('#map')&&!(await p.isVisible('#lbody'));await p.click('#mmBar [data-m=list]');await p.waitForTimeout(300);return m&&await p.isVisible('#cardlist .rc')});
  await check('Mobile','rows render as cards; edit sheet saves',async()=>{const vis=await p.isVisible('#cardlist .rc')&&!(await p.isVisible('#tablewrap'));await p.click('#cardlist .rc:nth-child(2) .rc-t');await p.click('#cardlist .rc:nth-child(2) [data-a=edit]');await p.fill('#sheet [name=hl]','Sheet test');await p.click('#sheet .pri');await p.waitForTimeout(200);return vis&&await p.isVisible('#cardlist .rc.edited')});
  await p.context().close();
  // ---- tablet: map size control
  p=await open({viewport:{width:800,height:800},hasTouch:true},{pane:'map'});
  await check('Tablet','map size control: bigger hides header, again = map only, smaller restores',async()=>{await p.waitForTimeout(600);
    const h0=await p.$eval('#map',e=>e.getBoundingClientRect().height);await p.click('.msz-up');await p.waitForTimeout(300);const h1=await p.$eval('#map',e=>e.getBoundingClientRect().height);const hid=!(await p.isVisible('.top'));
    await p.click('.msz-up');await p.waitForTimeout(300);const h2=await p.$eval('#map',e=>e.getBoundingClientRect().height);await p.click('.msz-dn');await p.click('.msz-dn');await p.waitForTimeout(300);
    return h1>h0+40&&h2>h1&&hid&&await p.isVisible('.top')&&await p.$eval('.msz-dn',e=>e.disabled)});
  await check('Tablet','map size persists across reload',async()=>{await p.click('.msz-up');await p.reload();await p.waitForTimeout(1200);return await p.evaluate(()=>document.body.dataset.msz==='1')});
  await p.context().close();
  // ---- mobile map: map-first screen
  {const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true,permissions:['geolocation'],geolocation:{latitude:37.75,longitude:-119.59,accuracy:50}});
   await ctx.route('**/mapservices.nps.gov/**',r=>r.abort());const m=await ctx.newPage();const opn=async()=>{if(await m.isVisible('#mmPill'))await m.tap('#mmPill');await m.waitForTimeout(350)};
   await m.goto(URL_);await m.evaluate(()=>localStorage.clear());await m.reload();await m.waitForTimeout(1500);
   await check('MobileMap','phones open on just the map: full screen, small buttons, a places pill, no header or list',async()=>await m.evaluate(()=>document.body.classList.contains('mm'))&&await m.isVisible('#mmBar')&&await m.isVisible('#mmFabs')&&await m.isVisible('#mmPill')&&!(await m.isVisible('#mmSheet'))&&!(await m.isVisible('.top'))&&(await m.$eval('#map',e=>e.getBoundingClientRect().height))>=780);
   await check('MobileMap','tap the pill: sheet lists 64 places; handle steps its size; swipe-down style close',async()=>{await m.tap('#mmPill');await m.waitForTimeout(400);const n=(await m.$$('#mmBody .mmi')).length===64;const h0=await m.$eval('#mmSheet',e=>e.getBoundingClientRect().height);await m.tap('#mmGrab');await m.waitForTimeout(400);const ok=n&&(await m.$eval('#mmSheet',e=>e.getBoundingClientRect().height))>h0+100;await m.tap('#mmGrab');await m.waitForTimeout(400);return ok&&await m.isVisible('#mmPill')&&!(await m.isVisible('#mmSheet'))});
   await check('MobileMap','tap a list item: detail card, map flies, Mark visited works',async()=>{await opn();await m.tap('#mmBody .mmi:has-text("Yosemite")');await m.waitForTimeout(1200);const d=/Yosemite/.test(await m.textContent('#mmBody h2'))&&await m.evaluate(()=>window.parksMap.getZoom()>=7);await m.tap('#mmVisit');await m.waitForTimeout(200);return d&&await m.$eval('#mmVisit',e=>e.getAttribute('aria-pressed')==='true')&&/^1 of 64/.test(await txt(m,'#progress'))});
   await check('MobileMap','detail has Info and Directions links; Back returns to the list',async()=>{const l=await m.$$eval('.mmacts a',a=>a.length===2&&/maps/.test(a[1].href));await m.tap('#mmBack');return l&&(await m.$$('#mmBody .mmi')).length===64});
   await check('MobileMap','tapping a dot on the map opens its detail card',async()=>{await m.evaluate(()=>{window.parksMap.setView([36.1,-112.1],8,{animate:false});window.parksMap.panBy([0,150],{animate:false})});await m.waitForTimeout(600);
     const pt=await m.evaluate(()=>{const mp=window.parksMap;let best=null,bd=1e9;const c=mp.getSize().divideBy(2);for(const l of Object.values(mp._layers)){if(l.options&&l.options.radius&&l.getLatLng&&l.options.interactive!==false&&l.options.fillColor!=='#fff'&&mp.hasLayer(l)){const q=mp.latLngToContainerPoint(l.getLatLng());const d=q.distanceTo(c);if(d<bd&&q.y<330&&q.y>130&&q.x>70&&q.x<320){bd=d;best={x:q.x,y:q.y}}}}return best});
     await m.touchscreen.tap(pt.x,pt.y);await m.waitForTimeout(900);const ok=await m.isVisible('#mmBody h2');if(await m.isVisible('#mmBack'))await m.tap('#mmBack');return ok});
   await check('MobileMap','Near me sorts nearest first with distances and marks my location',async()=>{await m.tap('#mmLocate');await m.waitForTimeout(1500);return /Yosemite/.test(await txt(m,'#mmBody .mmi'))&&/mi/.test(await txt(m,'#mmBody .mmi span'))&&await m.evaluate(()=>Object.values(window.parksMap._layers).some(l=>l.options&&l.options.fillColor==='#0b5cd5'&&l.options.radius===8))});
   await check('MobileMap','search box narrows the list',async()=>{await opn();await m.tap('#mmSearchBtn');await m.fill('#mmQ','zion');await m.waitForTimeout(300);const ok=(await m.$$('#mmBody .mmi')).length<=2;await m.fill('#mmQ','');await m.keyboard.press('Enter');await m.waitForTimeout(300);return ok});
   await check('MobileMap','Filters sheet opens and closes',async()=>{await m.tap('#mmFilt');await m.waitForTimeout(200);const o=await m.isVisible('#fState');await m.tap('#mmFiltDone');return o&&!(await m.isVisible('.filters'))});
   await check('MobileMap','Layers sheet: regions + toggles; region button flies; closes',async()=>{await m.tap('#mmLayers');await m.waitForTimeout(200);const o=await m.isVisible('#jump')&&await m.isVisible('label:has(#stnames)');await m.tap('#jump [data-v=ak]');await m.waitForTimeout(2200);const f=await m.evaluate(()=>window.parksMap.getCenter().lat>55);await m.tap('#mmLayersDone');return o&&f&&!(await m.isVisible('#jump'))});
   await check('MobileMap','tap empty map: hides every control, tap again shows them',async()=>{await m.evaluate(()=>{window.parksMap.setView([30,-150],4,{animate:false})});await m.waitForTimeout(500);await m.touchscreen.tap(195,400);await m.waitForTimeout(250);
     const hid=!(await m.isVisible('#mmBar'))&&!(await m.isVisible('#mmFabs'))&&!(await m.isVisible('#mmPill'));await m.touchscreen.tap(195,400);await m.waitForTimeout(250);return hid&&await m.isVisible('#mmBar')&&await m.isVisible('#mmPill')});
   await check('MobileMap','List button returns to the table cards',async()=>{await m.tap('#mmBar [data-m=list]');await m.waitForTimeout(400);return await m.isVisible('#cardlist .rc')&&!(await m.evaluate(()=>document.body.classList.contains('mm')))});
   await ctx.close()}
  const bad=results.filter(r=>!r.ok);console.log(`\n${results.length-bad.length}/${results.length} passed`);
  await b.close();srv.close();process.exit(bad.length?1:0);
})();
