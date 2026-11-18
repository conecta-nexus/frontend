import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useChallenges } from '~/composables/useChallenges'

const apiFetch = vi.fn()

describe('useChallenges public catalog detail', () => {
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
})
