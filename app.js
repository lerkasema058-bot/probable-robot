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
  tabGen: document.getElementById('tabGen'),
  tabModel: document.getElementById('tabModel'),
  modelGrid: document.getElementById('modelGrid'),
  modelBadge: document.getElementById('modelBadge'),
  modelCurrent: document.getElementById('modelCurrent'),
}

const ctx = els.canvas.getContext('2d')

// ==== Совместимость: Safari < 16 и старые браузеры не знают ctx.roundRect ====
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = Math.min(typeof r === 'number' ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2)
    this.moveTo(x + radius, y)
    this.arcTo(x + w, y, x + w, y + h, radius)
    this.arcTo(x + w, y + h, x, y + h, radius)
    this.arcTo(x, y + h, x, y, radius)
    this.arcTo(x, y, x + w, y, radius)
    this.closePath()
    return this
  }
}

// Любая ошибка рисования не должна «тихо убивать» кнопки — показываем её пользователю.
function safeDraw(t) {
  try {
    draw(t)
    return true
  } catch (err) {
    console.error(err)
    if (els.status) els.status.textContent = 'Ошибка отрисовки: ' + err.message
    return false
  }
}
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

// ==== localStorage может кидать ошибку (приватный режим, iframe с opaque origin) ====
const store = {
  get(key) { try { return localStorage.getItem(key) } catch { return null } },
  set(key, val) { try { localStorage.setItem(key, val) } catch {} },
}

// ==== Модели — пресеты стиля ====
const models = [
  { id: 'classic', name: 'Классика', icon: '◐', tag: 'Универсально', desc: 'Плавное появление и мягкие частицы', hint: 'Плавное появление + мягкие частицы', grad: ['#6366f1', '#8b5cf6'],
    bg: 'gradient2', anim: 'fadeScale', textColor: '#ffffff', particles: true, kenBurns: false, overlay: 0 },
  { id: 'cinema', name: 'Кино', icon: '🎬', tag: 'Кинематографично', desc: 'Глубокий фон, зерно плёнки, чёрные полосы', hint: 'Зум + зерно плёнки + letterbox', grad: ['#1a1a22', '#4a0a2a'],
    bg: 'solid', bgColor: '#0f0a12', anim: 'zoom', textColor: '#ffe3ea', particles: false, kenBurns: true, overlay: 18, grain: true, letterbox: true },
  { id: 'neon', name: 'Неон', icon: '⚡', tag: 'Промо', desc: 'Яркий градиент, зум и блеск', hint: 'Зум + максимум блесток', grad: ['#8a2be2', '#ff1493'],
    bg: 'gradient3', anim: 'zoom', textColor: '#ffffff', particles: true, kenBurns: false, overlay: 0 },
  { id: 'minimal', name: 'Минимализм', icon: '—', tag: 'Чисто', desc: 'Светлый фон, без частиц', hint: 'Без частиц, акцент на тексте', grad: ['#f8fafc', '#e2e8f0'],
    bg: 'solid', bgColor: '#f4f5f8', anim: 'fadeScale', textColor: '#111111', particles: false, kenBurns: false, overlay: 0 },
  { id: 'typewriter', name: 'Типографика', icon: '⌨', tag: 'Текст', desc: 'Печатает заголовок по буквам', hint: 'Печатная машинка', grad: ['#0f172a', '#334155'],
    bg: 'solid', bgColor: '#0b1220', anim: 'typewriter', textColor: '#38bdf8', particles: false, kenBurns: false, overlay: 0 },
  { id: 'sale', name: 'Распродажа', icon: '%', tag: 'Конверсия', desc: 'Закат, выезд снизу, движение фона', hint: 'Выезд снизу + движение фона', grad: ['#ff512f', '#dd2476'],
    bg: 'gradient1', anim: 'slideUp', textColor: '#ffd600', particles: true, kenBurns: true, overlay: 5 },
]

let currentModelId = store.get('pr-model') || 'classic'
if (!models.some(m => m.id === currentModelId)) currentModelId = 'classic'
const getModel = () => models.find(m => m.id === currentModelId) || models[0]

// ==== Зерно плёнки: одна шумовая плитка, дальше — pattern ====
let grainTile = null
function getGrainTile() {
  if (grainTile) return grainTile
  const size = 160
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const data = g.createImageData(size, size)
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 120 + Math.random() * 135
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v
    data.data[i + 3] = 255
  }
  g.putImageData(data, 0, 0)
  grainTile = c
  return c
}
function drawGrain(t, strength = 0.12) {
  const { w, h } = formats[format]
  const pattern = ctx.createPattern(getGrainTile(), 'repeat')
  if (!pattern) return
  ctx.save()
  ctx.globalAlpha = strength
  ctx.globalCompositeOperation = 'overlay'
  // сдвигаем плитку, чтобы зерно «шевелилось» от кадра к кадру
  const ox = (t * 977) % 160
  const oy = (t * 613) % 160
  ctx.translate(-ox, -oy)
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, w + 200, h + 200)
  ctx.restore()
}

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
  safeDraw(0)
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
  // Ken Burns scale
  let scale = 1
  if (s.kenBurns) scale = 1 + t * 0.06 // slowly zoom in
  ctx.save()
  if (scale !== 1) {
    ctx.translate(w/2, h/2)
    ctx.scale(scale, scale)
    ctx.translate(-w/2, -h/2)
  }

  if (s.bgType === 'image' && bgImage) {
    // cover
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
    // add subtle vignette
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
  const model = getModel()
  if (model.grain) s.grain = true
  if (model.letterbox) s.letterbox = true
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

  if (s.grain) drawGrain(tProgress, 0.16)
  if (s.letterbox) {
    const bar = Math.round(h * 0.075)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, bar)
    ctx.fillRect(0, h - bar, w, bar)
  }

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
    safeDraw(p)
    els.timelineProgress.style.width = (p*100) + '%'
    if (p < 1) previewRaf = requestAnimationFrame(loop)
    else {
      els.timelineProgress.style.width = '100%'
      setTimeout(()=> { els.timelineProgress.style.width = '0%'; safeDraw(0) }, 700)
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
    safeDraw(0)
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
  els.title.addEventListener(ev, () => safeDraw(0))
  els.subtitle.addEventListener(ev, () => safeDraw(0))
})
els.titleSize.addEventListener('input', () => { els.valTitleSize.textContent = els.titleSize.value; safeDraw(0) })
els.subSize.addEventListener('input', () => { els.valSubSize.textContent = els.subSize.value; safeDraw(0) })
els.bgType.addEventListener('change', () => { updateBgVisibility(); safeDraw(0) })
els.bgColor.addEventListener('input', () => safeDraw(0))
els.overlay.addEventListener('input', () => safeDraw(0))
els.anim.addEventListener('change', () => safeDraw(0))
els.duration.addEventListener('input', () => { els.valDuration.textContent = els.duration.value; els.timelineEnd.textContent = els.duration.value + 'с'; safeDraw(0) })
els.textColor.addEventListener('input', () => safeDraw(0))
document.querySelectorAll('.chip').forEach(c => c.onclick = () => { els.textColor.value = c.dataset.color; safeDraw(0) })
els.particles.addEventListener('change', () => safeDraw(0))
els.kenBurns.addEventListener('change', () => safeDraw(0))
els.watermark.addEventListener('change', () => safeDraw(0))
document.querySelectorAll('.fmt-btn').forEach(b => b.onclick = () => applyFormat(b.dataset.fmt))

els.inpImage.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  loadImageFile(file)
})
function loadImageFile(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => { bgImage = img; els.bgType.value = 'image'; updateBgVisibility(); safeDraw(0); els.status.textContent = 'Картинка загружена ✓' }
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
function resetGenerateBtn() {
  els.btnGenerate.disabled = false
  els.btnGenerate.innerHTML = '<span class="btn-icon">●</span> Сгенерировать видео'
}

function pickMime() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
  ]
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null
  return candidates.find(m => {
    try { return MediaRecorder.isTypeSupported(m) } catch { return false }
  }) || null
}

async function generateVideo() {
  const s = getState()
  if (!s.title.trim()) { els.status.textContent = 'Введи заголовок!'; return }

  // Проверяем возможности браузера ДО записи, чтобы не зависнуть в «Запись... 0%»
  if (typeof MediaRecorder === 'undefined' || typeof els.canvas.captureStream !== 'function') {
    els.status.textContent = 'Этот браузер не умеет записывать видео с canvas. Открой в Chrome, Edge, Firefox или Safari 15+.'
    return
  }
  const mime = pickMime()
  if (!mime) {
    els.status.textContent = 'Браузер не поддерживает запись видео. Попробуй Chrome / Firefox / Safari.'
    return
  }

  const fps = 30
  const duration = s.duration
  const totalFrames = Math.round(duration * fps)
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm'

  els.btnGenerate.disabled = true
  els.btnGenerate.innerHTML = '<span class="btn-icon">●</span> Запись...'
  els.status.textContent = 'Подготовка записи...'
  els.resultCard.style.display = 'none'

  let stream = null
  let recorder = null
  try {
    stream = els.canvas.captureStream(fps)
    // Safari игнорирует битрейт в webm, но с mp4 он полезен
    const opts = { videoBitsPerSecond: 5000000 }
    try { recorder = new MediaRecorder(stream, { mimeType: mime, ...opts }) }
    catch { recorder = new MediaRecorder(stream) }

    const chunks = []
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    const done = new Promise((resolve, reject) => {
      recorder.onstop = resolve
      recorder.onerror = e => reject(e.error || new Error('Ошибка записи'))
    })
    recorder.start(100)

    let frame = 0
    await new Promise(resolve => {
      function renderFrame() {
        if (frame > totalFrames) return resolve()
        const t = Math.min(1, frame / totalFrames)
        safeDraw(t)
        els.timelineProgress.style.width = (t * 100) + '%'
        els.status.textContent = `Запись... ${Math.round(t * 100)}%`
        frame++
        setTimeout(() => requestAnimationFrame(renderFrame), 1000 / fps)
      }
      requestAnimationFrame(renderFrame)
    })

    // даём рекордеру дослать последние данные, но не ждём вечно
    if (recorder.state !== 'inactive') recorder.stop()
    await Promise.race([done, new Promise(r => setTimeout(r, 3000))])

    if (!chunks.length) throw new Error('пустой файл — браузер не записал ни одного кадра')
    const blob = new Blob(chunks, { type: mime.split(';')[0] })
    const url = URL.createObjectURL(blob)
    els.resultVideo.src = url
    els.downloadLink.href = url
    const safeTitle = s.title.replace(/[^a-zA-Z0-9а-яА-ЯЁё]+/g, '_').slice(0, 30) || 'video'
    els.downloadLink.download = `${safeTitle}_${format.replace(':', '-')}.${ext}`
    els.resultCard.style.display = 'block'
    els.status.textContent = `Готово! ${(blob.size / 1024 / 1024).toFixed(2)} МБ • ${ext}`
    els.timelineProgress.style.width = '0%'
    safeDraw(0)
    try { els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } catch {}
  } catch (err) {
    console.error(err)
    els.status.textContent = 'Не получилось записать видео: ' + (err && err.message ? err.message : err) +
      '. Попробуй Chrome/Firefox или уменьши длительность.'
  } finally {
    try { if (stream) stream.getTracks().forEach(t => t.stop()) } catch {}
    resetGenerateBtn()
  }
}

els.btnGenerate.onclick = generateVideo
document.getElementById('btnAgain').onclick = () => { els.resultCard.style.display='none'; els.status.textContent='' }

// modals
document.getElementById('btnHelp').onclick = () => document.getElementById('modalHelp').style.display='grid'
document.getElementById('btnExamples').onclick = () => document.querySelector('.templates').scrollIntoView({behavior:'smooth'})
document.querySelectorAll('[data-close]').forEach(el => el.onclick = () => document.getElementById('modalHelp').style.display='none')

// ==== Вкладки левой панели: Текст / Модель ====
let activeTab = 'gen'
function syncTabs() {
  document.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.dataset.tab === activeTab
    b.classList.toggle('active', on)
    b.setAttribute('aria-selected', on ? 'true' : 'false')
  })
  els.tabGen.style.display = activeTab === 'gen' ? 'block' : 'none'
  els.tabModel.style.display = activeTab === 'model' ? 'block' : 'none'
  if (activeTab === 'model') renderModels()
}
document.querySelectorAll('.tab-btn').forEach(b => {
  b.addEventListener('click', () => { activeTab = b.dataset.tab; syncTabs() })
})

// ==== Модели ====
function renderModels() {
  const active = getModel()
  els.modelGrid.innerHTML = ''
  models.forEach(m => {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'model-card' + (m.id === currentModelId ? ' active' : '')
    card.dataset.model = m.id
    card.innerHTML = `
      <div class="model-card-top" style="background:linear-gradient(135deg,${m.grad[0]},${m.grad[1]});color:${m.textColor}">
        <div class="model-card-icon">${m.icon}</div>
      </div>
      <div class="model-card-body">
        <div class="model-card-title">${m.name}</div>
        <div class="model-card-desc">${m.desc}</div>
        <span class="model-card-tag">${m.tag}</span>
      </div>`
    card.addEventListener('click', () => setModel(m.id))
    els.modelGrid.appendChild(card)
  })
  els.modelBadge.textContent = active.name
  els.modelCurrent.innerHTML = `<div class="model-current-dot"></div>
    <div><b>${active.name}</b> — ${active.hint}</div>`
}

function setModel(id) {
  const m = models.find(x => x.id === id)
  if (!m) return
  currentModelId = id
  store.set('pr-model', id)
  els.bgType.value = m.bg
  if (m.bgColor) els.bgColor.value = m.bgColor
  els.anim.value = m.anim
  els.textColor.value = m.textColor
  els.particles.checked = m.particles
  els.kenBurns.checked = m.kenBurns
  els.overlay.value = m.overlay
  updateBgVisibility()
  renderModels()
  safeDraw(0)
  els.status.textContent = `Модель «${m.name}» применена ✓`
}

// init
updateBgVisibility()
applyFormat('16:9')
els.valTitleSize.textContent = els.titleSize.value
els.valSubSize.textContent = els.subSize.value
renderModels()
syncTabs()
safeDraw(0)
