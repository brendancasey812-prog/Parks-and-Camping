/* Cloud sync (optional): Google sign-in + Firestore, loaded only when cloud-config.js holds a Firebase web config.
   Each account has one document, parks/{uid}; each synced thing is a field on it (e.g. list:{items,at}).
   window.Cloud: state() "off"|"loading"|"out"|"in"|"error", user(), signIn(), signOut(), on(fn), watch(key,fn), put(key,value). */
(function(){
const cfg=window.CLOUD_CONFIG,V="10.12.2",U=m=>`https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
const subs=new Set(),watchers=new Map();
let st=cfg&&cfg.apiKey&&cfg.projectId?"loading":"off",user=null,fb=null,unsub=null,last={},err="";
const emit=()=>subs.forEach(f=>{try{f(st,user)}catch(e){}});
const fail=e=>{st="error";err=(e&&(e.code||e.message))||"unknown";console.warn("Cloud sync:",e);emit()};
async function init(){
  try{
    const [app,auth,fs]=await Promise.all([import(U("app")),import(U("auth")),import(U("firestore"))]);
    const a=app.initializeApp(cfg);fb={auth,fs,au:auth.getAuth(a),db:fs.getFirestore(a)};
    auth.getRedirectResult(fb.au).catch(fail);
    auth.onAuthStateChanged(fb.au,u=>{user=u;st=u?"in":"out";last={};if(unsub){unsub();unsub=null}
      if(u)unsub=fs.onSnapshot(fs.doc(fb.db,"parks",u.uid),s=>{last=s.exists()?s.data():{};watchers.forEach((fns,k)=>fns.forEach(f=>{try{f(last[k]??null)}catch(e){console.warn(e)}}))},fail);
      emit()});
  }catch(e){fail(e)}
}
window.Cloud={
  state:()=>st,user:()=>user,error:()=>err,
  async signIn(){if(!fb)return;const p=new fb.auth.GoogleAuthProvider();
    try{await fb.auth.signInWithPopup(fb.au,p)}
    catch(e){const c=e.code||"";if(/popup-blocked|operation-not-supported/.test(c))await fb.auth.signInWithRedirect(fb.au,p);else if(!/popup-closed-by-user|cancelled-popup-request/.test(c))fail(e)}},
  async signOut(){if(fb)await fb.auth.signOut(fb.au)},
  on(f){subs.add(f);f(st,user);return()=>subs.delete(f)},
  watch(k,f){if(!watchers.has(k))watchers.set(k,new Set());watchers.get(k).add(f);if(st==="in"&&k in last)f(last[k]);return()=>watchers.get(k).delete(f)},
  async put(k,v){if(st!=="in")return false;try{await fb.fs.setDoc(fb.fs.doc(fb.db,"parks",user.uid),{[k]:v},{merge:true});return true}catch(e){fail(e);return false}}
};

// Settings drawer: sign in / out
const box=document.getElementById("cloudBox");
if(box)window.Cloud.on((s,u)=>{
  const msg={off:"Not set up yet – everything is saved in this browser. See docs/CLOUD.md to turn it on.",loading:"Connecting…",
    out:"Sign in with Google to keep your dashboard list in sync on every browser.",in:`Signed in as ${u&&(u.email||u.displayName)||"you"}. Your list syncs automatically.`,
    error:`Cloud sync hit a problem (${err}). Your changes are still saved in this browser.`}[s];
  box.querySelector("p").textContent=msg;
  const b=box.querySelector("button");b.hidden=!(s==="out"||s==="in");b.textContent=s==="in"?"Sign out":"Sign in with Google";
  b.onclick=()=>s==="in"?window.Cloud.signOut():window.Cloud.signIn()});
if(st==="loading")init();
})();
