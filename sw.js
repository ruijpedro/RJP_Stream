const CACHE='rjp-stream-v1.3.0';
const ASSETS=['./','index.html','src/styles.css','src/app.js','manifest.webmanifest','assets/rjp-stream-icon.png','assets/rjp-stream-logo.png','assets/icons/icon-192.png','assets/icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin) return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match('index.html'))); return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));
});
