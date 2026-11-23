// Рендер новогоднего мини-фильма: сцены + Ken Burns + мягкие наплывы + снег + звук + титр.
// node film/render.mjs            -> 16:9  film/new_year_brothers.mp4
// FORMAT=v node film/render.mjs   -> 9:16  film/new_year_brothers_vertical.mp4
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const VERTICAL = (process.env.FORMAT || 'h').toLowerCase().startsWith('v')
const FF = process.env.FF || '/tmp/ffmpeg'
const W = VERTICAL ? 1080 : 1920
const H = VERTICAL ? 1920 : 1080
const FPS = 30
const XF = 0.7
const OUT = VERTICAL ? 'film/new_year_brothers_vertical.mp4' : 'film/new_year_brothers.mp4'

mkdirSync('film/build', { recursive: true })
GlobalFonts.registerFromPath('film/fonts/CormorantGaramond.ttf', 'Title')

// --- подготовка аудио ---
for (const v of ['voA', 'voB', 'voC', 'voD']) {
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', `film/audio/${v}.mp3`,
    '-ar', '48000', '-ac', '2', `film/build/${v}.wav`])
}

const SHOTS = VERTICAL
  ? [
      { file: 'v1_morning', dur: 10.5, mode: 'in', pan: [0.0, 0.004] },
      { file: 'v2_decorate', dur: 9.5, mode: 'out', pan: [0.0, -0.004] },
      { file: 'v3_play', dur: 10.5, mode: 'in', pan: [0.004, 0.0] },
      { file: 'v4_evening', dur: 10.5, mode: 'out', pan: [-0.004, 0.0] },
      { file: 'v5_final', dur: 12.5, mode: 'in', pan: [0.0, 0.0] },
      { file: 'v6_lights', dur: 10.5, mode: 'out', pan: [0.003, 0.0] },
    ]
  : [
      { file: 's1_morning', dur: 9.0, mode: 'in', pan: [0.0, 0.003] },
      { file: 's2_decorate', dur: 8.0, mode: 'out', pan: [0.004, 0.0] },
      { file: 's2b_hands', dur: 5.5, mode: 'in', pan: [0.0, 0.0] },
      { file: 's3_play', dur: 9.0, mode: 'in', pan: [-0.003, 0.0] },
      { file: 's4_evening', dur: 8.0, mode: 'out', pan: [0.0, -0.003] },
      { file: 's4b_faces', dur: 5.5, mode: 'in', pan: [0.003, 0.0] },
      { file: 's5_final', dur: 11.0, mode: 'in', pan: [0.0, 0.0] },
      { file: 's6_lights', dur: 9.0, mode: 'out', pan: [0.002, 0.0] },
    ]

let t = 0
for (const s of SHOTS) {
  s.start = t
  s.end = t + s.dur
  t = s.end - XF
}
const TOTAL = SHOTS[SHOTS.length - 1].end
console.log(`${VERTICAL ? '9:16' : '16:9'} duration: ${TOTAL.toFixed(2)}s`)

execFileSync('node', ['film/make-music.mjs', 'film/build/music.wav', String(Math.ceil(TOTAL) + 4)], { stdio: 'inherit' })

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

// --- снег ---
const sprites = [1.6, 2.6, 4.2, 6.5].map((r) => {
  const c = createCanvas(Math.ceil(r * 6) + 4, Math.ceil(r * 6) + 4)
  const x = c.getContext('2d')
  const cx = c.width / 2
  const g = x.createRadialGradient(cx, cx, 0, cx, cx, c.width / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.42, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.beginPath()
  x.arc(cx, cx, c.width / 2, 0, Math.PI * 2)
  x.fill()
  return { img: c, r }
})
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const rand = rnd(7)
const flakes = []
const FLAKES = VERTICAL ? 240 : 190
for (let i = 0; i < FLAKES; i++) {
  const depth = i < FLAKES * 0.59 ? 0 : i < FLAKES * 0.93 ? 1 : 2
  flakes.push({
    x: rand() * W,
    y: rand() * H,
    d: depth,
    r: depth === 0 ? 0.9 + rand() * 1.4 : depth === 1 ? 1.5 + rand() * 1.8 : 2.6 + rand() * 2.4,
    sp: (depth === 0 ? 60 : depth === 1 ? 105 : 190) * (0.75 + rand() * 0.5),
    drift: 18 + rand() * 46,
    ph: rand() * Math.PI * 2,
    a: depth === 0 ? 0.35 + rand() * 0.3 : depth === 1 ? 0.5 + rand() * 0.3 : 0.1 + rand() * 0.1,
  })
}

// --- зерно ---
const grain = []
for (let k = 0; k < 3; k++) {
  const g = createCanvas(480, 270)
  const gx = g.getContext('2d')
  const img = gx.createImageData(480, 270)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 120
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  gx.putImageData(img, 0, 0)
  grain.push(g)
}

// --- виньетка и тёплый грейд ---
const vign = createCanvas(W, H)
{
  const vx = vign.getContext('2d')
  const g = vx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.78)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.65, 'rgba(0,0,0,0.13)')
  g.addColorStop(1, 'rgba(0,0,0,0.44)')
  vx.fillStyle = g
  vx.fillRect(0, 0, W, H)
}
const warmth = createCanvas(W, H)
{
  const wx = warmth.getContext('2d')
  const g = wx.createLinearGradient(0, 0, W * 0.9, H)
  g.addColorStop(0, 'rgba(255,196,120,0.5)')
  g.addColorStop(0.6, 'rgba(255,150,90,0.22)')
  g.addColorStop(1, 'rgba(60,90,150,0.30)')
  wx.fillStyle = g
  wx.fillRect(0, 0, W, H)
}

// --- титр ---
const TITLE_AT = TOTAL - 8.0
const TITLE = { line1: 'С Новым годом!', line2: 'Марк и Ваня' }
const titleBackdrop = createCanvas(W, H)
{
  const bx = titleBackdrop.getContext('2d')
  // мягкая тёмная «вуаль» под титром, без видимых краёв
  const cy = VERTICAL ? H * 0.20 : H * 0.40
  const rx = W * 0.62
  const ry = VERTICAL ? H * 0.30 : H * 0.34
  const g = bx.createRadialGradient(W / 2, cy, 10, W / 2, cy, Math.max(rx, ry))
  g.addColorStop(0, 'rgba(2,5,10,0.66)')
  g.addColorStop(0.35, 'rgba(2,5,10,0.48)')
  g.addColorStop(0.7, 'rgba(2,5,10,0.18)')
  g.addColorStop(1, 'rgba(2,5,10,0)')
  bx.save()
  bx.translate(W / 2, cy)
  bx.scale(1, ry / rx)
  bx.translate(-W / 2, -cy)
  bx.fillStyle = g
  bx.fillRect(-W, cy - rx * 1.6, W * 3, rx * 3.2)
  bx.restore()
}

function drawSpacedText(text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)
  let x = cx - total / 2
  ctx.textAlign = 'left'
  ;[...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y)
    x += widths[i] + spacing
  })
}

function drawTitle(time) {
  if (time < TITLE_AT) return
  const p = Math.min(1, (time - TITLE_AT) / 1.8)
  const e = p * p * (3 - 2 * p)
  ctx.save()
  ctx.globalAlpha = e
  ctx.drawImage(titleBackdrop, 0, 0)

  const mainSize = VERTICAL ? 104 : 138
  const subSize = VERTICAL ? 40 : 48
  const cx = W / 2
  const mainY = VERTICAL ? H * 0.20 : H * 0.40 + (1 - e) * 14
  const subY = mainY + (VERTICAL ? 110 : 128)

  // мягкое золотое свечение позади
  const glow = ctx.createRadialGradient(cx, mainY - mainSize * 0.3, 10, cx, mainY - mainSize * 0.3, W * 0.45)
  glow.addColorStop(0, 'rgba(255,196,110,0.16)')
  glow.addColorStop(1, 'rgba(255,196,110,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, mainY - H * 0.35, W, H * 0.7)

  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,0.75)'
  ctx.shadowBlur = 26 * e
  ctx.fillStyle = '#f7e6c2'
  ctx.font = `600 ${mainSize}px Title`
  drawSpacedText(TITLE.line1, cx, mainY, VERTICAL ? 1.5 : 2.5)

  // тонкая линия-разделитель
  const lineW = (VERTICAL ? 160 : 210) * e
  const lineY = mainY + (VERTICAL ? 50 : 62)
  const lg = ctx.createLinearGradient(cx - lineW, 0, cx + lineW, 0)
  lg.addColorStop(0, 'rgba(240,205,145,0)')
  lg.addColorStop(0.5, 'rgba(240,205,145,0.85)')
  lg.addColorStop(1, 'rgba(240,205,145,0)')
  ctx.strokeStyle = lg
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(cx - lineW, lineY)
  ctx.lineTo(cx + lineW, lineY)
  ctx.stroke()

  ctx.shadowColor = 'rgba(255,180,90,0.45)'
  ctx.shadowBlur = 22 * e
  ctx.fillStyle = 'rgba(250,238,214,0.96)'
  ctx.font = `500 ${subSize}px Title`
  drawSpacedText(TITLE.line2, cx, subY, 3.5)
  ctx.restore()

  // лёгкая золотая подсветка строки заголовка
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = e * 0.5
  ctx.shadowColor = 'rgba(255,186,96,0.9)'
  ctx.shadowBlur = 46 * e
  ctx.fillStyle = 'rgba(255,206,140,0.55)'
  ctx.font = `600 ${mainSize}px Title`
  drawSpacedText(TITLE.line1, cx, mainY, VERTICAL ? 1.5 : 2.5)
  ctx.restore()
}

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

const images = {}
for (const s of SHOTS) images[s.file] = await loadImage(`film/frames/${s.file}.jpg`)

function drawShot(shot, time, alpha) {
  const p = Math.min(1, Math.max(0, (time - shot.start) / shot.dur))
  const e = easeInOut(p)
  const zoomStart = shot.mode === 'in' ? 1.02 : 1.13
  const zoomEnd = shot.mode === 'in' ? 1.13 : 1.02
  const zoom = zoomStart + (zoomEnd - zoomStart) * e

  const img = images[shot.file]
  const target = W / H
  let sw = img.width
  let sh = img.width / target
  if (sh > img.height) {
    sh = img.height
    sw = sh * target
  }
  const vw = sw / zoom
  const vh = sh / zoom
  const maxDX = (sw - vw) / 2
  const maxDY = (sh - vh) / 2
  const sx = (sw - vw) / 2 + maxDX * (shot.pan[0] / 0.004) * e
  const sy = (sh - vh) / 2 + maxDY * (shot.pan[1] / 0.004) * e

  ctx.globalAlpha = alpha
  ctx.drawImage(img, sx, sy, vw, vh, 0, 0, W, H)
  ctx.globalAlpha = 1
}

function renderFrame(frameIndex) {
  const time = frameIndex / FPS
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#05060a'
  ctx.fillRect(0, 0, W, H)

  const active = SHOTS.filter((s) => time >= s.start - 0.001 && time <= s.end + 0.001)
  if (active.length === 1) {
    drawShot(active[0], time, 1)
  } else if (active.length >= 2) {
    const k = Math.min(1, Math.max(0, (time - active[1].start) / XF))
    drawShot(active[0], time, 1)
    drawShot(active[1], time, easeInOut(k))
  }

  // тёплый грейд
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.5
  ctx.drawImage(warmth, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.drawImage(vign, 0, 0)

  // снег
  ctx.globalCompositeOperation = 'lighter'
  for (const f of flakes) {
    const y = (f.y + time * f.sp) % (H + 60) - 30
    const x = f.x + Math.sin(time * 0.6 + f.ph) * f.drift
    const size = f.r * 6
    ctx.globalAlpha = f.a
    ctx.drawImage(sprites[0].img, x - size / 2, y - size / 2, size, size)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.045
  ctx.drawImage(grain[frameIndex % 3], 0, 0, W, H)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  drawTitle(time)

  const fadeIn = Math.min(1, time / 1.2)
  const fadeOut = Math.min(1, Math.max(0, (TOTAL - time) / 2.4))
  const fade = Math.min(fadeIn, fadeOut)
  if (fade < 1) {
    ctx.globalAlpha = 1 - fade
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }
}

// --- видео ---
const totalFrames = Math.round(TOTAL * FPS)
const ff = spawn(FF, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', VERTICAL ? 20 : 19, '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', 'film/build/video.mp4',
], { stdio: ['pipe', 'inherit', 'inherit'] })

const writeFrame = (buf) => new Promise((res) => {
  if (ff.stdin.write(buf)) res()
  else ff.stdin.once('drain', res)
})

for (let i = 0; i < totalFrames; i++) {
  renderFrame(i)
  const data = ctx.getImageData(0, 0, W, H).data
  await writeFrame(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
  if (i % 150 === 0) process.stdout.write(`frame ${i}/${totalFrames}\n`)
}
ff.stdin.end()
await new Promise((res) => ff.on('close', res))
console.log('video ready')

// --- звук ---
function readWav(path) {
  const b = readFileSync(path)
  let off = 12
  let fmt = null
  let data = null
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4)
    const size = b.readUInt32LE(off + 4)
    if (id === 'fmt ') fmt = b.subarray(off + 8, off + 8 + size)
    if (id === 'data') data = b.subarray(off + 8, off + 8 + size)
    off += 8 + size + (size % 2)
  }
  const ch = fmt.readUInt16LE(2)
  const sr = fmt.readUInt32LE(4)
  const bits = fmt.readUInt16LE(14)
  const n = data.length / (ch * (bits / 8))
  const out = new Float32Array(n * ch)
  for (let i = 0; i < n * ch; i++) out[i] = data.readInt16LE(i * 2) / 32768
  return { sr, ch, data: out }
}

function toStereo48k(w) {
  if (w.sr === 48000 && w.ch === 2) return w.data
  const n = Math.ceil((w.data.length / w.ch) * (48000 / w.sr))
  const out = new Float32Array(n * 2)
  const frames = w.data.length / w.ch
  for (let i = 0; i < n; i++) {
    const srcPos = (i * w.sr) / 48000
    const i0 = Math.floor(srcPos)
    const i1 = Math.min(i0 + 1, frames - 1)
    const fr = srcPos - i0
    for (let c = 0; c < 2; c++) {
      const sc = Math.min(c, w.ch - 1)
      const a = w.data[i0 * w.ch + sc] || 0
      const b = w.data[i1 * w.ch + sc] || 0
      out[i * 2 + c] = a + (b - a) * fr
    }
  }
  return out
}

const SR = 48000
const N = Math.ceil(TOTAL * SR)
const voice = new Float32Array(N * 2)
const VOs = {}
for (const v of ['voA', 'voB', 'voC', 'voD']) VOs[v] = toStereo48k(readWav(`film/build/${v}.wav`))

function place(src, atSec, gain = 1) {
  const startFrame = Math.floor(atSec * SR)
  const frames = src.length / 2
  for (let f = 0; f < frames; f++) {
    const dst = startFrame + f
    if (dst >= N) break
    voice[dst * 2] += src[f * 2] * gain
    voice[dst * 2 + 1] += src[f * 2 + 1] * gain
  }
}

// раскладка реплик под сцены конкретного формата
const CUES = VERTICAL
  ? [['voA', 2.6], ['voB', 16.4], ['voC', 33.4], ['voD', 45.4]]
  : [['voA', 2.4], ['voB', 16.6], ['voC', 36.6], ['voD', 46.8]]
for (const [name, at] of CUES) place(VOs[name], at, name === 'voD' ? 1.06 : 1.0)
console.log('voice:', CUES.map(([n, a]) => `${n}@${a}s`).join(' '))

// огибающая голоса
const env = new Float32Array(N)
const win = Math.floor(SR * 0.02)
for (let i = 0; i < N; i += win) {
  let s = 0
  const lim = Math.min(N, i + win)
  for (let j = i; j < lim; j++) s += (voice[j * 2] * voice[j * 2] + voice[j * 2 + 1] * voice[j * 2 + 1]) * 0.5
  const rms = Math.sqrt(s / Math.max(1, lim - i))
  const v = Math.min(1, rms / 0.06)
  for (let j = i; j < lim; j++) env[j] = v
}
const smooth = new Float32Array(N)
let cur = 0
for (let i = 0; i < N; i++) {
  const target = env[i]
  cur += (target - cur) * (target > cur ? 0.02 : 0.0016)
  smooth[i] = cur
}

const music = toStereo48k(readWav('film/build/music.wav'))
const out = new Float32Array(N * 2)
let peak = 0
for (let i = 0; i < N; i++) {
  const duck = 1 - 0.6 * Math.min(1, smooth[i] * 1.6)
  const mg = 0.46 * duck
  for (let c = 0; c < 2; c++) {
    let v = (voice[i * 2 + c] || 0) + (music[i * 2 + c] || 0) * mg
    v = Math.tanh(v * 1.05) * 0.92
    out[i * 2 + c] = v
    peak = Math.max(peak, Math.abs(v))
  }
}
const norm = 0.94 / (peak || 1)
const pcm = Buffer.alloc(44 + N * 4)
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVE', 8)
pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22)
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34)
pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N * 2; i++) {
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(out[i] * norm * 32767))), 44 + i * 2)
}
writeFileSync('film/build/mix.wav', pcm)
console.log('audio ready')

await new Promise((res, rej) => {
  const p = spawn(FF, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', 'film/build/video.mp4', '-i', 'film/build/mix.wav',
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT,
  ], { stdio: 'inherit' })
  p.on('close', (c) => (c === 0 ? res() : rej(new Error('mux failed ' + c))))
})
console.log('done:', OUT)
