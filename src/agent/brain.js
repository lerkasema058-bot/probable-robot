import { kidsBackgrounds, kidsTemplates, models, templates } from '../data.js'
import { AGENT_TOOLS, matchCharacters } from './tools.js'

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-4o-mini'

export const LLM_TOOLS = AGENT_TOOLS.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}))

// ===== Локальный мозг: разбор русской фразы без сети и ключей =====

const KIDS_TEMPLATE_RULES = [
  { name: 'День Рождения', words: ['день рождения', 'днём рождения', 'днем рождения', 'днюх', 'юбиле', 'именин'] },
  { name: 'Космос', words: ['космос', 'ракет', 'астронавт', 'планет', 'звёздн', 'звездн'] },
  { name: 'Дино-парк', words: ['динозавр', 'дино'] },
  { name: 'Под водой', words: ['под водой', 'подводн', 'морск', 'дельфин', 'кит '] },
  { name: 'Животные Африки', words: ['африк', 'саванн', 'сафари'] },
  { name: 'Сказка', words: ['сказк', 'волшебн', 'жили-были', 'жили были'] },
  { name: 'Азбука', words: ['азбук', 'букв', 'алфавит'] },
  { name: 'Ферма', words: ['ферм', 'деревн', 'домашни'] },
]

const BG_RULES = [
  { cartoon: 'space', realistic: 'space', words: ['космос', 'ракет', 'планет', 'звёзд', 'звезд'] },
  { cartoon: 'sky', realistic: 'sky', words: ['небо', 'небес', 'облак'] },
  { cartoon: 'forest', realistic: 'r-forest', words: ['лес', 'лесн', 'деревь'] },
  { cartoon: 'underwater', realistic: 'r-ocean', words: ['под водой', 'подводн', 'океан', 'морск', 'море'] },
  { cartoon: 'castle', realistic: 'castle', words: ['замок', 'дворец'] },
  { cartoon: 'jungle', realistic: 'jungle', words: ['джунгл'] },
  { cartoon: 'farm', realistic: 'farm', words: ['ферм'] },
  { cartoon: 'city', realistic: 'city', words: ['город'] },
  { cartoon: 'r-beach', realistic: 'r-beach', words: ['пляж', 'берег'] },
  { cartoon: 'r-mountains', realistic: 'r-mountains', words: ['горах', 'горы', 'горист', 'горе '] },
  { cartoon: 'r-desert', realistic: 'r-desert', words: ['пустын'] },
  { cartoon: 'r-savanna', realistic: 'r-savanna', words: ['саванн', 'африк'] },
]

const TOPIC_TITLES = [
  { words: ['день рождения', 'днюх', 'юбиле'], title: 'С ДНЁМ РОЖДЕНИЯ!' },
  { words: ['космос', 'ракет', 'планет'], title: 'ПОЛЁТ В КОСМОС' },
  { words: ['кот', 'кошк'], title: 'КОТИК' },
  { words: ['собак', 'щен', 'пёс', 'пес'], title: 'ПЁСИК' },
  { words: ['динозавр', 'дино'], title: 'ДИНО-ПАРК' },
  { words: ['океан', 'мор'], title: 'МОРСКИЕ ДРУЗЬЯ' },
  { words: ['сказк', 'волшебн'], title: 'ЖИЛИ-БЫЛИ...' },
  { words: ['лес'], title: 'В ЛЕСУ' },
  { words: ['пляж', 'море'], title: 'НА ПЛЯЖЕ' },
  { words: ['город'], title: 'В ГОРОДЕ' },
  { words: ['гор'], title: 'В ГОРАХ' },
  { words: ['ферм'], title: 'НА ФЕРМЕ' },
  { words: ['пустын'], title: 'В ПУСТЫНЕ' },
  { words: ['неб'], title: 'В НЕБЕ' },
  { words: ['азбук', 'букв'], title: 'УЧИМ БУКВЫ' },
]

const MUSIC_RULES = [
  { track: 'none', words: ['без музыки', 'тишин', 'тихо'] },
  { track: 'happy', words: ['весёл', 'весел', 'радост', 'забавн', 'смешн'] },
  { track: 'tale', words: ['сказочн', 'спокойн', 'волшебн', 'лирич', 'нежн'] },
  { track: 'energy', words: ['энергичн', 'зажигательн', 'динамичн', 'клип', 'танц'] },
]

const ANIM_RULES = [
  { type: 'typewriter', words: ['печатн', 'печатная машинка'] },
  { type: 'slideUp', words: ['выезд', 'снизу'] },
  { type: 'zoom', words: ['зум', 'приближ'] },
  { type: 'fadeScale', words: ['плавн'] },
  { type: 'none', words: ['без анимац'] },
]

const MODEL_RULES = [
  { id: 'neon', words: ['неон'] },
  { id: 'cinema', words: ['кино', 'кинематограф'] },
  { id: 'minimal', words: ['минимал'] },
  { id: 'typewriter', words: ['печатная машинка', 'typewriter'] },
  { id: 'sale', words: ['скидк', 'распродаж', 'акци'] },
]

const EXCLUDED_NAMES = new Set([
  'детей',
  'малышей',
  'ребёнка',
  'ребенка',
  'всех',
  'друзей',
  'дома',
  'школы',
  'сада',
  'детсада',
  'себя',
])

/** Ищет слово только в начале слова: «лис» в «реалистичное» не сработает. */
function findStemIndex(text, stem) {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'gi')
  let match
  while ((match = re.exec(text)) !== null) {
    const before = match.index === 0 ? '' : text[match.index - 1]
    if (!/[а-яёa-z]/i.test(before)) return match.index
    re.lastIndex = match.index + 1
  }
  return -1
}

function findRule(rules, text) {
  return rules.find((rule) => rule.words.some((word) => findStemIndex(text, word) >= 0)) || null
}

function extractQuotes(text) {
  const out = []
  const re = /[«"„“]([^»"“”\n]{1,160})[»"”]/g
  let match
  while ((match = re.exec(text)) !== null) {
    const value = match[1].trim()
    if (value) out.push(value)
  }
  return out
}

function extractNamedText(text, key) {
  const re = new RegExp(`(?:${key})\\s*[:—-]\\s*([^\\n.;]{1,140})`, 'i')
  const match = re.exec(text)
  return match ? match[1].trim() : ''
}

/** Достаёт описание картинки из фразы «нарисуй …», «сгенерируй фон: …», «сделай картинку …». */
function extractGenerationPrompt(text) {
  const wantsImage =
    /сгенерируй|нарисуй|нейросет|изображени|создай\s+(фон|картин)|сделай\s+(фон|картин)/i.test(text)
  if (!wantsImage) return ''
  const match =
    /(?:сгенерируй|создай|нарисуй|сделай)\s+(?:мне\s+)?(?:фон\s*)?(?:[:—-]\s*)?([^,.;\n]{3,200})/i.exec(
      text
    )
  if (!match) return ''
  return match[1]
    .trim()
    .replace(/^(?:героя|герой|персонажа|персонаж)\s+/i, '')
    .replace(/^картин\w*\s+/i, '')
    .replace(/\s+\d{1,2}\s*(?:сек(?:унд)?[а-яё]*|с(?![-а-яё])).*$/i, '')
    .trim()
}

function heroNameFromPrompt(prompt) {
  const firstWord = String(prompt).trim().split(/\s+/)[0] || ''
  let name = firstWord.replace(/[^а-яёa-z0-9-]/gi, '').slice(0, 24)
  if (name.length > 4 && /[ая]$/i.test(name)) name = name.slice(0, -1)
  if (!name) return 'Герой'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function extractPersonName(text) {
  const match = /(?:^|\s)для\s+([А-ЯЁ][а-яё]{1,15})(?=[\s.,!?;:]|$)/.exec(text)
  if (!match) return ''
  const name = match[1]
  if (EXCLUDED_NAMES.has(name.toLowerCase())) return ''
  return name
}

function deriveTitle(text) {
  const rule = findRule(TOPIC_TITLES, text)
  return rule ? rule.title : ''
}

/**
 * Разбирает фразу пользователя в список вызовов инструментов.
 * Полностью офлайн: работает на ключевых словах и каталоге студии.
 */
export function planLocal(prompt, context = {}) {
  const raw = String(prompt ?? '')
  const text = raw.toLowerCase()
  const calls = []
  const notes = []

  if (!text.trim()) {
    return {
      calls,
      reply:
        'Опиши видео словами — например: «видео на день рождения для Саши, космос, 9:16, 8 секунд, весёлая музыка».',
    }
  }

  let kidsStyle = context.kidsStyle === 'realistic' ? 'realistic' : 'cartoon'
  const wantsRealistic = /реалистичн|как в жизни|документальн|натуралистичн/.test(text)
  const wantsCartoon = /мультяшн|мультфильм|мультик/.test(text)

  // 1. Готовая история задаёт и стиль, и фон, и текст, и героев
  let template = null
  const templateRule = findRule(KIDS_TEMPLATE_RULES, text)
  if (templateRule) {
    template = kidsTemplates.find((t) => t.name === templateRule.name) || null
  }
  if (template) {
    kidsStyle = template.style
    calls.push({ name: 'apply_kids_template', arguments: { name: template.name } })
    notes.push(`история «${template.name}»`)
  }

  // 2. Явное указание стиля перекрывает шаблон
  if (wantsRealistic && kidsStyle !== 'realistic') {
    kidsStyle = 'realistic'
    calls.push({ name: 'set_kids_style', arguments: { style: 'realistic' } })
    notes.push('реалистичный стиль')
  } else if (wantsCartoon && kidsStyle !== 'cartoon') {
    kidsStyle = 'cartoon'
    calls.push({ name: 'set_kids_style', arguments: { style: 'cartoon' } })
    notes.push('мультяшный стиль')
  }

  // 2.5. Генерация картинок нейросетью и просьба добавить свои фото
  const genPrompt = extractGenerationPrompt(raw)
  const heroWords =
    /геро|персонаж|мальчик|девочк|малыш|реб[её]нок|питомец|животн|единорог|котик|котёнок|щенок|медвежонок|динозавр|принцесс|робот|рыцар|супергеро/i
  const wantsCharacter = Boolean(genPrompt) && !/фон/i.test(text) && heroWords.test(text)
  const wantsPhotos =
    /фото/.test(text) &&
    /(мо[её]|сво[её]|загруз|добав|реб[её]нок|питом|семь|снимок)/i.test(text)

  // 3. Фон: детский каталог, сплошной цвет или градиент (пропускаем, если фон генерируем)
  const hexColor = genPrompt ? null : /#[0-9a-f]{3,8}\b/i.exec(text)
  if (hexColor) {
    const color = hexColor[0]
    calls.push({ name: 'set_background', arguments: { kind: 'solid', color } })
    notes.push(`фон ${color}`)
  } else if (!genPrompt) {
    const bgRule = findRule(BG_RULES, text)
    if (bgRule) {
      const bgId = bgRule[kidsStyle] || bgRule.cartoon
      const bg = kidsBackgrounds.find((b) => b.id === bgId)
      if (!template || template.bg !== bgId) {
        calls.push({ name: 'set_background', arguments: { kind: 'kids', id: bgId } })
        notes.push(`фон «${bg?.name || bgId}»`)
      }
    }
  }

  // 4. Герои и стикеры, упомянутые в тексте
  const matched = matchCharacters(raw, { kidsStyle, limit: 4 })
  const templateEmojis = new Set(template ? template.chars : [])
  const chars = []
  const stickerCalls = []
  for (const item of matched) {
    if (templateEmojis.has(item.emoji)) continue
    if (wantsCharacter) continue
    const resolved = item.isSticker
      ? stickerCalls.length < 4
        ? stickerCalls
        : null
      : chars.length < 4
        ? chars
        : null
    if (!resolved) continue
    if (item.isSticker) {
      stickerCalls.push(item.emoji)
    } else {
      chars.push(item.emoji)
    }
  }
  if (chars.length) {
    calls.push({ name: 'add_characters', arguments: { names: chars } })
    notes.push(`герои: ${chars.join(' ')}`)
  }
  if (stickerCalls.length) {
    calls.push({ name: 'add_stickers', arguments: { names: stickerCalls } })
    notes.push(`стикеры: ${stickerCalls.join(' ')}`)
  }

  if (genPrompt) {
    if (wantsCharacter) {
      calls.push({
        name: 'generate_character',
        arguments: { prompt: genPrompt, name: heroNameFromPrompt(genPrompt) },
      })
      notes.push(`сгенерировать героя «${genPrompt.slice(0, 40)}»`)
    } else {
      calls.push({ name: 'generate_background', arguments: { prompt: genPrompt } })
      notes.push(`сгенерировать фон «${genPrompt.slice(0, 40)}»`)
    }
  }

  if (wantsPhotos) {
    calls.push({ name: 'request_photos', arguments: {} })
    notes.push('загрузить свои фото')
  }

  // 5. Формат, длительность, анимация, музыка
  if (/9\s*[:хx]\s*16|вертикальн|сторис|reels|рикл|тик-?ток|tiktok/i.test(text)) {
    calls.push({ name: 'set_format', arguments: { format: '9:16' } })
    notes.push('формат 9:16')
  } else if (/1\s*[:хx]\s*1\b|квадрат/i.test(text)) {
    calls.push({ name: 'set_format', arguments: { format: '1:1' } })
    notes.push('формат 1:1')
  } else if (/16\s*[:хx]\s*9|горизонт|ютуб|youtube/i.test(text)) {
    calls.push({ name: 'set_format', arguments: { format: '16:9' } })
    notes.push('формат 16:9')
  }

  const durationMatch = /(\d{1,2})\s*(?:сек(?:унд)?[а-яё]*|с(?![а-яё]))/i.exec(text)
  if (durationMatch) {
    const requested = Number(durationMatch[1]) || 4
    const seconds = Math.min(10, Math.max(2, requested))
    calls.push({ name: 'set_duration', arguments: { seconds } })
    notes.push(`${seconds} сек${requested > 10 ? ' (максимум 10)' : ''}`)
  }

  const modelRule = findRule(
    MODEL_RULES.filter((rule) => rule.id !== 'sale'),
    text
  )
  const animRule = findRule(ANIM_RULES, text)
  const animDuplicatesModel =
    animRule && modelRule && modelRule.id === 'typewriter' && animRule.type === 'typewriter'
  if (animRule && !animDuplicatesModel) {
    calls.push({ name: 'set_animation', arguments: { type: animRule.type } })
    notes.push(`анимация «${animRule.type === 'typewriter' ? 'печатная машинка' : animRule.type === 'none' ? 'без анимации' : animRule.type}»`)
  }

  const musicRule = findRule(MUSIC_RULES, text)
  if (musicRule) {
    calls.push({ name: 'set_music', arguments: { track: musicRule.track } })
    const labels = { none: 'без музыки', happy: 'весёлая', tale: 'сказочная', energy: 'энергичная' }
    notes.push(`музыка ${labels[musicRule.track]}`)
  }

  // 6. Модель оформления и готовые текстовые шаблоны
  const wantsSale = /скидк|распродаж|акци/.test(text)
  let saleApplied = false
  if (wantsSale && !template) {
    const saleTpl = templates.find((t) => t.name === 'Скидка')
    if (saleTpl) {
      saleApplied = true
      calls.push({ name: 'apply_template', arguments: { name: saleTpl.name } })
      notes.push('шаблон «Скидка»')
      const percent = /(\d{1,3})\s*%/.exec(text)
      if (percent) {
        calls.push({
          name: 'set_text',
          arguments: { title: `СКИДКА ${percent[1]}%`, subtitle: saleTpl.subtitle },
        })
        notes.push(`скидка ${percent[1]}%`)
      }
    }
  }
  if (modelRule) {
    calls.push({ name: 'set_model', arguments: { id: modelRule.id } })
    notes.push(`модель «${models.find((m) => m.id === modelRule.id)?.name || modelRule.id}»`)
  }

  // 7. Эффекты
  const effects = {}
  if (/конфетти|хлопуш/i.test(text)) effects.confetti = true
  if (/пузырь|пузыр/i.test(text)) effects.bubbles = true
  if (/реплик|облачк|говор/i.test(text)) effects.speech = true
  if (/частиц|блестк|искры|звёзд|звезд/i.test(text)) effects.particles = true
  if (/движени[ея] фона|ken burns|кено/i.test(text)) effects.kenBurns = true
  if (/без эффектов|минимал|чист/i.test(text)) {
    effects.particles = false
    effects.kenBurns = false
    effects.confetti = false
    effects.bubbles = false
    effects.speech = false
    effects.watermark = false
  }
  if (Object.keys(effects).length) {
    calls.push({ name: 'set_effects', arguments: effects })
    const enabled = Object.keys(effects).filter((key) => effects[key])
    notes.push(enabled.length ? `эффекты: ${enabled.join(', ')}` : 'эффекты выключены')
  }

  // 8. Текст: кавычки, «заголовок: …», имя из «для …», иначе — заголовок по теме
  const quotes = extractQuotes(raw)
  let title = quotes[0] || ''
  let subtitle = quotes[1] || ''
  const headerText = extractNamedText(raw, 'заголовок|текст|надпись')
  const subtitleText = extractNamedText(raw, 'подзаголовок')
  if (headerText) title = headerText
  if (subtitleText) subtitle = subtitleText

  const person = extractPersonName(raw)
  if (person && !subtitle) {
    subtitle = `Для ${person}!`
  }

  if (!title && !template && !saleApplied) {
    title = deriveTitle(text)
  }

  if (title || subtitle) {
    const finalTitle = title || (template ? template.title : '')
    const finalSubtitle = subtitle || (template && !title ? template.subtitle : '')
    if (finalTitle || finalSubtitle) {
      calls.push({
        name: 'set_text',
        arguments: { title: finalTitle.slice(0, 120), subtitle: finalSubtitle.slice(0, 160) },
      })
      notes.push(
        `текст «${(finalTitle || finalSubtitle).slice(0, 40)}${(finalTitle || finalSubtitle).length > 40 ? '…' : ''}»`
      )
    }
  }

  if (!calls.length) {
    return {
      calls,
      reply:
        'Не понял, что именно сделать. Попробуй так: «мультяшное видео про котика и лисичку, лес, 5 секунд, весёлая музыка».',
    }
  }

  return {
    calls,
    reply: `План собран: ${notes.join(' • ')}.`,
  }
}

// ===== Дистанционный мозг: любой OpenAI-совместимый endpoint =====

export function normalizeBaseUrl(value) {
  const url = String(value ?? '').trim().replace(/\/+$/, '')
  if (!url) throw new Error('Не указан Base URL API (например, https://api.openai.com/v1)')
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Base URL должен начинаться с http:// или https://')
  }
  return url
}

export function buildSystemPrompt(context = {}) {
  const state = {
    title: context.title || '',
    subtitle: context.subtitle || '',
    format: context.format || '16:9',
    modelId: context.modelId || 'classic',
    kidsStyle: context.kidsStyle || 'cartoon',
    backgroundId: context.backgroundId || null,
    characters: Array.isArray(context.characters) ? context.characters : [],
    duration: context.duration || 4,
    music: context.music || 'none',
  }
  return [
    'Ты — агент-режиссёр детской видеостудии «probable-robot».',
    'Пользователь описывает ролик своими словами, а ты собираешь сцену вызовами инструментов (tool calls).',
    '',
    'Правила:',
    '- Отвечай по-русски, коротко: 1–3 предложения.',
    '- Меняй сцену только инструментами. Никакого кода, JSON или HTML в ответе.',
    '- Фоны, героев и модели бери из каталогов, указанных в описаниях инструментов.',
    '- Если данных мало, всё равно собери разумную сцену по умолчанию. Уточняй только при настоящей неоднозначности.',
    '- Не обещай возможности, которых нет среди инструментов.',
    '',
    `Текущее состояние студии: ${JSON.stringify(state)}`,
  ].join('\n')
}

function parseArguments(raw) {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseToolCalls(message) {
  const rawCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
  return rawCalls
    .map((call, index) => ({
      id: call?.id || `call_${index}`,
      name: call?.function?.name || '',
      arguments: parseArguments(call?.function?.arguments),
    }))
    .filter((call) => call.name)
}

/**
 * Один запрос к chat/completions с инструментами.
 * Возвращает текст модели и распарсенные вызовы инструментов.
 */
export async function chatRemote({ messages, config = {}, signal, withTools = true } = {}) {
  const baseUrl = normalizeBaseUrl(config.baseUrl || DEFAULT_BASE_URL)
  const apiKey = String(config.apiKey ?? '').trim()
  if (!apiKey) {
    throw new Error('Не указан API-ключ. Вставь ключ или переключи мозг на локальный.')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: String(config.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
      messages,
      ...(withTools ? { tools: LLM_TOOLS, tool_choice: 'auto' } : {}),
      temperature: 0.4,
    }),
    signal,
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    const detail = bodyText ? `: ${bodyText.slice(0, 200)}` : ''
    throw new Error(`API вернул ${response.status}${detail}`)
  }

  const data = await response.json()
  const message = data?.choices?.[0]?.message
  if (!message) throw new Error('Модель вернула пустой ответ')

  return {
    content: typeof message.content === 'string' ? message.content : '',
    toolCalls: parseToolCalls(message),
    assistantMessage: message,
  }
}
