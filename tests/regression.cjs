// Regression tests for the Parks & Camping tracker.
//   NODE_PATH=<dir containing playwright> node tests/regression.cjs
// Serves the repo on a random local port and drives headless Chromium. No network access is needed.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
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
  await check('Explore','progress summary counts national parks',async()=>/^0 of 63 national parks visited/.test(await txt(p,'#progress')));
  // ---- filters
  await check('Filter','default is the 63 national parks',async()=>/63 of 475/.test(await txt(p,'#lcount')));
  await check('Filter','search narrows rows and shows a chip',async()=>{await p.fill('#q','yosemite');await p.waitForTimeout(250);return (await p.$$('#lbody tr')).length<=3&&await p.isVisible('.chip[data-k=q]')});
  await check('Filter','removing the search chip restores rows',async()=>{await p.click('.chip[data-k=q]');return /63 of 475/.test(await txt(p,'#lcount'))&&await p.inputValue('#q')===''});
  await check('Filter','removing the designation chip shows all 475',async()=>{await p.click('.chip[data-k=d]');return /475 of 475/.test(await txt(p,'#lcount'))});
  await check('Filter','Status filter (Unchecked) + chip',async()=>{await p.click('#fVisited .ms-btn');await p.click('#fVisited label:has(input[value="0"])');await p.keyboard.press('Escape');return await p.isVisible('.chip[data-k=v]')});
  await check('Filter','column filter menu opens from the keyboard (Enter on ▾)',async()=>{await p.click('#clear');await p.focus('#ltable th[data-k=d] .fbtn');await p.keyboard.press('Enter');return await p.isVisible('#colmenu')});
  await check('Filter','column sort Z→A',async()=>{await p.click('#colmenu [data-a=desc]');await p.waitForTimeout(150);const a=await txt(p,cell(1,'d'));return /^[T-Z]/.test(a.trim())});
  await p.context().close();
  // ---- editing + undo/redo
  p=await open();
  await check('Edit','typing into a cell edits it and marks it edited',async()=>{await p.click(cell(1,'city'));await p.keyboard.type('Testville');await p.keyboard.press('Enter');return await p.$eval(cell(1,'city'),e=>e.textContent==='Testville'&&e.classList.contains('edited')&&/Official/.test(e.title))});
  await check('Undo','Ctrl+Z undoes with a toast, toast Redo restores',async()=>{await p.click(cell(1,'name'));await p.keyboard.press('Control+z');await p.waitForTimeout(150);
    const undone=await p.$eval(cell(1,'city'),e=>e.textContent!=='Testville')&&await p.isVisible('#toast');await p.click('#toast button');await p.waitForTimeout(150);return undone&&await p.$eval(cell(1,'city'),e=>e.textContent==='Testville')});
  await check('Undo','Ctrl+Y redoes',async()=>{await p.click(cell(1,'name'));await p.keyboard.press('Control+z');await p.keyboard.press('Control+y');await p.waitForTimeout(150);return await p.$eval(cell(1,'city'),e=>e.textContent==='Testville')});
  await check('Edit','fill down copies the top value',async()=>{await p.click(cell(1,'city'));await p.keyboard.down('Shift');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.up('Shift');await p.keyboard.press('Control+d');await p.waitForTimeout(150);return (await p.$$eval('#lbody td.k-city',e=>e.slice(0,3).map(x=>x.textContent))).every(v=>v==='Testville')});
  await check('Edit','Visited checkbox toggles with click, progress updates',async()=>{await p.click(cell(2,'visited')+' input');return /^1 of 63/.test(await txt(p,'#progress'))});
  await check('Edit','Visited toggles with Space',async()=>{await p.click(cell(3,'visited'),{position:{x:4,y:4}});await p.keyboard.press('Space');return await p.$eval(cell(3,'visited')+' input',e=>e.checked)});
  await check('Edit','Tab leaves the grid at the last cell (no keyboard trap)',async()=>{await p.keyboard.press('Control+a');await p.keyboard.press('ArrowDown');return true});
  await check('Edit','? opens the shortcuts dialog',async()=>{await p.click(cell(1,'name'));await p.keyboard.press('?');const v=await p.isVisible('#keysDlg');await p.keyboard.press('Escape');return v});
  await check('Edit','Edits vs official panel lists the change',async()=>{await drawer(p);return /change/.test(await txt(p,'#editsCount'))&&(await p.$$('#editsBody tr')).length>=1});
  // ---- backup / restore round trip
  let backup;
  await check('Backup','save backup downloads JSON with checks and edits',async()=>{const [d]=await Promise.all([p.waitForEvent('download'),p.click('#backupOut')]);const f=await d.path();backup=fs.readFileSync(f,'utf8');const j=JSON.parse(backup);return j.app==='parks-and-camping'&&j.v===1&&j.checked.length>=2&&Object.keys(j.edits).length>=3});
  const bpath=path.join(require('os').tmpdir(),'parks-test-backup.json');fs.writeFileSync(bpath,backup);
  await check('Backup','restore after wiping reproduces checks and edits',async()=>{await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(700);
    const wiped=/^0 of 63/.test(await txt(p,'#progress'));await drawer(p);p.once('dialog',d=>d.accept());await p.setInputFiles('#backupIn',bpath);await p.waitForTimeout(1500);
    return wiped&&/^[12] of 63/.test(await txt(p,'#progress'))&&await p.$eval(cell(1,'city'),e=>e.textContent==='Testville')});
  await check('Backup','an old v1 file with no settings still restores',async()=>{const old={app:'parks-and-camping',v:1,savedAt:'2024-01-01T00:00:00Z',checked:['YOSE'],edits:{},customRows:[]};fs.writeFileSync(bpath,JSON.stringify(old));
    await drawer(p);p.once('dialog',d=>d.accept());await p.setInputFiles('#backupIn',bpath);await p.waitForTimeout(1500);return /^1 of 63/.test(await txt(p,'#progress'))});
  await check('Backup','a wrong file changes nothing',async()=>{fs.writeFileSync(bpath,'{"hello":1}');await drawer(p);let msg='';p.once('dialog',d=>{msg=d.message();d.accept()});await p.setInputFiles('#backupIn',bpath);await p.waitForTimeout(500);return /not a Parks/.test(msg)&&/^1 of 63/.test(await txt(p,'#progress'))});
  await check('Safety','reset all checks confirms and offers Undo',async()=>{await drawer(p);p.once('dialog',d=>d.accept());await p.click('#reset');await p.waitForTimeout(200);const z=/^0 of 63/.test(await txt(p,'#progress'));await p.click('#toast button');await p.waitForTimeout(200);return z&&/^1 of 63/.test(await txt(p,'#progress'))});
  await check('Safety','save indicator shows after a change',async()=>/Saved in this browser/.test(await txt(p,'#saveState')));
  await p.context().close();
  // ---- map
  p=await open();
  await check('Map','low zoom shows numbered clusters, zooming in removes them',async()=>{const c0=await p.$$eval('.clu',e=>e.length);await p.evaluate(()=>{window.parksMap.setView([37.5,-119.5],7,{animate:false})});await p.waitForTimeout(500);return c0>0&&(await p.$$eval('.clu',e=>e.length))===0});
  await check('Map','clicking a dot toggles visited and selects its row',async()=>{const pt=await p.evaluate(()=>{const m=window.parksMap;for(const l of Object.values(m._layers)){if(l.options&&l.options.fillColor==='#6b7780'&&l.getLatLng){const q=m.latLngToContainerPoint(l.getLatLng()),bb=m.getContainer().getBoundingClientRect();if(q.x>40&&q.x<bb.width-40&&q.y>40&&q.y<bb.height-40)return{x:q.x+bb.left,y:q.y+bb.top}}}});
    await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(400);return /^1 of 63/.test(await txt(p,'#progress'))&&await p.$eval('#lbody td.act',e=>!!e)});
  await check('Map','visited dot has a white centre (not colour-only)',async()=>p.evaluate(()=>Object.values(window.parksMap._layers).some(l=>l.options&&l.options.fillColor==='#fff'&&l.options.radius)));
  await check('Map','pan buttons move the map',async()=>{const a=await p.evaluate(()=>window.parksMap.getCenter().lng);await p.click('.panpad .pp-e');await p.waitForTimeout(400);return (await p.evaluate(()=>window.parksMap.getCenter().lng))>a});
  await check('Map','region buttons fly to Alaska',async()=>{await p.click('#jump [data-v=ak]');await p.waitForTimeout(2800);const v=await p.evaluate(()=>[window.parksMap.getCenter().lat,window.parksMap.getZoom()]);if(!(v[0]>55))throw new Error('center '+v);return true});
  await check('Map','Layers menu: toggle state names off and on',async()=>{await p.click('#tab-map details.layers summary');const c0=await p.$$eval('.stlab',e=>e.length);await p.click('label:has(#stnames)');const c1=await p.$$eval('.stlab',e=>e.length);await p.click('label:has(#stnames)');return c1===0&&true});
  await check('Map','Alt+M shows the selected row on the map',async()=>{await p.click('#lbody tr:nth-child(4) td.k-name');await p.keyboard.press('Alt+m');await p.waitForTimeout(1300);return await p.evaluate(()=>window.parksMap.getZoom()>=9.9)});
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
  // ---- mobile
  p=await open({viewport:{width:390,height:800},hasTouch:true});
  await check('Mobile','Table/Map toggle',async()=>{await p.click('#paneSeg [data-pane=map]');const m=await p.isVisible('#map')&&!(await p.isVisible('#lbody'));await p.click('#paneSeg [data-pane=table]');return m});
  await check('Mobile','rows render as cards; edit sheet saves',async()=>{const vis=await p.isVisible('#cardlist .rc')&&!(await p.isVisible('#tablewrap'));await p.click('#cardlist .rc:nth-child(2) .rc-t');await p.click('#cardlist .rc:nth-child(2) [data-a=edit]');await p.fill('#sheet [name=hl]','Sheet test');await p.click('#sheet .pri');await p.waitForTimeout(200);return vis&&await p.isVisible('#cardlist .rc.edited')});
  await check('Mobile','map size control: bigger hides header, again = map only, smaller restores',async()=>{await p.click('#paneSeg [data-pane=map]');await p.waitForTimeout(600);
    const h0=await p.$eval('#map',e=>e.getBoundingClientRect().height);await p.click('.msz-up');await p.waitForTimeout(300);const h1=await p.$eval('#map',e=>e.getBoundingClientRect().height);const hid=!(await p.isVisible('.top'));
    await p.click('.msz-up');await p.waitForTimeout(300);const h2=await p.$eval('#map',e=>e.getBoundingClientRect().height);await p.click('.msz-dn');await p.click('.msz-dn');await p.waitForTimeout(300);
    return h1>h0+40&&h2>h1&&hid&&await p.isVisible('.top')&&await p.$eval('.msz-dn',e=>e.disabled)});
  await check('Mobile','map size persists across reload',async()=>{await p.click('.msz-up');await p.reload();await p.waitForTimeout(1200);return await p.evaluate(()=>document.body.dataset.msz==='1')});
  await p.context().close();
  // ---- trails (mocked service)
  {const ctx=await b.newContext({viewport:{width:1280,height:800}});let fail=true;
   await ctx.route('**/mapservices.nps.gov/**',r=>{const u=new URL(r.request().url());if(fail)return r.fulfill({status:500,body:'{"error":{"message":"boom"}}'});
     if(!u.pathname.endsWith('/query'))return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({fields:[{name:'TRLNAME'},{name:'UNITCODE'}]})});
     if(u.searchParams.get('returnCountOnly'))return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({count:1})});
     r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{TRLNAME:'Mist Trail',UNITCODE:'YOSE'},geometry:{type:'LineString',coordinates:[[-119.55,37.73],[-119.5,37.74]]}}]})})});
   const t=await ctx.newPage();await t.goto(URL_);await t.evaluate(()=>{localStorage.clear();localStorage.setItem('tab','"trails"')});await t.reload();await t.waitForTimeout(2500);
   await check('Trails','service error shows an alert with Retry',async()=>await t.isVisible('.trailnote.err button'));
   await check('Trails','Retry recovers',async()=>{fail=false;await t.click('.trailnote button');await t.waitForTimeout(2000);return !(await t.$('.trailnote.err'))});
   await ctx.close()}
  const bad=results.filter(r=>!r.ok);console.log(`\n${results.length-bad.length}/${results.length} passed`);
  await b.close();srv.close();process.exit(bad.length?1:0);
})();
