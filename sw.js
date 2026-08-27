const CACHE='arbitrage-radar-release-2-0';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.origin===self.location.origin&&(url.pathname.endsWith('/app.js')||url.pathname.endsWith('/styles.css')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/'))){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req)));return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(url.origin===self.location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});
