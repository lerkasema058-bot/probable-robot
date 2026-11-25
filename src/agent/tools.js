import {
  cartoonChars,
  gradients,
  kidsBackgrounds,
  kidsTemplates,
  models,
  realisticChars,
  stickers,
  templates,
} from '../data.js'
import { clamp, sanitizeColor, sanitizeText } from '../utils.js'

export class ToolError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ToolError'
  }
}

export const ANIMS = ['fadeScale', 'typewriter', 'slideUp', 'zoom', 'none']
export const MUSIC_TRACKS = ['none', 'happy', 'tale', 'energy']
export const FORMATS = ['16:9', '9:16', '1:1']
export const KIDS_STYLES = ['cartoon', 'realistic']
export const EFFECT_NAMES = ['particles', 'kenBurns', 'watermark', 'confetti', 'bubbles', 'speech']

const MUSIC_LABELS = { none: 'Без музыки', happy: 'Весёлая', tale: 'Сказочная', energy: 'Энергичная' }
const ANIM_LABELS = {
  fadeScale: 'Плавное появление',
  typewriter: 'Печатная машинка',
  slideUp: 'Выезд снизу',
  zoom: 'Зум',
  none: 'Без анимации',
}
const STYLE_LABELS = { cartoon: 'Мультяшный', realistic: 'Реалистичный' }

// ===== Каталог героев и стикеров =====
// stem → emoji. Для героев, которые есть в обоих стилях, emoji выбирается по стилю сцены.
const ALIASES = [
  { stems: ['мишк', 'медвед', 'медвеж', 'плеш'], emoji: { cartoon: '🧸', realistic: '🐻' } },
  { stems: ['собак', 'пёс', 'пес', 'щен', 'питомец'], emoji: '🐶' },
  { stems: ['кот', 'кошк', 'кис', 'котен', 'котэн'], emoji: '🐱' },
  { stems: ['лис'], emoji: '🦊' },
  { stems: ['зай', 'крол'], emoji: '🐰' },
  { stems: ['льв', 'лев'], emoji: '🦁' },
  { stems: ['панд'], emoji: '🐼' },
  { stems: ['единор'], emoji: '🦄' },
  { stems: ['осьмин'], emoji: '🐙' },
  { stems: ['динозавр', 'дино', 'ящер'], emoji: '🦖' },
  { stems: ['мартыш', 'обезьян'], emoji: '🐵' },
  { stems: ['пингвин'], emoji: '🐧' },
  { stems: ['тигр'], emoji: '🐯' },
  { stems: ['совушк', 'сова', 'сов'], emoji: '🦉' },
  { stems: ['лягуш'], emoji: '🐸' },
  { stems: ['слон'], emoji: '🐘' },
  { stems: ['волк', 'волч'], emoji: '🐺' },
  { stems: ['жираф'], emoji: '🦒' },
  { stems: ['носорог'], emoji: '🦏' },
  { stems: ['акул'], emoji: '🦈' },
  { stems: ['леопард'], emoji: '🐆' },
  { stems: ['зебр'], emoji: '🦓' },
  { stems: ['верблюд'], emoji: '🐪' },
  { stems: ['шарик', 'шары', 'воздушн шар'], emoji: '🎈', sticker: true },
  { stems: ['торт', 'пирожен', 'кекс'], emoji: '🎂', sticker: true },
  { stems: ['подар', 'сюрприз'], emoji: '🎁', sticker: true },
  { stems: ['звезд', 'звёзд'], emoji: '⭐', sticker: true },
  { stems: ['радуж', 'радуг'], emoji: '🌈', sticker: true },
  { stems: ['конфет', 'сладост', 'леденец'], emoji: '🍭', sticker: true },
  { stems: ['бант', 'бантик'], emoji: '🎀', sticker: true },
  { stems: ['блест', 'искры'], emoji: '✨', sticker: true },
  { stems: ['клубник', 'ягод'], emoji: '🍓', sticker: true },
  { stems: ['мяч', 'футбольн'], emoji: '⚽', sticker: true },
  { stems: ['ракет'], emoji: '🚀', sticker: true },
  { stems: ['корон'], emoji: '👑', sticker: true },
]

function pickFromCatalog(emoji, kidsStyle, stickersOnly) {
  if (stickersOnly) {
    const sticker = stickers.find((s) => s.emoji === emoji)
    return sticker ? { emoji: sticker.emoji, name: sticker.name, isSticker: true } : null
  }
  const order =
    kidsStyle === 'realistic' ? [realisticChars, cartoonChars] : [cartoonChars, realisticChars]
  for (const list of order) {
    const char = list.find((c) => c.emoji === emoji)
    if (char) return { emoji: char.emoji, name: char.name, isSticker: false }
  }
  return null
}

function emojiForAlias(alias, kidsStyle) {
  if (typeof alias.emoji === 'string') return alias.emoji
  return alias.emoji[kidsStyle] || alias.emoji.cartoon
}

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

/**
 * Ищет в тексте упоминания героев/стикеров из каталога.
 * Возвращает совпадения в порядке появления в тексте.
 */
export function matchCharacters(text, { kidsStyle = 'cartoon', limit = 4 } = {}) {
  const lower = String(text || '').toLowerCase()
  const found = []
  const seen = new Set()
  for (const alias of ALIASES) {
    let index = -1
    for (const stem of alias.stems) {
      const at = findStemIndex(lower, stem)
      if (at >= 0 && (index < 0 || at < index)) index = at
    }
    if (index < 0) continue
    const emoji = emojiForAlias(alias, kidsStyle)
    if (seen.has(emoji)) continue
    seen.add(emoji)
    found.push({ emoji, index, isSticker: Boolean(alias.sticker) })
  }
  return found.sort((a, b) => a.index - b.index).slice(0, limit)
}

/**
 * Превращает строку (emoji, имя или описание) в героя каталога.
 */
export function resolveCharacter(raw, { kidsStyle = 'cartoon', stickersOnly = false } = {}) {
  const value = String(raw ?? '').trim()
  if (!value) return null
  const direct = pickFromCatalog(value, kidsStyle, stickersOnly)
  if (direct) return direct

  const lower = value.toLowerCase()
  for (const alias of ALIASES) {
    if (stickersOnly !== Boolean(alias.sticker)) continue
    const hit = alias.stems.some((stem) => lower.includes(stem) || stem.includes(lower))
    if (!hit) continue
    const emoji = emojiForAlias(alias, kidsStyle)
    const item = pickFromCatalog(emoji, kidsStyle, stickersOnly)
    if (item) return item
  }
  return null
}

// ===== Схемы инструментов =====
const str = (description) => ({ type: 'string', description })
const bool = (description) => ({ type: 'boolean', description })
const int = (description, min, max) => ({ type: 'integer', description, minimum: min, maximum: max })
const list = (description) => ({ type: 'array', description, items: { type: 'string' }, maxItems: 8 })
const enumeration = (description, values) => ({ type: 'string', description, enum: values })
const objectSchema = (properties, required = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})

export const AGENT_TOOLS = [
  {
    name: 'set_text',
    description: 'Задаёт заголовок и подзаголовок, которые появятся на кадре',
    parameters: objectSchema(
      { title: str('Заголовок, до 120 символов'), subtitle: str('Подзаголовок, до 160 символов') },
      []
    ),
  },
  {
    name: 'set_background',
    description:
      'Ставит фон сцены: детский процедурный (kind=kids, id из каталога), градиент (kind=gradient) или сплошной цвет (kind=solid)',
    parameters: objectSchema(
      {
        kind: enumeration('Тип фона', ['kids', 'gradient', 'solid']),
        id: str('Идентификатор фона: sky, forest, underwater, space, castle, jungle, farm, city, r-forest, r-beach, r-mountains, r-savanna, r-ocean, r-desert или gradient1..gradient4'),
        color: str('Цвет в hex, например #1a1a22 — только для kind=solid'),
      },
      ['kind']
    ),
  },
  {
    name: 'set_model',
    description: 'Применяет модель оформления (пресет стиля анимации и цветокоррекции)',
    parameters: objectSchema(
      { id: enumeration('Идентификатор модели', models.map((m) => m.id)) },
      ['id']
    ),
  },
  {
    name: 'set_kids_style',
    description: 'Переключает стиль студии: мультяшный или реалистичный',
    parameters: objectSchema(
      { style: enumeration('Стиль сцены', KIDS_STYLES) },
      ['style']
    ),
  },
  {
    name: 'add_characters',
    description: 'Добавляет героев на сцену по именам или emoji из каталога (максимум 8)',
    parameters: objectSchema({ names: list('Имена или emoji героев') }, ['names']),
  },
  {
    name: 'add_stickers',
    description: 'Добавляет стикеры на сцену по именам или emoji (максимум 8)',
    parameters: objectSchema({ names: list('Имена или emoji стикеров') }, ['names']),
  },
  {
    name: 'clear_characters',
    description: 'Убирает всех героев, фото и стикеры со сцены',
    parameters: objectSchema({}),
  },
  {
    name: 'set_format',
    description: 'Задаёт формат кадра: 16:9, 9:16 (Stories/Reels) или 1:1',
    parameters: objectSchema({ format: enumeration('Формат кадра', FORMATS) }, ['format']),
  },
  {
    name: 'set_animation',
    description: 'Задаёт тип анимации текста',
    parameters: objectSchema({ type: enumeration('Тип анимации', ANIMS) }, ['type']),
  },
  {
    name: 'set_duration',
    description: 'Задаёт длительность ролика в секундах (от 2 до 10)',
    parameters: objectSchema({ seconds: int('Длительность в секундах', 2, 10) }, ['seconds']),
  },
  {
    name: 'set_music',
    description: 'Выбирает музыкальный трек, который запишется в видео',
    parameters: objectSchema({ track: enumeration('Трек', MUSIC_TRACKS) }, ['track']),
  },
  {
    name: 'set_effects',
    description: 'Включает или выключает эффекты: частицы, движение фона, водяной знак, конфетти, пузырьки, реплики героев',
    parameters: objectSchema({
      particles: bool('Частицы / блёстки'),
      kenBurns: bool('Движение фона (Ken Burns)'),
      watermark: bool('Водяной знак'),
      confetti: bool('Конфетти'),
      bubbles: bool('Пузырьки / звёздочки'),
      speech: bool('Реплики героев'),
    }),
  },
  {
    name: 'apply_kids_template',
    description: 'Загружает готовую детскую историю: фон, текст и героев',
    parameters: objectSchema(
      { name: enumeration('Название истории', kidsTemplates.map((t) => t.name)) },
      ['name']
    ),
  },
  {
    name: 'apply_template',
    description: 'Применяет готовый шаблон оформления для текстового ролика',
    parameters: objectSchema(
      { name: enumeration('Название шаблона', templates.map((t) => t.name)) },
      ['name']
    ),
  },
  {
    name: 'generate_background',
    description:
      'Генерирует фон нейросетью по текстовому описанию и ставит его на сцену. Требуется API-ключ в настройках агента. Используй, когда пользователь просит нарисовать или сгенерировать картинку/фон.',
    parameters: objectSchema({ prompt: str('Описание картинки, 3–900 символов') }, ['prompt']),
  },
  {
    name: 'generate_character',
    description:
      'Генерирует героя нейросетью по описанию и добавляет его на сцену круглым персонажем. Требуется API-ключ в настройках агента.',
    parameters: objectSchema(
      {
        prompt: str('Описание героя, 3–900 символов'),
        name: str('Имя героя для списка сцены, до 32 символов'),
      },
      ['prompt']
    ),
  },
  {
    name: 'request_photos',
    description:
      'Просит пользователя загрузить свои фото (ребёнок, питомец, семья) — в чате появится кнопка выбора файлов, и фото добавятся на сцену. Используй, когда пользователь хочет видеть на сцене своё фото.',
    parameters: objectSchema({}),
  },
  {
    name: 'speak_text',
    description: 'Озвучивает заголовок и подзаголовок голосом браузера',
    parameters: objectSchema({}),
  },
  {
    name: 'export_video',
    description: 'Запускает запись готового видео (может занять несколько секунд)',
    parameters: objectSchema({}),
  },
]

// ===== Исполнение инструментов =====
function requireString(args, key, { maxLen = 160, required = false } = {}) {
  const raw = args?.[key]
  if (raw === undefined || raw === null || raw === '') {
    if (required) throw new ToolError(`Не указан параметр «${key}»`)
    return ''
  }
  if (typeof raw !== 'string') throw new ToolError(`Параметр «${key}» должен быть строкой`)
  return sanitizeText(raw, maxLen, '')
}

function requireEnum(args, key, values, label) {
  const value = requireString(args, key, { maxLen: 64, required: true })
  if (!values.includes(value)) {
    throw new ToolError(`Неизвестный ${label}: «${value}». Доступно: ${values.join(', ')}`)
  }
  return value
}

function requireStringList(args, key, maxItems = 8) {
  const raw = args?.[key]
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ToolError(`Параметр «${key}» должен быть непустым списком`)
  }
  return raw.slice(0, maxItems).map((item) => String(item ?? '').trim()).filter(Boolean)
}

function addItems(names, { kidsStyle, stickersOnly }) {
  const added = []
  const skipped = []
  for (const raw of names) {
    const item = resolveCharacter(raw, { kidsStyle, stickersOnly })
    if (item) added.push(item)
    else skipped.push(raw)
  }
  return { added, skipped }
}

const HANDLERS = {
  set_text(args, studio) {
    const title = requireString(args, 'title', { maxLen: 120 })
    const subtitle = requireString(args, 'subtitle', { maxLen: 160 })
    if (!title && !subtitle) throw new ToolError('Не передан ни заголовок, ни подзаголовок')
    const current = studio.getContext()
    // Если поле не передано — оставляем как есть, агент меняет только запрошенное
    const finalTitle = title || current.title
    const finalSubtitle = subtitle || current.subtitle
    studio.setText(finalTitle, finalSubtitle)
    return `Текст: «${finalTitle}»${finalSubtitle ? ` / «${finalSubtitle}»` : ''}`
  },

  set_background(args, studio) {
    const kind = requireEnum(args, 'kind', ['kids', 'gradient', 'solid'], 'тип фона')
    if (kind === 'kids') {
      const id = requireEnum(
        args,
        'id',
        kidsBackgrounds.map((b) => b.id),
        'идентификатор детского фона'
      )
      const bg = kidsBackgrounds.find((b) => b.id === id)
      studio.setKidsBackground(id)
      return `Фон: «${bg.name}»`
    }
    if (kind === 'gradient') {
      const id = requireEnum(args, 'id', Object.keys(gradients), 'градиент')
      studio.setGradientBackground(id)
      return `Фон: градиент ${id}`
    }
    const color = sanitizeColor(args?.color, '')
    if (!color) throw new ToolError('Для сплошного фона нужен цвет в hex, например #1a1a22')
    studio.setSolidBackground(color)
    return `Фон: цвет ${color}`
  },

  set_model(args, studio) {
    const id = requireEnum(
      args,
      'id',
      models.map((m) => m.id),
      'идентификатор модели'
    )
    studio.setModel(id)
    return `Модель: «${models.find((m) => m.id === id)?.name || id}»`
  },

  set_kids_style(args, studio) {
    const style = requireEnum(args, 'style', KIDS_STYLES, 'стиль сцены')
    studio.setKidsStyle(style)
    return `Стиль: ${STYLE_LABELS[style]}`
  },

  add_characters(args, studio) {
    const names = requireStringList(args, 'names')
    const { added, skipped } = addItems(names, {
      kidsStyle: studio.getContext().kidsStyle,
      stickersOnly: false,
    })
    added.forEach((item) => studio.addCharacter(item.emoji, item.name, false))
    if (!added.length) {
      throw new ToolError(`Не нашёл героев: ${names.join(', ')}. Попробуй: Мишка, Котик, Лев, Единорог`)
    }
    return `Герои: ${added.map((c) => `${c.emoji} ${c.name}`).join(', ')}${
      skipped.length ? ` (пропущено: ${skipped.join(', ')})` : ''
    }`
  },

  add_stickers(args, studio) {
    const names = requireStringList(args, 'names')
    const { added, skipped } = addItems(names, {
      kidsStyle: studio.getContext().kidsStyle,
      stickersOnly: true,
    })
    added.forEach((item) => studio.addCharacter(item.emoji, item.name, true))
    if (!added.length) {
      throw new ToolError(`Не нашёл стикеры: ${names.join(', ')}. Попробуй: Шарик, Торт, Радуга, Ракета`)
    }
    return `Стикеры: ${added.map((c) => `${c.emoji} ${c.name}`).join(', ')}${
      skipped.length ? ` (пропущено: ${skipped.join(', ')})` : ''
    }`
  },

  clear_characters(_args, studio) {
    studio.clearCharacters()
    return 'Сцена очищена от героев и стикеров'
  },

  set_format(args, studio) {
    const format = requireEnum(args, 'format', FORMATS, 'формат кадра')
    studio.setFormat(format)
    return `Формат: ${format}`
  },

  set_animation(args, studio) {
    const type = requireEnum(args, 'type', ANIMS, 'тип анимации')
    studio.setAnimation(type)
    return `Анимация: ${ANIM_LABELS[type]}`
  },

  set_duration(args, studio) {
    const raw = Number(args?.seconds)
    if (!Number.isFinite(raw)) throw new ToolError('Длительность должна быть числом секунд')
    const seconds = clamp(Math.round(raw), 2, 10)
    studio.setDuration(seconds)
    return `Длительность: ${seconds} сек`
  },

  set_music(args, studio) {
    const track = requireEnum(args, 'track', MUSIC_TRACKS, 'трек')
    studio.setMusic(track)
    return `Музыка: ${MUSIC_LABELS[track]}`
  },

  set_effects(args, studio) {
    const patch = {}
    for (const name of EFFECT_NAMES) {
      if (args?.[name] !== undefined) {
        if (typeof args[name] !== 'boolean') {
          throw new ToolError(`Параметр «${name}» должен быть true/false`)
        }
        patch[name] = args[name]
      }
    }
    if (!Object.keys(patch).length) throw new ToolError('Не передано ни одного эффекта')
    studio.setEffects(patch)
    const enabled = EFFECT_NAMES.filter((n) => patch[n] === true)
    const disabled = EFFECT_NAMES.filter((n) => patch[n] === false)
    const parts = []
    if (enabled.length) parts.push(`включено: ${enabled.join(', ')}`)
    if (disabled.length) parts.push(`выключено: ${disabled.join(', ')}`)
    return `Эффекты — ${parts.join('; ')}`
  },

  apply_kids_template(args, studio) {
    const name = requireEnum(
      args,
      'name',
      kidsTemplates.map((t) => t.name),
      'название истории'
    )
    const tpl = kidsTemplates.find((t) => t.name === name)
    studio.applyKidsTemplate(tpl)
    return `История: «${name}»`
  },

  apply_template(args, studio) {
    const name = requireEnum(
      args,
      'name',
      templates.map((t) => t.name),
      'название шаблона'
    )
    const tpl = templates.find((t) => t.name === name)
    studio.applyTemplate(tpl)
    return `Шаблон: «${name}»`
  },

  async generate_background(args, studio) {
    const prompt = requireString(args, 'prompt', { maxLen: 900, required: true })
    if (prompt.trim().length < 3) throw new ToolError('Опиши картинку подробнее — минимум 3 символа')
    await studio.generateBackground(prompt)
    return `Фон сгенерирован по описанию «${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}»`
  },

  async generate_character(args, studio) {
    const prompt = requireString(args, 'prompt', { maxLen: 900, required: true })
    if (prompt.trim().length < 3) throw new ToolError('Опиши героя подробнее — минимум 3 символа')
    const name = requireString(args, 'name', { maxLen: 32 }) || 'Герой'
    await studio.generateCharacter(prompt, name)
    return `Герой сгенерирован: ${name}`
  },

  request_photos(_args, studio) {
    const available = studio.requestPhotos()
    if (!available) throw new ToolError('Загрузка фото недоступна в этом браузере')
    return 'Нужны фото пользователя — покажи кнопку загрузки'
  },

  speak_text(_args, studio) {
    const spoken = studio.speak()
    return spoken ? 'Озвучка запущена' : 'Браузер не поддерживает озвучку'
  },

  async export_video(_args, studio) {
    await studio.exportVideo()
    return 'Запись видео запущена'
  },
}

/**
 * Выполняет один вызов инструмента и всегда возвращает результат,
 * а не бросает исключение: агент продолжает работать даже при ошибке.
 */
export async function executeToolCall(call, studio) {
  const name = call?.name
  try {
    const handler = HANDLERS[name]
    if (!handler) throw new ToolError(`Неизвестный инструмент: ${name}`)
    const message = await handler(call?.arguments ?? {}, studio)
    return { id: call?.id ?? null, tool: name, ok: true, message }
  } catch (err) {
    return {
      id: call?.id ?? null,
      tool: name || 'unknown',
      ok: false,
      message: err instanceof ToolError ? err.message : `Ошибка инструмента: ${err.message}`,
    }
  }
}

function nameFromCatalog(id, catalog) {
  return catalog.find((item) => item.id === id)?.name || id
}

/** Человекочитаемое описание вызова инструмента — для карточки плана. */
export function describeToolCall(call) {
  const args = call?.arguments ?? {}
  switch (call?.name) {
    case 'set_text':
      return [
        args.title ? `заголовок «${args.title}»` : '',
        args.subtitle ? `подзаголовок «${args.subtitle}»` : '',
      ]
        .filter(Boolean)
        .join(', ') || 'текст не изменён'
    case 'set_background':
      if (args.kind === 'solid') return `сплошной фон ${args.color || ''}`.trim()
      if (args.kind === 'gradient') return `градиент ${args.id || ''}`.trim()
      return `детский фон «${nameFromCatalog(args.id, kidsBackgrounds)}»`
    case 'set_model':
      return `модель «${models.find((m) => m.id === args.id)?.name || args.id}»`
    case 'set_kids_style':
      return `стиль ${STYLE_LABELS[args.style] || args.style}`
    case 'add_characters':
      return `герои: ${(args.names || []).join(', ')}`
    case 'add_stickers':
      return `стикеры: ${(args.names || []).join(', ')}`
    case 'clear_characters':
      return 'убрать всех героев'
    case 'set_format':
      return `формат ${args.format}`
    case 'set_animation':
      return `анимация «${ANIM_LABELS[args.type] || args.type}»`
    case 'set_duration':
      return `длительность ${args.seconds} сек`
    case 'set_music':
      return `музыка «${MUSIC_LABELS[args.track] || args.track}»`
    case 'set_effects': {
      const enabled = Object.keys(args).filter((key) => args[key] === true)
      return enabled.length ? `эффекты: ${enabled.join(', ')}` : 'эффекты выключены'
    }
    case 'apply_kids_template':
      return `история «${args.name}»`
    case 'apply_template':
      return `шаблон «${args.name}»`
    case 'speak_text':
      return 'озвучить текст'
    case 'generate_background':
      return `сгенерировать фон «${args.prompt || ''}»`
    case 'generate_character':
      return `сгенерировать героя «${args.name || args.prompt || ''}»`
    case 'request_photos':
      return 'загрузить свои фото'
    case 'export_video':
      return 'записать видео'
    default:
      return call?.name || 'неизвестный шаг'
  }
}
