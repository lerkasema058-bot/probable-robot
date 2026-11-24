import { makeMusicStream } from './audio.js'

const CANDIDATE_MIMES = [
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
  { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
]

export function detectSupportedFormat(MediaRecorderCtor = globalThis.MediaRecorder) {
  if (!MediaRecorderCtor) return null
  if (typeof MediaRecorderCtor.isTypeSupported !== 'function') {
    return { mime: '', ext: 'webm' }
  }
  for (const item of CANDIDATE_MIMES) {
    try {
      if (MediaRecorderCtor.isTypeSupported(item.mime)) {
        return item
      }
    } catch {
      // ignore invalid codec probes on specific engines
    }
  }
  return { mime: '', ext: 'webm' }
}

export async function recordCanvasVideo({
  canvas,
  durationSec,
  fps = 30,
  musicType = 'none',
  drawFrame,
  onProgress,
}) {
  if (typeof globalThis.MediaRecorder === 'undefined') {
    throw new Error('Ваш браузер не поддерживает запись видео (MediaRecorder API)')
  }
  if (typeof canvas.captureStream !== 'function') {
    throw new Error('Ваш браузер не поддерживает захват кадров Canvas (captureStream)')
  }

  const chosen = detectSupportedFormat()
  const canvasStream = canvas.captureStream(fps)
  let musicStream = null
  let combinedStream = canvasStream

  if (musicType && musicType !== 'none') {
    try {
      musicStream = makeMusicStream(musicType, durationSec)
      const videoTrack = canvasStream.getVideoTracks()[0]
      const audioTrack = musicStream.getAudioTracks()[0]
      if (videoTrack && audioTrack) {
        combinedStream = new MediaStream([videoTrack, audioTrack])
      }
    } catch (err) {
      console.warn('Не удалось подключить аудиодорожку к записи:', err)
    }
  }

  let recorder
  try {
    const options = { videoBitsPerSecond: 5_000_000 }
    if (chosen && chosen.mime) options.mimeType = chosen.mime
    recorder = new MediaRecorder(combinedStream, options)
  } catch {
    // Fallback without explicit mimeType for strict Safari/WebKit versions
    recorder = new MediaRecorder(combinedStream)
  }

  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  const stopPromise = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve()
    recorder.onerror = (ev) => reject(ev?.error || new Error('Ошибка во время записи видео'))
  })

  try {
    // Render initial frame prior to start
    drawFrame(0)
    recorder.start(100)

    const durationMs = durationSec * 1000
    const startTime = performance.now()

    await new Promise((resolve) => {
      function tick(now) {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / durationMs)
        drawFrame(progress)
        if (onProgress) onProgress(progress)

        if (elapsed < durationMs) {
          requestAnimationFrame(tick)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(tick)
    })

    if (recorder.state !== 'inactive') {
      recorder.stop()
    }
    await stopPromise
  } finally {
    if (musicStream) {
      musicStream.getTracks().forEach((t) => t.stop())
    }
    canvasStream.getTracks().forEach((t) => t.stop())
  }

  const actualMime = recorder.mimeType || chosen?.mime || 'video/webm'
  const ext = actualMime.includes('mp4') ? 'mp4' : chosen?.ext || 'webm'
  const blob = new Blob(chunks, { type: actualMime })

  if (blob.size === 0) {
    throw new Error('Не удалось записать кадры видео — попробуйте другой браузер (Chrome/Edge/Firefox)')
  }

  return {
    blob,
    mime: actualMime,
    ext,
    hasMusic: Boolean(musicStream),
  }
}
