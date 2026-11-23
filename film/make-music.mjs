// Праздничная подложка: «музыкальная шкатулка» + глокеншпиль-мелодия + бубенцы.
// Генерируется локально, без сэмплов.
// node film/make-music.mjs film/build/music.wav 64
import { writeFileSync } from 'node:fs'

const outPath = process.argv[2] || 'film/build/music.wav'
const TOTAL = Number(process.argv[3] || 64)
const SR = 44100
const N = Math.ceil(SR * TOTAL)
const L = new Float32Array(N)
const R = new Float32Array(N)

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const note = (name) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name)
  const semi = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12
  return 440 * Math.pow(2, (semi - 69) / 12)
}

function add(idx, v, gain, pan) {
  L[idx] += v * gain * Math.cos((pan + 1) * Math.PI / 4)
  R[idx] += v * gain * Math.sin((pan + 1) * Math.PI / 4)
}

// Колокольчик / глокеншпиль
function bell(freq, start, dur, gain, pan = 0, decay = 2.9) {
  const s0 = Math.floor(start * SR)
  const len = Math.min(Math.floor(dur * SR), N - s0)
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const env = Math.exp(-decay * t) * (1 - Math.exp(-t * 900))
    const v = Math.sin(2 * Math.PI * freq * t) +
      0.3 * Math.sin(2 * Math.PI * freq * 2.01 * t) +
      0.12 * Math.sin(2 * Math.PI * freq * 3.03 * t) +
      0.05 * Math.sin(2 * Math.PI * freq * 4.76 * t)
    add(s0 + i, v, env * gain, pan)
  }
}

// Тёплая подушка-аккорд
function pad(freqs, start, dur, gain) {
  const s0 = Math.floor(start * SR)
  const len = Math.min(Math.floor(dur * SR), N - s0)
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const fade = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 1.6)
    if (fade <= 0) continue
    let v = 0
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(2 * Math.PI * f * 1.004 * t)
    add(s0 + i, v, gain * fade * 0.5, Math.sin(start) * 0.3)
  }
}

// Мягкий бас (пиццикато)
function bass(freq, start, dur, gain) {
  const s0 = Math.floor(start * SR)
  const len = Math.min(Math.floor(dur * SR), N - s0)
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const env = Math.exp(-5.5 * t) * (1 - Math.exp(-t * 400))
    add(s0 + i, Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t), env * gain, 0)
  }
}

// Бубенцы: шумовой всплеск с металлическим призвуком
const BUF = 4096
const noise = new Float32Array(BUF)
let rngState = 12345
for (let i = 0; i < BUF; i++) {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296
  noise[i] = rngState / 2147483648 - 1
}
let npos = 0
function sleighBell(start, gain, pan = 0.15) {
  const s0 = Math.floor(start * SR)
  const len = Math.min(Math.floor(0.28 * SR), N - s0)
  let lp = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    // два затухания: щелчок + звон
    const click = Math.exp(-55 * t)
    const ring = Math.exp(-13 * t)
    const n = noise[(npos++) % BUF]
    lp += (n - lp) * 0.55 // грубый ФНЧ — «жестяной» оттенок
    const metal = Math.sin(2 * Math.PI * 5200 * t) * 0.35 + Math.sin(2 * Math.PI * 7400 * t) * 0.2
    const v = lp * (click * 0.9 + ring * 0.25) + metal * ring * 0.22
    add(s0 + i, v, gain, pan)
  }
}

// --- гармония и мелодия ---
const chords = [
  { notes: ['C4', 'E4', 'G4', 'C5'], root: 'C3', mel: ['E5', 'G5', 'C6', 'G5'] },
  { notes: ['A3', 'C4', 'E4', 'A4'], root: 'A2', mel: ['C6', 'E5', 'A5', 'E5'] },
  { notes: ['F3', 'A3', 'C4', 'F4'], root: 'F2', mel: ['A5', 'C6', 'F5', 'C6'] },
  { notes: ['G3', 'B3', 'D4', 'G4'], root: 'G2', mel: ['B5', 'D6', 'G5', 'D6'] },
]
const BPM = 76
const beat = 60 / BPM
const barLen = beat * 4
const arp = [0, 2, 1, 3, 2, 1, 3, 2] // 8 восьмых

for (let bar = 0; bar * barLen < TOTAL; bar++) {
  const c = chords[bar % chords.length]
  const t0 = bar * barLen
  pad(c.notes.map(note), t0, barLen + 1.5, 0.018)

  // «музыкальная шкатулка» — 8-е ноты
  for (let s = 0; s < 8; s++) {
    const t = t0 + s * (beat / 2)
    if (t >= TOTAL) break
    bell(note(c.notes[arp[s]]), t, 2.2, s === 0 ? 0.085 : 0.045, s % 2 ? 0.32 : -0.32)
  }

  // мелодия глокеншпиля — по четвертям, со второй фразы
  if (bar >= 2) {
    c.mel.forEach((n, k) => {
      const t = t0 + k * beat
      if (t < TOTAL) bell(note(n), t, 2.4, 0.05, -0.15, 3.4)
    })
  }

  // бас на 1 и 3
  bass(note(c.root), t0, 1.2, 0.075)
  bass(note(c.root) * 1.5, t0 + beat * 2, 1.0, 0.05)

  // бубенцы: восьмые, начиная со второй части
  if (bar >= 1) {
    for (let s = 0; s < 8; s++) {
      const t = t0 + s * (beat / 2)
      if (t >= TOTAL) break
      const accent = s === 0 ? 1 : s === 4 ? 0.8 : s % 2 === 0 ? 0.55 : 0.35
      sleighBell(t, 0.022 * accent, s % 2 ? 0.35 : -0.2)
    }
  }
}

// Эхо/воздух
function echo(buf, delayMs, fb, mix) {
  const d = Math.floor((delayMs / 1000) * SR)
  const out = new Float32Array(buf.length)
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] + (i >= d ? out[i - d] * fb * mix : 0)
  return out
}
const Lr = echo(L, 165, 0.4, 0.5)
const Rr = echo(R, 235, 0.4, 0.5)

const fadeIn = Math.floor(SR * 1.4)
const fadeOut = Math.floor(SR * 4.5)
let peak = 0
for (let i = 0; i < N; i++) {
  let g = 1
  if (i < fadeIn) g *= i / fadeIn
  if (i > N - fadeOut) g *= Math.max(0, (N - i) / fadeOut)
  Lr[i] *= g
  Rr[i] *= g
  peak = Math.max(peak, Math.abs(Lr[i]), Math.abs(Rr[i]))
}
const norm = 0.34 / (peak || 1)

const data = Buffer.alloc(44 + N * 4)
data.write('RIFF', 0)
data.writeUInt32LE(36 + N * 4, 4)
data.write('WAVE', 8)
data.write('fmt ', 12)
data.writeUInt32LE(16, 16)
data.writeUInt16LE(1, 20)
data.writeUInt16LE(2, 22)
data.writeUInt32LE(SR, 24)
data.writeUInt32LE(SR * 4, 28)
data.writeUInt16LE(4, 32)
data.writeUInt16LE(16, 34)
data.write('data', 36)
data.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Lr[i] * norm * 32767))), 44 + i * 4)
  data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Rr[i] * norm * 32767))), 46 + i * 4)
}
writeFileSync(outPath, data)
console.log('music:', outPath, TOTAL + 's', 'bpm', BPM)
