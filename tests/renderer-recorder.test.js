import { describe, expect, it, vi } from 'vitest'
import { detectSupportedFormat } from '../src/recorder.js'
import { renderScene } from '../src/renderer.js'

function createRecordingCtx() {
  const strokeStyles = []
  const fonts = []
  const filledTexts = []
  const ctx = {
    fillStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetY: 0,
    set strokeStyle(v) {
      strokeStyles.push(v)
      this._stroke = v
    },
    get strokeStyle() {
      return this._stroke
    },
    set font(v) {
      fonts.push(v)
      this._font = v
    },
    get font() {
      return this._font
    },
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    setLineDash: vi.fn(),
    measureText: (txt) => ({ width: String(txt).length * 12 }),
    fillText: (txt, x, y) => filledTexts.push({ txt, x, y, font: ctx._font }),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  }
  return { ctx, strokeStyles, fonts, filledTexts }
}

describe('renderer & recorder', () => {
  it('never passes CSS var(--accent) to Canvas strokeStyle and omits selection ring when showSelection=false', () => {
    const { ctx, strokeStyles } = createRecordingCtx()
    const scene = {
      title: 'С ДНЁМ РОЖДЕНИЯ!',
      subtitle: 'Очень длинный подзаголовок который аккуратно переносится на несколько строк',
      titleSize: 68,
      subSize: 24,
      bgType: 'gradient1',
      bgColor: '#0a0a0f',
      overlay: 10,
      anim: 'typewriter',
      duration: 4,
      textColor: '#ffffff',
      particles: true,
      kenBurns: true,
      watermark: true,
      confetti: true,
      bubbles: true,
      speech: true,
      format: '16:9',
      modelId: 'cinema',
      kidsStyle: 'cartoon',
      activeKidsBgId: 'city',
      selectedCharId: 'photo-1',
      characters: [
        {
          id: 'photo-1',
          name: 'Фото',
          emoji: '📸',
          x: 1260,
          y: 20,
          size: 120,
          rot: 0,
          isPhoto: true,
          _img: { complete: true, naturalWidth: 200, width: 200, height: 200 },
        },
      ],
      strokes: [
        {
          color: '#ff2d55',
          size: 6,
          points: [
            { x: 10, y: 10 },
            { x: 40, y: 40 },
          ],
        },
      ],
      currentStroke: null,
    }

    renderScene(ctx, scene, 0.5, { showSelection: false })

    expect(strokeStyles.some((s) => String(s).includes('var('))).toBe(false)
    expect(ctx.setLineDash).not.toHaveBeenCalled()

    // With showSelection=true, selection ring dashes ARE drawn
    renderScene(ctx, scene, 0.5, { showSelection: true })
    expect(ctx.setLineDash).toHaveBeenCalled()
  })

  it('detectSupportedFormat falls back cleanly to video/mp4 on Safari-like MediaRecorder', () => {
    const safariRecorder = {
      isTypeSupported: (mime) => mime.startsWith('video/mp4'),
    }
    const picked = detectSupportedFormat(safariRecorder)
    expect(picked.ext).toBe('mp4')
    expect(picked.mime).toContain('video/mp4')

    const chromeRecorder = {
      isTypeSupported: (mime) => mime === 'video/webm;codecs=vp9,opus',
    }
    expect(detectSupportedFormat(chromeRecorder)).toEqual({
      mime: 'video/webm;codecs=vp9,opus',
      ext: 'webm',
    })

    expect(detectSupportedFormat(undefined)).toBeNull()
  })
})
