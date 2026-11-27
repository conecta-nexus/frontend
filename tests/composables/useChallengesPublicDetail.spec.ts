import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChallenges } from '~/composables/useChallenges'

const apiFetch = vi.fn()
const openChallenge = {
  id: 'open-1',
  company_id: 'company-1',
  title: 'Reto público',
  difficulty_level: 'BEGINNER',
  modality: 'REMOTE',
  min_semester: 7,
  economic_sector: 'Software',
  required_skills: ['Vue'],
  knowledge_areas: ['Ingeniería'],
  created_at: '2026-11-24T12:00:00Z',
  updated_at: '2026-11-24T18:00:00Z',
  description: 'Descripción pública',
  business_process: 'Diseño',
  status: 'OPEN',
}

function pendingResponse() {
  let resolve!: (value: unknown) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('useChallenges public detail', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    const store = new Map<string, ReturnType<typeof ref<unknown>>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!store.has(key)) store.set(key, ref(init()))
      return store.get(key)
    })
    vi.stubGlobal('useApi', () => ({ apiFetch }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('encodes the path and stores only the public challenge and attachment projection', async () => {
    const attachment = {
      id: 'file-1',
      file_name: 'requirements.pdf',
      file_size_bytes: 1024,
      mime_type: 'application/pdf',
      download_url: 'https://example.test/file',
      created_at: openChallenge.created_at,
    }
    apiFetch.mockResolvedValue({
      ...openChallenge,
      company_name: '  Empresa pública  ',
      contact_name: 'private',
      contact_email: 'private@example.test',
      contact_phone: 'private',
      attachments: [
        { ...attachment, storage_path: 'private-object', uploaded_by: 'private' },
        { ...attachment, id: 'file-2', challenge_id: 'open-1' },
      ],
    })

    const result = await useChallenges().getCatalogChallenge('id/with space?')
    expect(apiFetch).toHaveBeenCalledWith('/challenges/catalog/id%2Fwith%20space%3F', { method: 'GET' })
    expect(result).toStrictEqual({
      ...openChallenge,
      company_name: 'Empresa pública',
      attachments: [
        { ...attachment, challenge_id: 'open-1' },
        { ...attachment, id: 'file-2', challenge_id: 'open-1' },
      ],
    })
    expect(useChallenges().currentChallenge.value).toEqual(result)
  })

  it.each([
    {},
    { required_skills: null, knowledge_areas: null, attachments: null, company_name: '   ' },
    { required_skills: [], knowledge_areas: [], attachments: [], company_name: null },
  ])('normalizes absent or empty arrays and leaves the name fallback to the page (%j)', async (optionalFields) => {
    const { required_skills: _skills, knowledge_areas: _areas, ...minimal } = openChallenge
    apiFetch.mockResolvedValue({ ...minimal, ...optionalFields })
    const result = await useChallenges().getCatalogChallenge(openChallenge.id)
    expect(result).toEqual({ ...minimal, required_skills: [], knowledge_areas: [], attachments: [] })
    expect(result).not.toHaveProperty('company_name')
  })

  it('propagates the latest API error, clears loading and allows recovery', async () => {
    const detail = useChallenges()
    const error = { status: 404, data: { detail: 'Reto no disponible' } }
    apiFetch.mockRejectedValueOnce(error).mockResolvedValueOnce(openChallenge)
    await expect(detail.getCatalogChallenge('absent')).rejects.toBe(error)
    expect(detail.error.value).toBe('Reto no disponible')
    expect(detail.loading.value).toBe(false)
    expect(detail.currentChallenge.value).toBeNull()
    await detail.getCatalogChallenge(openChallenge.id)
    expect(detail.error.value).toBeNull()
    expect(detail.currentChallenge.value?.id).toBe(openChallenge.id)
  })

  it('does not publish a result that arrives after a newer public detail request', async () => {
    const older = pendingResponse()
    const newer = pendingResponse()
    apiFetch.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const first = useChallenges().getCatalogChallenge('old-id')
    const second = useChallenges().getCatalogChallenge(openChallenge.id)
    newer.resolve(openChallenge)
    await second
    older.resolve({ ...openChallenge, id: 'old-id' })
    expect((await first).id).toBe('old-id')
    expect(useChallenges().currentChallenge.value?.id).toBe(openChallenge.id)
  })

  it('does not publish a stale failure or clear the newer request loading flag', async () => {
    const older = pendingResponse()
    const newer = pendingResponse()
    apiFetch.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const detail = useChallenges()
    const first = detail.getCatalogChallenge('old-id')
    const second = detail.getCatalogChallenge(openChallenge.id)
    const rejection = expect(first).rejects.toEqual({ status: 503 })
    older.reject({ status: 503 })
    await rejection
    expect(detail.loading.value).toBe(true)
    expect(detail.error.value).toBeNull()
    newer.resolve(openChallenge)
    await second
    expect(detail.loading.value).toBe(false)
  })

  it('does not store a response for an abandoned route even without a replacement request', async () => {
    const controller = new AbortController()
    const old = pendingResponse()
    apiFetch.mockReturnValueOnce(old.promise)
    const detail = useChallenges()
    const request = detail.getCatalogChallenge(openChallenge.id, controller.signal)
    controller.abort()
    old.resolve(openChallenge)
    await request
    expect(apiFetch).toHaveBeenCalledWith('/challenges/catalog/open-1', { method: 'GET', signal: controller.signal })
    expect(detail.currentChallenge.value).toBeNull()
    expect(detail.loading.value).toBe(false)
  })
})
