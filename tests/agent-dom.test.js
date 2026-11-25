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

function submitPrompt(prompt) {
  const input = document.getElementById('agentInput')
  input.value = prompt
  document
    .getElementById('agentForm')
    .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
}

describe('вкладка ИИ-агента в интерфейсе', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.innerHTML = html
    mockCanvas2D()
  })

  it('открывается по клику на таб и собирает сцену по описанию', async () => {
    await import('../app.js')

    document.querySelector('.tab-btn[data-tab="agent"]').click()
    expect(document.getElementById('tabAgent').style.display).toBe('block')

    submitPrompt('Видео на день рождения для Саши, 9:16, 8 секунд, весёлая музыка')

    await vi.waitFor(() => {
      expect(document.getElementById('agentStatusText').textContent).toBe('Готово')
    })
    expect(document.getElementById('inpTitle').value).toBe('С ДНЁМ РОЖДЕНИЯ!')
    expect(document.getElementById('inpSubtitle').value).toBe('Для Саши!')
    expect(document.getElementById('inpDuration').value).toBe('8')
    expect(document.getElementById('inpMusic').value).toBe('happy')
    expect(document.getElementById('fmtLabel').textContent).toContain('720×1280')
    expect(document.getElementById('kidsCount').textContent).toBe('3')
    expect(document.querySelectorAll('#agentLog .agent-msg--tool').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('#agentLog .agent-msg--plan').length).toBe(1)
    expect(document.getElementById('agentStatusText').textContent).toBe('Готово')
  })

  it('показывает план и применяет его только после подтверждения', async () => {
    await import('../app.js')
    document.querySelector('.tab-btn[data-tab="agent"]').click()
    document.getElementById('agentAutoApply').checked = false

    submitPrompt('Космос с котиком, 5 секунд')

    await vi.waitFor(() => {
      expect(document.querySelectorAll('#agentLog .agent-plan').length).toBe(1)
    })
    expect(document.getElementById('agentStatusText').textContent).toBe('Жду подтверждения')
    // План ещё не применён: заголовок остался прежним
    expect(document.getElementById('inpTitle').value).toBe('С ДНЁМ РОЖДЕНИЯ!')

    const applyBtn = [...document.querySelectorAll('.agent-plan-actions button')].find(
      (btn) => btn.textContent.includes('Применить')
    )
    applyBtn.click()

    await vi.waitFor(() => {
      expect(document.getElementById('agentStatusText').textContent).toBe('Готово')
    })
    expect(document.getElementById('inpTitle').value).toBe('ПОЛЁТ В КОСМОС')
    expect(document.getElementById('inpDuration').value).toBe('5')
    expect(document.getElementById('agentStatusText').textContent).toBe('Готово')
  })

  it('кнопка «🤖 Агент» в шапке открывает вкладку агента', async () => {
    await import('../app.js')

    document.getElementById('btnAgent').click()

    expect(document.body.dataset.tab).toBe('agent')
    expect(document.getElementById('tabAgent').style.display).toBe('block')
    expect(document.querySelector('.tab-btn[data-tab="agent"]').classList.contains('active')).toBe(
      true
    )
  })

  it('показывает кнопку загрузки фото, когда агент просит свои фото', async () => {
    await import('../app.js')
    document.querySelector('.tab-btn[data-tab="agent"]').click()

    const input = document.getElementById('inpPhoto')
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    submitPrompt('Загрузи моё фото')

    await vi.waitFor(() => {
      expect(document.querySelectorAll('#agentLog .agent-photo-request').length).toBe(1)
    })

    const btn = document.querySelector('#agentLog .agent-photo-request button')
    expect(btn.textContent).toContain('Выбрать фото')
    btn.click()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('сохраняет выбор мозга и показывает настройки API только для OpenAI', async () => {
    await import('../app.js')
    document.querySelector('.tab-btn[data-tab="agent"]').click()

    expect(document.getElementById('agentRemoteSettings').style.display).toBe('none')

    const select = document.getElementById('agentBrain')
    select.value = 'openai'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    expect(document.getElementById('agentRemoteSettings').style.display).toBe('flex')
    expect(localStorage.getItem('pr-agent-brain')).toBe('openai')

    document.getElementById('agentKey').value = 'sk-test'
    document.getElementById('agentKey').dispatchEvent(new Event('change', { bubbles: true }))
    expect(localStorage.getItem('pr-agent-key')).toBe('sk-test')
  })
})
