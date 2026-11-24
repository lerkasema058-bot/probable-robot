import { seededRandom } from './utils.js'

let audioCtx = null
let previewNodes = []
let previewStopTimer = null

export function ensureAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) throw new Error('Web Audio API не поддерживается в этом браузере')
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function makeMusicStream(type, durationSec) {
  const ac = ensureAudio()
  const dest = ac.createMediaStreamDestination()
  const now = ac.currentTime
  const tempo = type === 'energy' ? 140 : type === 'tale' ? 78 : 108
  const beat = 60 / tempo
  const scales = {
    happy: [0, 2, 4, 5, 7, 9, 11, 12],
    tale: [0, 2, 4, 7, 9, 12, 14],
    energy: [0, 3, 5, 7, 10, 12],
  }
  const baseNotes = { happy: 48, tale: 48, energy: 36 }
  const scale = scales[type] || scales.happy
  const baseNote = baseNotes[type] ?? 48
  // Pad audio slightly so there is never an abrupt gap before recorder stops
  const totalSec = durationSec + 0.5

  function playNote(semi, t, dur, gain = 0.22, oscType = 'sine') {
    const osc = ac.createOscillator()
    osc.type = oscType
    const g = ac.createGain()
    osc.frequency.value = 440 * Math.pow(2, (baseNote + semi - 69) / 12)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95)
    osc.connect(g)
    g.connect(dest)
    osc.start(t)
    osc.stop(t + dur)
  }

  for (let b = 0; b < totalSec / beat; b++) {
    const t = now + b * beat
    const idx = Math.floor(seededRandom(b * 3.7 + 1) * scale.length) % scale.length
    const semi = scale[idx] + (b % 8 === 0 ? 12 : 0)
    if (type === 'energy' && b % 2 === 0) {
      playNote(0, t, beat * 0.9, 0.3, 'square')
      playNote(semi, t, beat * 0.8, 0.18, 'sine')
    } else if (type === 'tale') {
      playNote(semi, t, beat * 1.8, 0.16, 'triangle')
      if (b % 4 === 0) playNote(semi - 12, t, beat * 3.2, 0.1, 'sine')
    } else {
      playNote(semi, t, beat * 0.95, 0.2, 'sine')
      if (b % 2 === 0) playNote(semi - 12, t, beat * 0.9, 0.08, 'triangle')
    }
  }

  if (type === 'energy') {
    for (let b = 0; b < totalSec / beat; b += 2) {
      const t = now + b * beat
      const noise = ac.createBufferSource()
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.12), ac.sampleRate)
      const channel = buf.getChannelData(0)
      for (let i = 0; i < channel.length; i++) {
        channel[i] = (seededRandom(i + b * 101) * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.04))
      }
      noise.buffer = buf
      const g = ac.createGain()
      g.gain.setValueAtTime(0.35, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      noise.connect(g)
      g.connect(dest)
      noise.start(t)
    }
  }

  return dest.stream
}

export function previewMusic(type, onDone) {
  stopPreviewMusic()
  const ac = ensureAudio()
  const now = ac.currentTime
  const dest = ac.destination

  for (let i = 0; i < 10; i++) {
    const semi = [0, 2, 4, 7, 9][i % 5]
    const t = now + i * 0.4
    const dur = 0.6
    const osc = ac.createOscillator()
    osc.type = type === 'energy' ? 'square' : 'sine'
    const g = ac.createGain()
    osc.frequency.value = 440 * Math.pow(2, (48 + semi - 69) / 12)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.18, t + 0.03)
    g.gain.linearRampToValueAtTime(0, t + dur)
    osc.connect(g)
    g.connect(dest)
    osc.start(t)
    osc.stop(t + dur)
    previewNodes.push(osc)
  }

  previewStopTimer = setTimeout(() => {
    stopPreviewMusic()
    if (onDone) onDone()
  }, 5000)
}

export function stopPreviewMusic() {
  if (previewStopTimer) {
    clearTimeout(previewStopTimer)
    previewStopTimer = null
  }
  previewNodes.forEach((osc) => {
    try {
      osc.stop()
    } catch {
      // oscillator may already have stopped
    }
  })
  previewNodes = []
}
