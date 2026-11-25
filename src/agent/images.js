import { normalizeBaseUrl } from './brain.js'
import { isSafeImageDataUrl } from '../utils.js'

export const DEFAULT_IMAGE_MODEL = 'gpt-image-1'

/** Размер под формат кадра; для моделей без таких размеров есть откат на 1024x1024. */
export const IMAGE_SIZES = {
  '16:9': '1536x1024',
  '9:16': '1024x1536',
  '1:1': '1024x1024',
}

function chunkedBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Скачивает картинку по URL и превращает в data URL — чтобы фон жил офлайн и попадал в черновик. */
async function fetchImageAsDataUrl(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Не удалось скачать картинку (${response.status})`)
  const contentType = response.headers.get('content-type') || ''
  const mime = /image\/(png|jpeg|jpg|webp|gif)/i.exec(contentType)?.[0]?.toLowerCase() || 'image/png'
  const buffer = await response.arrayBuffer()
  return `data:${mime};base64,${chunkedBase64(new Uint8Array(buffer))}`
}

async function requestImage(baseUrl, headers, payload, signal) {
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  })
  if (response.ok) return response
  const bodyText = await response.text().catch(() => '')
  const detail = bodyText ? `: ${bodyText.slice(0, 200)}` : ''
  throw new Error(`API картинок вернул ${response.status}${detail}`)
}

/**
 * Генерирует картинку через OpenAI-совместимый /images/generations.
 * Возвращает { dataUrl } — картинку уже в виде data URL, готовую для Canvas и черновика.
 */
export async function generateImage({ prompt, config = {}, format = '16:9', signal } = {}) {
  const text = String(prompt ?? '').trim()
  if (text.length < 3) throw new Error('Опиши картинку подробнее — минимум 3 символа')

  const baseUrl = normalizeBaseUrl(config.baseUrl)
  const apiKey = String(config.apiKey ?? '').trim()
  if (!apiKey) {
    throw new Error('Для генерации картинок нужен API-ключ — укажи его в настройках агента')
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  const model = String(config.imageModel || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL
  const size = IMAGE_SIZES[format] || IMAGE_SIZES['16:9']
  const base = { model, prompt: text.slice(0, 900), n: 1 }

  let response
  try {
    response = await requestImage(baseUrl, headers, { ...base, size }, signal)
  } catch (err) {
    // Часть моделей умеет только квадрат — пробуем ещё раз
    if (size === '1024x1024') throw err
    response = await requestImage(baseUrl, headers, { ...base, size: '1024x1024' }, signal)
  }

  const data = await response.json()
  const item = Array.isArray(data?.data) ? data.data[0] : null
  if (!item) throw new Error('API не вернул изображение')

  let dataUrl = ''
  if (typeof item.b64_json === 'string' && item.b64_json) {
    dataUrl = `data:image/png;base64,${item.b64_json}`
  } else if (typeof item.url === 'string' && item.url) {
    dataUrl = await fetchImageAsDataUrl(item.url, signal)
  }
  if (!isSafeImageDataUrl(dataUrl)) {
    throw new Error('API вернул картинку в неподдерживаемом формате')
  }
  return { dataUrl, revisedPrompt: item.revised_prompt || '' }
}
