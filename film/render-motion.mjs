// «Живая» версия: между ключевыми кадрами каждой сцены — оптическая интерполяция
// (ffmpeg minterpolate), поэтому руки, головы и позы реально движутся.
// node film/render-motion.mjs            -> film/new_year_brothers_live.mp4 (16:9)
// FORMAT=v node film/render-motion.mjs   -> film/new_year_brothers_live_vertical.mp4
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'

const VERTICAL = (process.env.FORMAT || 'h').toLowerCase().startsWith('v')
const FF = process.env.FF || '/tmp/ffmpeg'
const W = VERTICAL ? 1080 : 1920
const H = VERTICAL ? 1920 : 1080
const FPS = 30
const XF = 0.7
const OUT = VERTICAL
  ? 'film/new_year_brothers_live_vertical.mp4'
  : 'film/new_year_brothers_live.mp4'
const BUILD = 'film/build-motion'

mkdirSync(BUILD, { recursive: true })
GlobalFonts.registerFromPath('film/fonts/CormorantGaramond.ttf', 'Title')

// сцены: список ключевых кадров + длительности удержания на каждом
// pause = сколько секунд «стоим» на кадре (для тайминга реплик)
const SCENES = [
  {
    name: 's1', dur: 11.0, pause: 1.5,
    frames: ['film/frames/s1_morning.jpg', 'film/motion/s1_a.jpg', 'film/motion/s1_b.jpg'],
    pan: [0, 0.0025],
  },
  {
    name: 's2', dur: 9.5, pause: 1.2,
    frames: ['film/frames/s2_decorate.jpg', 'film/motion/s2_a.jpg', 'film/motion/s2_b.jpg'],
    pan: [-0.0025, 0],
  },
  {
    name: 's3', dur: 11.0, pause: 1.5,
    frames: ['film/frames/s3_play.jpg', 'film/motion/s3_a.jpg', 'film/motion/s3_b.jpg'],
    pan: [0.0025, 0],
  },
  {
    name: 's4', dur: 10.0, pause: 1.6,
    frames: ['film/frames/s4_evening.jpg', 'film/motion/s4_a.jpg', 'film/motion/s4_b.jpg'],
    pan: [0, -0.0025],
  },
  {
    name: 's5', dur: 10.5, pause: 1.4,
    frames: ['film/frames/s5_final.jpg', 'film/motion/s5_a.jpg', 'film/motion/s5_b.jpg'],
    pan: [0, 0],
  },
  {
    name: 's6', dur: 9.0, pause: 0,
    frames: ['film/frames/s6_lights.jpg'],
    pan: [0.002, 0],
  },
]

let t = 0
for (const s of SCENES) {
  s.start = t
  s.end = t + s.dur
  t = s.end - XF
}
const TOTAL = SCENES[SCENES.length - 1].end
console.log(`${VERTICAL ? '9:16' : '16:9'} live duration: ${TOTAL.toFixed(2)}s`)

// --- 1. Собираем «живые» потоки сцен через minterpolate ---
const SCALE = VERTICAL ? '1080:1920' : '1920:1080'
for (const s of SCENES) {
  const out = `${BUILD}/${s.name}.mp4`
  if (s.frames.length === 1) {
    // статичный план — только медленный Ken Burns
    const z = 'zoompan=z=min(zoom+0.00035\\,1.08):x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)'
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', s.frames[0],
      '-vf', `scale=${VERTICAL ? '900:1600' : '2400:1350'}:flags=lanczos,crop=${VERTICAL ? '900:1600' : '2400:1350'},${z}:d=${Math.round(s.dur * FPS)}:s=${W}x${H}:fps=${FPS},setsar=1`,
      '-t', String(s.dur), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', out])
    console.log(s.name, 'static ok')
    continue
  }

  const n = s.frames.length
  // ключевые кадры держим по pause секунд, между ними minterpolate вставляет движение
  const hold = s.pause
  const args = []
  for (const f of s.frames) args.push('-loop', '1', '-t', String(hold), '-i', f)
  const parts = []
  const labels = []
  s.frames.forEach((f, i) => {
    parts.push(`[${i}:v]scale=${SCALE}:flags=lanczos,setsar=1,fps=${FPS},trim=duration=${hold},setpts=PTS-STARTPTS[k${i}]`)
    labels.push(`[k${i}]`)
  })
  const concat = `${labels.join('')}concat=n=${n}:v=1:a=0,minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p[v]`
  const graph = parts.join(';') + ';' + concat
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args,
    '-filter_complex', graph, '-map', '[v]',
    '-t', String(n * hold), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', out])
  console.log(s.name, 'morph ok', `${n} keys x ${hold}s`)
}

// --- 2. Компоновка: сцены + наплывы + грейд + снег + титр ---
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

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
  return c
})
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const rand = rnd(11)
const flakes = []
for (let i = 0; i < (VERTICAL ? 240 : 190); i++) {
  const depth = i < 120 ? 0 : i < 176 ? 1 : 2
  flakes.push({
    x: rand() * W, y: rand() * H, d: depth,
    r: depth === 0 ? 0.9 + rand() * 1.4 : depth === 1 ? 1.5 + rand() * 1.8 : 2.6 + rand() * 2.4,
    sp: (depth === 0 ? 60 : depth === 1 ? 105 : 190) * (0.75 + rand() * 0.5),
    drift: 18 + rand() * 46, ph: rand() * Math.PI * 2,
    a: depth === 0 ? 0.3 + rand() * 0.28 : depth === 1 ? 0.45 + rand() * 0.28 : 0.09 + rand() * 0.09,
  })
}
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
const vign = createCanvas(W, H)
{
  const vx = vign.getContext('2d')
  const g = vx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.78)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.65, 'rgba(0,0,0,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0.42)')
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

const TITLE_AT = TOTAL - 8.0
function drawSpacedText(text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)
  let x = cx - total / 2
  ctx.textAlign = 'left'
  ;[...text].forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + spacing })
}
function drawTitle(time) {
  if (time < TITLE_AT) return
  const p = Math.min(1, (time - TITLE_AT) / 1.8)
  const e = p * p * (3 - 2 * p)
  const mainSize = VERTICAL ? 104 : 138
  const subSize = VERTICAL ? 40 : 48
  const cx = W / 2
  const mainY = VERTICAL ? H * 0.20 : H * 0.40 + (1 - e) * 14
  const subY = mainY + (VERTICAL ? 110 : 128)

  ctx.save()
  ctx.globalAlpha = e
  const glow = ctx.createRadialGradient(cx, mainY, 10, cx, mainY, Math.max(W * 0.62, H * 0.34))
  glow.addColorStop(0, 'rgba(2,5,10,0.66)')
  glow.addColorStop(0.35, 'rgba(2,5,10,0.48)')
  glow.addColorStop(0.7, 'rgba(2,5,10,0.18)')
  glow.addColorStop(1, 'rgba(2,5,10,0)')
  ctx.save()
  ctx.translate(cx, mainY)
  ctx.scale(1, (VERTICAL ? H * 0.30 : H * 0.34) / (W * 0.62))
  ctx.translate(-cx, -mainY)
  ctx.fillStyle = glow
  ctx.fillRect(-W, mainY - W * 0.62 * 1.6, W * 3, W * 0.62 * 3.2)
  ctx.restore()

  ctx.shadowColor = 'rgba(0,0,0,0.75)'
  ctx.shadowBlur = 26 * e
  ctx.fillStyle = '#f7e6c2'
  ctx.font = `600 ${mainSize}px Title`
  drawSpacedText('С Новым годом!', cx, mainY, VERTICAL ? 1.5 : 2.5)

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
  drawSpacedText('Марк и Ваня', cx, subY, 3.5)
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = e * 0.5
  ctx.shadowColor = 'rgba(255,186,96,0.9)'
  ctx.shadowBlur = 46 * e
  ctx.fillStyle = 'rgba(255,206,140,0.55)'
  ctx.font = `600 ${mainSize}px Title`
  drawSpacedText('С Новым годом!', cx, mainY, VERTICAL ? 1.5 : 2.5)
  ctx.restore()
}

// кадры каждой сцены раскладываем в JPEG на диск — экономно по памяти
for (const s of SCENES) {
  const dir = `${BUILD}/frames_${s.name}`
  if (!existsSync(`${dir}/f00000.jpg`)) {
    mkdirSync(dir, { recursive: true })
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${BUILD}/${s.name}.mp4`,
      '-q:v', '2', `${dir}/f%05d.jpg`])
  }
  s.framesDir = dir
  s.frameCount = readdirSync(dir).length
  console.log(`extracted ${s.name}: ${s.frameCount} frames`)
}

const imgCache = new Map()
async function grab(shot, localTime) {
  const idx = Math.min(shot.frameCount - 1, Math.max(0, Math.floor(localTime * FPS)))
  const path = `${shot.framesDir}/f${String(idx + 1).padStart(5, '0')}.jpg`
  if (!imgCache.has(path)) {
    if (imgCache.size > 40) imgCache.delete(imgCache.keys().next().value)
    imgCache.set(path, await loadImage(path))
  }
  return imgCache.get(path)
}


function paintRaw(img, alpha) {
  ctx.globalAlpha = alpha
  ctx.drawImage(img, 0, 0, W, H)
  ctx.globalAlpha = 1
}

async function renderFrame(frameIndex) {
  const time = frameIndex / FPS
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#05060a'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 1

  const active = SCENES.filter((s) => time >= s.start - 0.001 && time <= s.end + 0.001)
  if (active.length === 1) {
    const s = active[0]
    paintRaw(await grab(s, time - s.start), 1)
  } else if (active.length >= 2) {
    const a = active[0]
    const b = active[1]
    const k = Math.min(1, Math.max(0, (time - b.start) / XF))
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    paintRaw(await grab(a, time - a.start), 1)
    paintRaw(await grab(b, time - b.start), e)
  }

  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.45
  ctx.drawImage(warmth, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.drawImage(vign, 0, 0)

  ctx.globalCompositeOperation = 'lighter'
  for (const f of flakes) {
    const y = (f.y + time * f.sp) % (H + 60) - 30
    const x = f.x + Math.sin(time * 0.6 + f.ph) * f.drift
    const size = f.r * 6
    ctx.globalAlpha = f.a
    ctx.drawImage(sprites[0], x - size / 2, y - size / 2, size, size)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.04
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

const totalFrames = Math.round(TOTAL * FPS)
const ff = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', `${BUILD}/video.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] })
const writeFrame = (buf) => new Promise((res) => {
  if (ff.stdin.write(buf)) res()
  else ff.stdin.once('drain', res)
})
for (let i = 0; i < totalFrames; i++) {
  await renderFrame(i)
  const data = ctx.getImageData(0, 0, W, H).data
  await writeFrame(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
  if (i % 150 === 0) process.stdout.write(`frame ${i}/${totalFrames}\n`)
}
ff.stdin.end()
await new Promise((res) => ff.on('close', res))
console.log('video ready')

// --- 3. Звук (та же схема, что в основном рендере) ---
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'film/build/music.wav',
  '-t', String(Math.ceil(TOTAL) + 2), `${BUILD}/music.wav`])
for (const v of ['voA', 'voB', 'voC', 'voD']) {
  if (!existsSync(`${BUILD}/${v}.wav`)) {
    execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', `film/audio/${v}.mp3`,
      '-ar', '48000', '-ac', '2', `${BUILD}/${v}.wav`])
  }
}

function readWav(path) {
  const b = readFileSync(path)
  let off = 12, fmt = null, data = null
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4)
    const size = b.readUInt32LE(off + 4)
    if (id === 'fmt ') fmt = b.subarray(off + 8, off + 8 + size)
    if (id === 'data') data = b.subarray(off + 8, off + 8 + size)
    off += 8 + size + (size % 2)
  }
  const ch = fmt.readUInt16LE(2), sr = fmt.readUInt32LE(4), bits = fmt.readUInt16LE(14)
  const n = data.length / (ch * (bits / 8))
  const out = new Float32Array(n * ch)
  for (let i = 0; i < n * ch; i++) out[i] = data.readInt16LE(i * 2) / 32768
  return { sr, ch, data: out }
}
function toStereo48k(w) {
  if (w.sr === 48000 && w.ch === 2) return w.data
  const frames = w.data.length / w.ch
  const n = Math.ceil(frames * (48000 / w.sr))
  const out = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const srcPos = (i * w.sr) / 48000
    const i0 = Math.floor(srcPos), i1 = Math.min(i0 + 1, frames - 1), fr = srcPos - i0
    for (let c = 0; c < 2; c++) {
      const sc = Math.min(c, w.ch - 1)
      const a = w.data[i0 * w.ch + sc] || 0, b = w.data[i1 * w.ch + sc] || 0
      out[i * 2 + c] = a + (b - a) * fr
    }
  }
  return out
}
const SR = 48000
const N = Math.ceil(TOTAL * SR)
const voice = new Float32Array(N * 2)
const VOs = {}
for (const v of ['voA', 'voB', 'voC', 'voD']) VOs[v] = toStereo48k(readWav(`${BUILD}/${v}.wav`))
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
const CUES = [['voA', 3.0], ['voB', 14.4], ['voC', 33.0], ['voD', 46.0]]
for (const [name, at] of CUES) place(VOs[name], at, name === 'voD' ? 1.06 : 1)
console.log('voice:', CUES.map(([n, a]) => `${n}@${a}s`).join(' '))

const env = new Float32Array(N)
const win = Math.floor(SR * 0.02)
for (let i = 0; i < N; i += win) {
  let s = 0
  const lim = Math.min(N, i + win)
  for (let j = i; j < lim; j++) s += (voice[j * 2] ** 2 + voice[j * 2 + 1] ** 2) * 0.5
  const rms = Math.sqrt(s / Math.max(1, lim - i))
  const v = Math.min(1, rms / 0.06)
  for (let j = i; j < lim; j++) env[j] = v
}
const smooth = new Float32Array(N)
let cur = 0
for (let i = 0; i < N; i++) {
  cur += (env[i] - cur) * (env[i] > cur ? 0.02 : 0.0016)
  smooth[i] = cur
}
const music = toStereo48k(readWav(`${BUILD}/music.wav`))
const out = new Float32Array(N * 2)
let peak = 0
for (let i = 0; i < N; i++) {
  const mg = 0.46 * (1 - 0.6 * Math.min(1, smooth[i] * 1.6))
  for (let c = 0; c < 2; c++) {
    const v = Math.tanh(((voice[i * 2 + c] || 0) + (music[i * 2 + c] || 0) * mg) * 1.05) * 0.92
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
writeFileSync(`${BUILD}/mix.wav`, pcm)
console.log('audio ready')

await new Promise((res, rej) => {
  const p = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y',
    '-i', `${BUILD}/video.mp4`, '-i', `${BUILD}/mix.wav`,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' })
  p.on('close', (c) => (c === 0 ? res() : rej(new Error('mux failed ' + c))))
})
console.log('done:', OUT)
