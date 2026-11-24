import { describe, expect, it } from 'vitest'
import {
  safeGetItem,
  safeParseJSON,
  safeSetItem,
  serializeCharacters,
  validateProject,
} from '../src/storage.js'

describe('storage & draft validation', () => {
  it('handles QuotaExceededError gracefully without throwing', () => {
    const quotaStorage = {
      setItem() {
        const err = new Error('Quota exceeded')
        err.name = 'QuotaExceededError'
        throw err
      },
      getItem() {
        throw new Error('SecurityError')
      },
    }

    const setRes = safeSetItem('pr-draft', '{"v":3}', quotaStorage)
    expect(setRes.ok).toBe(false)
    expect(setRes.quota).toBe(true)
    expect(safeGetItem('pr-draft', 'fallback', quotaStorage)).toBe('fallback')
  })

  it('safeParseJSON never throws on malformed JSON', () => {
    expect(safeParseJSON('{broken json', [])).toEqual([])
    expect(safeParseJSON('', null)).toBeNull()
    expect(safeParseJSON('{"ok":true}', null)).toEqual({ ok: true })
  })

  it('validateProject sanitizes untrusted XSS payloads and preserves all Kids Studio fields', () => {
    const malicious = {
      title: 'Праздник\u0000',
      subtitle: 'Подзаголовок',
      titleSize: 9999,
      subSize: -5,
      bgType: 'unknown-bg',
      bgColor: 'javascript:alert(1)',
      bgImageSrc: 'x" onerror="alert(1)',
      anim: 'zoom',
      duration: 5,
      confetti: true,
      bubbles: false,
      speech: true,
      drawColor: '#00e5ff',
      drawSize: 14,
      kidsStyle: 'realistic',
      activeKidsBgId: 'r-savanna',
      format: '9:16',
      modelId: 'cinema',
      music: 'happy',
      characters: [
        {
          id: 'evil',
          name: '<img src=x onerror=alert(1)>',
          emoji: '🦁',
          isPhoto: true,
          imgSrc: 'x" onerror="alert(1)',
          x: 360,
          y: 640,
          size: 100,
        },
      ],
      strokes: [
        {
          color: 'bad-color',
          size: 10,
          points: [
            { x: 10, y: 20 },
            { x: 50, y: 80 },
          ],
        },
      ],
    }

    const clean = validateProject(malicious)
    expect(clean.title).toBe('Праздник')
    expect(clean.titleSize).toBe(110)
    expect(clean.subSize).toBe(14)
    expect(clean.bgType).toBe('gradient1')
    expect(clean.bgColor).toBe('#0a0a0f')
    expect(clean.bgImageSrc).toBeNull()
    expect(clean.confetti).toBe(true)
    expect(clean.bubbles).toBe(false)
    expect(clean.speech).toBe(true)
    expect(clean.drawColor).toBe('#00e5ff')
    expect(clean.drawSize).toBe(14)
    expect(clean.format).toBe('9:16')
    expect(clean.modelId).toBe('cinema')
    expect(clean.music).toBe('happy')
    // Unsafe imgSrc is stripped and isPhoto becomes false
    expect(clean.characters[0].isPhoto).toBe(false)
    expect(clean.characters[0].imgSrc).toBeUndefined()
    expect(clean.strokes[0].color).toBe('#ff2d55')
  })

  it('validateProject rejects non-object payloads', () => {
    expect(() => validateProject(null)).toThrow()
    expect(() => validateProject(['array'])).toThrow()
  })

  it('serializeCharacters strips transient _img HTMLImageElement instances', () => {
    const out = serializeCharacters([
      { id: '1', name: 'Мишка', _img: { fakeImg: true }, nx: 0.5, ny: 0.5 },
    ])
    expect(out).toEqual([{ id: '1', name: 'Мишка', nx: 0.5, ny: 0.5 }])
  })
})
