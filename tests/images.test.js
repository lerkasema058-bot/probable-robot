import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_SIZES, generateImage } from '../src/agent/images.js'

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('генерация изображений', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('шлёт описание и размер под формат, возвращает data URL из b64_json', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: [{ b64_json: 'aGVsbG8=', revised_prompt: 'better prompt' }] })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateImage({
      prompt: 'закат над морем',
      config: { baseUrl: 'https://api.example.com/v1', apiKey: 'k', imageModel: 'img-1' },
      format: '9:16',
    })

    expect(result.dataUrl).toBe('data:image/png;base64,aGVsbG8=')
    expect(result.revisedPrompt).toBe('better prompt')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.com/v1/images/generations')
    expect(init.headers.Authorization).toBe('Bearer k')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      model: 'img-1',
      prompt: 'закат над морем',
      size: IMAGE_SIZES['9:16'],
    })
  })

  it('скачивает картинку по URL, если API не вернул b64', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ url: 'https://cdn.example.com/img.png' }] }))
      .mockResolvedValueOnce(new Response(new Blob([bytes], { type: 'image/png' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateImage({
      prompt: 'котик',
      config: { baseUrl: 'https://api.example.com/v1', apiKey: 'k' },
    })

    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('https://cdn.example.com/img.png')
  })

  it('откатывается на 1024x1024, если выбранный размер не поддерживается', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('size not supported', { status: 400 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ b64_json: 'aGVsbG8=' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateImage({
      prompt: 'закат',
      config: { baseUrl: 'https://api.example.com/v1', apiKey: 'k' },
      format: '16:9',
    })

    expect(result.dataUrl).toBe('data:image/png;base64,aGVsbG8=')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).size).toBe('1024x1024')
  })

  it('требует ключ и внятное описание', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateImage({ prompt: '', config: { apiKey: 'k' } })).rejects.toThrow('Опиши картинку')
    await expect(
      generateImage({ prompt: 'закат', config: { baseUrl: 'https://x.example/v1', apiKey: ' ' } })
    ).rejects.toThrow('API-ключ')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('бросает ошибку с текстом API, если генерация не удалась', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('content policy', { status: 400 }))
    )
    await expect(
      generateImage({
        prompt: 'что-то запрещённое',
        config: { baseUrl: 'https://x.example/v1', apiKey: 'k' },
      })
    ).rejects.toThrow('content policy')
  })
})
