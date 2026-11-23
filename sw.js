const CACHE='kids-studio-v2'
const ASSETS=['/','/index.html','/style.css','/app.js','/manifest.json']
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{})); self.skipWaiting() })
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))); self.clients.claim() })
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url)
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      if(e.request.method==='GET' && res.ok) caches.open(CACHE).then(c=>c.put(e.request,res.clone()))
      return res
    }).catch(()=> caches.match('/index.html'))))
  }
})
