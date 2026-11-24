export function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

export function isSafeImageDataUrl(value) {
  if (typeof value !== 'string') return false
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/.test(value)
}

export function sanitizeText(value, maxLen = 120, fallback = '') {
  if (typeof value !== 'string') return fallback
  // Strip ASCII control characters except CR/LF/TAB
  let cleaned = ''
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    const isControl =
      (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127
    if (!isControl) cleaned += value[i]
  }
  return cleaned.slice(0, maxLen)
}

export function sanitizeColor(value, fallback = '#ffffff') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed
  return fallback
}

export function wrapText(ctx, text, maxWidth) {
  if (!text) return []
  const paragraphs = String(text).split(/\r?\n/)
  const lines = []

  for (const para of paragraphs) {
    const words = para.split(' ')
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }

      // Break single extra-long words so they never overflow maxWidth
      while (line && ctx.measureText(line).width > maxWidth && line.length > 1) {
        let splitIdx = line.length - 1
        while (splitIdx > 1 && ctx.measureText(line.slice(0, splitIdx)).width > maxWidth) {
          splitIdx--
        }
        lines.push(line.slice(0, splitIdx))
        line = line.slice(splitIdx)
      }
    }
    if (line) lines.push(line)
  }

  return lines
}

export function safeFilename(title, fmt = '16:9', ext = 'webm') {
  const base =
    String(title || '')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'video'
  const fmtPart = String(fmt).replace(/[^0-9a-zA-Z]+/g, 'x')
  return `${base}_${fmtPart}.${ext}`
}

export function normalizeCharacter(raw, dims = { w: 1280, h: 720 }) {
  if (!raw || typeof raw !== 'object') return null
  const w = dims.w || 1280
  const h = dims.h || 720
  const minDim = Math.min(w, h)

  const id = sanitizeText(String(raw.id || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`), 40)
  const name = sanitizeText(raw.name || raw.emoji || 'Герой', 32, 'Герой')
  const emoji = sanitizeText(raw.emoji || '🧸', 12, '🧸')
  const isPhoto = Boolean(raw.isPhoto && isSafeImageDataUrl(raw.imgSrc))
  const imgSrc = isPhoto ? raw.imgSrc : undefined

  const nx =
    typeof raw.nx === 'number' && Number.isFinite(raw.nx)
      ? clamp(raw.nx, 0.02, 0.98)
      : clamp((Number(raw.x) || w * 0.5) / w, 0.02, 0.98)
  const ny =
    typeof raw.ny === 'number' && Number.isFinite(raw.ny)
      ? clamp(raw.ny, 0.02, 0.98)
      : clamp((Number(raw.y) || h * 0.5) / h, 0.02, 0.98)
  const nSize =
    typeof raw.nSize === 'number' && Number.isFinite(raw.nSize)
      ? clamp(raw.nSize, 0.05, 0.4)
      : clamp((Number(raw.size) || minDim * 0.15) / minDim, 0.05, 0.4)

  const rot = typeof raw.rot === 'number' && Number.isFinite(raw.rot) ? clamp(raw.rot, -Math.PI, Math.PI) : 0

  return {
    id,
    name,
    emoji,
    nx,
    ny,
    nSize,
    x: nx * w,
    y: ny * h,
    size: Math.round(nSize * minDim),
    rot,
    isSticker: Boolean(raw.isSticker),
    isPhoto,
    ...(imgSrc ? { imgSrc } : {}),
  }
}

export function syncCharactersToFormat(characters, dims) {
  const { w, h } = dims
  const minDim = Math.min(w, h)
  return characters.map((ch) => {
    const nx = typeof ch.nx === 'number' ? clamp(ch.nx, 0.02, 0.98) : clamp(ch.x / w, 0.02, 0.98)
    const ny = typeof ch.ny === 'number' ? clamp(ch.ny, 0.02, 0.98) : clamp(ch.y / h, 0.02, 0.98)
    const nSize =
      typeof ch.nSize === 'number' ? clamp(ch.nSize, 0.05, 0.4) : clamp(ch.size / minDim, 0.05, 0.4)
    return {
      ...ch,
      nx,
      ny,
      nSize,
      x: nx * w,
      y: ny * h,
      size: Math.round(clamp(nSize * minDim, 36, 280)),
    }
  })
}

export function normalizeStroke(raw, dims = { w: 1280, h: 720 }) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.points)) return null
  const w = dims.w || 1280
  const h = dims.h || 720
  const minDim = Math.min(w, h)
  const color = sanitizeColor(raw.color, '#ff2d55')
  const nSize =
    typeof raw.nSize === 'number' && Number.isFinite(raw.nSize)
      ? clamp(raw.nSize, 0.002, 0.05)
      : clamp((Number(raw.size) || 6) / minDim, 0.002, 0.05)

  const points = raw.points
    .slice(0, 5000)
    .map((pt) => {
      if (!pt || typeof pt !== 'object') return null
      const nx =
        typeof pt.nx === 'number' && Number.isFinite(pt.nx)
          ? clamp(pt.nx, 0, 1)
          : clamp((Number(pt.x) || 0) / w, 0, 1)
      const ny =
        typeof pt.ny === 'number' && Number.isFinite(pt.ny)
          ? clamp(pt.ny, 0, 1)
          : clamp((Number(pt.y) || 0) / h, 0, 1)
      return { nx, ny, x: nx * w, y: ny * h }
    })
    .filter(Boolean)

  if (points.length < 2) return null
  return {
    color,
    nSize,
    size: Math.max(2, Math.round(nSize * minDim)),
    points,
  }
}

export function syncStrokesToFormat(strokes, dims) {
  const { w, h } = dims
  const minDim = Math.min(w, h)
  return strokes.map((s) => {
    const nSize = typeof s.nSize === 'number' ? s.nSize : clamp((s.size || 6) / minDim, 0.002, 0.05)
    return {
      ...s,
      nSize,
      size: Math.max(2, Math.round(nSize * minDim)),
      points: s.points.map((pt) => {
        const nx = typeof pt.nx === 'number' ? pt.nx : clamp(pt.x / w, 0, 1)
        const ny = typeof pt.ny === 'number' ? pt.ny : clamp(pt.y / h, 0, 1)
        return { nx, ny, x: nx * w, y: ny * h }
      }),
    }
  })
}

export async function downscaleImageFile(file, maxEdge = 512, quality = 0.82) {
  const bitmapUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Не удалось прочитать изображение'))
      el.src = bitmapUrl
    })
    const iw = img.naturalWidth || img.width || maxEdge
    const ih = img.naturalHeight || img.height || maxEdge
    const scale = Math.min(1, maxEdge / Math.max(iw, ih))
    const tw = Math.max(1, Math.round(iw * scale))
    const th = Math.max(1, Math.round(ih * scale))

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const c = canvas.getContext('2d')
    c.drawImage(img, 0, 0, tw, th)

    let dataUrl = canvas.toDataURL('image/webp', quality)
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }
    const thumbImg = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Ошибка декодирования миниатюры'))
      el.src = dataUrl
    })
    return { dataUrl, img: thumbImg }
  } finally {
    URL.revokeObjectURL(bitmapUrl)
  }
}
