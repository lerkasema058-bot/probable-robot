import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAgent } from '../src/agent/agent.js'
import { chatRemote, planLocal } from '../src/agent/brain.js'
import { describeToolCall, executeToolCall } from '../src/agent/tools.js'

function createMockStudio(overrides = {}) {
  const state = {
    title: 'Старый заголовок',
    subtitle: '',
    kidsStyle: 'cartoon',
    characters: [],
  }
  const studio = {
    state,
    getContext: () => ({
      title: state.title,
      subtitle: state.subtitle,
      kidsStyle: state.kidsStyle,
      format: '16:9',
      characters: state.characters.map((c) => c.emoji),
    }),
    setText: vi.fn((title, subtitle) => {
      state.title = title
      state.subtitle = subtitle
    }),
    setKidsBackground: vi.fn(),
    setGradientBackground: vi.fn(),
    setSolidBackground: vi.fn(),
    setModel: vi.fn(),
    setKidsStyle: vi.fn((style) => {
      state.kidsStyle = style
    }),
    addCharacter: vi.fn((emoji, name, isSticker) => {
      state.characters.push({ emoji, name, isSticker })
    }),
    clearCharacters: vi.fn(),
    setFormat: vi.fn(),
    setAnimation: vi.fn(),
    setDuration: vi.fn(),
    setMusic: vi.fn(),
    setEffects: vi.fn(),
    applyKidsTemplate: vi.fn(),
    applyTemplate: vi.fn(),
    speak: vi.fn(() => true),
    exportVideo: vi.fn(async () => {}),
  }
  return Object.assign(studio, overrides)
}

function findCall(calls, name) {
  return calls.find((call) => call.name === name)
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('локальный мозг', () => {
  it('собирает день рождения: шаблон, формат, длительность, музыка и имя', () => {
    const plan = planLocal('Видео на день рождения для Саши, 9:16, 8 секунд, весёлая музыка', {
      kidsStyle: 'cartoon',
    })

    expect(findCall(plan.calls, 'apply_kids_template').arguments).toEqual({
      name: 'День Рождения',
    })
    expect(findCall(plan.calls, 'set_format').arguments).toEqual({ format: '9:16' })
    expect(findCall(plan.calls, 'set_duration').arguments).toEqual({ seconds: 8 })
    expect(findCall(plan.calls, 'set_music').arguments).toEqual({ track: 'happy' })

    const text = findCall(plan.calls, 'set_text')
    expect(text.arguments.title).toBe('С ДНЁМ РОЖДЕНИЯ!')
    expect(text.arguments.subtitle).toContain('Саши')
    expect(plan.reply).toContain('План собран')
  })

  it('понимает кавычки, модель и эффекты', () => {
    const plan = planLocal('Заголовок «Привет, мир!», подзаголовок «Это тест», неон, 5 секунд, конфетти')

    expect(findCall(plan.calls, 'set_text').arguments).toEqual({
      title: 'Привет, мир!',
      subtitle: 'Это тест',
    })
    expect(findCall(plan.calls, 'set_model').arguments).toEqual({ id: 'neon' })
    expect(findCall(plan.calls, 'set_duration').arguments).toEqual({ seconds: 5 })
    expect(findCall(plan.calls, 'set_effects').arguments.confetti).toBe(true)
  })

  it('ставит фон, героев и стиль из текста', () => {
    const plan = planLocal('Реалистичное видео про льва и жирафа в горах, 6 секунд')

    expect(findCall(plan.calls, 'set_kids_style').arguments).toEqual({ style: 'realistic' })
    expect(findCall(plan.calls, 'set_background').arguments).toEqual({ kind: 'kids', id: 'r-mountains' })
    expect(findCall(plan.calls, 'add_characters').arguments.names).toEqual(['🦁', '🦒'])
    expect(findCall(plan.calls, 'set_duration').arguments).toEqual({ seconds: 6 })
  })

  it('распознаёт стикеры отдельно от героев', () => {
    const plan = planLocal('Добавь котика и шарик с тортом')

    expect(findCall(plan.calls, 'add_characters').arguments.names).toEqual(['🐱'])
    expect(findCall(plan.calls, 'add_stickers').arguments.names).toEqual(['🎈', '🎂'])
  })

  it('не ломается на пустом и бессмысленном запросе', () => {
    expect(planLocal('', {}).calls).toEqual([])
    const unclear = planLocal('сделай красиво', {})
    expect(unclear.calls.length).toBe(0)
    expect(unclear.reply.length).toBeGreaterThan(10)
  })

  it('понимает «без эффектов» и «без музыки»', () => {
    const plan = planLocal('Видео про космос, без эффектов, без музыки')
    const effects = findCall(plan.calls, 'set_effects').arguments
    expect(effects).toMatchObject({ confetti: false, bubbles: false, particles: false })
    expect(findCall(plan.calls, 'set_music').arguments).toEqual({ track: 'none' })
  })

  it('распознаёт скидку с процентом и не перебивает её заголовок', () => {
    const plan = planLocal('Скидка 30% на корм для котов, неон, 9:16, 5 секунд')
    expect(findCall(plan.calls, 'apply_template').arguments).toEqual({ name: 'Скидка' })
    expect(findCall(plan.calls, 'set_text').arguments.title).toBe('СКИДКА 30%')
    expect(findCall(plan.calls, 'set_model').arguments).toEqual({ id: 'neon' })
    expect(plan.calls.filter((call) => call.name === 'set_text')).toHaveLength(1)
  })

  it('понимает просьбу сгенерировать фон нейросетью', () => {
    const plan = planLocal('нарисуй закат над морем, 6 секунд')
    const gen = findCall(plan.calls, 'generate_background')
    expect(gen.arguments.prompt).toBe('закат над морем')
    expect(findCall(plan.calls, 'set_background')).toBeUndefined()
    expect(findCall(plan.calls, 'set_duration').arguments).toEqual({ seconds: 6 })
  })

  it('отличает генерацию героя от генерации фона', () => {
    const hero = planLocal('сгенерируй героя единорога в космосе, 5 секунд')
    const gen = findCall(hero.calls, 'generate_character')
    expect(gen.arguments.name).toBe('Единорог')
    expect(gen.arguments.prompt).toContain('единорог')

    const bg = planLocal('сделай фон звездное небо')
    expect(findCall(bg.calls, 'generate_background').arguments.prompt).toBe('звездное небо')
  })

  it('понимает просьбу загрузить своё фото', () => {
    const plan = planLocal('Добавь фото ребёнка и сделай день рождения')
    expect(findCall(plan.calls, 'request_photos')).toBeTruthy()
    expect(findCall(plan.calls, 'add_characters')).toBeUndefined()
  })

  it('понимает длительность с разными окончаниями', () => {
    expect(findCall(planLocal('сказка, 4 секунды').calls, 'set_duration').arguments).toEqual({
      seconds: 4,
    })
    expect(findCall(planLocal('космос, 9 сек').calls, 'set_duration').arguments).toEqual({
      seconds: 9,
    })
  })
})

describe('исполнение инструментов', () => {
  it('set_text меняет только переданные поля', async () => {
    const studio = createMockStudio()
    const result = await executeToolCall(
      { name: 'set_text', arguments: { subtitle: 'Новый подзаголовок' } },
      studio
    )

    expect(result.ok).toBe(true)
    expect(studio.setText).toHaveBeenCalledWith('Старый заголовок', 'Новый подзаголовок')
  })

  it('add_characters превращает имена в героев каталога по стилю', async () => {
    const cartoon = createMockStudio()
    await executeToolCall({ name: 'add_characters', arguments: { names: ['медведь', 'котик'] } }, cartoon)
    expect(cartoon.addCharacter.mock.calls.map((c) => c.slice(0, 2))).toEqual([
      ['🧸', 'Мишка'],
      ['🐱', 'Котик'],
    ])

    const realistic = createMockStudio()
    realistic.state.kidsStyle = 'realistic'
    await executeToolCall({ name: 'add_characters', arguments: { names: ['медведь'] } }, realistic)
    expect(realistic.addCharacter).toHaveBeenCalledWith('🐻', 'Медведь', false)
  })

  it('возвращает ошибку, а не бросает исключение, на невалидных данных', async () => {
    const studio = createMockStudio()

    const badBg = await executeToolCall(
      { name: 'set_background', arguments: { kind: 'kids', id: 'nope' } },
      studio
    )
    expect(badBg.ok).toBe(false)
    expect(badBg.message).toContain('идентификатор детского фона')

    const unknown = await executeToolCall({ name: 'delete_everything', arguments: {} }, studio)
    expect(unknown.ok).toBe(false)
    expect(unknown.message).toContain('Неизвестный инструмент')
    expect(studio.clearCharacters).not.toHaveBeenCalled()
  })

  it('set_effects применяет только булевы флаги', async () => {
    const studio = createMockStudio()
    const result = await executeToolCall(
      { name: 'set_effects', arguments: { confetti: true, bubbles: false } },
      studio
    )
    expect(result.ok).toBe(true)
    expect(studio.setEffects).toHaveBeenCalledWith({ confetti: true, bubbles: false })
  })

  it('generate_background и generate_character вызывают студию', async () => {
    const studio = createMockStudio({
      generateBackground: vi.fn(async () => ({})),
      generateCharacter: vi.fn(async () => ({ name: 'Единорог' })),
    })

    const bg = await executeToolCall(
      { name: 'generate_background', arguments: { prompt: 'закат над морем' } },
      studio
    )
    expect(bg.ok).toBe(true)
    expect(studio.generateBackground).toHaveBeenCalledWith('закат над морем')

    const hero = await executeToolCall(
      { name: 'generate_character', arguments: { prompt: 'единорог', name: 'Единорог' } },
      studio
    )
    expect(hero.ok).toBe(true)
    expect(studio.generateCharacter).toHaveBeenCalledWith('единорог', 'Единорог')
    expect(hero.message).toContain('Единорог')
  })

  it('generate_background требует описание, request_photos — доступный input', async () => {
    const studio = createMockStudio({
      generateBackground: vi.fn(),
      requestPhotos: vi.fn(() => true),
    })

    const empty = await executeToolCall(
      { name: 'generate_background', arguments: { prompt: '  ' } },
      studio
    )
    expect(empty.ok).toBe(false)
    expect(empty.message).toContain('Опиши картинку')

    const photos = await executeToolCall({ name: 'request_photos', arguments: {} }, studio)
    expect(photos.ok).toBe(true)

    const noInput = createMockStudio({ requestPhotos: vi.fn(() => false) })
    const unavailable = await executeToolCall({ name: 'request_photos', arguments: {} }, noInput)
    expect(unavailable.ok).toBe(false)
  })

  it('describeToolCall даёт читаемые подписи', () => {
    expect(describeToolCall({ name: 'set_music', arguments: { track: 'happy' } })).toContain('Весёлая')
    expect(describeToolCall({ name: 'add_characters', arguments: { names: ['🐱'] } })).toContain('🐱')
    expect(describeToolCall({ name: 'unknown_tool' })).toBe('unknown_tool')
  })
})

describe('дистанционный мозг', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('парсит tool_calls и шлёт инструменты в запросе', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: 'Делаю сцену',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'set_text',
                    arguments: JSON.stringify({ title: 'Привет', subtitle: 'Мир' }),
                  },
                },
              ],
            },
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await chatRemote({
      messages: [{ role: 'user', content: 'собери сцену' }],
      config: { baseUrl: 'https://example.com/v1/', apiKey: 'secret', model: 'test-model' },
    })

    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'set_text', arguments: { title: 'Привет', subtitle: 'Мир' } },
    ])
    expect(result.content).toBe('Делаю сцену')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.com/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer secret')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('test-model')
    expect(body.tools.length).toBeGreaterThan(5)
    vi.unstubAllGlobals()
  })

  it('требует API-ключ и не делает запрос без него', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      chatRemote({ messages: [], config: { baseUrl: 'https://example.com/v1', apiKey: '' } })
    ).rejects.toThrow('API-ключ')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('показывает код ошибки API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })))
    await expect(
      chatRemote({ messages: [], config: { baseUrl: 'https://example.com/v1', apiKey: 'k' } })
    ).rejects.toThrow('401')
    vi.unstubAllGlobals()
  })
})

describe('оркестратор агента', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('локально планирует и применяет сцену', async () => {
    const studio = createMockStudio()
    const agent = createAgent({
      studio,
      getConfig: () => ({ brain: 'local' }),
    })

    const result = await agent.run('Космос с котиком, 9:16, 5 секунд, без музыки')

    expect(result.status).toBe('done')
    expect(result.plan.calls.length).toBeGreaterThan(0)
    expect(findCall(result.plan.calls, 'apply_kids_template').arguments.name).toBe('Космос')
    expect(studio.setFormat).toHaveBeenCalledWith('9:16')
    expect(studio.setDuration).toHaveBeenCalledWith(5)
    expect(studio.setMusic).toHaveBeenCalledWith('none')
    expect(studio.addCharacter).toHaveBeenCalled()
    expect(result.reply).toContain('Готово')
  })

  it('без autoApply возвращает план на подтверждение', async () => {
    const studio = createMockStudio()
    const agent = createAgent({ studio, getConfig: () => ({ brain: 'local' }) })

    const result = await agent.run('Космос', { autoApply: false })

    expect(result.status).toBe('awaiting_approval')
    expect(result.plan.calls.length).toBeGreaterThan(0)
    expect(studio.setKidsBackground).not.toHaveBeenCalled()
  })

  it('удалённый мозг планирует через tool calls и получает итог после применения', async () => {
    const studio = createMockStudio()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: 'Ставлю котика в космос',
                tool_calls: [
                  {
                    id: 'call_9',
                    type: 'function',
                    function: {
                      name: 'set_format',
                      arguments: JSON.stringify({ format: '9:16' }),
                    },
                  },
                ],
              },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'Готово, формат 9:16!' } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const agent = createAgent({
      studio,
      getConfig: () => ({
        brain: 'openai',
        baseUrl: 'https://example.com/v1',
        apiKey: 'secret',
        model: 'test-model',
      }),
    })

    const result = await agent.run('сделай вертикально')

    expect(studio.setFormat).toHaveBeenCalledWith('9:16')
    expect(result.reply).toBe('Готово, формат 9:16!')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    const toolMessage = secondBody.messages.find((m) => m.role === 'tool')
    expect(toolMessage.tool_call_id).toBe('call_9')
    expect(toolMessage.content).toContain('9:16')
    vi.unstubAllGlobals()
  })

  it('продолжает работу, если один из инструментов упал', async () => {
    const studio = createMockStudio()
    studio.setModel.mockImplementation(() => {
      throw new Error('взрыв')
    })
    const agent = createAgent({ studio, getConfig: () => ({ brain: 'local' }) })

    const result = await agent.run('Космос, неон')

    expect(result.status).toBe('done')
    expect(result.results.some((r) => !r.ok)).toBe(true)
    expect(result.results.find((r) => r.tool === 'set_model').message).toContain('взрыв')
  })
})
