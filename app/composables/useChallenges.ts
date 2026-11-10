import { computed } from 'vue'
import type {
  AttachmentDownloadResponse,
  Challenge,
  ChallengeAttachment,
  ChallengeCatalogFilter,
  ChallengeClosePayload,
  ChallengeCreatePayload,
  ChallengeUpdatePayload,
  PaginatedResponse,
} from '~/types/challenge'

export function useChallenges() {
  const { apiFetch } = useApi()

  // Reactive state shared across challenge pages and components
  const challenges = useState<Challenge[]>('challenges_list', () => [])
  const currentChallenge = useState<Challenge | null>('challenges_current', () => null)
  const pagination = useState<PaginatedResponse<Challenge> | null>('challenges_pagination', () => null)
  const loading = useState<boolean>('challenges_loading', () => false)
  const error = useState<string | null>('challenges_error', () => null)

  // Computed state helpers
  const hasChallenges = computed(() => challenges.value.length > 0)
  const totalChallenges = computed(() => pagination.value?.total || challenges.value.length)
  const activeChallenges = computed(() => challenges.value.filter(c => c.status === 'OPEN'))
  const draftChallenges = computed(() => challenges.value.filter(c => c.status === 'DRAFT'))
  const closedChallenges = computed(() => challenges.value.filter(c => c.status === 'CLOSED'))

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset currently active challenge
   */
  function clearCurrentChallenge() {
    currentChallenge.value = null
  }

  /**
   * Create a new challenge (HU-06)
   */
  async function createChallenge(payload: ChallengeCreatePayload): Promise<Challenge> {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<Challenge>('/challenges/', {
        method: 'POST',
        body: payload,
      })
      currentChallenge.value = response
      challenges.value.unshift(response)
      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to create challenge'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single challenge by ID
   */
  async function getChallenge(id: string): Promise<Challenge> {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<Challenge>(`/challenges/${id}`, {
        method: 'GET',
      })
      currentChallenge.value = response
      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to fetch challenge'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Partially update a challenge's functional attributes (HU-06 / HU-08)
   */
  async function updateChallenge(id: string, payload: ChallengeUpdatePayload): Promise<Challenge> {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<Challenge>(`/challenges/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      currentChallenge.value = response
      const index = challenges.value.findIndex(c => c.id === id)
      if (index !== -1) {
        challenges.value[index] = response
      }
      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to update challenge'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Voluntarily close a challenge with mandatory justification (HU-08)
   */
  async function closeChallenge(
    id: string,
    payload: ChallengeClosePayload | string,
  ): Promise<Challenge> {
    loading.value = true
    error.value = null
    try {
      const body = typeof payload === 'string' ? { reason: payload } : payload
      const response = await apiFetch<Challenge>(`/challenges/${id}/close`, {
        method: 'POST',
        body,
      })
      currentChallenge.value = response
      const index = challenges.value.findIndex(c => c.id === id)
      if (index !== -1) {
        challenges.value[index] = response
      }
      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to close challenge'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch company's own challenges portfolio (HU-08)
   */
  async function fetchCompanyChallenges(
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<PaginatedResponse<Challenge>> {
    loading.value = true
    error.value = null
    try {
      const query: Record<string, string | number> = {}
      if (params.page) query.page = params.page
      if (params.limit) query.limit = params.limit
      if (params.status) query.status = params.status

      const response = await apiFetch<PaginatedResponse<Challenge>>('/challenges/company/me', {
        method: 'GET',
        query,
      })
      challenges.value = response.items
      pagination.value = response
      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to fetch company challenges'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch public challenge catalog with multi-criteria filtering (HU-09, HU-10)
   */
  async function fetchCatalog(
    filters: ChallengeCatalogFilter = {},
  ): Promise<PaginatedResponse<Challenge>> {
    loading.value = true
    error.value = null
    try {
      const query: Record<string, string | number> = {}
      if (filters.q) query.q = filters.q
      if (filters.economic_sector || filters.sector) {
        query.economic_sector = filters.economic_sector || filters.sector || ''
      }
      if (filters.modality) query.modality = filters.modality
      if (filters.difficulty_level || filters.difficulty) {
        query.difficulty_level = filters.difficulty_level || filters.difficulty || ''
      }
      if (filters.skill) query.skill = filters.skill
      if (filters.knowledge_area) query.knowledge_area = filters.knowledge_area
      if (filters.min_semester !== undefined) query.min_semester = filters.min_semester
      if (filters.page) query.page = filters.page
      if (filters.limit || filters.page_size) query.limit = filters.limit || filters.page_size || 10

      const response = await apiFetch<PaginatedResponse<Challenge>>('/challenges/catalog', {
        method: 'GET',
        query,
      })
      challenges.value = response.items
      pagination.value = response
      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to fetch opportunity catalog'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload technical file attachment for a challenge (HU-07)
   */
  async function uploadAttachment(challengeId: string, file: File): Promise<ChallengeAttachment> {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiFetch<ChallengeAttachment>(
        `/challenges/${challengeId}/attachments`,
        {
          method: 'POST',
          body: formData,
        },
      )

      if (currentChallenge.value && currentChallenge.value.id === challengeId) {
        if (!currentChallenge.value.attachments) {
          currentChallenge.value.attachments = []
        }
        currentChallenge.value.attachments.push(response)
      }

      return response
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to upload attachment'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtain an ephemeral signed URL to download a technical attachment (HU-07)
   */
  async function getAttachmentDownloadUrl(
    challengeId: string,
    attachmentId: string,
  ): Promise<AttachmentDownloadResponse> {
    loading.value = true
    error.value = null
    try {
      return await apiFetch<AttachmentDownloadResponse>(
        `/challenges/${challengeId}/attachments/${attachmentId}/download`,
        {
          method: 'GET',
        },
      )
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to generate download URL'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete an attachment from a challenge (HU-07)
   */
  async function deleteAttachment(challengeId: string, attachmentId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await apiFetch<unknown>(`/challenges/${challengeId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      })

      if (currentChallenge.value?.attachments) {
        currentChallenge.value.attachments = currentChallenge.value.attachments.filter(
          att => att.id !== attachmentId,
        )
      }
    } catch (err: unknown) {
      const fetchError = err as { data?: { detail?: string }; message?: string }
      error.value = fetchError?.data?.detail || fetchError?.message || 'Failed to delete attachment'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // Reactive states
    challenges,
    currentChallenge,
    pagination,
    loading,
    error,

    // Computed helpers
    hasChallenges,
    totalChallenges,
    activeChallenges,
    draftChallenges,
    closedChallenges,

    // Methods
    clearError,
    clearCurrentChallenge,
    createChallenge,
    getChallenge,
    updateChallenge,
    closeChallenge,
    fetchCompanyChallenges,
    fetchCatalog,
    uploadAttachment,
    getAttachmentDownloadUrl,
    deleteAttachment,
  }
}
