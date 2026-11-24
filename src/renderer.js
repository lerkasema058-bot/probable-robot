import {
  ACCENT_COLOR,
  formats,
  gradients,
  kidsBackgrounds,
  models,
  speechPhrases,
} from './data.js'
import { clamp, seededRandom, wrapText } from './utils.js'

function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
}

export function drawKidsBackground(ctx, bgId, dims, t) {
  const bg = kidsBackgrounds.find((b) => b.id === bgId)
  if (!bg) return false
  const { w, h } = dims
  const [c1, c2] = bg.grad
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  if (bg.deco === 'clouds') {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (let i = 0; i < 4; i++) {
      const x = w * 0.15 + i * w * 0.25 + Math.sin(t * 0.3 + i) * 12
      const y = h * 0.18 + Math.cos(t * 0.2 + i) * 8
      const r = h * 0.06
      ctx.beginPath()
      ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2)
      ctx.ellipse(x + r * 0.6, y - r * 0.2, r * 1.2, r * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#7bcf7b'
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.96, w * 0.6, h * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (bg.deco === 'trees') {
    for (let i = 0; i < 5; i++) {
      const x = w * 0.1 + i * w * 0.2
      const y = h * 0.78
      ctx.fillStyle = '#5a3e1b'
      ctx.fillRect(x - 10, y, 20, h - y)
      ctx.fillStyle = '#2d7a2d'
      ctx.beginPath()
      ctx.moveTo(x - 38, y)
      ctx.lineTo(x + 38, y)
      ctx.lineTo(x, y - h * 0.22)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, 0, w, h)
  } else if (bg.deco === 'bubbles') {
    for (let i = 0; i < 18; i++) {
      const x = (Math.sin(i * 1.3 + t * 0.5) * 0.5 + 0.5) * w
      const y = ((i * 0.13 + t * 0.06) % 1) * h
      const r = 4 + Math.sin(i) * 3
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  } else if (bg.deco === 'stars') {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    for (let i = 0; i < 60; i++) {
      const x = (Math.sin(i * 1.9 + t * 0.1 + i) * 0.5 + 0.5) * w
      const y = (Math.cos(i * 2.1 + t * 0.08 + i) * 0.5 + 0.5) * h
      // Deterministic twinkle radius instead of per-frame Math.random() flicker
      const baseR = 0.6 + seededRandom(i * 17.3) * 1.8
      const twinkle = 0.75 + Math.sin(t * 4 + i * 2.3) * 0.25
      ctx.beginPath()
      ctx.arc(x, y, baseR * twinkle, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ff9a9e'
    ctx.beginPath()
    ctx.arc(w * 0.78, h * 0.22, w * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.ellipse(w * 0.78, h * 0.22, w * 0.1, h * 0.025, -0.4, 0, Math.PI * 2)
    ctx.fill()
  } else if (bg.deco === 'castle') {
    ctx.fillStyle = '#4a2a6b'
    ctx.fillRect(0, h * 0.62, w, h * 0.38)
    ctx.fillStyle = '#6b3a8a'
    for (let i = 0; i < 4; i++) {
      const x = w * 0.2 + i * w * 0.18
      ctx.fillRect(x - 22, h * 0.48, 44, h * 0.14)
      ctx.fillRect(x - 30, h * 0.44, 60, 18)
    }
  } else if (bg.deco === 'jungle') {
    for (let i = 0; i < 6; i++) {
      const x = w * 0.08 + i * w * 0.16
      ctx.fillStyle = '#1a4d1a'
      ctx.beginPath()
      ctx.moveTo(x - 20, h)
      ctx.lineTo(x + 20, h)
      ctx.lineTo(x, h * 0.55)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#2d7a22'
      ctx.beginPath()
      ctx.arc(x, h * 0.55, 28, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (bg.deco === 'farm') {
    ctx.fillStyle = '#81c784'
    ctx.fillRect(0, h * 0.7, w, h * 0.3)
    ctx.fillStyle = '#a1887f'
    ctx.fillRect(0, h * 0.62, w, h * 0.08)
  } else if (bg.deco === 'city') {
    for (let i = 0; i < 8; i++) {
      const x = w * 0.05 + i * w * 0.12
      const hh = h * 0.2 + Math.sin(i) * h * 0.08
      ctx.fillStyle = i % 2 ? '#16213e' : '#0f3460'
      ctx.fillRect(x, h * 0.58 - hh, w * 0.09, hh)
      for (let wy = 0; wy < 3; wy++) {
        for (let wx = 0; wx < 2; wx++) {
          // Deterministic lit windows instead of strobe-flickering Math.random()
          const lit = seededRandom(i * 31 + wy * 7 + wx * 13) > 0.4
          if (lit) {
            ctx.fillStyle = '#ffd600'
            ctx.fillRect(x + 6 + wx * 14, h * 0.58 - hh + 8 + wy * 12, 6, 6)
          }
        }
      }
    }
  } else if (bg.deco === 'beach') {
    ctx.fillStyle = '#ffd8a8'
    ctx.fillRect(0, h * 0.65, w, h * 0.35)
    ctx.fillStyle = '#4facfe'
    ctx.fillRect(0, 0, w, h * 0.42)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 3; i++) {
      const x = w * 0.2 + i * w * 0.3 + Math.sin(t * 0.4 + i) * 10
      ctx.beginPath()
      ctx.ellipse(x, h * 0.48, 40, 8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (bg.deco === 'savanna') {
    ctx.fillStyle = '#d2a679'
    ctx.fillRect(0, h * 0.68, w, h * 0.32)
    ctx.fillStyle = '#f5deb3'
    ctx.beginPath()
    ctx.arc(w * 0.85, h * 0.18, w * 0.08, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 3; i++) {
      const x = w * 0.2 + i * w * 0.3
      ctx.fillStyle = '#8b5a2b'
      ctx.fillRect(x - 3, h * 0.45, 6, h * 0.23)
      ctx.fillStyle = '#2d5016'
      ctx.beginPath()
      ctx.arc(x, h * 0.45, 26, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (bg.deco === 'ocean') {
    for (let i = 0; i < 4; i++) {
      const y = h * 0.5 + i * h * 0.12 + Math.sin(t * 0.6 + i) * 6
      ctx.fillStyle = `rgba(37,99,235,${0.25 + i * 0.15})`
      ctx.fillRect(0, y, w, 30)
    }
  } else if (bg.deco === 'mountains') {
    ctx.fillStyle = '#1e3a5f'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.55)
    for (let i = 0; i < 5; i++) {
      const x = w * 0.1 + i * w * 0.22
      const peak = h * 0.28 + Math.sin(i) * h * 0.08
      ctx.lineTo(x, peak)
      ctx.lineTo(x + w * 0.11, h * 0.55)
    }
    ctx.lineTo(w, h * 0.55)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e0f2fe'
    ctx.beginPath()
    ctx.ellipse(w * 0.82, h * 0.16, 50, 22, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (bg.deco === 'desert') {
    ctx.fillStyle = '#e09f3e'
    ctx.beginPath()
    ctx.ellipse(w * 0.3, h * 0.85, w * 0.5, h * 0.22, 0, 0, Math.PI * 2)
    ctx.ellipse(w * 0.8, h * 0.88, w * 0.45, h * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (bg.deco.includes('real')) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.9)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }

  return true
}

function drawBackground(ctx, scene, dims, t) {
  const { w, h } = dims
  if (scene.activeKidsBgId && drawKidsBackground(ctx, scene.activeKidsBgId, dims, t)) {
    if (scene.overlay > 0) {
      ctx.fillStyle = `rgba(0,0,0,${scene.overlay / 100})`
      ctx.fillRect(0, 0, w, h)
    }
    return
  }

  const scale = scene.kenBurns ? 1 + t * 0.06 : 1
  ctx.save()
  if (scale !== 1) {
    ctx.translate(w / 2, h / 2)
    ctx.scale(scale, scale)
    ctx.translate(-w / 2, -h / 2)
  }

  if (scene.bgType === 'image' && scene.bgImage) {
    const iw = scene.bgImage.width || 1
    const ih = scene.bgImage.height || 1
    const ratio = Math.max(w / iw, h / ih)
    const nw = iw * ratio
    const nh = ih * ratio
    ctx.drawImage(scene.bgImage, (w - nw) / 2, (h - nh) / 2, nw, nh)
  } else if (scene.bgType === 'solid') {
    ctx.fillStyle = scene.bgColor
    ctx.fillRect(0, 0, w, h)
  } else {
    const [c1, c2] = gradients[scene.bgType] || gradients.gradient1
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    const vg = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.4,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.9
    )
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()

  if (scene.overlay > 0) {
    ctx.fillStyle = `rgba(0,0,0,${scene.overlay / 100})`
    ctx.fillRect(0, 0, w, h)
  }

  const model = models.find((x) => x.id === scene.modelId)
  if (model && model.id === 'cinema') {
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    const grainBucket = Math.floor(t * 24)
    for (let i = 0; i < 120; i++) {
      const x = seededRandom(i * 12.7 + grainBucket * 3.1) * w
      const y = seededRandom(i * 29.3 + grainBucket * 7.7) * h
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    const bar = h * 0.06
    ctx.fillRect(0, 0, w, bar)
    ctx.fillRect(0, h - bar, w, bar)
  } else if (model && model.id === 'neon') {
    const ng = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.9)
    ng.addColorStop(0, 'rgba(255,20,147,0)')
    ng.addColorStop(1, 'rgba(138,43,226,0.22)')
    ctx.fillStyle = ng
    ctx.fillRect(0, 0, w, h)
  }
}

function drawParticles(ctx, dims, t) {
  const { w, h } = dims
  const count = w > 900 ? 40 : 22
  for (let i = 0; i < count; i++) {
    const x = (Math.sin(i * 1.7 + t * 0.6) * 0.5 + 0.5) * w
    const y = ((i * 0.13 + t * 0.08) % 1) * h
    const r = (Math.sin(i) + 1) * 1.5 + 1
    const alpha = 0.35 + Math.sin(t * 2 + i) * 0.2
    ctx.beginPath()
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawConfetti(ctx, dims, t) {
  const { w, h } = dims
  const palette = ['#ff2d55', '#ffd600', '#00e5ff', '#22c55e', '#8b5cf6']
  for (let i = 0; i < 30; i++) {
    const x = (Math.sin(i * 2.3 + t * 1.2) * 0.5 + 0.5) * w
    const y = ((i * 0.07 + t * 0.25) % 1) * h
    ctx.fillStyle = palette[i % palette.length]
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 2 + i)
    ctx.fillRect(-5, -3, 10, 6)
    ctx.restore()
  }
}

function drawCharacters(ctx, scene, dims, t, showSelection) {
  const { w, h } = dims
  scene.characters.forEach((ch, idx) => {
    const bounce = Math.sin(t * 3 + idx) * 8
    const wiggle = Math.sin(t * 4 + idx * 1.2) * 0.06
    const isSelected = showSelection && ch.id === scene.selectedCharId
    const isSticker = Boolean(ch.isSticker)
    const pulse = isSticker ? 1 + Math.sin(t * 6 + idx * 1.5) * 0.12 : 1
    const extraRot = isSticker ? Math.sin(t * 3 + idx) * 0.08 : 0

    ctx.save()
    ctx.translate(ch.x, ch.y + (scene.bubbles ? bounce : 0))
    ctx.rotate(ch.rot + extraRot + (scene.kidsStyle === 'cartoon' ? wiggle : 0))
    ctx.scale(pulse, pulse)

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(0, ch.size * 0.45, ch.size * 0.28, ch.size * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()

    if (ch.isPhoto && ch._img && ch._img.complete && ch._img.naturalWidth > 0) {
      const r = ch.size * 0.5
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.clip()
      const iw = ch._img.width || 1
      const ih = ch._img.height || 1
      const ratio = Math.max((r * 2) / iw, (r * 2) / ih)
      const nw = iw * ratio
      const nh = ih * ratio
      ctx.drawImage(ch._img, -nw / 2, -nh / 2, nw, nh)
      ctx.restore()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()

      // Concrete hex instead of invalid CSS custom property var(--accent)
      ctx.strokeStyle = ACCENT_COLOR
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, r + 2, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.font = `${ch.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (scene.kidsStyle === 'cartoon') {
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4
      }
      ctx.fillText(ch.emoji || '🧸', 0, 0)
      ctx.shadowBlur = 0
    }

    if (isSelected) {
      ctx.strokeStyle = ACCENT_COLOR
      ctx.lineWidth = 4
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.ellipse(0, 0, ch.size * 0.42, ch.size * 0.42, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = ACCENT_COLOR
      ctx.beginPath()
      ctx.arc(0, -ch.size * 0.45, 8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Speech bubble clamped inside canvas bounds
    if (scene.speech && t > 0.2) {
      const phrase = speechPhrases[(idx + Math.floor(t * 0.7)) % speechPhrases.length]
      ctx.save()
      ctx.font = `600 ${Math.max(12, Math.round(ch.size * 0.16))}px Nunito, Inter, sans-serif`
      const pad = 10
      const bw = ctx.measureText(phrase).width + pad * 2
      const bh = Math.max(24, ch.size * 0.24)
      const bx = clamp(ch.x + ch.size * 0.2, 8, Math.max(8, w - bw - 8))
      const by = clamp(ch.y - ch.size * 0.72, 8, Math.max(8, h - bh - 12))

      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#1a1a22'
      ctx.lineWidth = 2
      drawRoundedRect(ctx, bx, by, bw, bh, 12)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#1a1a22'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(phrase, bx + bw / 2, by + bh / 2)

      const tailX = clamp(ch.x, bx + 10, bx + bw - 10)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(tailX - 5, by + bh)
      ctx.lineTo(tailX, by + bh + 6)
      ctx.lineTo(tailX + 5, by + bh)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  })
}

function drawStrokes(ctx, strokes, currentStroke) {
  const all = currentStroke ? [...strokes, currentStroke] : strokes
  all.forEach((s) => {
    if (!s || !s.points || s.points.length < 2) return
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(s.points[0].x, s.points[0].y)
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x, s.points[i].y)
    }
    ctx.stroke()
  })
}

export function renderScene(ctx, scene, tProgress, options = {}) {
  const { showSelection = true } = options
  const dims = formats[scene.format] || formats['16:9']
  const { w, h } = dims

  drawBackground(ctx, scene, dims, tProgress)

  if (scene.particles) drawParticles(ctx, dims, tProgress)
  if (scene.confetti) drawConfetti(ctx, dims, tProgress)
  if (scene.bubbles && !scene.activeKidsBgId) {
    for (let i = 0; i < 10; i++) {
      const x = (Math.sin(i * 1.1 + tProgress) * 0.5 + 0.5) * w
      const y = ((i * 0.2 + tProgress * 0.05) % 1) * h
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawCharacters(ctx, scene, dims, tProgress, showSelection)
  drawStrokes(ctx, scene.strokes, scene.currentStroke)

  let titleAlpha = 1
  let titleY = 0
  let titleScale = 1
  let subtitleAlpha = 1
  let charCount = Infinity
  const t = tProgress
  const rawTitle = scene.title || ' '

  switch (scene.anim) {
    case 'fadeScale':
      titleAlpha = Math.min(1, t * 3)
      titleScale = 0.88 + titleAlpha * 0.12
      subtitleAlpha = Math.min(1, Math.max(0, (t - 0.25) * 3))
      break
    case 'typewriter':
      charCount = Math.floor(t * rawTitle.length * 1.4)
      subtitleAlpha = t > 0.6 ? Math.min(1, (t - 0.6) * 4) : 0
      break
    case 'slideUp':
      titleY = (1 - Math.min(1, t * 2.2)) * 60
      titleAlpha = Math.min(1, t * 2.5)
      subtitleAlpha = Math.min(1, Math.max(0, (t - 0.3) * 2))
      break
    case 'zoom':
      titleScale = 0.7 + Math.min(1, t * 2) * 0.3 + t * 0.03
      titleAlpha = Math.min(1, t * 2.8)
      subtitleAlpha = Math.min(1, Math.max(0, (t - 0.4) * 2.5))
      break
    case 'none':
    default:
      break
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Deterministic timeline-driven cursor blink instead of Date.now()
  const elapsedSec = t * (scene.duration || 4)
  let titleText = rawTitle
  if (scene.anim === 'typewriter') {
    const showCursor = charCount < rawTitle.length && Math.floor(elapsedSec * 2.5) % 2 === 0
    titleText = rawTitle.slice(0, charCount) + (showCursor ? '|' : '')
  }

  // Set exact title font BEFORE wrapText measurement so cartoon Nunito never overflows pills
  const isCartoonKids = scene.kidsStyle === 'cartoon' && Boolean(scene.activeKidsBgId)
  ctx.font = isCartoonKids
    ? `900 ${scene.titleSize}px Nunito, Manrope, sans-serif`
    : `800 ${scene.titleSize}px Manrope, Inter, sans-serif`

  ctx.fillStyle = scene.textColor
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6

  const maxW = w * 0.84
  const lines = wrapText(ctx, titleText, maxW)
  const lineH = scene.titleSize * 1.08
  const totalH = lines.length * lineH
  let centerY = h / 2 - (scene.subtitle ? 22 : 0)
  if (scene.format === '9:16') centerY = h * 0.38
  const startY = centerY - totalH / 2 + lineH / 2 + titleY

  ctx.save()
  if (titleScale !== 1) {
    ctx.translate(w / 2, centerY)
    ctx.scale(titleScale, titleScale)
    ctx.translate(-w / 2, -centerY)
  }
  ctx.globalAlpha = titleAlpha

  if (scene.activeKidsBgId) {
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 2
    lines.forEach((ln, i) => {
      const y = startY + i * lineH
      const tw = ctx.measureText(ln).width
      const x = w / 2 - tw / 2 - 16
      drawRoundedRect(ctx, x, y - lineH * 0.48, tw + 32, lineH * 0.92, 16)
      ctx.fill()
      ctx.stroke()
    })
    ctx.fillStyle = '#1a1a22'
  }

  lines.forEach((ln, i) => {
    ctx.fillText(ln, w / 2, startY + i * lineH)
  })
  ctx.restore()

  // Multi-line wrapped subtitle inside adaptive pill
  if (scene.subtitle) {
    ctx.save()
    ctx.shadowBlur = scene.activeKidsBgId ? 0 : 10
    ctx.shadowOffsetY = 3
    ctx.globalAlpha = subtitleAlpha
    ctx.font = `500 ${scene.subSize}px Inter, sans-serif`

    const subMaxW = w * 0.8
    const subLines = wrapText(ctx, scene.subtitle, subMaxW)
    const subLineH = scene.subSize * 1.25
    const subTotalH = subLines.length * subLineH
    const maxSubWidth = subLines.reduce((m, ln) => Math.max(m, ctx.measureText(ln).width), 0)
    const pillW = Math.min(maxSubWidth + 32, w * 0.86)
    const pillH = subTotalH + 16
    const subTopY = centerY + totalH / 2 + 20 + titleY
    const pillCenterY = subTopY + pillH / 2

    if (scene.activeKidsBgId) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      drawRoundedRect(ctx, w / 2 - pillW / 2, subTopY, pillW, pillH, 20)
      ctx.fill()
      ctx.fillStyle = '#1a1a22'
    } else {
      if (scene.bgType !== 'solid' || scene.bgColor === '#0a0a0f') {
        ctx.fillStyle = 'rgba(255,255,255,0.14)'
        drawRoundedRect(ctx, w / 2 - pillW / 2, subTopY, pillW, pillH, 20)
        ctx.fill()
      }
      ctx.fillStyle = scene.textColor === '#ffffff' ? 'rgba(255,255,255,0.92)' : scene.textColor
    }

    const firstSubY = pillCenterY - subTotalH / 2 + subLineH / 2
    subLines.forEach((ln, idx) => {
      ctx.fillText(ln, w / 2, firstSubY + idx * subLineH)
    })
    ctx.restore()
  }

  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  if (scene.watermark) {
    ctx.font = '600 13px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'right'
    ctx.fillText('probable-robot • kids', w - 18, h - 18)
    ctx.textAlign = 'center'
  }
}
