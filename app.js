const els = {
  title: document.getElementById('inpTitle'),
  subtitle: document.getElementById('inpSubtitle'),
  titleSize: document.getElementById('inpTitleSize'),
  subSize: document.getElementById('inpSubSize'),
  valTitleSize: document.getElementById('valTitleSize'),
  valSubSize: document.getElementById('valSubSize'),
  bgType: document.getElementById('inpBgType'),
  bgColor: document.getElementById('inpBgColor'),
  bgColorRow: document.getElementById('bgColorRow'),
  bgImageRow: document.getElementById('bgImageRow'),
  inpImage: document.getElementById('inpImage'),
  overlay: document.getElementById('inpOverlay'),
  anim: document.getElementById('inpAnim'),
  duration: document.getElementById('inpDuration'),
  valDuration: document.getElementById('valDuration'),
  textColor: document.getElementById('inpTextColor'),
  particles: document.getElementById('inpParticles'),
  kenBurns: document.getElementById('inpKenBurns'),
  watermark: document.getElementById('inpWatermark'),
  canvas: document.getElementById('c'),
  fmtLabel: document.getElementById('fmtLabel'),
  timelineProgress: document.getElementById('timelineProgress'),
  timelineEnd: document.getElementById('timelineEnd'),
  btnGenerate: document.getElementById('btnGenerate'),
  btnPlayPreview: document.getElementById('btnPlayPreview'),
  status: document.getElementById('status'),
  resultCard: document.getElementById('resultCard'),
  resultVideo: document.getElementById('resultVideo'),
  downloadLink: document.getElementById('downloadLink'),
  canvasWrap: document.getElementById('canvasWrap'),
  toolbarStyle: document.getElementById('toolbarStyle'),
  inpMusic: document.getElementById('inpMusic'),
  inpPhoto: document.getElementById('inpPhoto'),
}
const ctx = els.canvas.getContext('2d')
let format = '16:9'
let bgImage = null
const formats = { '16:9': { w: 1280, h: 720 }, '9:16': { w: 720, h: 1280 }, '1:1': { w: 800, h: 800 } }
const gradients = {
  gradient1: ['#ff512f', '#dd2476'],
  gradient2: ['#0093e9', '#80d0c7'],
  gradient3: ['#8a2be2', '#ff1493'],
  gradient4: ['#0f5132', '#a3f7a3'],
}
const models = [
  { id:'classic', name:'Классика', desc:'Сбалансировано для любых видео', icon:'◐', grad:['#6366f1','#8b5cf6'], anim:'fadeScale', bg:'gradient2', textColor:'#ffffff', particles:true, kenBurns:false, overlay:0, tag:'Универсально', hint:'Плавное появление + мягкие частицы' },
  { id:'cinema', name:'Кино', desc:'Драма, глубокая виньетка', icon:'🎬', grad:['#1a1a22','#4a0a2a'], anim:'zoom', bg:'solid', bgColor:'#0f0a12', textColor:'#ffd6e0', particles:false, kenBurns:true, overlay:10, tag:'Кинематографично', hint:'Медленный зум + тёплый оттенок' },
  { id:'neon', name:'Неон', desc:'Ярко, энергично, для акций', icon:'⚡', grad:['#8a2be2','#ff1493'], anim:'zoom', bg:'gradient3', textColor:'#ffffff', particles:true, kenBurns:false, overlay:0, tag:'Промо', hint:'Зум + максимум блесток' },
  { id:'minimal', name:'Минимализм', desc:'Чисто, без эффектов', icon:'—', grad:['#f8fafc','#e2e8f0'], anim:'fadeScale', bg:'solid', bgColor:'#f8f9fb', textColor:'#111111', particles:false, kenBurns:false, overlay:0, tag:'Чисто', hint:'Без частиц, акцент на тексте' },
  { id:'typewriter', name:'Типографика', desc:'Печатная машинка', icon:'⌨', grad:['#0f172a','#334155'], anim:'typewriter', bg:'solid', bgColor:'#0b1220', textColor:'#38bdf8', particles:false, kenBurns:false, overlay:0, tag:'Текст', hint:'Печатает заголовок по буквам' },
  { id:'sale', name:'Распродажа', desc:'Для скидок и акций', icon:'%', grad:['#ff512f','#dd2476'], anim:'slideUp', bg:'gradient1', textColor:'#ffd600', particles:true, kenBurns:true, overlay:5, tag:'Конверсия', hint:'Выезд снизу + движение фона' },
]
let currentModelId = localStorage.getItem('pr-model') || 'classic'

// ===== Kids data =====
const kidsBackgrounds = [
  {id:'sky', name:'Небо', icon:'☁️', mode:'cartoon', grad:['#87CEEB','#E0F6FF'], deco:'clouds'},
  {id:'forest', name:'Лес', icon:'🌲', mode:'cartoon', grad:['#a8e6cf','#dcedc1'], deco:'trees'},
  {id:'underwater', name:'Под водой', icon:'🌊', mode:'cartoon', grad:['#0093E9','#80D0C7'], deco:'bubbles'},
  {id:'space', name:'Космос', icon:'🚀', mode:'cartoon', grad:['#0f0c29','#302b63'], deco:'stars'},
  {id:'castle', name:'Замок', icon:'🏰', mode:'cartoon', grad:['#ff9a9e','#fecfef'], deco:'castle'},
  {id:'jungle', name:'Джунгли', icon:'🌴', mode:'cartoon', grad:['#0f5132','#a3f7a3'], deco:'jungle'},
  {id:'farm', name:'Ферма', icon:'🚜', mode:'cartoon', grad:['#f6d365','#fda085'], deco:'farm'},
  {id:'city', name:'Город', icon:'🏙️', mode:'cartoon', grad:['#667eea','#764ba2'], deco:'city'},
  {id:'r-forest', name:'Лес реал', icon:'🌲', mode:'realistic', grad:['#2d4a22','#5a7d3a'], deco:'realTrees'},
  {id:'r-beach', name:'Пляж', icon:'🏖️', mode:'realistic', grad:['#ffecd2','#fcb69f'], deco:'beach'},
  {id:'r-mountains', name:'Горы', icon:'⛰️', mode:'realistic', grad:['#4b6cb7','#182848'], deco:'mountains'},
  {id:'r-savanna', name:'Саванна', icon:'🦒', mode:'realistic', grad:['#f6d365','#d88771'], deco:'savanna'},
  {id:'r-ocean', name:'Океан', icon:'🐋', mode:'realistic', grad:['#0f172a','#2563eb'], deco:'ocean'},
  {id:'r-desert', name:'Пустыня', icon:'🏜️', mode:'realistic', grad:['#ed8f2f','#f5d76e'], deco:'desert'},
]
const cartoonChars = [
  {emoji:'🧸', name:'Мишка'}, {emoji:'🐶', name:'Пёсик'}, {emoji:'🐱', name:'Котик'}, {emoji:'🦊', name:'Лисичка'},
  {emoji:'🐰', name:'Зайка'}, {emoji:'🦁', name:'Львёнок'}, {emoji:'🐼', name:'Панда'}, {emoji:'🦄', name:'Единорог'},
  {emoji:'🐙', name:'Осьминог'}, {emoji:'🦖', name:'Динозавр'}, {emoji:'🐵', name:'Мартышка'}, {emoji:'🐧', name:'Пингвин'},
  {emoji:'🐯', name:'Тигрёнок'}, {emoji:'🦉', name:'Совушка'}, {emoji:'🐸', name:'Лягушонок'}, {emoji:'🐘', name:'Слоник'},
]
const realisticChars = [
  {emoji:'🦁', name:'Лев'}, {emoji:'🐯', name:'Тигр'}, {emoji:'🐻', name:'Медведь'}, {emoji:'🐺', name:'Волк'},
  {emoji:'🦒', name:'Жираф'}, {emoji:'🐘', name:'Слон'}, {emoji:'🦏', name:'Носорог'}, {emoji:'🦈', name:'Акула'},
  {emoji:'🐅', name:'Тигр'}, {emoji:'🐆', name:'Леопард'}, {emoji:'🦓', name:'Зебра'}, {emoji:'🐪', name:'Верблюд'},
]
const stickers = [
  {emoji:'🎈', name:'Шарик'}, {emoji:'🎂', name:'Торт'}, {emoji:'🎁', name:'Подарок'}, {emoji:'⭐', name:'Звезда'},
  {emoji:'🌈', name:'Радуга'}, {emoji:'🍭', name:'Конфета'}, {emoji:'🎀', name:'Бантик'}, {emoji:'✨', name:'Блестка'},
  {emoji:'🍓', name:'Клубника'}, {emoji:'⚽', name:'Мяч'}, {emoji:'🚀', name:'Ракета'}, {emoji:'👑', name:'Корона'},
]
const kidsTemplates = [
  {name:'День Рождения', title:'С ДНЁМ РОЖДЕНИЯ!', subtitle:'Саше 5 лет — ура!', bg:'sky', chars:['🎈','🎂','🧸'], style:'cartoon', icon:'🎂'},
  {name:'Азбука', title:'УЧИМ БУКВУ А', subtitle:'А — арбуз, аист, азбука', bg:'forest', chars:['🦊','📚','🍎'], style:'cartoon', icon:'🔤'},
  {name:'Сказка', title:'ЖИЛИ-БЫЛИ...', subtitle:'в волшебном лесу', bg:'castle', chars:['🦄','🐰','🦉'], style:'cartoon', icon:'📖'},
  {name:'Животные Африки', title:'КТО ЭТО?', subtitle:'Угадай животное', bg:'r-savanna', chars:['🦁','🦒','🐘'], style:'realistic', icon:'🦁'},
  {name:'Космос', title:'ПОЛЕТ В КОСМОС', subtitle:'Мы — юные астронавты!', bg:'space', chars:['🚀','⭐','👨‍🚀'], style:'cartoon', icon:'🚀'},
  {name:'Под водой', title:'МОРСКИЕ ДРУЗЬЯ', subtitle:'Кит, дельфин и осьминог', bg:'underwater', chars:['🐙','🐬','🐳'], style:'cartoon', icon:'🌊'},
  {name:'Дино-парк', title:'ПАРК ДИНОЗАВРОВ', subtitle:'Р-р-р! Кто громче?', bg:'jungle', chars:['🦖','🦕','🌴'], style:'cartoon', icon:'🦖'},
  {name:'Ферма', title:'НА ФЕРМЕ', subtitle:'Му-му, ме-ее, ку-ка-ре-ку', bg:'farm', chars:['🐶','🐱','🐮'], style:'cartoon', icon:'🚜'},
]

let kidsStyle = localStorage.getItem('pr-kids-style') || 'cartoon'
let activeKidsBgId = localStorage.getItem('pr-kids-bg') || null
let characters = JSON.parse(localStorage.getItem('pr-chars') || '[]')
let selectedCharId = null
let strokes = JSON.parse(localStorage.getItem('pr-strokes')||'[]')
let isDrawMode = false, currentStroke=null
let drawColor = localStorage.getItem('pr-draw-color') || '#ff2d55'
let drawSize = +(localStorage.getItem('pr-draw-size')||6)
function reviveChars(){ characters.forEach(c=>{ if(c.isPhoto && c.imgSrc && !c._img){ const im=new Image(); im.src=c.imgSrc; c._img=im } }) }
reviveChars()
function saveKids(){ const toSave=characters.map(c=>{ const { _img, ...rest }=c; return rest }); localStorage.setItem('pr-kids-style', kidsStyle); localStorage.setItem('pr-kids-bg', activeKidsBgId||''); localStorage.setItem('pr-chars', JSON.stringify(toSave)); try{ localStorage.setItem('pr-strokes', JSON.stringify(strokes)) }catch(e){} }
function saveDraw(){ try{ localStorage.setItem('pr-strokes', JSON.stringify(strokes)) }catch(e){} }

function addChar(emoji, name, isSticker=false){
  const id = Date.now()+'_'+Math.random().toString(36).slice(2,5)
  const {w,h} = formats[format]
  characters.push({id, emoji, name, x: w*0.5 + (Math.random()-0.5)*w*0.4, y: h*0.55 + (Math.random()-0.5)*h*0.3, size: w>900? 120: 90, rot: (Math.random()-0.5)*0.2, isSticker})
  selectedCharId = id
  saveKids(); renderKidsSelected(); draw(0)
  els.status.textContent = `${emoji} добавлен — тащи на сцене!`
}
function addPhotoChar(file){
  const reader = new FileReader()
  reader.onload = e=>{
    const dataUrl = e.target.result
    const im = new Image()
    im.onload=()=>{
      const id = Date.now()+'_'+Math.random().toString(36).slice(2,5)
      const {w,h}=formats[format]
      characters.push({id, name: file.name.slice(0,12), x:w*0.5, y:h*0.5, size: w>900? 140: 110, rot:0, isPhoto:true, imgSrc: dataUrl, _img: im, emoji: '📸'})
      selectedCharId=id
      saveKids(); renderKidsSelected(); draw(0)
      els.status.textContent = `Фото добавлено ✓ Перетаскивай на сцене!`
      const thumbs=document.getElementById('photoThumbs')
      if(thumbs){ const t=document.createElement('div'); t.style.cssText='width:48px;height:48px;border-radius:10px;overflow:hidden;border:2px solid var(--border);background:#0f0f13'; t.innerHTML=`<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`; thumbs.appendChild(t) }
    }
    im.src=dataUrl
  }
  reader.readAsDataURL(file)
}
function removeChar(id){ characters = characters.filter(c=>c.id!==id); if(selectedCharId===id) selectedCharId=null; saveKids(); renderKidsSelected(); draw(0) }

// ===== Музыка (генерируется Web Audio, попадает в видео) =====
let audioCtx=null, previewOscs=[]
function ensureAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); return audioCtx }
function makeMusicStream(type, durationSec){
  const ac=ensureAudio()
  const dest=ac.createMediaStreamDestination()
  const now=ac.currentTime
  const tempo = type==='energy'? 140 : type==='tale'? 78 : 108
  const beat=60/tempo
  const scales = {
    happy: [0,2,4,5,7,9,11,12],
    tale: [0,2,4,7,9,12,14],
    energy: [0,3,5,7,10,12]
  }
  const baseNotes = { happy: 48, tale: 48, energy: 36 }
  function playNote(semi, t, dur, gain=0.22, oscType='sine'){
    const o=ac.createOscillator(); o.type=oscType
    const g=ac.createGain()
    o.frequency.value=440*Math.pow(2,(baseNotes[type]+semi-69)/12)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t+0.03)
    g.gain.exponentialRampToValueAtTime(0.001, t+dur*0.95)
    o.connect(g); g.connect(dest)
    // также к колонкам чтобы слышать при генерации? нет, только в стрим — предпросмотр отдельно
    o.start(t); o.stop(t+dur)
  }
  // simple melody + bass
  for(let b=0; b< durationSec/beat; b++){
    const t = now + b*beat
    const scale=scales[type]
    const idx = Math.floor(Math.random()*scale.length) % scale.length
    const semi = scale[idx] + (b%8===0?12:0)
    if(type==='energy' && b%2===0){
      playNote(0, t, beat*0.9, 0.3, 'square')
      playNote(semi, t, beat*0.8, 0.18, 'sine')
    } else if(type==='tale'){
      playNote(semi, t, beat*1.8, 0.16, 'triangle')
      if(b%4===0) playNote(semi-12, t, beat*3.2, 0.1, 'sine')
    } else {
      playNote(semi, t, beat*0.95, 0.2, 'sine')
      if(b%2===0) playNote(semi-12, t, beat*0.9, 0.08, 'triangle')
    }
  }
  // легкий шум-бочка для энергии
  if(type==='energy'){
    for(let b=0;b<durationSec/beat;b+=2){
      const t=now+b*beat
      const n=ac.createBufferSource(); const buf=ac.createBuffer(1, ac.sampleRate*0.12, ac.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(ac.sampleRate*0.04)); n.buffer=buf
      const g=ac.createGain(); g.gain.value=0.35; g.gain.exponentialRampToValueAtTime(0.001, t+0.25); n.connect(g); g.connect(dest); n.start(t)
    }
  }
  return dest.stream
}
let previewNodes=[]
function previewMusic(type){
  stopPreviewMusic()
  const ac=ensureAudio()
  const now=ac.currentTime
  const dest=ac.destination // слышим
  function n(semi,t,dur,gain,typeOsc){
    const o=ac.createOscillator(); o.type=typeOsc; const g=ac.createGain(); o.frequency.value=440*Math.pow(2,(48+semi-69)/12); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+0.03); g.gain.linearRampToValueAtTime(0,t+dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur); previewNodes.push(o)
  }
  for(let i=0;i<10;i++){ n([0,2,4,7,9][i%5], now+i*0.4, 0.6, 0.18, type==='energy'?'square':'sine') }
  setTimeout(stopPreviewMusic,5000)
}
function stopPreviewMusic(){ previewNodes.forEach(o=>{ try{o.stop()}catch{}}); previewNodes=[] }

const templates = [
  { name: 'Скидка', title: 'СКИДКА 50%', subtitle: 'Только сегодня', bg: 'gradient1', anim: 'zoom', color: '#ffffff' },
  { name: 'Новый товар', title: 'НОВИНКА', subtitle: 'Уже в продаже', bg: 'gradient2', anim: 'slideUp', color: '#ffffff' },
  { name: 'Акция', title: '2 ПО ЦЕНЕ 1', subtitle: 'Успей забрать', bg: 'gradient3', anim: 'fadeScale', color: '#ffffff' },
  { name: 'Продажа', title: 'РАСПРОДАЖА', subtitle: 'до -70%', bg: 'gradient1', anim: 'typewriter', color: '#ffd600' },
  { name: 'Неон', title: 'WOW SALE', subtitle: 'Не пропусти', bg: 'gradient3', anim: 'zoom', color: '#00e5ff' },
  { name: 'Минимал', title: 'Hello World', subtitle: 'Минимализм', bg: 'solid', color: '#111111', bgColor: '#f2f2f2' },
  { name: 'Чёрный', title: 'PREMIUM', subtitle: 'Для избранных', bg: 'solid', color: '#ffd600', bgColor: '#0a0a0f' },
  { name: 'Лето', title: 'ЛЕТО 2025', subtitle: 'Новая коллекция', bg: 'gradient4', anim: 'slideUp', color: '#ffffff' },
]
function applyFormat(fmt) {
  const old = formats[format]
  format = fmt
  const { w, h } = formats[fmt]
  // пересчёт координат героев и мазков при смене формата — не теряем сцену
  if(old){
    const sx=w/old.w, sy=h/old.h
    characters.forEach(c=>{ c.x*=sx; c.y*=sy; c.size=Math.max(36, Math.min(220, c.size*Math.min(sx,sy))) })
    strokes.forEach(s=> s.points.forEach(p=>{ p.x*=sx; p.y*=sy }))
  }
  els.canvas.width = w; els.canvas.height = h
  els.fmtLabel.textContent = `${w}×${h} • ${fmt}`
  document.querySelectorAll('.fmt-btn').forEach(b => b.classList.toggle('active', b.dataset.fmt === fmt))
  els.canvas.style.width = fmt === '9:16' ? '340px' : fmt === '1:1' ? '380px' : '100%'
  saveKids(); draw(0)
}
function getState() {
  return {
    title: els.title.value || ' ', subtitle: els.subtitle.value || '',
    titleSize: +els.titleSize.value, subSize: +els.subSize.value,
    bgType: els.bgType.value, bgColor: els.bgColor.value, overlay: +els.overlay.value,
    anim: els.anim.value, duration: +els.duration.value, textColor: els.textColor.value,
    particles: els.particles.checked, kenBurns: els.kenBurns.checked, watermark: els.watermark.checked,
    confetti: document.getElementById('inpConfetti')?.checked, bubbles: document.getElementById('inpBubbles')?.checked, speech: document.getElementById('inpSpeech')?.checked,
  }
}

function drawKidsBackground(bgId, t){
  const bg = kidsBackgrounds.find(b=>b.id===bgId)
  if(!bg) return false
  const {w,h} = formats[format]
  const [c1,c2] = bg.grad
  const g = ctx.createLinearGradient(0,0,w,h)
  g.addColorStop(0,c1); g.addColorStop(1,c2)
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h)
  // deco
  if(bg.deco==='clouds'){
    ctx.fillStyle='rgba(255,255,255,0.9)'
    for(let i=0;i<4;i++){ const x=w*0.15+i*w*0.25 + Math.sin(t*0.3+i)*12, y=h*0.18+Math.cos(t*0.2+i)*8, r= h*0.06; ctx.beginPath(); ctx.ellipse(x,y,r*1.6,r,0,0,Math.PI*2); ctx.ellipse(x+r*0.6,y-r*0.2,r*1.2,r*0.8,0,0,Math.PI*2); ctx.fill() }
    // grass bottom
    ctx.fillStyle='#7bcf7b'; ctx.beginPath(); ctx.ellipse(w/2,h*0.96,w*0.6,h*0.08,0,0,Math.PI*2); ctx.fill()
  } else if(bg.deco==='trees'){
    // simple trees
    for(let i=0;i<5;i++){ const x=w*0.1+i*w*0.2, y=h*0.78; ctx.fillStyle='#5a3e1b'; ctx.fillRect(x-10,y,20,h-y); ctx.fillStyle='#2d7a2d'; ctx.beginPath(); ctx.moveTo(x-38,y); ctx.lineTo(x+38,y); ctx.lineTo(x,y-h*0.22); ctx.closePath(); ctx.fill() }
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(0,0,w,h)
  } else if(bg.deco==='bubbles'){
    for(let i=0;i<18;i++){ const x=(Math.sin(i*1.3+t*0.5)*0.5+0.5)*w, y=((i*0.13+t*0.06)%1)*h, r=4+Math.sin(i)*3; ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1; ctx.stroke() }
  } else if(bg.deco==='stars'){
    ctx.fillStyle='rgba(255,255,255,0.95)'
    for(let i=0;i<60;i++){ const x=(Math.sin(i*1.9+t*0.1+i)*0.5+0.5)*w, y=(Math.cos(i*2.1+t*0.08+i)*0.5+0.5)*h, r=Math.random()*1.8+0.6; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill() }
    // planet
    ctx.fillStyle='#ff9a9e'; ctx.beginPath(); ctx.arc(w*0.78,h*0.22,w*0.07,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(w*0.78,h*0.22,w*0.1,h*0.025, -0.4,0,Math.PI*2); ctx.fill()
  } else if(bg.deco==='castle'){
    // castle silhouette bottom
    ctx.fillStyle='#4a2a6b'; ctx.fillRect(0,h*0.62,w,h*0.38); ctx.fillStyle='#6b3a8a'; for(let i=0;i<4;i++){ const x=w*0.2+i*w*0.18; ctx.fillRect(x-22,h*0.48,44,h*0.14); ctx.fillRect(x-30,h*0.44,60,18) }
  } else if(bg.deco==='jungle'){
    for(let i=0;i<6;i++){ const x=w*0.08+i*w*0.16; ctx.fillStyle='#1a4d1a'; ctx.beginPath(); ctx.moveTo(x-20,h); ctx.lineTo(x+20,h); ctx.lineTo(x,h*0.55); ctx.closePath(); ctx.fill(); ctx.fillStyle='#2d7a22'; ctx.beginPath(); ctx.arc(x,h*0.55,28,0,Math.PI*2); ctx.fill() }
  } else if(bg.deco==='farm'){
    ctx.fillStyle='#81c784'; ctx.fillRect(0,h*0.7,w,h*0.3); ctx.fillStyle='#a1887f'; ctx.fillRect(0,h*0.62,w,h*0.08);
  } else if(bg.deco==='city'){
    ctx.fillStyle='#1a1a2e'; for(let i=0;i<8;i++){ const x=w*0.05+i*w*0.12, hh=h*0.2+Math.sin(i)*h*0.08; ctx.fillStyle=i%2?'#16213e':'#0f3460'; ctx.fillRect(x,h*0.58-hh,w*0.09,hh); for(let wy=0; wy<3; wy++) for(let wx=0; wx<1; wx++){ ctx.fillStyle=Math.random()>0.5?'#ffd600':'transparent'; ctx.fillRect(x+4+wx*6,h*0.58-hh+6+wy*8,4,4)} }
  } else if(bg.deco==='beach'){
    ctx.fillStyle='#ffd8a8'; ctx.fillRect(0,h*0.65,w,h*0.35); ctx.fillStyle='#4facfe'; ctx.fillRect(0,0,w,h*0.42); // sea
    ctx.fillStyle='#fff'; for(let i=0;i<3;i++){ const x=w*0.2+i*w*0.3+Math.sin(t*0.4+i)*10; ctx.beginPath(); ctx.ellipse(x,h*0.48,40,8,0,0,Math.PI*2); ctx.fill() }
  } else if(bg.deco==='savanna'){
    ctx.fillStyle='#d2a679'; ctx.fillRect(0,h*0.68,w,h*0.32); ctx.fillStyle='#f5deb3'; ctx.beginPath(); ctx.arc(w*0.85,h*0.18,w*0.08,0,Math.PI*2); ctx.fill(); // sun
    for(let i=0;i<3;i++){ const x=w*0.2+i*w*0.3; ctx.fillStyle='#8b5a2b'; ctx.fillRect(x-3,h*0.45,6,h*0.23); ctx.fillStyle='#2d5016'; ctx.beginPath(); ctx.arc(x,h*0.45,26,0,Math.PI*2); ctx.fill() }
  } else if(bg.deco==='ocean'){
    for(let i=0;i<4;i++){ const y=h*0.5+i*h*0.12+Math.sin(t*0.6+i)*6; ctx.fillStyle=`rgba(37,99,235,${0.25+i*0.15})`; ctx.fillRect(0,y,w,30)}
  } else if(bg.deco==='mountains'){
    ctx.fillStyle='#1e3a5f'; ctx.beginPath(); ctx.moveTo(0,h*0.55); for(let i=0;i<5;i++){ const x=w*0.1+i*w*0.22, peak=h*0.28+Math.sin(i)*h*0.08; ctx.lineTo(x,peak); ctx.lineTo(x+w*0.11,h*0.55)} ctx.lineTo(w,h*0.55); ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill(); ctx.fillStyle='#e0f2fe'; ctx.beginPath(); ctx.ellipse(w*0.82,h*0.16,50,22,0,0,Math.PI*2); ctx.fill()
  } else if(bg.deco.includes('real')){
    // generic vignette for realistic
    const vg=ctx.createRadialGradient(w/2,h/2,w*0.3,w/2,h/2,w*0.9); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.25)'); ctx.fillStyle=vg; ctx.fillRect(0,0,w,h)
  }
  return true
}

function drawBackground(s, t) {
  const { w, h } = formats[format]
  // kids bg priority
  if(activeKidsBgId && drawKidsBackground(activeKidsBgId, t)){
    // kids vignette light
    if(s.overlay>0){ ctx.fillStyle=`rgba(0,0,0,${s.overlay/100})`; ctx.fillRect(0,0,w,h) }
    return
  }
  let scale=1; if(s.kenBurns) scale=1+t*0.06
  ctx.save(); if(scale!==1){ ctx.translate(w/2,h/2); ctx.scale(scale,scale); ctx.translate(-w/2,-h/2) }
  if(s.bgType==='image' && bgImage){ const iw=bgImage.width, ih=bgImage.height; const ratio=Math.max(w/iw,h/ih); const nw=iw*ratio, nh=ih*ratio; ctx.drawImage(bgImage,(w-nw)/2,(h-nh)/2,nw,nh) }
  else if(s.bgType==='solid'){ ctx.fillStyle=s.bgColor; ctx.fillRect(0,0,w,h) }
  else { const [c1,c2]=gradients[s.bgType]||gradients.gradient1; const g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,c1); g.addColorStop(1,c2); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.4,w/2,h/2,Math.max(w,h)*0.9); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.35)'); ctx.fillStyle=vg; ctx.fillRect(0,0,w,h) }
  ctx.restore()
  if(s.overlay>0){ ctx.fillStyle=`rgba(0,0,0,${s.overlay/100})`; ctx.fillRect(0,0,w,h) }
  const m=models.find(x=>x.id===currentModelId)
  if(m && m.id==='cinema'){ ctx.fillStyle='rgba(255,255,255,0.04)'; for(let i=0;i<120;i++){ const x=(Math.sin(i*12.7+t*5)*0.5+0.5)*w; const y=Math.random()*h; ctx.fillRect(x,y,1,1) } ctx.fillStyle='rgba(0,0,0,0.45)'; const bar=h*0.06; ctx.fillRect(0,0,w,bar); ctx.fillRect(0,h-bar,w,bar) }
  if(m && m.id==='neon'){ const ng=ctx.createRadialGradient(w/2,h/2,w*0.1,w/2,h/2,w*0.9); ng.addColorStop(0,'rgba(255,20,147,0)'); ng.addColorStop(1,'rgba(138,43,226,0.22)'); ctx.fillStyle=ng; ctx.fillRect(0,0,w,h) }
}
function particlesEffect(t){ const {w,h}=formats[format]; const count=w>900?40:22; for(let i=0;i<count;i++){ const x=(Math.sin(i*1.7+t*0.6)*0.5+0.5)*w; const y=((i*0.13+t*0.08)%1)*h; const r=(Math.sin(i)+1)*1.5+1; const alpha=0.35+Math.sin(t*2+i)*0.2; ctx.beginPath(); ctx.fillStyle=`rgba(255,255,255,${alpha})`; ctx.arc(x,y,r,0,Math.PI*2); ctx.fill() } }
function wrapText(text,maxWidth){ const words=text.split(' '); let lines=[], line=''; for(const w of words){ const test=line?line+' '+w:w; if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=w } else line=test } if(line) lines.push(line); return lines }

function drawCharacters(t){
  const s=getState()
  const phrases = ['Привет!','Ура!','Супер!','Вау!','Хи-хи','Давай играть!','Я тут!']
  characters.forEach((ch, idx)=>{
    const bounce = Math.sin(t*3 + idx)*8
    const wiggle = Math.sin(t*4 + idx*1.2)*0.06
    const isSelected = ch.id===selectedCharId
    // анимированные стикеры пульсируют
    const isSticker = !!ch.isSticker
    const pulse = isSticker ? 1 + Math.sin(t*6 + idx*1.5)*0.12 : 1
    const extraRot = isSticker ? Math.sin(t*3+idx)*0.08 : 0
    ctx.save()
    ctx.translate(ch.x, ch.y + (s.bubbles? bounce:0))
    ctx.rotate(ch.rot + extraRot + (kidsStyle==='cartoon' ? wiggle : 0))
    ctx.scale(pulse, pulse)
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, ch.size*0.45, ch.size*0.28, ch.size*0.1,0,0,Math.PI*2); ctx.fill()
    // photo or emoji
    if(ch.isPhoto && ch._img && ch._img.complete){
      const r=ch.size*0.5
      ctx.save()
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip()
      // cover
      const iw=ch._img.width, ih=ch._img.height; const ratio=Math.max(r*2/iw, r*2/ih); const nw=iw*ratio, nh=ih*ratio
      ctx.drawImage(ch._img, -nw/2, -nh/2, nw, nh)
      ctx.restore()
      ctx.strokeStyle='white'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke()
      ctx.strokeStyle='var(--accent)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,r+2,0,Math.PI*2); ctx.stroke()
    } else {
      ctx.font = `${ch.size}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`
      ctx.textAlign='center'; ctx.textBaseline='middle'
      if(kidsStyle==='cartoon'){ ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=12; ctx.shadowOffsetY=4 }
      ctx.fillText(ch.emoji || '❓', 0, 0)
      ctx.shadowBlur=0
    }
    // selection ring
    if(isSelected){
      ctx.strokeStyle='#ff2d55'; ctx.lineWidth=4; ctx.setLineDash([8,6]); ctx.beginPath(); ctx.ellipse(0,0,ch.size*0.42,ch.size*0.42,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle='#ff2d55'; ctx.beginPath(); ctx.arc(0,-ch.size*0.45,8,0,Math.PI*2); ctx.fill()
    }
    ctx.restore()
    // speech bubble
    if(s.speech && t>0.2){
      const phrase = phrases[(idx + Math.floor(t*0.7)) % phrases.length]
      ctx.save()
      ctx.font = `600 ${Math.round(ch.size*0.16)}px Nunito, Inter, sans-serif`
      const pad=10, bw=ctx.measureText(phrase).width+pad*2, bh=ch.size*0.24
      const bx=ch.x+ch.size*0.35, by=ch.y - ch.size*0.7
      ctx.fillStyle='white'; ctx.strokeStyle='#1a1a22'; ctx.lineWidth=2
      ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,12); ctx.fill(); ctx.stroke()
      ctx.fillStyle='#1a1a22'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(phrase, bx+bw/2, by+bh/2)
      // tail
      ctx.fillStyle='white'; ctx.beginPath(); ctx.moveTo(bx+8, by+bh); ctx.lineTo(bx+14, by+bh+6); ctx.lineTo(bx+18, by+bh); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  })
}
function drawStrokes(){
  strokes.forEach(s=>{
    if(!s.points || s.points.length<2) return
    ctx.strokeStyle=s.color; ctx.lineWidth=s.size; ctx.lineCap='round'; ctx.lineJoin='round'
    ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y)
    for(let i=1;i<s.points.length;i++) ctx.lineTo(s.points[i].x, s.points[i].y)
    ctx.stroke()
  })
  if(currentStroke && currentStroke.points.length>1){
    ctx.strokeStyle=currentStroke.color; ctx.lineWidth=currentStroke.size; ctx.lineCap='round'; ctx.lineJoin='round'
    ctx.beginPath(); ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y)
    for(let i=1;i<currentStroke.points.length;i++) ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y)
    ctx.stroke()
  }
}
function drawConfetti(t){
  const {w,h}=formats[format]
  for(let i=0;i<30;i++){
    const x=(Math.sin(i*2.3 + t*1.2)*0.5+0.5)*w
    const y=((i*0.07 + t*0.25)%1)*h
    const col = ['#ff2d55','#ffd600','#00e5ff','#22c55e','#8b5cf6'][i%5]
    ctx.fillStyle=col
    ctx.save(); ctx.translate(x,y); ctx.rotate(t*2+i); ctx.fillRect(-5,-3,10,6); ctx.restore()
  }
}

function draw(tProgress){
  const s=getState(); const {w,h}=formats[format]
  drawBackground(s,tProgress)
  if(s.particles) particlesEffect(tProgress)
  if(s.confetti) drawConfetti(tProgress)
  if(s.bubbles && !activeKidsBgId){
    for(let i=0;i<10;i++){ const x=(Math.sin(i*1.1+tProgress)*0.5+0.5)*w; const y=((i*0.2+tProgress*0.05)%1)*h; ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill() }
  }
  drawCharacters(tProgress)
  drawStrokes()

  let titleAlpha=1, titleY=0, titleScale=1, subtitleAlpha=1, charCount=Infinity
  const t=tProgress
  switch(s.anim){
    case 'fadeScale': titleAlpha=Math.min(1,t*3); titleScale=0.88+titleAlpha*0.12; subtitleAlpha=Math.min(1,Math.max(0,(t-0.25)*3)); break
    case 'typewriter': charCount=Math.floor(t*s.title.length*1.4); subtitleAlpha=t>0.6?Math.min(1,(t-0.6)*4):0; break
    case 'slideUp': titleY=(1-Math.min(1,t*2.2))*60; titleAlpha=Math.min(1,t*2.5); subtitleAlpha=Math.min(1,Math.max(0,(t-0.3)*2)); break
    case 'zoom': titleScale=0.7+Math.min(1,t*2)*0.3+t*0.03; titleAlpha=Math.min(1,t*2.8); subtitleAlpha=Math.min(1,Math.max(0,(t-0.4)*2.5)); break
    case 'none': break
  }
  ctx.textAlign='center'; ctx.textBaseline='middle'
  let titleText=s.title; if(s.anim==='typewriter') titleText=s.title.slice(0,charCount)+(charCount<s.title.length && Math.floor(Date.now()/400)%2?'|':'')
  ctx.font=`800 ${s.titleSize}px Manrope, Inter, sans-serif`; ctx.fillStyle=s.textColor; ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=18; ctx.shadowOffsetY=6
  const maxW=w*0.86; let lines=wrapText(titleText,maxW); let lineH=s.titleSize*1.08; let totalH=lines.length*lineH; let centerY=h/2 - (s.subtitle? 22:0); if(format==='9:16') centerY=h*0.38; let startY=centerY-totalH/2+lineH/2+titleY
  // kids titles more playful
  if(kidsStyle==='cartoon' && activeKidsBgId){ ctx.font=`900 ${s.titleSize}px Nunito, Manrope, sans-serif`; }
  ctx.save(); if(titleScale!==1){ ctx.translate(w/2,centerY); ctx.scale(titleScale,titleScale); ctx.translate(-w/2,-centerY) }
  ctx.globalAlpha=titleAlpha
  // text background for kids for readability
  if(activeKidsBgId){
    const padH=lineH*0.45; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=2
    lines.forEach((ln,i)=>{ const y=startY+i*lineH; const tw=ctx.measureText(ln).width; const x=w/2 - tw/2 -16; ctx.beginPath(); ctx.roundRect(x, y-lineH*0.48, tw+32, lineH*0.92, 16); ctx.fill(); ctx.stroke() })
    ctx.fillStyle='#1a1a22'
  }
  lines.forEach((ln,i)=> ctx.fillText(ln,w/2,startY+i*lineH) )
  ctx.restore()
  if(s.subtitle){
    ctx.shadowBlur=10; ctx.shadowOffsetY=3; ctx.globalAlpha=subtitleAlpha; ctx.font=`500 ${s.subSize}px Inter, sans-serif`
    ctx.fillStyle = activeKidsBgId? '#1a1a22' : (s.textColor==='#ffffff'?'rgba(255,255,255,0.92)':s.textColor)
    const subY=centerY+totalH/2+32
    if(!activeKidsBgId){
      const metrics=ctx.measureText(s.subtitle); const pillW=Math.min(metrics.width+32,w*0.85); const pillH=s.subSize+16
      if(s.bgType!=='solid' || s.bgColor==='#0a0a0f'){ ctx.fillStyle='rgba(255,255,255,0.14)'; const x=w/2-pillW/2, y=subY-pillH/2; ctx.beginPath(); ctx.roundRect(x,y,pillW,pillH,999); ctx.fill(); ctx.fillStyle=s.textColor; ctx.globalAlpha=subtitleAlpha }
    } else {
      // kids pill white
      const metrics=ctx.measureText(s.subtitle); const pillW=Math.min(metrics.width+24,w*0.82); const pillH=s.subSize+14; ctx.fillStyle='rgba(255,255,255,0.9)'; const x=w/2-pillW/2, y=subY-pillH/2; ctx.beginPath(); ctx.roundRect(x,y,pillW,pillH,999); ctx.fill(); ctx.fillStyle='#1a1a22'
    }
    ctx.fillText(s.subtitle,w/2,subY)
  }
  ctx.globalAlpha=1; ctx.shadowBlur=0
  if(s.watermark){ ctx.font=`600 13px Inter, sans-serif`; ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.textAlign='right'; ctx.fillText('probable-robot • kids',w-18,h-18); ctx.textAlign='center' }
}

let previewRaf=null
function playPreview(){ if(previewRaf) cancelAnimationFrame(previewRaf); const start=performance.now(); const dur=+els.duration.value*1000; const loop=(now)=>{ const p=Math.min(1,(now-start)/dur); draw(p); els.timelineProgress.style.width=(p*100)+'%'; if(p<1) previewRaf=requestAnimationFrame(loop); else { els.timelineProgress.style.width='100%'; setTimeout(()=>{ els.timelineProgress.style.width='0%'; draw(0)},700)} }; previewRaf=requestAnimationFrame(loop) }

const tplGrid=document.getElementById('tplGrid')
templates.forEach(t=>{
  const el=document.createElement('div'); el.className='tpl-card'
  const thumb=document.createElement('div'); thumb.className='tpl-thumb'
  if(t.bgColor) thumb.style.background=t.bgColor; else { const [c1,c2]=gradients[t.bg]||gradients.gradient1; thumb.style.background=`linear-gradient(135deg,${c1},${c2})` }
  thumb.style.color=t.color; thumb.textContent=t.title
  const name=document.createElement('div'); name.className='tpl-name'; name.textContent=t.name
  el.append(thumb,name)
  el.onclick=()=>{ els.title.value=t.title; els.subtitle.value=t.subtitle||''; els.bgType.value=t.bg; if(t.bgColor) els.bgColor.value=t.bgColor; if(t.anim) els.anim.value=t.anim; if(t.color) els.textColor.value=t.color; activeKidsBgId=null; localStorage.removeItem('pr-kids-bg'); saveKids(); renderKids(); draw(0) }
  tplGrid.appendChild(el)
})

function updateBgVisibility(){ const v=els.bgType.value; els.bgColorRow.style.display=v==='solid'?'block':'none'; els.bgImageRow.style.display=v==='image'?'block':'none' }
;['input','change'].forEach(ev=>{ els.title.addEventListener(ev,()=>draw(0)); els.subtitle.addEventListener(ev,()=>draw(0)) })
els.titleSize.addEventListener('input',()=>{ els.valTitleSize.textContent=els.titleSize.value; draw(0) })
els.subSize.addEventListener('input',()=>{ els.valSubSize.textContent=els.subSize.value; draw(0) })
els.bgType.addEventListener('change',()=>{ updateBgVisibility(); draw(0) })
els.bgColor.addEventListener('input',()=>draw(0))
els.overlay.addEventListener('input',()=>draw(0))
els.anim.addEventListener('change',()=>draw(0))
els.duration.addEventListener('input',()=>{ els.valDuration.textContent=els.duration.value; els.timelineEnd.textContent=els.duration.value+'с'; draw(0) })
els.textColor.addEventListener('input',()=>draw(0))
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ els.textColor.value=c.dataset.color; draw(0) })
els.particles.addEventListener('change',()=>draw(0))
els.kenBurns.addEventListener('change',()=>draw(0))
els.watermark.addEventListener('change',()=>draw(0))
document.getElementById('inpConfetti')?.addEventListener('change',()=>draw(0))
document.getElementById('inpBubbles')?.addEventListener('change',()=>draw(0))
document.getElementById('inpSpeech')?.addEventListener('change',()=>draw(0))
document.querySelectorAll('.fmt-btn').forEach(b=>b.onclick=()=>applyFormat(b.dataset.fmt))
els.inpImage.addEventListener('change',e=>{ const file=e.target.files[0]; if(!file) return; loadImageFile(file) })
function loadImageFile(file){ const url=URL.createObjectURL(file); const img=new Image(); img.onload=()=>{ bgImage=img; els.bgType.value='image'; updateBgVisibility(); draw(0); els.status.textContent='Картинка загружена ✓' }; img.src=url }
els.canvasWrap.addEventListener('dragover',e=>{ e.preventDefault(); els.canvasWrap.classList.add('drag') })
els.canvasWrap.addEventListener('dragleave',()=>els.canvasWrap.classList.remove('drag'))
els.canvasWrap.addEventListener('drop',e=>{
  e.preventDefault(); els.canvasWrap.classList.remove('drag')
  const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'))
  if(!files.length) return
  // если вкладка Дети активна — добавляем как фото-персонажей
  if(document.body.dataset.tab==='kids'){
    files.forEach(f=> addPhotoChar(f))
  } else {
    loadImageFile(files[0])
  }
})
// фото-персонажи
els.inpPhoto?.addEventListener('change', e=>{
  const files=[...e.target.files]; if(!files.length) return
  files.forEach(f=>{ if(f.type.startsWith('image/')) addPhotoChar(f) })
  e.target.value=''
})
document.getElementById('btnPreviewMusic')?.addEventListener('click', ()=>{
  const type=els.inpMusic.value; if(type==='none'){ els.status.textContent='Выбери музыку сначала'; return }
  previewMusic(type); els.status.textContent='▶ Слушай 5 сек...'; setTimeout(()=> els.status.textContent='Готово', 5200)
})
document.getElementById('btnStopMusic')?.addEventListener('click', ()=>{ stopPreviewMusic(); els.status.textContent='Остановлено' })
els.btnPlayPreview.onclick=playPreview

// text-to-speech
document.getElementById('btnSpeak').onclick=()=>{
  const text = els.title.value + '. ' + els.subtitle.value
  if(!('speechSynthesis' in window)) { els.status.textContent='Браузер не поддерживает озвучку'; return }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang='ru-RU'; u.rate=0.95; u.pitch=1.1
  speechSynthesis.speak(u)
  els.status.textContent='🔊 Озвучиваю...'
  u.onend=()=> els.status.textContent='Готово!'
}

// Kids rendering
function renderKids(){
  const bgGrid=document.getElementById('kidsBgGrid')
  const charGrid=document.getElementById('kidsCharGrid')
  const stickerGrid=document.getElementById('kidsStickerGrid')
  if(!bgGrid) return
  bgGrid.innerHTML=''; charGrid.innerHTML=''; stickerGrid.innerHTML=''
  const bgs = kidsBackgrounds.filter(b=>b.mode===kidsStyle)
  bgs.forEach(bg=>{
    const card=document.createElement('button'); card.className='kids-bg-card'+(activeKidsBgId===bg.id?' active':''); card.type='button'
    card.innerHTML=`<div class="kids-bg-thumb" style="background: linear-gradient(135deg, ${bg.grad[0]}, ${bg.grad[1]})">${bg.icon} ${bg.name}</div><div class="kids-bg-name">${bg.mode==='cartoon'?'Мульт':'Реал'} • ${bg.name}</div>`
    card.onclick=()=>{ activeKidsBgId=bg.id; saveKids(); renderKids(); draw(0); els.status.textContent=`Фон «${bg.name}» выбран ✓` }
    bgGrid.appendChild(card)
  })
  const chars = kidsStyle==='cartoon'? cartoonChars : realisticChars
  chars.forEach(c=>{
    const btn=document.createElement('button'); btn.className='kids-char-btn'; btn.type='button'
    btn.innerHTML=`<div class="kids-char-emoji">${c.emoji}</div><div class="kids-char-name">${c.name}</div>`
    btn.onclick=()=> addChar(c.emoji, c.name)
    charGrid.appendChild(btn)
  })
  stickers.forEach(s=>{
    const btn=document.createElement('button'); btn.className='kids-char-btn'; btn.type='button'
    btn.innerHTML=`<div class="kids-char-emoji">${s.emoji}</div><div class="kids-char-name">${s.name}</div>`
    btn.onclick=()=> addChar(s.emoji, s.name, true)
    stickerGrid.appendChild(btn)
  })
  renderKidsSelected()
  // style buttons
  document.querySelectorAll('.style-btn').forEach(b=> b.classList.toggle('active', b.dataset.style===kidsStyle))
  // toolbar
  const activeModel = models.find(m=>m.id===currentModelId)?.name||'Классика'
  els.toolbarStyle.textContent = (kidsStyle==='cartoon'?'Мультяшный':'Реалистичный') + ' • ' + activeModel
  document.getElementById('kidsBgHint').textContent = activeKidsBgId ? kidsBackgrounds.find(b=>b.id===activeKidsBgId)?.name : 'выбери фон'
}
function renderKidsSelected(){
  const sec=document.getElementById('kidsSelectedSection')
  const list=document.getElementById('selectedList')
  const count=document.getElementById('kidsCount')
  if(!sec) return
  if(characters.length===0){ sec.style.display='none'; return }
  sec.style.display='block'; count.textContent=characters.length; list.innerHTML=''
  characters.forEach(ch=>{
    const row=document.createElement('div'); row.className='selected-item'
    const avatar = ch.isPhoto ? `<img src="${ch.imgSrc}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--border)">` : ch.emoji
    row.innerHTML=`<div class="selected-item-emoji" style="display:grid;place-items:center">${avatar}</div><div class="selected-item-info"><div class="selected-item-title">${ch.name}</div><div class="selected-item-sub">x:${Math.round(ch.x)} y:${Math.round(ch.y)} • ${ch.size}px</div></div>`
    const actions=document.createElement('div'); actions.className='selected-item-actions'
    const inc=document.createElement('button'); inc.className='icon-btn'; inc.textContent='+'; inc.title='Увеличить'; inc.onclick=()=>{ ch.size=Math.min(200,ch.size+12); saveKids(); renderKidsSelected(); draw(0)}
    const dec=document.createElement('button'); dec.className='icon-btn'; dec.textContent='−'; dec.title='Уменьшить'; dec.onclick=()=>{ ch.size=Math.max(40,ch.size-12); saveKids(); renderKidsSelected(); draw(0)}
    const del=document.createElement('button'); del.className='icon-btn'; del.textContent='✕'; del.title='Удалить'; del.onclick=()=> removeChar(ch.id)
    actions.append(inc,dec,del); row.appendChild(actions)
    row.onclick=(e)=>{ if(e.target.closest('.icon-btn')) return; selectedCharId=ch.id; draw(0) }
    if(ch.id===selectedCharId) row.style.borderColor='var(--accent)'
    list.appendChild(row)
  })
}
document.querySelectorAll('.style-btn').forEach(b=> b.addEventListener('click', ()=>{ kidsStyle=b.dataset.style; saveKids(); renderKids(); draw(0) }))
document.getElementById('btnClearBg').onclick=()=>{ activeKidsBgId=null; saveKids(); renderKids(); draw(0); els.status.textContent='Детский фон убран' }
document.getElementById('btnClearChars').onclick=()=>{ characters=[]; selectedCharId=null; saveKids(); renderKids(); draw(0) }
document.getElementById('btnShuffle').onclick=()=>{ const {w,h}=formats[format]; characters.forEach(c=>{ c.x=w*0.25+Math.random()*w*0.5; c.y=h*0.4+Math.random()*h*0.4 }); saveKids(); draw(0) }
renderKids()
document.getElementById('kidsTplList').innerHTML=''
kidsTemplates.forEach(t=>{
  const btn=document.createElement('button'); btn.className='kids-tpl-btn'; btn.type='button'
  btn.innerHTML=`<div class="kids-tpl-emoji">${t.icon}</div><div><div class="kids-tpl-title">${t.name}</div><div class="kids-tpl-sub">${t.title} — ${t.subtitle.slice(0,30)}</div></div>`
  btn.onclick=()=>{
    kidsStyle=t.style; activeKidsBgId=t.bg; els.title.value=t.title; els.subtitle.value=t.subtitle
    characters=[]; t.chars.forEach((emoji,i)=>{ const {w,h}=formats[format]; characters.push({id:Date.now()+i, emoji, name:emoji, x:w*0.25+i*w*0.2, y:h*0.62+ (i%2? -30:10), size: w>900? 110: 80, rot:0}) })
    saveKids(); renderKids(); draw(0); document.body.dataset.tab='kids'; syncTabs()
    els.status.textContent=`История «${t.name}» загружена — нажимай Генерировать!`
  }
  document.getElementById('kidsTplList').appendChild(btn)
})

// drag + рисование
let drag=null
function canvasPos(e){
  const rect=els.canvas.getBoundingClientRect()
  const scaleX=els.canvas.width/rect.width, scaleY=els.canvas.height/rect.height
  const x=(e.touches? e.touches[0].clientX : e.clientX) - rect.left
  const y=(e.touches? e.touches[0].clientY : e.clientY) - rect.top
  return {x:x*scaleX, y:y*scaleY}
}
function hitTest(pos){
  for(let i=characters.length-1;i>=0;i--){ const ch=characters[i]; const dx=pos.x-ch.x, dy=pos.y-ch.y; const r=ch.size*0.38; if(dx*dx+dy*dy < r*r) return ch }
  return null
}
els.canvas.addEventListener('mousedown', e=>{
  const p=canvasPos(e)
  if(isDrawMode){
    currentStroke={ color: drawColor, size: drawSize, points:[p] }
    els.canvas.style.cursor='crosshair'
    e.preventDefault(); return
  }
  const hit=hitTest(p); if(hit){ selectedCharId=hit.id; drag={id:hit.id, offX:p.x-hit.x, offY:p.y-hit.y}; draw(0); renderKidsSelected(); e.preventDefault() } else { selectedCharId=null; draw(0); renderKidsSelected() }
})
els.canvas.addEventListener('mousemove', e=>{
  const p=canvasPos(e)
  if(currentStroke){ currentStroke.points.push(p); draw(0); return }
  if(!drag) return; const ch=characters.find(c=>c.id===drag.id); if(ch){ ch.x=p.x-drag.offX; ch.y=p.y-drag.offY; saveKids(); draw(0); renderKidsSelected() }
})
window.addEventListener('mouseup', ()=>{
  if(currentStroke){ strokes.push(currentStroke); currentStroke=null; saveDraw(); draw(0) }
  if(drag) saveKids()
  drag=null
})
els.canvas.addEventListener('touchstart', e=>{
  const p=canvasPos(e)
  if(isDrawMode){ currentStroke={ color: drawColor, size: drawSize, points:[p] }; e.preventDefault(); return }
  const hit=hitTest(p); if(hit){ selectedCharId=hit.id; drag={id:hit.id, offX:p.x-hit.x, offY:p.y-hit.y}; draw(0); renderKidsSelected(); e.preventDefault() }
}, {passive:false})
els.canvas.addEventListener('touchmove', e=>{
  const p=canvasPos(e)
  if(currentStroke){ currentStroke.points.push(p); draw(0); e.preventDefault(); return }
  if(!drag) return; const ch=characters.find(c=>c.id===drag.id); if(ch){ ch.x=p.x-drag.offX; ch.y=p.y-drag.offY; draw(0); renderKidsSelected() } e.preventDefault()
}, {passive:false})
window.addEventListener('touchend', ()=> { if(currentStroke){ strokes.push(currentStroke); currentStroke=null; saveDraw(); draw(0) } if(drag) saveKids(); drag=null })
els.canvas.addEventListener('wheel', e=>{
  if(!selectedCharId) return; const ch=characters.find(c=>c.id===selectedCharId); if(!ch) return; e.preventDefault(); ch.size=Math.max(40, Math.min(220, ch.size + (e.deltaY<0? 8:-8))); saveKids(); draw(0); renderKidsSelected()
}, {passive:false})

// ===== Рисование, черновики, PWA =====
const btnDrawToggle=document.getElementById('btnDrawToggle')
const btnClearDraw=document.getElementById('btnClearDraw')
const inpDrawColor=document.getElementById('inpDrawColor')
const inpDrawSize=document.getElementById('inpDrawSize')
const valDrawSize=document.getElementById('valDrawSize')
if(inpDrawColor){ inpDrawColor.value=drawColor; inpDrawColor.addEventListener('input', e=>{ drawColor=e.target.value; localStorage.setItem('pr-draw-color', drawColor) }) }
if(inpDrawSize){ inpDrawSize.value=drawSize; valDrawSize.textContent=drawSize; inpDrawSize.addEventListener('input', e=>{ drawSize=+e.target.value; valDrawSize.textContent=drawSize; localStorage.setItem('pr-draw-size', drawSize) }) }
if(btnDrawToggle){
  const upd=()=>{
    btnDrawToggle.textContent = isDrawMode ? '✅ Кисть включена — рисуй!' : '✏️ Включить кисть'
    btnDrawToggle.style.background = isDrawMode ? 'var(--accent)' : '#0f0f13'
    btnDrawToggle.style.color = isDrawMode ? '#fff' : 'var(--text)'
    els.canvas.style.cursor = isDrawMode ? 'crosshair' : 'default'
    document.getElementById('canvasHint').textContent = isDrawMode ? '✏️ Рисуй мышкой/пальцем — отпусти чтобы сохранить штрих' : '💡 Включи кисть чтобы рисовать • стикеры теперь пульсируют'
  }
  btnDrawToggle.onclick=()=>{ isDrawMode=!isDrawMode; upd(); els.status.textContent=isDrawMode? 'Кисть включена — рисуй на сцене!' : 'Кисть выключена' }
  upd()
}
if(btnClearDraw) btnClearDraw.onclick=()=>{ strokes=[]; currentStroke=null; saveDraw(); draw(0); els.status.textContent='Рисунок очищен' }

// черновики
function collectProject(){
  return {
    v:2, title: els.title.value, subtitle: els.subtitle.value,
    titleSize:+els.titleSize.value, subSize:+els.subSize.value,
    bgType: els.bgType.value, bgColor: els.bgColor.value, overlay:+els.overlay.value,
    anim: els.anim.value, duration:+els.duration.value, textColor: els.textColor.value,
    particles: els.particles.checked, kenBurns: els.kenBurns.checked, watermark: els.watermark.checked,
    kidsStyle, activeKidsBgId, characters: characters.map(c=>{const{_img,...r}=c; return r}), strokes,
    music: els.inpMusic?.value||'none', format, modelId: currentModelId
  }
}
function applyProject(p){
  try{
    els.title.value=p.title||''; els.subtitle.value=p.subtitle||''
    els.titleSize.value=p.titleSize||68; els.subSize.value=p.subSize||24
    els.bgType.value=p.bgType||'gradient1'; els.bgColor.value=p.bgColor||'#0a0a0f'; els.overlay.value=p.overlay||0
    els.anim.value=p.anim||'fadeScale'; els.duration.value=p.duration||4; els.textColor.value=p.textColor||'#ffffff'
    if(els.particles) els.particles.checked=!!p.particles
    if(els.kenBurns) els.kenBurns.checked=!!p.kenBurns
    if(els.watermark) els.watermark.checked=!!p.watermark
    kidsStyle=p.kidsStyle||'cartoon'; activeKidsBgId=p.activeKidsBgId||null
    characters = Array.isArray(p.characters)? p.characters: []
    strokes = Array.isArray(p.strokes)? p.strokes: []
    reviveChars()
    if(p.music && els.inpMusic) els.inpMusic.value=p.music
    if(p.format) format=p.format
    if(p.modelId) currentModelId=p.modelId
    renderKids(); renderModels(); updateBgVisibility(); applyFormat(format)
    els.valTitleSize.textContent=els.titleSize.value; els.valSubSize.textContent=els.subSize.value
    els.valDuration.textContent=els.duration.value; els.timelineEnd.textContent=els.duration.value+'с'
    // draw colors
    if(p.drawColor) drawColor=p.drawColor
    draw(0)
    els.status.textContent='Черновик загружен ✓'
  }catch(e){ els.status.textContent='Ошибка загрузки: '+e.message }
}
document.getElementById('btnSaveDraft')?.addEventListener('click',()=>{
  const pr=collectProject(); localStorage.setItem('pr-draft', JSON.stringify(pr)); localStorage.setItem('pr-draft-time', new Date().toISOString())
  document.getElementById('draftHint').textContent='Сохранено '+new Date().toLocaleTimeString(); els.status.textContent='Черновик сохранён ✓'
})
document.getElementById('btnLoadDraft')?.addEventListener('click',()=>{
  const raw=localStorage.getItem('pr-draft'); if(!raw){ els.status.textContent='Нет сохранённого черновика'; return }
  applyProject(JSON.parse(raw))
})
document.getElementById('btnDownloadDraft')?.addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(collectProject(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kids-project.json'; a.click()
})
document.getElementById('inpLoadDraft')?.addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=> applyProject(JSON.parse(ev.target.result)); r.readAsText(f)
})
// автосохранение каждые 5с
setInterval(()=>{ try{ localStorage.setItem('pr-draft', JSON.stringify(collectProject())) }catch{} },5000)
if(localStorage.getItem('pr-draft')) document.getElementById('draftHint').textContent='Есть сохранённый черновик — нажми Открыть'

// PWA
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}) }
let deferredPrompt=null
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; const b=document.getElementById('btnInstall'); if(b) b.style.display='block' })
document.getElementById('btnInstall')?.addEventListener('click', async()=>{
  if(!deferredPrompt){ document.getElementById('pwaHint').textContent='Открой в Chrome на телефоне и выбери «Установить»'; return }
  deferredPrompt.prompt(); const r=await deferredPrompt.userChoice; document.getElementById('pwaHint').textContent= r.outcome==='accepted'? 'Устанавливаю...' : 'Отменено'; deferredPrompt=null
})

async function generateVideo(){
  const s=getState(); if(!s.title.trim()){ els.status.textContent='Введи заголовок!'; return }
  const fps=30, duration=s.duration, totalFrames=duration*fps
  els.btnGenerate.disabled=true; els.btnGenerate.innerHTML='<span class="btn-icon"></span> Запись...'; els.status.textContent='Подготовка записи...'; els.resultCard.style.display='none'
  let mime='video/webm;codecs=vp9'; if(!MediaRecorder.isTypeSupported(mime)) mime='video/webm;codecs=vp8'; if(!MediaRecorder.isTypeSupported(mime)) mime='video/webm'
  const canvasStream=els.canvas.captureStream(fps)
  // музыка в видео
  let musicStream=null, combinedStream=canvasStream
  const musicType=els.inpMusic?.value
  if(musicType && musicType!=='none'){
    try{ musicStream=makeMusicStream(musicType, duration); const vt=canvasStream.getVideoTracks()[0]; const at=musicStream.getAudioTracks()[0]; combinedStream=new MediaStream([vt, at]) }catch(e){ console.warn('music fail',e) }
  }
  const recorder=new MediaRecorder(combinedStream,{mimeType:mime, videoBitsPerSecond:5000000}); const chunks=[]; recorder.ondataavailable=e=>{ if(e.data.size) chunks.push(e.data) }; const done=new Promise(res=> recorder.onstop=res); recorder.start(100)
  let frame=0; function renderFrame(){ const t=frame/totalFrames; draw(t); els.timelineProgress.style.width=(t*100)+'%'; els.status.textContent=`Запись... ${Math.round(t*100)}%`; frame++; if(frame<=totalFrames){ setTimeout(()=> requestAnimationFrame(renderFrame),1000/fps) } else recorder.stop() }
  requestAnimationFrame(renderFrame); await done
  // stop music
  if(musicStream) musicStream.getTracks().forEach(t=>t.stop())
  const blob=new Blob(chunks,{type:mime}); const url=URL.createObjectURL(blob); els.resultVideo.src=url; els.downloadLink.href=url
  const safeTitle=s.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g,'_').slice(0,30)||'video'; els.downloadLink.download=`${safeTitle}_${format}.webm`
  els.resultCard.style.display='block'; els.status.textContent=`Готово! ${(blob.size/1024/1024).toFixed(2)} МБ • ${mime}${musicType!=='none'?' • с музыкой 🎵':''}`; els.btnGenerate.disabled=false; els.btnGenerate.innerHTML='<span class="btn-icon"></span> Сгенерировать видео'; els.timelineProgress.style.width='0%'; draw(0); els.resultCard.scrollIntoView({behavior:'smooth',block:'nearest'})
}
els.btnGenerate.onclick=generateVideo
document.getElementById('btnAgain').onclick=()=>{ els.resultCard.style.display='none'; els.status.textContent='' }
document.getElementById('btnHelp').onclick=()=> document.getElementById('modalHelp').style.display='grid'
document.getElementById('btnExamples').onclick=()=> document.querySelector('.templates').scrollIntoView({behavior:'smooth'})
document.querySelectorAll('[data-close]').forEach(el=> el.onclick=()=> document.getElementById('modalHelp').style.display='none')

function syncTabs(){ document.querySelectorAll('.tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.tab===document.body.dataset.tab)); document.getElementById('tabGen').style.display=document.body.dataset.tab==='model'?'none': document.body.dataset.tab==='kids'?'none':'block'; document.getElementById('tabModel').style.display=document.body.dataset.tab==='model'?'block':'none'; document.getElementById('tabKids').style.display=document.body.dataset.tab==='kids'?'block':'none' }
document.body.dataset.tab='kids' // сразу показываем детский режим как главный
document.querySelectorAll('.tab-btn').forEach(b=> b.addEventListener('click', ()=>{ document.body.dataset.tab=b.dataset.tab; syncTabs() }))
syncTabs()
function renderModels(){ const grid=document.getElementById('modelGrid'); const badge=document.getElementById('modelBadge'); const cur=document.getElementById('modelCurrent'); grid.innerHTML=''; models.forEach(m=>{ const card=document.createElement('button'); card.type='button'; card.className='model-card'+(m.id===currentModelId?' active':''); card.innerHTML=`<div class="model-card-top" style="background: linear-gradient(135deg, ${m.grad[0]}, ${m.grad[1]}); color:${m.textColor||'#fff'}"><div style="text-align:center"><div class="model-card-icon">${m.icon}</div><div class="model-card-name">${m.name}</div></div></div><div class="model-card-body"><div class="model-card-title">${m.name}</div><div class="model-card-desc">${m.desc}</div><span class="model-card-tag">${m.tag}</span></div>`; card.onclick=()=> setModel(m.id); grid.appendChild(card) }); const active=models.find(x=>x.id===currentModelId); if(active){ badge.textContent=active.name; cur.innerHTML=`<div class="model-current-dot"></div><div><b>${active.name}</b> — ${active.hint}<br><span>Анимация: ${active.anim} • фон: ${active.bg}</span></div>` } }
function setModel(id){ const m=models.find(x=>x.id===id); if(!m) return; currentModelId=id; localStorage.setItem('pr-model',id); els.bgType.value=m.bg; if(m.bgColor) els.bgColor.value=m.bgColor; els.anim.value=m.anim; els.textColor.value=m.textColor; els.particles.checked=m.particles; els.kenBurns.checked=m.kenBurns; els.overlay.value=m.overlay; updateBgVisibility(); renderModels(); draw(0); els.status.textContent=`Модель «${m.name}» применена ✓` }
renderModels()
{
  const m=models.find(x=>x.id===currentModelId); if(m){ els.bgType.value=m.bg; if(m.bgColor) els.bgColor.value=m.bgColor; els.anim.value=m.anim; els.textColor.value=m.textColor; els.particles.checked=m.particles; els.kenBurns.checked=m.kenBurns; els.overlay.value=m.overlay }
}
updateBgVisibility(); applyFormat('16:9'); els.valTitleSize.textContent=els.titleSize.value; els.valSubSize.textContent=els.subSize.value; draw(0)
