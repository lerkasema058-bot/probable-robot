import { previewMusic, stopPreviewMusic } from './src/audio.js'
import {
  cartoonChars,
  formats,
  gradients,
  kidsBackgrounds,
  kidsTemplates,
  models,
  realisticChars,
  stickers,
  templates,
} from './src/data.js'
import { recordCanvasVideo } from './src/recorder.js'
import { renderScene } from './src/renderer.js'
import {
  STORAGE_KEYS,
  safeGetItem,
  safeParseJSON,
  safeRemoveItem,
  safeSetItem,
  serializeCharacters,
  validateProject,
} from './src/storage.js'
import {
  clamp,
  downscaleImageFile,
  isSafeImageDataUrl,
  normalizeCharacter,
  normalizeStroke,
  safeFilename,
  sanitizeText,
  syncCharactersToFormat,
  syncStrokesToFormat,
} from './src/utils.js'

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
  confetti: document.getElementById('inpConfetti'),
  bubbles: document.getElementById('inpBubbles'),
  speech: document.getElementById('inpSpeech'),
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
  activeKidsBgBanner: document.getElementById('activeKidsBgBanner'),
}

const ctx = els.canvas.getContext('2d')

const savedFormat = safeGetItem(STORAGE_KEYS.format, '16:9')
let format = formats[savedFormat] ? savedFormat : '16:9'
let bgImage = null
let bgImageSrc = null
let bgImageLoadToken = 0
let lastVideoObjectUrl = null
let isRecording = false
let previewRaf = null
let previewResetTimer = null
let autosaveTimer = null

let currentModelId = safeGetItem(STORAGE_KEYS.model, 'classic')
if (!models.some((m) => m.id === currentModelId)) currentModelId = 'classic'

let kidsStyle = safeGetItem(STORAGE_KEYS.kidsStyle, 'cartoon')
if (kidsStyle !== 'cartoon' && kidsStyle !== 'realistic') kidsStyle = 'cartoon'

const rawKidsBg = safeGetItem(STORAGE_KEYS.kidsBg, '')
let activeKidsBgId = kidsBackgrounds.some((b) => b.id === rawKidsBg) ? rawKidsBg : null

const initialDims = formats[format]
const parsedChars = safeParseJSON(safeGetItem(STORAGE_KEYS.chars, '[]'), [])
let characters = Array.isArray(parsedChars)
  ? parsedChars.map((c) => normalizeCharacter(c, initialDims)).filter(Boolean)
  : []

const parsedStrokes = safeParseJSON(safeGetItem(STORAGE_KEYS.strokes, '[]'), [])
let strokes = Array.isArray(parsedStrokes)
  ? parsedStrokes.map((s) => normalizeStroke(s, initialDims)).filter(Boolean)
  : []

let selectedCharId = null
let isDrawMode = false
let currentStroke = null
let drawColor = safeGetItem(STORAGE_KEYS.drawColor, '#ff2d55')
let drawSize = clamp(Number(safeGetItem(STORAGE_KEYS.drawSize, '6')) || 6, 2, 24)

function notifyStorageIssue(res) {
  if (!res || res.ok) return
  if (res.quota) {
    els.status.textContent =
      'Память браузера заполнена — скачай проект в .json, чтобы не потерять фото'
  }
}

function reviveChars() {
  characters.forEach((c) => {
    if (c.isPhoto && isSafeImageDataUrl(c.imgSrc) && !c._img) {
      const im = new Image()
      im.onload = () => draw(0)
      im.src = c.imgSrc
      c._img = im
    }
  })
  renderPhotoThumbs()
}

function renderPhotoThumbs() {
  const thumbs = document.getElementById('photoThumbs')
  if (!thumbs) return
  thumbs.replaceChildren()
  characters
    .filter((c) => c.isPhoto && isSafeImageDataUrl(c.imgSrc))
    .forEach((c) => {
      const box = document.createElement('button')
      box.type = 'button'
      box.title = `Выбрать ${c.name}`
      box.style.cssText =
        'width:48px;height:48px;border-radius:10px;overflow:hidden;border:2px solid var(--border);background:#0f0f13;padding:0;cursor:pointer'
      const img = document.createElement('img')
      img.src = c.imgSrc
      img.alt = c.name
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block'
      box.appendChild(img)
      box.onclick = () => {
        selectedCharId = c.id
        renderKidsSelected()
        draw(0)
      }
      thumbs.appendChild(box)
    })
}

function saveKids() {
  safeSetItem(STORAGE_KEYS.kidsStyle, kidsStyle)
  safeSetItem(STORAGE_KEYS.kidsBg, activeKidsBgId || '')
  safeSetItem(STORAGE_KEYS.format, format)
  notifyStorageIssue(
    safeSetItem(STORAGE_KEYS.chars, JSON.stringify(serializeCharacters(characters)))
  )
  notifyStorageIssue(safeSetItem(STORAGE_KEYS.strokes, JSON.stringify(strokes)))
  scheduleAutosave()
}

function saveDraw() {
  notifyStorageIssue(safeSetItem(STORAGE_KEYS.strokes, JSON.stringify(strokes)))
  scheduleAutosave()
}

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    const res = safeSetItem(STORAGE_KEYS.draft, JSON.stringify(collectProject()))
    if (res.ok) {
      safeSetItem(STORAGE_KEYS.draftTime, new Date().toISOString())
    } else {
      notifyStorageIssue(res)
    }
  }, 1200)
}

function getSceneState() {
  return {
    title: els.title.value || ' ',
    subtitle: els.subtitle.value || '',
    titleSize: Number(els.titleSize.value) || 68,
    subSize: Number(els.subSize.value) || 24,
    bgType: els.bgType.value,
    bgColor: els.bgColor.value,
    bgImage,
    overlay: Number(els.overlay.value) || 0,
    anim: els.anim.value,
    duration: Number(els.duration.value) || 4,
    textColor: els.textColor.value,
    particles: Boolean(els.particles?.checked),
    kenBurns: Boolean(els.kenBurns?.checked),
    watermark: Boolean(els.watermark?.checked),
    confetti: Boolean(els.confetti?.checked),
    bubbles: Boolean(els.bubbles?.checked),
    speech: Boolean(els.speech?.checked),
    format,
    modelId: currentModelId,
    kidsStyle,
    activeKidsBgId,
    characters,
    selectedCharId,
    strokes,
    currentStroke,
  }
}

function draw(tProgress = 0, options = {}) {
  renderScene(ctx, getSceneState(), tProgress, options)
}

function updateCharacterPixelPos(ch, x, y) {
  const { w, h } = formats[format]
  ch.nx = clamp(x / w, 0.02, 0.98)
  ch.ny = clamp(y / h, 0.02, 0.98)
  ch.x = ch.nx * w
  ch.y = ch.ny * h
}

function updateCharacterPixelSize(ch, newSize) {
  const { w, h } = formats[format]
  const minDim = Math.min(w, h)
  const clamped = clamp(newSize, 36, 260)
  ch.nSize = clamp(clamped / minDim, 0.05, 0.4)
  ch.size = Math.round(ch.nSize * minDim)
}

function addChar(emoji, name, isSticker = false) {
  const dims = formats[format]
  const minDim = Math.min(dims.w, dims.h)
  const baseSize = dims.w > 900 ? 120 : 90
  const nx = clamp(0.5 + (Math.random() - 0.5) * 0.4, 0.1, 0.9)
  const ny = clamp(0.55 + (Math.random() - 0.5) * 0.3, 0.15, 0.88)
  const nSize = clamp(baseSize / minDim, 0.05, 0.4)
  const ch = normalizeCharacter(
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      name,
      nx,
      ny,
      nSize,
      rot: (Math.random() - 0.5) * 0.2,
      isSticker,
    },
    dims
  )
  characters.push(ch)
  selectedCharId = ch.id
  saveKids()
  renderKidsSelected()
  draw(0)
  els.status.textContent = `${emoji} добавлен — тащи на сцене!`
}

async function addPhotoChar(file) {
  try {
    els.status.textContent = 'Обрабатываю фото...'
    const { dataUrl, img } = await downscaleImageFile(file, 480, 0.82)
    const dims = formats[format]
    const minDim = Math.min(dims.w, dims.h)
    const baseSize = dims.w > 900 ? 140 : 110
    const rawName = sanitizeText(file.name.replace(/\.[^.]+$/, ''), 16, 'Фото')
    const ch = normalizeCharacter(
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: rawName,
        emoji: '📸',
        nx: 0.5,
        ny: 0.5,
        nSize: clamp(baseSize / minDim, 0.05, 0.4),
        rot: 0,
        isPhoto: true,
        imgSrc: dataUrl,
      },
      dims
    )
    ch._img = img
    characters.push(ch)
    selectedCharId = ch.id
    saveKids()
    renderPhotoThumbs()
    renderKidsSelected()
    draw(0)
    els.status.textContent = 'Фото добавлено ✓ Перетаскивай на сцене!'
  } catch (err) {
    els.status.textContent = `Ошибка загрузки фото: ${err.message}`
  }
}

function removeChar(id) {
  characters = characters.filter((c) => c.id !== id)
  if (selectedCharId === id) selectedCharId = null
  saveKids()
  renderPhotoThumbs()
  renderKidsSelected()
  draw(0)
}

function applyFormat(fmt) {
  if (!formats[fmt]) return
  format = fmt
  const dims = formats[fmt]
  characters = syncCharactersToFormat(characters, dims)
  strokes = syncStrokesToFormat(strokes, dims)

  els.canvas.width = dims.w
  els.canvas.height = dims.h
  els.fmtLabel.textContent = `${dims.w}×${dims.h} • ${fmt}`
  document.querySelectorAll('.fmt-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.fmt === fmt)
  })
  els.canvas.style.width = fmt === '9:16' ? '340px' : fmt === '1:1' ? '380px' : '100%'
  saveKids()
  renderKidsSelected()
  draw(0)
}

function cancelPreview() {
  if (previewRaf) {
    cancelAnimationFrame(previewRaf)
    previewRaf = null
  }
  if (previewResetTimer) {
    clearTimeout(previewResetTimer)
    previewResetTimer = null
  }
}

function playPreview() {
  if (isRecording) return
  cancelPreview()
  const start = performance.now()
  const dur = (Number(els.duration.value) || 4) * 1000
  const loop = (now) => {
    const p = Math.min(1, (now - start) / dur)
    draw(p)
    els.timelineProgress.style.width = `${p * 100}%`
    if (p < 1) {
      previewRaf = requestAnimationFrame(loop)
    } else {
      previewRaf = null
      els.timelineProgress.style.width = '100%'
      previewResetTimer = setTimeout(() => {
        els.timelineProgress.style.width = '0%'
        draw(0)
      }, 700)
    }
  }
  previewRaf = requestAnimationFrame(loop)
}

function updateBgVisibility() {
  const v = els.bgType.value
  els.bgColorRow.style.display = v === 'solid' ? 'block' : 'none'
  els.bgImageRow.style.display = v === 'image' ? 'block' : 'none'
  if (els.activeKidsBgBanner) {
    els.activeKidsBgBanner.style.display = activeKidsBgId ? 'flex' : 'none'
  }
}

function clearKidsBgIfActive() {
  if (activeKidsBgId) {
    activeKidsBgId = null
    safeRemoveItem(STORAGE_KEYS.kidsBg)
    renderKids()
    updateBgVisibility()
  }
}

function buildTemplateCard(t, onAfterApply) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'tpl-card'
  const thumb = document.createElement('div')
  thumb.className = 'tpl-thumb'
  if (t.bgColor) {
    thumb.style.background = t.bgColor
  } else {
    const [c1, c2] = gradients[t.bg] || gradients.gradient1
    thumb.style.background = `linear-gradient(135deg,${c1},${c2})`
  }
  thumb.style.color = t.color
  thumb.textContent = t.title

  const name = document.createElement('div')
  name.className = 'tpl-name'
  name.textContent = t.name
  btn.append(thumb, name)

  btn.onclick = () => {
    els.title.value = t.title
    els.subtitle.value = t.subtitle || ''
    els.bgType.value = t.bg
    if (t.bgColor) els.bgColor.value = t.bgColor
    if (t.anim) els.anim.value = t.anim
    if (t.color) els.textColor.value = t.color
    activeKidsBgId = null
    safeRemoveItem(STORAGE_KEYS.kidsBg)
    updateBgVisibility()
    saveKids()
    renderKids()
    draw(0)
    els.status.textContent = `Шаблон «${t.name}» применён ✓`
    if (onAfterApply) onAfterApply()
  }
  return btn
}

function buildKidsTemplateBtn(t, onAfterApply) {
  const btn = document.createElement('button')
  btn.className = 'kids-tpl-btn'
  btn.type = 'button'

  const iconBox = document.createElement('div')
  iconBox.className = 'kids-tpl-emoji'
  iconBox.textContent = t.icon

  const textWrap = document.createElement('div')
  const titleEl = document.createElement('div')
  titleEl.className = 'kids-tpl-title'
  titleEl.textContent = t.name
  const subEl = document.createElement('div')
  subEl.className = 'kids-tpl-sub'
  subEl.textContent = `${t.title} — ${t.subtitle.slice(0, 30)}`
  textWrap.append(titleEl, subEl)
  btn.append(iconBox, textWrap)

  btn.onclick = () => {
    kidsStyle = t.style
    activeKidsBgId = t.bg
    els.title.value = t.title
    els.subtitle.value = t.subtitle
    const dims = formats[format]
    const minDim = Math.min(dims.w, dims.h)
    const baseSize = dims.w > 900 ? 110 : 80
    characters = t.chars.map((emoji, i) =>
      normalizeCharacter(
        {
          id: `${Date.now()}_${i}`,
          emoji,
          name: emoji,
          nx: 0.25 + i * 0.22,
          ny: 0.62 + (i % 2 ? -0.04 : 0.02),
          nSize: baseSize / minDim,
          rot: 0,
        },
        dims
      )
    )
    selectedCharId = null
    updateBgVisibility()
    saveKids()
    renderPhotoThumbs()
    renderKids()
    draw(0)
    document.body.dataset.tab = 'kids'
    syncTabs()
    els.status.textContent = `История «${t.name}» загружена — нажимай Сгенерировать!`
    if (onAfterApply) onAfterApply()
  }
  return btn
}

function renderTemplateLists() {
  const tplGrid = document.getElementById('tplGrid')
  const modalTplGrid = document.getElementById('modalTplGrid')
  const kidsTplList = document.getElementById('kidsTplList')
  const modalKidsTplList = document.getElementById('modalKidsTplList')

  if (tplGrid) {
    tplGrid.replaceChildren(...templates.map((t) => buildTemplateCard(t)))
  }
  if (modalTplGrid) {
    modalTplGrid.replaceChildren(
      ...templates.map((t) => buildTemplateCard(t, () => closeModal('modalTemplates')))
    )
  }
  if (kidsTplList) {
    kidsTplList.replaceChildren(...kidsTemplates.map((t) => buildKidsTemplateBtn(t)))
  }
  if (modalKidsTplList) {
    modalKidsTplList.replaceChildren(
      ...kidsTemplates.map((t) => buildKidsTemplateBtn(t, () => closeModal('modalTemplates')))
    )
  }
}

async function loadImageFile(file) {
  try {
    const { dataUrl, img } = await downscaleImageFile(file, 1440, 0.86)
    bgImageLoadToken++
    bgImage = img
    bgImageSrc = dataUrl
    els.bgType.value = 'image'
    clearKidsBgIfActive()
    updateBgVisibility()
    scheduleAutosave()
    draw(0)
    els.status.textContent = 'Картинка фона загружена ✓'
  } catch (err) {
    els.status.textContent = `Не удалось загрузить картинку: ${err.message}`
  }
}

function renderKids() {
  const bgGrid = document.getElementById('kidsBgGrid')
  const charGrid = document.getElementById('kidsCharGrid')
  const stickerGrid = document.getElementById('kidsStickerGrid')
  if (!bgGrid || !charGrid || !stickerGrid) return

  bgGrid.replaceChildren()
  charGrid.replaceChildren()
  stickerGrid.replaceChildren()

  const bgs = kidsBackgrounds.filter((b) => b.mode === kidsStyle)
  bgs.forEach((bg) => {
    const card = document.createElement('button')
    card.className = `kids-bg-card${activeKidsBgId === bg.id ? ' active' : ''}`
    card.type = 'button'

    const thumb = document.createElement('div')
    thumb.className = 'kids-bg-thumb'
    thumb.style.background = `linear-gradient(135deg, ${bg.grad[0]}, ${bg.grad[1]})`
    thumb.textContent = `${bg.icon} ${bg.name}`

    const name = document.createElement('div')
    name.className = 'kids-bg-name'
    name.textContent = `${bg.mode === 'cartoon' ? 'Мульт' : 'Реал'} • ${bg.name}`

    card.append(thumb, name)
    card.onclick = () => {
      activeKidsBgId = bg.id
      updateBgVisibility()
      saveKids()
      renderKids()
      draw(0)
      els.status.textContent = `Фон «${bg.name}» выбран ✓`
    }
    bgGrid.appendChild(card)
  })

  const chars = kidsStyle === 'cartoon' ? cartoonChars : realisticChars
  chars.forEach((c) => {
    const btn = document.createElement('button')
    btn.className = 'kids-char-btn'
    btn.type = 'button'

    const em = document.createElement('div')
    em.className = 'kids-char-emoji'
    em.textContent = c.emoji
    const nm = document.createElement('div')
    nm.className = 'kids-char-name'
    nm.textContent = c.name
    btn.append(em, nm)
    btn.onclick = () => addChar(c.emoji, c.name, false)
    charGrid.appendChild(btn)
  })

  stickers.forEach((s) => {
    const btn = document.createElement('button')
    btn.className = 'kids-char-btn'
    btn.type = 'button'

    const em = document.createElement('div')
    em.className = 'kids-char-emoji'
    em.textContent = s.emoji
    const nm = document.createElement('div')
    nm.className = 'kids-char-name'
    nm.textContent = s.name
    btn.append(em, nm)
    btn.onclick = () => addChar(s.emoji, s.name, true)
    stickerGrid.appendChild(btn)
  })

  renderKidsSelected()
  document.querySelectorAll('.style-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.style === kidsStyle)
  })

  const activeModel = models.find((m) => m.id === currentModelId)?.name || 'Классика'
  els.toolbarStyle.textContent = `${kidsStyle === 'cartoon' ? 'Мультяшный' : 'Реалистичный'} • ${activeModel}`
  const bgHint = document.getElementById('kidsBgHint')
  if (bgHint) {
    bgHint.textContent = activeKidsBgId
      ? kidsBackgrounds.find((b) => b.id === activeKidsBgId)?.name || 'выбери фон'
      : 'выбери фон'
  }
}

function renderKidsSelected() {
  const sec = document.getElementById('kidsSelectedSection')
  const list = document.getElementById('selectedList')
  const count = document.getElementById('kidsCount')
  if (!sec || !list || !count) return

  if (characters.length === 0) {
    sec.style.display = 'none'
    return
  }

  sec.style.display = 'block'
  count.textContent = String(characters.length)
  list.replaceChildren()

  characters.forEach((ch) => {
    const row = document.createElement('div')
    row.className = `selected-item${ch.id === selectedCharId ? ' selected' : ''}`

    // Safe DOM construction instead of innerHTML to prevent XSS from imported JSON / filenames
    const avatarWrap = document.createElement('div')
    avatarWrap.className = 'selected-item-emoji'
    if (ch.isPhoto && isSafeImageDataUrl(ch.imgSrc)) {
      const img = document.createElement('img')
      img.src = ch.imgSrc
      img.alt = ch.name
      img.style.cssText =
        'width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--border)'
      avatarWrap.appendChild(img)
    } else {
      avatarWrap.textContent = ch.emoji
    }

    const info = document.createElement('div')
    info.className = 'selected-item-info'
    const titleEl = document.createElement('div')
    titleEl.className = 'selected-item-title'
    titleEl.textContent = ch.name
    const subEl = document.createElement('div')
    subEl.className = 'selected-item-sub'
    subEl.textContent = `x:${Math.round(ch.x)} y:${Math.round(ch.y)} • ${ch.size}px`
    info.append(titleEl, subEl)

    const actions = document.createElement('div')
    actions.className = 'selected-item-actions'

    const inc = document.createElement('button')
    inc.type = 'button'
    inc.className = 'icon-btn'
    inc.textContent = '+'
    inc.ariaLabel = `Увеличить ${ch.name}`
    inc.title = 'Увеличить'
    inc.onclick = () => {
      updateCharacterPixelSize(ch, ch.size + 12)
      saveKids()
      renderKidsSelected()
      draw(0)
    }

    const dec = document.createElement('button')
    dec.type = 'button'
    dec.className = 'icon-btn'
    dec.textContent = '−'
    dec.ariaLabel = `Уменьшить ${ch.name}`
    dec.title = 'Уменьшить'
    dec.onclick = () => {
      updateCharacterPixelSize(ch, ch.size - 12)
      saveKids()
      renderKidsSelected()
      draw(0)
    }

    const del = document.createElement('button')
    del.type = 'button'
    del.className = 'icon-btn'
    del.textContent = '✕'
    del.ariaLabel = `Удалить ${ch.name}`
    del.title = 'Удалить'
    del.onclick = () => removeChar(ch.id)

    actions.append(inc, dec, del)
    row.append(avatarWrap, info, actions)

    row.onclick = (e) => {
      if (e.target.closest('.icon-btn')) return
      selectedCharId = ch.id
      renderKidsSelected()
      draw(0)
    }
    list.appendChild(row)
  })
}

function renderModels() {
  const grid = document.getElementById('modelGrid')
  const badge = document.getElementById('modelBadge')
  const cur = document.getElementById('modelCurrent')
  if (!grid || !badge || !cur) return

  grid.replaceChildren()
  models.forEach((m) => {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = `model-card${m.id === currentModelId ? ' active' : ''}`

    const top = document.createElement('div')
    top.className = 'model-card-top'
    top.style.background = `linear-gradient(135deg, ${m.grad[0]}, ${m.grad[1]})`
    top.style.color = m.textColor || '#fff'

    const topInner = document.createElement('div')
    topInner.style.textAlign = 'center'
    const iconEl = document.createElement('div')
    iconEl.className = 'model-card-icon'
    iconEl.textContent = m.icon
    const nameEl = document.createElement('div')
    nameEl.className = 'model-card-name'
    nameEl.textContent = m.name
    topInner.append(iconEl, nameEl)
    top.appendChild(topInner)

    const body = document.createElement('div')
    body.className = 'model-card-body'
    const titleEl = document.createElement('div')
    titleEl.className = 'model-card-title'
    titleEl.textContent = m.name
    const descEl = document.createElement('div')
    descEl.className = 'model-card-desc'
    descEl.textContent = m.desc
    const tagEl = document.createElement('span')
    tagEl.className = 'model-card-tag'
    tagEl.textContent = m.tag
    body.append(titleEl, descEl, tagEl)

    card.append(top, body)
    card.onclick = () => setModel(m.id)
    grid.appendChild(card)
  })

  const active = models.find((x) => x.id === currentModelId)
  if (active) {
    badge.textContent = active.name
    cur.replaceChildren()
    const dot = document.createElement('div')
    dot.className = 'model-current-dot'
    const info = document.createElement('div')
    const bold = document.createElement('b')
    bold.textContent = active.name
    const meta = document.createElement('span')
    meta.textContent = `Анимация: ${active.anim} • фон: ${active.bg}`
    info.append(bold, document.createTextNode(` — ${active.hint}`), document.createElement('br'), meta)
    cur.append(dot, info)
  }
}

function setModel(id, { clearKidsBg = true } = {}) {
  const m = models.find((x) => x.id === id)
  if (!m) return
  currentModelId = id
  safeSetItem(STORAGE_KEYS.model, id)
  els.bgType.value = m.bg
  if (m.bgColor) els.bgColor.value = m.bgColor
  els.anim.value = m.anim
  els.textColor.value = m.textColor
  els.particles.checked = m.particles
  els.kenBurns.checked = m.kenBurns
  els.overlay.value = String(m.overlay)
  if (clearKidsBg) {
    clearKidsBgIfActive()
  }
  updateBgVisibility()
  renderModels()
  renderKids()
  scheduleAutosave()
  draw(0)
  els.status.textContent = `Модель «${m.name}» применена ✓`
}

// ===== Черновики (сохранение/импорт со всеми параметрами) =====
function collectProject() {
  return {
    v: 3,
    title: els.title.value,
    subtitle: els.subtitle.value,
    titleSize: Number(els.titleSize.value) || 68,
    subSize: Number(els.subSize.value) || 24,
    bgType: els.bgType.value,
    bgColor: els.bgColor.value,
    bgImageSrc: els.bgType.value === 'image' ? bgImageSrc : null,
    overlay: Number(els.overlay.value) || 0,
    anim: els.anim.value,
    duration: Number(els.duration.value) || 4,
    textColor: els.textColor.value,
    particles: Boolean(els.particles?.checked),
    kenBurns: Boolean(els.kenBurns?.checked),
    watermark: Boolean(els.watermark?.checked),
    confetti: Boolean(els.confetti?.checked),
    bubbles: Boolean(els.bubbles?.checked),
    speech: Boolean(els.speech?.checked),
    drawColor,
    drawSize,
    kidsStyle,
    activeKidsBgId,
    characters: serializeCharacters(characters),
    strokes,
    music: els.inpMusic?.value || 'none',
    format,
    modelId: currentModelId,
  }
}

function applyProject(rawProject) {
  try {
    const p = validateProject(rawProject)
    els.title.value = p.title
    els.subtitle.value = p.subtitle
    els.titleSize.value = String(p.titleSize)
    els.subSize.value = String(p.subSize)
    els.bgType.value = p.bgType
    els.bgColor.value = p.bgColor
    els.overlay.value = String(p.overlay)
    els.anim.value = p.anim
    els.duration.value = String(p.duration)
    els.textColor.value = p.textColor
    if (els.particles) els.particles.checked = p.particles
    if (els.kenBurns) els.kenBurns.checked = p.kenBurns
    if (els.watermark) els.watermark.checked = p.watermark
    if (els.confetti) els.confetti.checked = p.confetti
    if (els.bubbles) els.bubbles.checked = p.bubbles
    if (els.speech) els.speech.checked = p.speech

    kidsStyle = p.kidsStyle
    activeKidsBgId = p.activeKidsBgId
    characters = p.characters
    strokes = p.strokes
    selectedCharId = null

    if (p.bgImageSrc) {
      bgImage = null
      bgImageSrc = p.bgImageSrc
      const loadToken = ++bgImageLoadToken
      const im = new Image()
      im.onload = () => {
        if (loadToken !== bgImageLoadToken) return
        bgImage = im
        draw(0)
      }
      im.onerror = () => {
        if (loadToken !== bgImageLoadToken) return
        bgImage = null
        bgImageSrc = null
        draw(0)
        els.status.textContent = 'Не удалось загрузить фоновое изображение из черновика'
      }
      im.src = p.bgImageSrc
    } else {
      bgImageLoadToken++
      bgImage = null
      bgImageSrc = null
    }

    drawColor = p.drawColor
    drawSize = p.drawSize
    const inpDrawColor = document.getElementById('inpDrawColor')
    const inpDrawSize = document.getElementById('inpDrawSize')
    const valDrawSize = document.getElementById('valDrawSize')
    if (inpDrawColor) inpDrawColor.value = drawColor
    if (inpDrawSize) inpDrawSize.value = String(drawSize)
    if (valDrawSize) valDrawSize.textContent = String(drawSize)

    if (els.inpMusic) els.inpMusic.value = p.music
    currentModelId = p.modelId

    reviveChars()
    applyFormat(p.format)
    renderKids()
    renderModels()
    updateBgVisibility()

    els.valTitleSize.textContent = els.titleSize.value
    els.valSubSize.textContent = els.subSize.value
    els.valDuration.textContent = els.duration.value
    els.timelineEnd.textContent = `${els.duration.value}с`

    draw(0)
    els.status.textContent = 'Черновик загружен ✓'
  } catch (err) {
    els.status.textContent = `Ошибка загрузки черновика: ${err.message}`
  }
}

// ===== Drag & Рисование =====
let drag = null

function canvasPos(e) {
  const rect = els.canvas.getBoundingClientRect()
  const scaleX = els.canvas.width / (rect.width || 1)
  const scaleY = els.canvas.height / (rect.height || 1)
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const x = (clientX - rect.left) * scaleX
  const y = (clientY - rect.top) * scaleY
  const { w, h } = formats[format]
  return {
    x,
    y,
    nx: clamp(x / w, 0, 1),
    ny: clamp(y / h, 0, 1),
  }
}

function hitTest(pos) {
  for (let i = characters.length - 1; i >= 0; i--) {
    const ch = characters[i]
    const dx = pos.x - ch.x
    const dy = pos.y - ch.y
    const r = ch.size * 0.42
    if (dx * dx + dy * dy < r * r) return ch
  }
  return null
}

function startStroke(pos) {
  const { w, h } = formats[format]
  const minDim = Math.min(w, h)
  currentStroke = {
    color: drawColor,
    size: drawSize,
    nSize: clamp(drawSize / minDim, 0.002, 0.05),
    points: [pos],
  }
}

els.canvas.addEventListener('mousedown', (e) => {
  if (isRecording) return
  els.canvas.focus({ preventScroll: true })
  const p = canvasPos(e)
  if (isDrawMode) {
    startStroke(p)
    els.canvas.style.cursor = 'crosshair'
    e.preventDefault()
    return
  }
  const hit = hitTest(p)
  if (hit) {
    selectedCharId = hit.id
    drag = { id: hit.id, offX: p.x - hit.x, offY: p.y - hit.y }
    draw(0)
    renderKidsSelected()
    e.preventDefault()
  } else {
    selectedCharId = null
    draw(0)
    renderKidsSelected()
  }
})

els.canvas.addEventListener('mousemove', (e) => {
  if (isRecording) return
  const p = canvasPos(e)
  if (currentStroke) {
    currentStroke.points.push(p)
    draw(0)
    return
  }
  if (!drag) return
  const ch = characters.find((c) => c.id === drag.id)
  if (ch) {
    updateCharacterPixelPos(ch, p.x - drag.offX, p.y - drag.offY)
    draw(0)
    renderKidsSelected()
  }
})

window.addEventListener('mouseup', () => {
  if (currentStroke) {
    if (currentStroke.points.length > 1) {
      strokes.push(currentStroke)
      saveDraw()
    }
    currentStroke = null
    draw(0)
  }
  if (drag) {
    saveKids()
    drag = null
  }
})

els.canvas.addEventListener(
  'touchstart',
  (e) => {
    if (isRecording) return
    const p = canvasPos(e)
    if (isDrawMode) {
      startStroke(p)
      e.preventDefault()
      return
    }
    const hit = hitTest(p)
    if (hit) {
      selectedCharId = hit.id
      drag = { id: hit.id, offX: p.x - hit.x, offY: p.y - hit.y }
      draw(0)
      renderKidsSelected()
      e.preventDefault()
    }
  },
  { passive: false }
)

els.canvas.addEventListener(
  'touchmove',
  (e) => {
    if (isRecording) return
    const p = canvasPos(e)
    if (currentStroke) {
      currentStroke.points.push(p)
      draw(0)
      e.preventDefault()
      return
    }
    if (!drag) return
    const ch = characters.find((c) => c.id === drag.id)
    if (ch) {
      updateCharacterPixelPos(ch, p.x - drag.offX, p.y - drag.offY)
      draw(0)
      renderKidsSelected()
    }
    e.preventDefault()
  },
  { passive: false }
)

window.addEventListener('touchend', () => {
  if (currentStroke) {
    if (currentStroke.points.length > 1) {
      strokes.push(currentStroke)
      saveDraw()
    }
    currentStroke = null
    draw(0)
  }
  if (drag) {
    saveKids()
    drag = null
  }
})

els.canvas.addEventListener(
  'wheel',
  (e) => {
    if (isRecording || !selectedCharId) return
    const ch = characters.find((c) => c.id === selectedCharId)
    if (!ch) return
    e.preventDefault()
    updateCharacterPixelSize(ch, ch.size + (e.deltaY < 0 ? 8 : -8))
    saveKids()
    draw(0)
    renderKidsSelected()
  },
  { passive: false }
)

// Keyboard controls on canvas: arrow keys nudge selected character, +/- resize, Delete removes
els.canvas.addEventListener('keydown', (e) => {
  if (isRecording || !selectedCharId) return
  const ch = characters.find((c) => c.id === selectedCharId)
  if (!ch) return
  const step = e.shiftKey ? 24 : 8
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    updateCharacterPixelPos(ch, ch.x - step, ch.y)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    updateCharacterPixelPos(ch, ch.x + step, ch.y)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    updateCharacterPixelPos(ch, ch.x, ch.y - step)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    updateCharacterPixelPos(ch, ch.x, ch.y + step)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    removeChar(ch.id)
    return
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    updateCharacterPixelSize(ch, ch.size + 10)
  } else if (e.key === '-') {
    e.preventDefault()
    updateCharacterPixelSize(ch, ch.size - 10)
  } else {
    return
  }
  saveKids()
  renderKidsSelected()
  draw(0)
})

// ===== Модальные окна и доступность =====
let lastFocusedBeforeModal = null

function getFocusableInModal(modal) {
  return [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (el) => !el.disabled && el.offsetParent !== null
  )
}

function openModal(id) {
  const modal = document.getElementById(id)
  if (!modal) return
  lastFocusedBeforeModal = document.activeElement
  modal.style.display = 'grid'
  const focusable = getFocusableInModal(modal)
  if (focusable[0]) focusable[0].focus()
}

function closeModal(id) {
  const modal = document.getElementById(id)
  if (!modal) return
  modal.style.display = 'none'
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus()
  }
}

window.addEventListener('keydown', (e) => {
  const openModalEl = ['modalHelp', 'modalTemplates']
    .map((id) => document.getElementById(id))
    .find((m) => m && m.style.display !== 'none')

  if (e.key === 'Escape') {
    if (openModalEl) closeModal(openModalEl.id)
    return
  }

  if (e.key === 'Tab' && openModalEl) {
    const focusable = getFocusableInModal(openModalEl)
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first || !openModalEl.contains(document.activeElement)) {
        e.preventDefault()
        last.focus()
      }
    } else if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    } else if (!openModalEl.contains(document.activeElement)) {
      e.preventDefault()
      first.focus()
    }
  }
})

// ===== Генерация видео =====
async function generateVideo() {
  if (isRecording) return
  const s = getSceneState()
  if (!s.title.trim()) {
    els.status.textContent = 'Введи заголовок!'
    els.title.focus()
    return
  }

  cancelPreview()
  stopPreviewMusic()

  isRecording = true
  els.btnGenerate.disabled = true
  els.btnGenerate.replaceChildren()
  const recIcon = document.createElement('span')
  recIcon.className = 'btn-icon'
  recIcon.setAttribute('aria-hidden', 'true')
  els.btnGenerate.append(recIcon, ' Запись...')
  els.status.textContent = 'Подготовка записи...'
  els.resultCard.style.display = 'none'

  try {
    const musicType = els.inpMusic?.value || 'none'
    const result = await recordCanvasVideo({
      canvas: els.canvas,
      durationSec: s.duration,
      fps: 30,
      musicType,
      // Hide selection ring so editor chrome never bakes into exported video
      drawFrame: (progress) => draw(progress, { showSelection: false }),
      onProgress: (progress) => {
        els.timelineProgress.style.width = `${progress * 100}%`
        els.status.textContent = `Запись... ${Math.round(progress * 100)}%`
      },
    })

    if (lastVideoObjectUrl) {
      URL.revokeObjectURL(lastVideoObjectUrl)
    }
    const url = URL.createObjectURL(result.blob)
    lastVideoObjectUrl = url

    els.resultVideo.src = url
    els.downloadLink.href = url
    els.downloadLink.download = safeFilename(s.title, format, result.ext)
    els.resultCard.style.display = 'block'

    const sizeMb = (result.blob.size / 1024 / 1024).toFixed(2)
    els.status.textContent = `Готово! ${sizeMb} МБ • ${result.mime}${result.hasMusic ? ' • с музыкой 🎵' : ''}`
    els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (err) {
    els.status.textContent = `Ошибка записи: ${err.message}`
  } finally {
    isRecording = false
    els.btnGenerate.disabled = false
    els.btnGenerate.replaceChildren()
    const genIcon = document.createElement('span')
    genIcon.className = 'btn-icon'
    genIcon.setAttribute('aria-hidden', 'true')
    genIcon.textContent = '●'
    els.btnGenerate.append(genIcon, ' Сгенерировать видео')
    els.timelineProgress.style.width = '0%'
    draw(0)
  }
}

// ===== Привязка UI контролов =====
;['input', 'change'].forEach((ev) => {
  els.title.addEventListener(ev, () => {
    scheduleAutosave()
    draw(0)
  })
  els.subtitle.addEventListener(ev, () => {
    scheduleAutosave()
    draw(0)
  })
})

els.titleSize.addEventListener('input', () => {
  els.valTitleSize.textContent = els.titleSize.value
  scheduleAutosave()
  draw(0)
})

els.subSize.addEventListener('input', () => {
  els.valSubSize.textContent = els.subSize.value
  scheduleAutosave()
  draw(0)
})

els.bgType.addEventListener('change', () => {
  // Choosing an explicit background in the Text tab clears any hidden kids background override
  clearKidsBgIfActive()
  updateBgVisibility()
  scheduleAutosave()
  draw(0)
})

els.bgColor.addEventListener('input', () => {
  clearKidsBgIfActive()
  scheduleAutosave()
  draw(0)
})

document.getElementById('btnSwitchToNormalBg')?.addEventListener('click', () => {
  clearKidsBgIfActive()
  draw(0)
  els.status.textContent = 'Детский фон отключён — активен обычный фон'
})

els.overlay.addEventListener('input', () => {
  scheduleAutosave()
  draw(0)
})

els.anim.addEventListener('change', () => {
  scheduleAutosave()
  draw(0)
})

els.duration.addEventListener('input', () => {
  els.valDuration.textContent = els.duration.value
  els.timelineEnd.textContent = `${els.duration.value}с`
  scheduleAutosave()
  draw(0)
})

els.textColor.addEventListener('input', () => {
  scheduleAutosave()
  draw(0)
})

document.querySelectorAll('.chip').forEach((c) => {
  c.onclick = () => {
    els.textColor.value = c.dataset.color
    scheduleAutosave()
    draw(0)
  }
})

;[els.particles, els.kenBurns, els.watermark, els.confetti, els.bubbles, els.speech].forEach((chk) => {
  chk?.addEventListener('change', () => {
    scheduleAutosave()
    draw(0)
  })
})

document.querySelectorAll('.fmt-btn').forEach((b) => {
  b.onclick = () => applyFormat(b.dataset.fmt)
})

els.inpImage.addEventListener('change', (e) => {
  const file = e.target.files?.[0]
  if (file) loadImageFile(file)
  e.target.value = ''
})

els.canvasWrap.addEventListener('dragover', (e) => {
  e.preventDefault()
  els.canvasWrap.classList.add('drag')
})

els.canvasWrap.addEventListener('dragleave', () => {
  els.canvasWrap.classList.remove('drag')
})

els.canvasWrap.addEventListener('drop', (e) => {
  e.preventDefault()
  els.canvasWrap.classList.remove('drag')
  const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'))
  if (!files.length) return
  if (document.body.dataset.tab === 'kids') {
    files.forEach((f) => addPhotoChar(f))
  } else {
    loadImageFile(files[0])
  }
})

els.inpPhoto?.addEventListener('change', (e) => {
  const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'))
  files.forEach((f) => addPhotoChar(f))
  e.target.value = ''
})

document.getElementById('btnPreviewMusic')?.addEventListener('click', () => {
  const type = els.inpMusic.value
  if (type === 'none') {
    els.status.textContent = 'Выбери музыку сначала'
    return
  }
  try {
    els.status.textContent = '▶ Слушай 5 сек...'
    previewMusic(type, () => {
      els.status.textContent = 'Готово'
    })
  } catch (err) {
    els.status.textContent = `Не удалось воспроизвести звук: ${err.message}`
  }
})

document.getElementById('btnStopMusic')?.addEventListener('click', () => {
  stopPreviewMusic()
  els.status.textContent = 'Остановлено'
})

els.inpMusic?.addEventListener('change', () => scheduleAutosave())
els.btnPlayPreview.onclick = playPreview

document.getElementById('btnSpeak').onclick = () => {
  const text = `${els.title.value}. ${els.subtitle.value}`.trim()
  if (!('speechSynthesis' in window)) {
    els.status.textContent = 'Браузер не поддерживает озвучку'
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ru-RU'
  u.rate = 0.95
  u.pitch = 1.1
  window.speechSynthesis.speak(u)
  els.status.textContent = '🔊 Озвучиваю...'
  u.onend = () => {
    els.status.textContent = 'Готово!'
  }
}

document.querySelectorAll('.style-btn').forEach((b) => {
  b.addEventListener('click', () => {
    kidsStyle = b.dataset.style
    saveKids()
    renderKids()
    draw(0)
  })
})

document.getElementById('btnClearBg').onclick = () => {
  activeKidsBgId = null
  updateBgVisibility()
  saveKids()
  renderKids()
  draw(0)
  els.status.textContent = 'Детский фон убран'
}

document.getElementById('btnClearChars').onclick = () => {
  characters = []
  selectedCharId = null
  saveKids()
  renderPhotoThumbs()
  renderKids()
  draw(0)
}

document.getElementById('btnShuffle').onclick = () => {
  const { w, h } = formats[format]
  characters.forEach((c) => {
    updateCharacterPixelPos(c, w * (0.2 + Math.random() * 0.6), h * (0.35 + Math.random() * 0.45))
  })
  saveKids()
  renderKidsSelected()
  draw(0)
}

// Кисть
const btnDrawToggle = document.getElementById('btnDrawToggle')
const btnClearDraw = document.getElementById('btnClearDraw')
const inpDrawColor = document.getElementById('inpDrawColor')
const inpDrawSize = document.getElementById('inpDrawSize')
const valDrawSize = document.getElementById('valDrawSize')

if (inpDrawColor) {
  inpDrawColor.value = drawColor
  inpDrawColor.addEventListener('input', (e) => {
    drawColor = e.target.value
    safeSetItem(STORAGE_KEYS.drawColor, drawColor)
    scheduleAutosave()
  })
}
if (inpDrawSize && valDrawSize) {
  inpDrawSize.value = String(drawSize)
  valDrawSize.textContent = String(drawSize)
  inpDrawSize.addEventListener('input', (e) => {
    drawSize = Number(e.target.value) || 6
    valDrawSize.textContent = String(drawSize)
    safeSetItem(STORAGE_KEYS.drawSize, String(drawSize))
    scheduleAutosave()
  })
}
if (btnDrawToggle) {
  const updateDrawUi = () => {
    btnDrawToggle.textContent = isDrawMode ? '✅ Кисть включена — рисуй!' : '✏️ Включить кисть'
    btnDrawToggle.style.background = isDrawMode ? 'var(--accent)' : '#0f0f13'
    btnDrawToggle.style.color = isDrawMode ? '#fff' : 'var(--text)'
    els.canvas.style.cursor = isDrawMode ? 'crosshair' : 'default'
    const hint = document.getElementById('canvasHint')
    if (hint) {
      hint.textContent = isDrawMode
        ? '✏️ Рисуй мышкой/пальцем — отпусти чтобы сохранить штрих'
        : '💡 Кликни на персонажа и тащи мышкой • колесо — размер • стрелки / Delete'
    }
  }
  btnDrawToggle.onclick = () => {
    isDrawMode = !isDrawMode
    updateDrawUi()
    els.status.textContent = isDrawMode ? 'Кисть включена — рисуй на сцене!' : 'Кисть выключена'
  }
  updateDrawUi()
}
if (btnClearDraw) {
  btnClearDraw.onclick = () => {
    strokes = []
    currentStroke = null
    saveDraw()
    draw(0)
    els.status.textContent = 'Рисунок очищен'
  }
}

// Кнопки черновиков
document.getElementById('btnSaveDraft')?.addEventListener('click', () => {
  const res = safeSetItem(STORAGE_KEYS.draft, JSON.stringify(collectProject()))
  if (!res.ok) {
    notifyStorageIssue(res)
    return
  }
  safeSetItem(STORAGE_KEYS.draftTime, new Date().toISOString())
  const hint = document.getElementById('draftHint')
  if (hint) hint.textContent = `Сохранено ${new Date().toLocaleTimeString()}`
  els.status.textContent = 'Черновик сохранён ✓'
})

document.getElementById('btnLoadDraft')?.addEventListener('click', () => {
  const raw = safeGetItem(STORAGE_KEYS.draft, null)
  if (!raw) {
    els.status.textContent = 'Нет сохранённого черновика'
    return
  }
  const parsed = safeParseJSON(raw, null)
  if (!parsed) {
    els.status.textContent = 'Черновик повреждён — не удалось прочитать JSON'
    return
  }
  applyProject(parsed)
})

document.getElementById('btnDownloadDraft')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(collectProject(), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kids-project.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

document.getElementById('inpLoadDraft')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const parsed = safeParseJSON(String(ev.target?.result || ''), null)
    if (!parsed) {
      els.status.textContent = 'Ошибка загрузки: файл не является корректным JSON'
      return
    }
    applyProject(parsed)
  }
  reader.onerror = () => {
    els.status.textContent = 'Ошибка чтения файла черновика'
  }
  reader.readAsText(file)
  e.target.value = ''
})

if (safeGetItem(STORAGE_KEYS.draft, null)) {
  const hint = document.getElementById('draftHint')
  if (hint) hint.textContent = 'Есть сохранённый черновик — нажми Открыть'
}

// PWA с относительным путём для поддержки подпапок (GitHub Pages и т.д.)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Service worker registration can fail in private mode or insecure origins
    })
  })
}

let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  const btn = document.getElementById('btnInstall')
  if (btn) btn.style.display = 'block'
})

document.getElementById('btnInstall')?.addEventListener('click', async () => {
  const hint = document.getElementById('pwaHint')
  if (!deferredPrompt) {
    if (hint) hint.textContent = 'Открой в Chrome/Safari на телефоне и выбери «Установить / На экран Домой»'
    return
  }
  deferredPrompt.prompt()
  const r = await deferredPrompt.userChoice
  if (hint) hint.textContent = r.outcome === 'accepted' ? 'Устанавливаю...' : 'Отменено'
  deferredPrompt = null
})

els.btnGenerate.onclick = generateVideo
document.getElementById('btnAgain').onclick = () => {
  els.resultCard.style.display = 'none'
  els.status.textContent = ''
}

function downloadPngFrame() {
  draw(0, { showSelection: false })
  const a = document.createElement('a')
  a.href = els.canvas.toDataURL('image/png')
  a.download = safeFilename(els.title.value || 'frame', format, 'png')
  a.click()
  draw(0)
  els.status.textContent = 'PNG-кадр скачан ✓'
}

document.getElementById('btnDownloadPng')?.addEventListener('click', downloadPngFrame)
document.getElementById('btnDownloadPngToolbar')?.addEventListener('click', downloadPngFrame)

document.getElementById('btnHelp').onclick = () => openModal('modalHelp')

// На широких экранах скроллим к правой панели, на планшетах/телефонах открываем модальное окно
document.getElementById('btnExamples').onclick = () => {
  const panel = document.getElementById('templatesPanel')
  if (panel && window.getComputedStyle(panel).display !== 'none') {
    panel.scrollIntoView({ behavior: 'smooth' })
  } else {
    openModal('modalTemplates')
  }
}

document.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', () => {
    const targetId = el.getAttribute('data-close') || 'modalHelp'
    closeModal(targetId)
  })
})

function syncTabs() {
  const activeTab = document.body.dataset.tab || 'kids'
  document.querySelectorAll('.tab-btn').forEach((b) => {
    const isSelected = b.dataset.tab === activeTab
    b.classList.toggle('active', isSelected)
    b.setAttribute('aria-selected', String(isSelected))
  })
  document.getElementById('tabGen').style.display = activeTab === 'gen' ? 'block' : 'none'
  document.getElementById('tabKids').style.display = activeTab === 'kids' ? 'block' : 'none'
  document.getElementById('tabModel').style.display = activeTab === 'model' ? 'block' : 'none'
}

document.body.dataset.tab = 'kids'
document.querySelectorAll('.tab-btn').forEach((b) => {
  b.addEventListener('click', () => {
    document.body.dataset.tab = b.dataset.tab
    syncTabs()
  })
})

// Инициализация
syncTabs()
renderTemplateLists()
reviveChars()
{
  const m = models.find((x) => x.id === currentModelId)
  if (m) {
    els.bgType.value = m.bg
    if (m.bgColor) els.bgColor.value = m.bgColor
    els.anim.value = m.anim
    els.textColor.value = m.textColor
    els.particles.checked = m.particles
    els.kenBurns.checked = m.kenBurns
    els.overlay.value = String(m.overlay)
  }
}
renderModels()
renderKids()
updateBgVisibility()
applyFormat(format)
els.valTitleSize.textContent = els.titleSize.value
els.valSubSize.textContent = els.subSize.value
draw(0)
