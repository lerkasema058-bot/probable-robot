import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')

function mockCanvas2D() {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    font: '16px sans-serif',
    textAlign: 'center',
    textBaseline: 'middle',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetY: 0,
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
    measureText: (txt) => ({ width: String(txt).length * 10 }),
    fillText: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  }))
}

describe('app.js DOM integration', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.innerHTML = html
    mockCanvas2D()
  })

  it('boots cleanly even if localStorage contains corrupted JSON, switches tabs, adds characters, and escapes XSS in names', async () => {
    localStorage.setItem('pr-chars', '{corrupted')
    localStorage.setItem('pr-strokes', 'not-json')

    await import('../app.js')

    // Kids tab is active on startup and renders characters
    expect(document.body.dataset.tab).toBe('kids')
    const charButtons = document.querySelectorAll('#kidsCharGrid .kids-char-btn')
    expect(charButtons.length).toBeGreaterThan(0)

    // Add a character via button click
    charButtons[0].click()
    expect(document.getElementById('kidsCount').textContent).toBe('1')

    // Switch formats back and forth and verify label updates
    const fmt916 = document.querySelector('.fmt-btn[data-fmt="9:16"]')
    fmt916.click()
    expect(document.getElementById('fmtLabel').textContent).toContain('720×1280')

    // Test draft import with malicious XSS name renders safely as textContent, never real <img>
    const saveDraftPayload = {
      title: 'Тестовый заголовок',
      subtitle: 'Подзаголовок',
      format: '1:1',
      characters: [
        {
          id: 'xss1',
          name: '<img id="injectedXss" src="x">',
          emoji: '🦊',
          nx: 0.5,
          ny: 0.5,
          nSize: 0.15,
        },
      ],
    }
    localStorage.setItem('pr-draft', JSON.stringify(saveDraftPayload))
    document.getElementById('btnLoadDraft').click()

    expect(document.getElementById('injectedXss')).toBeNull()
    expect(document.querySelector('.selected-item-title').textContent).toBe(
      '<img id="injectedXss" src="x">'
    )
    expect(document.getElementById('fmtLabel').textContent).toContain('800×800')
  })

  it('opens mobile templates modal when right sidebar is hidden', async () => {
    await import('../app.js')
    const panel = document.getElementById('templatesPanel')
    panel.style.display = 'none'

    document.getElementById('btnExamples').click()
    expect(document.getElementById('modalTemplates').style.display).toBe('grid')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.getElementById('modalTemplates').style.display).toBe('none')
  })
})
