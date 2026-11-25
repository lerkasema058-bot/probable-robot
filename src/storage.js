import { formats, kidsBackgrounds, models } from './data.js'
import {
  clamp,
  isSafeImageDataUrl,
  normalizeCharacter,
  normalizeStroke,
  sanitizeColor,
  sanitizeText,
} from './utils.js'

export const STORAGE_KEYS = {
  model: 'pr-model',
  format: 'pr-format',
  kidsStyle: 'pr-kids-style',
  kidsBg: 'pr-kids-bg',
  chars: 'pr-chars',
  strokes: 'pr-strokes',
  drawColor: 'pr-draw-color',
  drawSize: 'pr-draw-size',
  draft: 'pr-draft',
  draftTime: 'pr-draft-time',
  agentBrain: 'pr-agent-brain',
  agentBaseUrl: 'pr-agent-base-url',
  agentModel: 'pr-agent-model',
  agentKey: 'pr-agent-key',
  agentImageModel: 'pr-agent-image-model',
  agentAutoApply: 'pr-agent-auto-apply',
}

export function safeGetItem(key, fallback = null, storage = globalThis.localStorage) {
  try {
    const val = storage?.getItem(key)
    return val === null || val === undefined ? fallback : val
  } catch {
    return fallback
  }
}

export function safeSetItem(key, value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(key, value)
    return { ok: true }
  } catch (err) {
    const isQuota =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22)
    return { ok: false, quota: Boolean(isQuota), error: err }
  }
}

export function safeRemoveItem(key, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(key)
  } catch {
    // ignore storage errors in restricted environments
  }
}

export function safeParseJSON(raw, fallback = null) {
  if (typeof raw !== 'string' || !raw.trim()) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function serializeCharacters(characters) {
  return characters.map((ch) => {
    const copy = { ...ch }
    delete copy._img
    return copy
  })
}

const VALID_BG_TYPES = new Set(['gradient1', 'gradient2', 'gradient3', 'gradient4', 'solid', 'image'])
const VALID_ANIMS = new Set(['fadeScale', 'typewriter', 'slideUp', 'zoom', 'none'])
const VALID_MUSIC = new Set(['none', 'happy', 'tale', 'energy'])
const VALID_STYLES = new Set(['cartoon', 'realistic'])
const VALID_KIDS_BG_IDS = new Set(kidsBackgrounds.map((b) => b.id))
const VALID_MODEL_IDS = new Set(models.map((m) => m.id))

export function validateProject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Некорректный формат файла черновика')
  }

  const fmt = typeof raw.format === 'string' && formats[raw.format] ? raw.format : '16:9'
  const dims = formats[fmt]

  const kidsStyle = VALID_STYLES.has(raw.kidsStyle) ? raw.kidsStyle : 'cartoon'
  const activeKidsBgId =
    typeof raw.activeKidsBgId === 'string' && VALID_KIDS_BG_IDS.has(raw.activeKidsBgId)
      ? raw.activeKidsBgId
      : null
  const modelId = VALID_MODEL_IDS.has(raw.modelId) ? raw.modelId : 'classic'
  const bgType = VALID_BG_TYPES.has(raw.bgType) ? raw.bgType : 'gradient1'
  const anim = VALID_ANIMS.has(raw.anim) ? raw.anim : 'fadeScale'
  const music = VALID_MUSIC.has(raw.music) ? raw.music : 'none'

  const rawChars = Array.isArray(raw.characters) ? raw.characters.slice(0, 60) : []
  const characters = rawChars.map((c) => normalizeCharacter(c, dims)).filter(Boolean)

  const rawStrokes = Array.isArray(raw.strokes) ? raw.strokes.slice(0, 300) : []
  const strokes = rawStrokes.map((s) => normalizeStroke(s, dims)).filter(Boolean)

  const bgImageSrc = isSafeImageDataUrl(raw.bgImageSrc) ? raw.bgImageSrc : null

  return {
    v: 3,
    title: sanitizeText(raw.title ?? '', 300, ''),
    subtitle: sanitizeText(raw.subtitle ?? '', 300, ''),
    titleSize: clamp(Number(raw.titleSize) || 68, 28, 110),
    subSize: clamp(Number(raw.subSize) || 24, 14, 48),
    bgType,
    bgColor: sanitizeColor(raw.bgColor, '#0a0a0f'),
    bgImageSrc,
    overlay: clamp(Number(raw.overlay) || 0, 0, 80),
    anim,
    duration: clamp(Math.round(Number(raw.duration) || 4), 2, 10),
    textColor: sanitizeColor(raw.textColor, '#ffffff'),
    particles: Boolean(raw.particles ?? true),
    kenBurns: Boolean(raw.kenBurns ?? false),
    watermark: Boolean(raw.watermark ?? false),
    confetti: Boolean(raw.confetti ?? false),
    bubbles: Boolean(raw.bubbles ?? true),
    speech: Boolean(raw.speech ?? false),
    drawColor: sanitizeColor(raw.drawColor, '#ff2d55'),
    drawSize: clamp(Number(raw.drawSize) || 6, 2, 24),
    kidsStyle,
    activeKidsBgId,
    characters,
    strokes,
    music,
    format: fmt,
    modelId,
  }
}
