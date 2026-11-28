import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChallenges } from '~/composables/useChallenges'

const apiFetch = vi.fn()

describe('useChallenges public catalog', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    vi.stubGlobal('useApi', () => ({ apiFetch }))
    vi.stubGlobal('useState', <T>(_key: string, init: () => T) => ref(init()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the privacy-safe endpoint and normalizes public attachments', async () => {
    apiFetch.mockResolvedValueOnce({
      id: 'challenge/1',
      company_id: 'company-1',
      title: 'Reto público',
      description: 'Descripción',
      business_process: 'Proceso',
      status: 'OPEN',
      difficulty_level: 'INTERMEDIATE',
      modality: 'REMOTE',
      min_semester: 7,
      economic_sector: 'Tecnología',
      required_skills: ['Vue'],
      knowledge_areas: ['Software'],
      attachments: [
        {
          id: 'attachment-1',
          file_name: 'guia.pdf',
          file_size_bytes: 1024,
          mime_type: 'application/pdf',
          download_url: 'https://storage.example.com/signed/guide',
          created_at: '2026-11-12T12:00:00Z',
        },
      ],
      created_at: '2026-11-12T12:00:00Z',
      updated_at: '2026-11-12T12:00:00Z',
    })

    const { getCatalogChallenge, currentChallenge } = useChallenges()
    const result = await getCatalogChallenge('challenge/1')

    expect(apiFetch).toHaveBeenCalledWith(
      '/challenges/catalog/challenge%2F1',
      { method: 'GET' },
    )
    expect(result.attachments[0]).toEqual(expect.objectContaining({
      challenge_id: 'challenge/1',
      download_url: 'https://storage.example.com/signed/guide',
    }))
    expect(currentChallenge.value).toEqual(result)
  })

  it('keeps the latest catalog response when an older page request finishes later', async () => {
    const firstPage = { items: [], page: 1, pages: 2, total: 2, limit: 1 }
    const secondPage = { ...firstPage, page: 2 }
    let resolveFirstPage!: (response: typeof firstPage) => void
    apiFetch.mockReturnValueOnce(new Promise((resolve) => {
      resolveFirstPage = resolve
    })).mockResolvedValueOnce(secondPage)

    const { fetchCatalog, catalog, catalogLoading, challenges } = useChallenges()
    const request = fetchCatalog({ page: 1, limit: 1 })
    expect(catalogLoading.value).toBe(true)
    await fetchCatalog({ page: 2, limit: 1 })
    resolveFirstPage(firstPage)
    await request

    expect(apiFetch).toHaveBeenLastCalledWith('/challenges/catalog', {
      method: 'GET',
      query: { page: 2, limit: 1 },
    })
    expect(catalog.value).toEqual(secondPage)
    expect(catalogLoading.value).toBe(false)
    expect(challenges.value).toEqual([])
  })

  it('keeps the backend zero-results metadata in the catalog response', async () => {
    const response = {
      items: [], total: 0, page: 1, pages: 1, limit: 10,
      empty_state: {
        code: 'NO_MATCHING_CHALLENGES',
        message: 'No challenges match your selected search criteria.',
        query_params: { q: 'Unknown' },
        suggested_reset: true,
        total_active_challenges: 14,
      },
    }
    apiFetch.mockResolvedValueOnce(response)
    const { fetchCatalog, catalog } = useChallenges()
    await expect(fetchCatalog({ q: 'Unknown' })).resolves.toEqual(response)
    expect(catalog.value?.empty_state).toEqual(response.empty_state)
  })
})

describe('useChallenges CRUD, publish and normalized errors', () => {
  const sampleChallenge = {
    id: 'ch-1',
    company_id: 'comp-1',
    title: 'Plataforma Logística',
    description: 'Optimización de rutas urbanas.',
    business_process: 'Logística',
    status: 'DRAFT' as const,
    difficulty_level: 'INTERMEDIATE' as const,
    modality: 'HYBRID' as const,
    min_semester: 7,
    economic_sector: 'Logística y Transporte',
    required_skills: ['TypeScript', 'Nuxt'],
    knowledge_areas: ['Ingeniería de Software'],
    attachments: [],
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  }

  beforeEach(() => {
    apiFetch.mockReset()
    const store = new Map<string, ReturnType<typeof ref<unknown>>>()
    vi.stubGlobal('useApi', () => ({ apiFetch }))
    vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
      if (!store.has(key)) store.set(key, ref(init()))
      return store.get(key)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a challenge, prepends to portfolio, and leaves draft catalog cache intact', async () => {
    apiFetch.mockResolvedValueOnce(sampleChallenge)
    const { createChallenge, challenges, currentChallenge, loading } = useChallenges()

    const created = await createChallenge({
      title: sampleChallenge.title,
      description: sampleChallenge.description,
      business_process: sampleChallenge.business_process,
      difficulty_level: sampleChallenge.difficulty_level,
      modality: sampleChallenge.modality,
      min_semester: sampleChallenge.min_semester,
      economic_sector: sampleChallenge.economic_sector,
      required_skills: sampleChallenge.required_skills,
      knowledge_areas: sampleChallenge.knowledge_areas,
      status: 'DRAFT',
    })

    expect(created.id).toBe('ch-1')
    expect(currentChallenge.value?.id).toBe('ch-1')
    expect(challenges.value[0]?.id).toBe('ch-1')
    expect(loading.value).toBe(false)
  })

  it('publishes a draft challenge, clears cached catalog, and normalizes API errors', async () => {
    const published = { ...sampleChallenge, status: 'OPEN' as const }
    apiFetch.mockResolvedValueOnce(published)

    const { publishChallenge, challenges, catalog, currentChallenge, error, loading } = useChallenges()
    challenges.value = [sampleChallenge]
    catalog.value = { items: [], total: 0, page: 1, pages: 1, limit: 10 }

    const res = await publishChallenge('ch-1')
    expect(apiFetch).toHaveBeenCalledWith('/challenges/ch-1/publish', { method: 'POST', retry: 0 })
    expect(res.status).toBe('OPEN')
    expect(currentChallenge.value?.status).toBe('OPEN')
    expect(challenges.value[0]?.status).toBe('OPEN')
    expect(catalog.value).toBeNull()
    expect(loading.value).toBe(false)

    apiFetch.mockRejectedValueOnce({ data: { detail: 'Challenge is already open' } })
    await expect(publishChallenge('ch-1')).rejects.toBeTruthy()
    expect(error.value).toBe('Challenge is already open')
    expect(loading.value).toBe(false)
  })

  it('updates and closes challenges while keeping reactive list synchronized', async () => {
    const updated = { ...sampleChallenge, title: 'Nuevo título' }
    const closed = { ...updated, status: 'CLOSED' as const }
    apiFetch.mockResolvedValueOnce(updated).mockResolvedValueOnce(closed)

    const { updateChallenge, closeChallenge, challenges, fetchCompanyChallenges } = useChallenges()
    challenges.value = [sampleChallenge]

    await updateChallenge('ch-1', { title: 'Nuevo título' })
    expect(challenges.value[0]?.title).toBe('Nuevo título')

    await closeChallenge('ch-1', 'Proyecto asignado internamente en la empresa.')
    expect(apiFetch).toHaveBeenLastCalledWith('/challenges/ch-1/close', {
      method: 'POST',
      body: { reason: 'Proyecto asignado internamente en la empresa.' },
    })
    expect(challenges.value[0]?.status).toBe('CLOSED')

    apiFetch.mockResolvedValueOnce({ items: [closed], total: 1, page: 1, limit: 10, pages: 1 })
    const portfolio = await fetchCompanyChallenges({ status: 'CLOSED', page: 1, limit: 10 })
    expect(portfolio.items).toHaveLength(1)
  })

  it('uploads, signs download URL, and removes challenge attachments cleanly', async () => {
    const att = {
      id: 'att-1',
      challenge_id: 'ch-1',
      file_name: 'spec.pdf',
      file_size_bytes: 2048,
      mime_type: 'application/pdf',
      created_at: '2026-11-20T12:00:00Z',
    }
    apiFetch
      .mockResolvedValueOnce(att)
      .mockResolvedValueOnce({ download_url: 'https://storage.test/spec.pdf', expires_in_seconds: 300 })
      .mockResolvedValueOnce({})

    const { currentChallenge, uploadAttachment, getAttachmentDownloadUrl, deleteAttachment } = useChallenges()
    currentChallenge.value = { ...sampleChallenge, attachments: [] }

    const file = new File(['%PDF'], 'spec.pdf', { type: 'application/pdf' })
    await uploadAttachment('ch-1', file)
    expect(currentChallenge.value.attachments).toHaveLength(1)

    const signed = await getAttachmentDownloadUrl('ch-1', 'att-1')
    expect(signed.download_url).toBe('https://storage.test/spec.pdf')

    await deleteAttachment('ch-1', 'att-1')
    expect(currentChallenge.value.attachments).toHaveLength(0)
  })
})
