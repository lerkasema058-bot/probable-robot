import { describe, expect, it } from 'vitest'
import { formats } from '../src/data.js'
import {
  clamp,
  isSafeImageDataUrl,
  normalizeCharacter,
  normalizeStroke,
  safeFilename,
  sanitizeColor,
  sanitizeText,
  seededRandom,
  syncCharactersToFormat,
  syncStrokesToFormat,
  wrapText,
} from '../src/utils.js'

function makeMockCtx(pxPerChar = 10) {
  return {
    measureText: (str) => ({ width: String(str).length * pxPerChar }),
  }
}

describe('utils', () => {
  it('seededRandom is deterministic and within [0, 1)', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const c = seededRandom(43)
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })

  it('clamp restricts values inside bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })

  it('validates safe base64 image data URLs and blocks XSS payloads', () => {
    expect(isSafeImageDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
    expect(isSafeImageDataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true)
    expect(isSafeImageDataUrl('data:image/webp;base64,UklGRg==')).toBe(true)
    expect(isSafeImageDataUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeImageDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isSafeImageDataUrl('x" onerror="alert(1)')).toBe(false)
    // Disallow data:image/svg+xml which can carry embedded scripts
    expect(isSafeImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
  })

  it('sanitizeText and sanitizeColor reject invalid values', () => {
    expect(sanitizeText('Привет\u0000Мир', 20)).toBe('ПриветМир')
    expect(sanitizeText(12345, 20, 'fallback')).toBe('fallback')
    expect(sanitizeColor('#ff2d55')).toBe('#ff2d55')
    expect(sanitizeColor('expression(alert(1))', '#000000')).toBe('#000000')
  })

  it('wrapText wraps multi-word lines and breaks single extra-long words', () => {
    const ctx = makeMockCtx(10)
    expect(wrapText(ctx, 'С ДНЁМ РОЖДЕНИЯ ДРУЗЬЯ', 120)).toEqual([
      'С ДНЁМ',
      'РОЖДЕНИЯ',
      'ДРУЗЬЯ',
    ])
    const broken = wrapText(ctx, 'СВЕРХДЛИННОЕБЕЗПРОБЕЛОВСЛОВО', 100)
    expect(broken.every((line) => line.length * 10 <= 100)).toBe(true)
    expect(broken.join('')).toBe('СВЕРХДЛИННОЕБЕЗПРОБЕЛОВСЛОВО')
  })

  it('safeFilename builds clean filenames with Cyrillic and extension', () => {
    expect(safeFilename('С ДНЁМ РОЖДЕНИЯ!', '16:9', 'webm')).toBe('С_ДНЁМ_РОЖДЕНИЯ_16x9.webm')
    expect(safeFilename('   ???   ', '9:16', 'mp4')).toBe('video_9x16.mp4')
  })

  it('preserves character size across repeated format switches (no cumulative shrinkage)', () => {
    const startDims = formats['16:9']
    const initial = [
      normalizeCharacter({ id: 'hero1', emoji: '🦊', name: 'Лисичка', x: 640, y: 360, size: 120 }, startDims),
    ]
    const originalSize = initial[0].size

    let current = initial
    for (let i = 0; i < 10; i++) {
      current = syncCharactersToFormat(current, formats['9:16'])
      current = syncCharactersToFormat(current, formats['1:1'])
      current = syncCharactersToFormat(current, formats['16:9'])
    }

    expect(current[0].size).toBe(originalSize)
    expect(Math.round(current[0].x)).toBe(640)
    expect(Math.round(current[0].y)).toBe(360)
  })

  it('normalizes strokes and scales across formats', () => {
    const stroke = normalizeStroke(
      {
        color: '#00e5ff',
        size: 8,
        points: [
          { x: 0, y: 0 },
          { x: 1280, y: 720 },
        ],
      },
      formats['16:9']
    )
    expect(stroke).not.toBeNull()
    const rescaled = syncStrokesToFormat([stroke], formats['9:16'])
    expect(rescaled[0].points[1].x).toBe(720)
    expect(rescaled[0].points[1].y).toBe(1280)
  })
})
