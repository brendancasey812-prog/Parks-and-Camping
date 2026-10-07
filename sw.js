// Offline-first cache so the map and app load instantly on repeat visits (and with no connection).
const V="parks-v4";
const CORE=["./","index.html","style.css","app.js","data/parks.js","data/details.js","data/geo.js","vendor/leaflet.js","vendor/leaflet.css","vendor/topojson-client.min.js",
  "fonts/inter-latin-wght-normal.woff2","fonts/fraunces-latin-wght-normal.woff2","manifest.webmanifest","icon.svg","icon-180.png"];
self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(V);
    await Promise.allSettled(CORE.map(u=>c.add(u)));
    const urls=[];for(let z=0;z<=4;z++)for(let x=0;x<2**z;x++)for(let y=0;y<2**z;y++)urls.push(`tiles/${z}/${x}/${y}.webp`);
    for(let i=0;i<urls.length;i+=40)await Promise.allSettled(urls.slice(i,i+40).map(u=>c.add(u)));   // whole-world overview tiles
    self.skipWaiting();
  })());
});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return;
  const stat=/\/(tiles|fonts|vendor)\//.test(u.pathname);
  e.respondWith((async()=>{
    const c=await caches.open(V);
    if(stat){const hit=await c.match(r);if(hit)return hit;
      try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}catch(err){return new Response("",{status:504})}}
    try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}                  // app files: latest first
    catch(err){return (await c.match(r))||(await c.match("index.html"))||new Response("offline",{status:503})}
  })());
});
