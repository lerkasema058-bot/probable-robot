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
  dropOverlay: document.getElementById('dropOverlay'),
}

const ctx = els.canvas.getContext('2d')
let format = '16:9'
let bgImage = null
let previewAnim = null
let previewStart = null

const formats = {
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720, h: 1280 },
  '1:1': { w: 800, h: 800 },
}

const gradients = {
  gradient1: ['#ff512f', '#dd2476'], // sunset
  gradient2: ['#0093e9', '#80d0c7'], // ocean
  gradient3: ['#8a2be2', '#ff1493'], // neon
  gradient4: ['#0f5132', '#a3f7a3'], // forest
}

// === Модели: были «скоро появится» — теперь 6 рабочих стилей ===
const models = [
  { id:'classic', name:'Классика', desc:'Сбалансировано для любых видео', icon:'◐', grad:['#6366f1','#8b5cf6'], anim:'fadeScale', bg:'gradient2', textColor:'#ffffff', particles:true, kenBurns:false, overlay:0, tag:'Универсально', hint:'Плавное появление + мягкие частицы' },
  { id:'cinema', name:'Кино', desc:'Драма, глубокая виньетка', icon:'🎬', grad:['#1a1a22','#4a0a2a'], anim:'zoom', bg:'solid', bgColor:'#0f0a12', textColor:'#ffd6e0', particles:false, kenBurns:true, overlay:10, tag:'Кинематографично', hint:'Медленный зум + тёплый оттенок' },
  { id:'neon', name:'Неон', desc:'Ярко, энергично, для акций', icon:'⚡', grad:['#8a2be2','#ff1493'], anim:'zoom', bg:'gradient3', textColor:'#ffffff', particles:true, kenBurns:false, overlay:0, tag:'Промо', hint:'Зум + максимум блесток' },
  { id:'minimal', name:'Минимализм', desc:'Чисто, без эффектов', icon:'—', grad:['#f8fafc','#e2e8f0'], anim:'fadeScale', bg:'solid', bgColor:'#f8f9fb', textColor:'#111111', particles:false, kenBurns:false, overlay:0, tag:'Чисто', hint:'Без частиц, акцент на тексте' },
  { id:'typewriter', name:'Типографика', desc:'Печатная машинка', icon:'⌨', grad:['#0f172a','#334155'], anim:'typewriter', bg:'solid', bgColor:'#0b1220', textColor:'#38bdf8', particles:false, kenBurns:false, overlay:0, tag:'Текст', hint:'Печатает заголовок по буквам' },
  { id:'sale', name:'Распродажа', desc:'Для скидок и акций', icon:'%', grad:['#ff512f','#dd2476'], anim:'slideUp', bg:'gradient1', textColor:'#ffd600', particles:true, kenBurns:true, overlay:5, tag:'Конверсия', hint:'Выезд снизу + движение фона' },
]
let currentModelId = localStorage.getItem('pr-model') || 'classic'

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
  format = fmt
  const { w, h } = formats[fmt]
  els.canvas.width = w
  els.canvas.height = h
  els.fmtLabel.textContent = `${w}×${h} • ${fmt}`
  document.querySelectorAll('.fmt-btn').forEach(b => b.classList.toggle('active', b.dataset.fmt === fmt))
  // keep preview responsive
  els.canvas.style.width = fmt === '9:16' ? '340px' : fmt === '1:1' ? '380px' : '100%'
  els.canvas.style.maxWidth = '100%'
  draw(0)
}

function getState() {
  return {
    title: els.title.value || ' ',
    subtitle: els.subtitle.value || '',
    titleSize: +els.titleSize.value,
    subSize: +els.subSize.value,
    bgType: els.bgType.value,
    bgColor: els.bgColor.value,
    overlay: +els.overlay.value,
    anim: els.anim.value,
    duration: +els.duration.value,
    textColor: els.textColor.value,
    particles: els.particles.checked,
    kenBurns: els.kenBurns.checked,
    watermark: els.watermark.checked,
  }
}

function drawBackground(s, t) {
  const { w, h } = formats[format]
  let scale = 1
  if (s.kenBurns) scale = 1 + t * 0.06
  ctx.save()
  if (scale !== 1) {
    ctx.translate(w/2, h/2)
    ctx.scale(scale, scale)
    ctx.translate(-w/2, -h/2)
  }
  if (s.bgType === 'image' && bgImage) {
    const iw = bgImage.width, ih = bgImage.height
    const ratio = Math.max(w / iw, h / ih)
    const nw = iw * ratio, nh = ih * ratio
    ctx.drawImage(bgImage, (w - nw)/2, (h - nh)/2, nw, nh)
  } else if (s.bgType === 'solid') {
    ctx.fillStyle = s.bgColor
    ctx.fillRect(0,0,w,h)
  } else {
    const [c1,c2] = gradients[s.bgType] || gradients.gradient1
    const g = ctx.createLinearGradient(0,0,w,h)
    g.addColorStop(0,c1)
    g.addColorStop(1,c2)
    ctx.fillStyle = g
    ctx.fillRect(0,0,w,h)
    const vg = ctx.createRadialGradient(w/2,h/2, Math.min(w,h)*0.4, w/2,h/2, Math.max(w,h)*0.9)
    vg.addColorStop(0,'rgba(0,0,0,0)')
    vg.addColorStop(1,'rgba(0,0,0,0.35)')
    ctx.fillStyle = vg
    ctx.fillRect(0,0,w,h)
  }
  ctx.restore()
  if (s.overlay > 0) {
    ctx.fillStyle = `rgba(0,0,0,${s.overlay/100})`
    ctx.fillRect(0,0,w,h)
  }
  // модель Кино — дополнительное зерно
  const m = models.find(x=>x.id===currentModelId)
  if (m && m.id==='cinema') {
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let i=0;i<120;i++) {
      const x = (Math.sin(i*12.7 + t*5)*0.5+0.5)*w
      const y = (Math.random())*h
      ctx.fillRect(x,y,1,1)
    }
    // letterbox
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    const bar = h*0.06
    ctx.fillRect(0,0,w,bar)
    ctx.fillRect(0,h-bar,w,bar)
  }
  if (m && m.id==='neon') {
    // extra glow vignette
    const ng = ctx.createRadialGradient(w/2,h/2, w*0.1, w/2,h/2, w*0.9)
    ng.addColorStop(0,'rgba(255,20,147,0)')
    ng.addColorStop(1,'rgba(138,43,226,0.22)')
    ctx.fillStyle = ng
    ctx.fillRect(0,0,w,h)
  }
}

function particlesEffect(t) {
  const { w, h } = formats[format]
  const count = w > 900 ? 40 : 22
  for (let i=0;i<count;i++) {
    const x = (Math.sin(i*1.7 + t*0.6) * 0.5 + 0.5) * w
    const y = ( (i*0.13 + t*0.08) % 1) * h
    const r = (Math.sin(i)+1)*1.5 + 1
    const alpha = 0.35 + Math.sin(t*2 + i)*0.2
    ctx.beginPath()
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.arc(x, y, r, 0, Math.PI*2)
    ctx.fill()
  }
}

function wrapText(text, maxWidth) {
  const words = text.split(' ')
  let lines = [], line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function draw(tProgress) {
  // tProgress 0..1
  const s = getState()
  const { w, h } = formats[format]
  // background
  drawBackground(s, tProgress)

  if (s.particles) particlesEffect(tProgress)

  // animation factors
  let titleAlpha = 1, titleY = 0, titleScale = 1, subtitleAlpha = 1, charCount = Infinity
  const t = tProgress
  switch(s.anim) {
    case 'fadeScale':
      titleAlpha = Math.min(1, t*3)
      titleScale = 0.88 + titleAlpha*0.12
      subtitleAlpha = Math.min(1, Math.max(0, (t-0.25)*3))
      break
    case 'typewriter':
      charCount = Math.floor(t * s.title.length * 1.4)
      subtitleAlpha = t > 0.6 ? Math.min(1, (t-0.6)*4) : 0
      break
    case 'slideUp':
      titleY = (1 - Math.min(1, t*2.2)) * 60
      titleAlpha = Math.min(1, t*2.5)
      subtitleAlpha = Math.min(1, Math.max(0,(t-0.3)*2))
      break
    case 'zoom':
      titleScale = 0.7 + Math.min(1, t*2)*0.3 + t*0.03
      titleAlpha = Math.min(1, t*2.8)
      subtitleAlpha = Math.min(1, Math.max(0,(t-0.4)*2.5))
      break
    case 'none':
      break
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // title
  let titleText = s.title
  if (s.anim === 'typewriter') titleText = s.title.slice(0, charCount) + (charCount < s.title.length && Math.floor(Date.now()/400)%2 ? '|' : '')
  ctx.font = `800 ${s.titleSize}px Manrope, Inter, sans-serif`
  ctx.fillStyle = s.textColor
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6

  const maxW = w * 0.88
  let lines = wrapText(titleText, maxW)
  // adjust if too tall
  let lineH = s.titleSize * 1.08
  let totalH = lines.length * lineH
  // center vertically with offset for subtitle
  let centerY = h/2 - (s.subtitle ? 18 : 0)
  // For 9:16 make a bit higher
  if (format === '9:16') centerY = h*0.42
  let startY = centerY - totalH/2 + lineH/2 + titleY

  ctx.save()
  if (titleScale !== 1) {
    ctx.translate(w/2, centerY)
    ctx.scale(titleScale, titleScale)
    ctx.translate(-w/2, -centerY)
  }
  ctx.globalAlpha = titleAlpha
  lines.forEach((ln, i) => {
    ctx.fillText(ln, w/2, startY + i*lineH)
    // stroke for readability on light bg
    if (s.textColor === '#ffffff' || s.textColor === '#ffd600') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 2
      // ctx.strokeText(ln, w/2, startY + i*lineH)
    }
  })
  ctx.restore()

  // subtitle
  if (s.subtitle) {
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 3
    ctx.globalAlpha = subtitleAlpha
    ctx.font = `500 ${s.subSize}px Inter, sans-serif`
    ctx.fillStyle = s.textColor === '#ffffff' ? 'rgba(255,255,255,0.92)' : s.textColor
    // subtle pill background
    const subY = centerY + totalH/2 + 30
    const metrics = ctx.measureText(s.subtitle)
    const pillW = Math.min(metrics.width + 32, w*0.85)
    const pillH = s.subSize + 16
    // only draw pill if dark bg or light text for contrast
    if (s.bgType !== 'solid' || s.bgColor === '#0a0a0f') {
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      // rounded rect
      const x = w/2 - pillW/2, y = subY - pillH/2
      ctx.beginPath()
      ctx.roundRect(x, y, pillW, pillH, 999)
      ctx.fill()
      ctx.fillStyle = s.textColor
      ctx.globalAlpha = subtitleAlpha
    }
    ctx.fillText(s.subtitle, w/2, subY)
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  if (s.watermark) {
    ctx.font = `600 13px Inter, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'right'
    ctx.fillText('probable-robot • video', w - 18, h - 18)
    ctx.textAlign = 'center'
  }
}

let previewRaf = null
function playPreview() {
  if (previewRaf) cancelAnimationFrame(previewRaf)
  previewStart = performance.now()
  const dur = +els.duration.value * 1000
  const loop = (now) => {
    const p = Math.min(1, (now - previewStart) / dur)
    draw(p)
    els.timelineProgress.style.width = (p*100) + '%'
    if (p < 1) previewRaf = requestAnimationFrame(loop)
    else {
      els.timelineProgress.style.width = '100%'
      setTimeout(()=> { els.timelineProgress.style.width = '0%'; draw(0) }, 700)
    }
  }
  previewRaf = requestAnimationFrame(loop)
}

// init templates
const tplGrid = document.getElementById('tplGrid')
templates.forEach(t => {
  const el = document.createElement('div')
  el.className = 'tpl-card'
  const thumb = document.createElement('div')
  thumb.className = 'tpl-thumb'
  if (t.bgColor) thumb.style.background = t.bgColor
  else {
    const [c1,c2] = gradients[t.bg] || gradients.gradient1
    thumb.style.background = `linear-gradient(135deg, ${c1}, ${c2})`
  }
  thumb.style.color = t.color
  thumb.textContent = t.title
  const name = document.createElement('div')
  name.className = 'tpl-name'
  name.textContent = t.name
  el.append(thumb, name)
  el.onclick = () => {
    els.title.value = t.title
    els.subtitle.value = t.subtitle || ''
    els.bgType.value = t.bg
    if (t.bgColor) els.bgColor.value = t.bgColor
    if (t.anim) els.anim.value = t.anim
    if (t.color) els.textColor.value = t.color
    updateBgVisibility()
    draw(0)
  }
  tplGrid.appendChild(el)
})

function updateBgVisibility() {
  const v = els.bgType.value
  els.bgColorRow.style.display = v === 'solid' ? 'block' : 'none'
  els.bgImageRow.style.display = v === 'image' ? 'block' : 'none'
}

// events
['input','change'].forEach(ev => {
  els.title.addEventListener(ev, () => draw(0))
  els.subtitle.addEventListener(ev, () => draw(0))
})
els.titleSize.addEventListener('input', () => { els.valTitleSize.textContent = els.titleSize.value; draw(0) })
els.subSize.addEventListener('input', () => { els.valSubSize.textContent = els.subSize.value; draw(0) })
els.bgType.addEventListener('change', () => { updateBgVisibility(); draw(0) })
els.bgColor.addEventListener('input', () => draw(0))
els.overlay.addEventListener('input', () => draw(0))
els.anim.addEventListener('change', () => draw(0))
els.duration.addEventListener('input', () => { els.valDuration.textContent = els.duration.value; els.timelineEnd.textContent = els.duration.value + 'с'; draw(0) })
els.textColor.addEventListener('input', () => draw(0))
document.querySelectorAll('.chip').forEach(c => c.onclick = () => { els.textColor.value = c.dataset.color; draw(0) })
els.particles.addEventListener('change', () => draw(0))
els.kenBurns.addEventListener('change', () => draw(0))
els.watermark.addEventListener('change', () => draw(0))
document.querySelectorAll('.fmt-btn').forEach(b => b.onclick = () => applyFormat(b.dataset.fmt))

els.inpImage.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  loadImageFile(file)
})
function loadImageFile(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => { bgImage = img; els.bgType.value = 'image'; updateBgVisibility(); draw(0); els.status.textContent = 'Картинка загружена ✓' }
  img.src = url
}
// drag drop
els.canvasWrap.addEventListener('dragover', e => { e.preventDefault(); els.canvasWrap.classList.add('drag') })
els.canvasWrap.addEventListener('dragleave', () => els.canvasWrap.classList.remove('drag'))
els.canvasWrap.addEventListener('drop', e => {
  e.preventDefault(); els.canvasWrap.classList.remove('drag')
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) loadImageFile(file)
})

els.btnPlayPreview.onclick = playPreview

// Generate video
async function generateVideo() {
  const s = getState()
  if (!s.title.trim()) { els.status.textContent = 'Введи заголовок!'; return }

  const fps = 30
  const duration = s.duration
  const totalFrames = duration * fps

  els.btnGenerate.disabled = true
  els.btnGenerate.innerHTML = '<span class="btn-icon"></span> Запись...'
  els.status.textContent = 'Подготовка записи...'
  els.resultCard.style.display = 'none'

  // choose mime
  let mime = 'video/webm;codecs=vp9'
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp8'
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm'
  const stream = els.canvas.captureStream(fps)
  // try to get higher bitrate
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000 })
  const chunks = []
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise(res => recorder.onstop = res)
  recorder.start(100)

  const start = performance.now()
  let frame = 0
  function renderFrame() {
    const t = frame / totalFrames
    draw(t)
    els.timelineProgress.style.width = (t*100) + '%'
    els.status.textContent = `Запись... ${Math.round(t*100)}%`
    frame++
    if (frame <= totalFrames) {
      // schedule next frame at fps
      setTimeout(() => requestAnimationFrame(renderFrame), 1000/fps)
    } else {
      recorder.stop()
    }
  }
  requestAnimationFrame(renderFrame)

  await done
  const blob = new Blob(chunks, { type: mime })
  const url = URL.createObjectURL(blob)
  els.resultVideo.src = url
  els.downloadLink.href = url
  const safeTitle = s.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, '_').slice(0,30) || 'video'
  els.downloadLink.download = `${safeTitle}_${format}.webm`
  els.resultCard.style.display = 'block'
  els.status.textContent = `Готово! Размер: ${(blob.size/1024/1024).toFixed(2)} МБ • ${mime}`
  els.btnGenerate.disabled = false
  els.btnGenerate.innerHTML = '<span class="btn-icon"></span> Сгенерировать видео'
  els.timelineProgress.style.width = '0%'
  draw(0)
  // scroll to result on mobile
  els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

els.btnGenerate.onclick = generateVideo
document.getElementById('btnAgain').onclick = () => { els.resultCard.style.display='none'; els.status.textContent='' }

// modals
document.getElementById('btnHelp').onclick = () => document.getElementById('modalHelp').style.display='grid'
document.getElementById('btnExamples').onclick = () => document.querySelector('.templates').scrollIntoView({behavior:'smooth'})
document.querySelectorAll('[data-close]').forEach(el => el.onclick = () => document.getElementById('modalHelp').style.display='none')

// === Вкладки Генератор / Модель ===
function syncTabs() {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===document.body.dataset.tab))
  document.getElementById('tabGen').style.display = document.body.dataset.tab==='model' ? 'none' : 'block'
  document.getElementById('tabModel').style.display = document.body.dataset.tab==='model' ? 'block' : 'none'
}
document.body.dataset.tab = 'gen'
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click', ()=>{
  document.body.dataset.tab = b.dataset.tab
  syncTabs()
}))
syncTabs()

function renderModels(){
  const grid = document.getElementById('modelGrid')
  const badge = document.getElementById('modelBadge')
  const cur = document.getElementById('modelCurrent')
  grid.innerHTML = ''
  models.forEach(m=>{
    const card = document.createElement('button')
    card.type='button'
    card.className='model-card'+(m.id===currentModelId?' active':'')
    card.innerHTML = `
      <div class="model-card-top" style="background: linear-gradient(135deg, ${m.grad[0]}, ${m.grad[1]}); color:${m.textColor||'#fff'}">
        <div style="text-align:center">
          <div class="model-card-icon">${m.icon}</div>
          <div class="model-card-name">${m.name}</div>
        </div>
      </div>
      <div class="model-card-body">
        <div class="model-card-title">${m.name}</div>
        <div class="model-card-desc">${m.desc}</div>
        <span class="model-card-tag">${m.tag}</span>
      </div>`
    card.onclick = ()=> setModel(m.id)
    grid.appendChild(card)
  })
  const active = models.find(x=>x.id===currentModelId)
  if(active){ badge.textContent = active.name; cur.innerHTML = `<div class="model-current-dot"></div><div><b>${active.name}</b> — ${active.hint}<br><span>Анимация: ${active.anim} • фон: ${active.bg}</span></div>` }
}
function setModel(id){
  const m = models.find(x=>x.id===id)
  if(!m) return
  currentModelId = id
  localStorage.setItem('pr-model', id)
  // применить пресет к контрóлам (не трогаем заголовок пользователя)
  els.bgType.value = m.bg
  if(m.bgColor) els.bgColor.value = m.bgColor
  els.anim.value = m.anim
  els.textColor.value = m.textColor
  els.particles.checked = m.particles
  els.kenBurns.checked = m.kenBurns
  els.overlay.value = m.overlay
  updateBgVisibility()
  renderModels()
  draw(0)
  els.status.textContent = `Модель «${m.name}» применена ✓`
}
renderModels()
// применить сохранённую модель при старте (без перезаписи текста)
{
  const m = models.find(x=>x.id===currentModelId)
  if(m){ els.bgType.value=m.bg; if(m.bgColor) els.bgColor.value=m.bgColor; els.anim.value=m.anim; els.textColor.value=m.textColor; els.particles.checked=m.particles; els.kenBurns.checked=m.kenBurns; els.overlay.value=m.overlay }
}

// init
updateBgVisibility()
applyFormat('16:9')
els.valTitleSize.textContent = els.titleSize.value
els.valSubSize.textContent = els.subSize.value
draw(0)
