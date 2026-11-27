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
})
