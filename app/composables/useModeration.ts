import { computed } from 'vue'
import type {
  AuditLogEntry,
  AuditLogQueryFilters,
  PaginatedAuditLogResponse,
  SuspensionActionResponse,
} from '~/types/moderation'
import { extractApiErrorMessage } from '~/utils/errors'

const DEFAULT_PAGE_SIZE = 20

export function useModeration() {
  const { apiFetch } = useApi()

  const logs = useState<AuditLogEntry[]>('moderation_audit_logs', () => [])
  const totalCount = useState<number>('moderation_total_count', () => 0)
  const currentPage = useState<number>('moderation_current_page', () => 1)
  const pageSize = useState<number>('moderation_page_size', () => DEFAULT_PAGE_SIZE)
  const nextUrl = useState<string | null>('moderation_next_url', () => null)
  const previousUrl = useState<string | null>('moderation_previous_url', () => null)
  const loading = useState<boolean>('moderation_loading', () => false)
  const submitting = useState<boolean>('moderation_submitting', () => false)
  const error = useState<string | null>('moderation_error', () => null)

  const hasNextPage = computed(() => Boolean(nextUrl.value))
  const hasPreviousPage = computed(() => Boolean(previousUrl.value))
  const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))

  function clearError() {
    error.value = null
  }

  async function fetchAuditLogs(
    filters: AuditLogQueryFilters = {},
  ): Promise<PaginatedAuditLogResponse> {
    loading.value = true
    error.value = null

    const page = filters.page ?? 1
    const size = filters.page_size ?? pageSize.value
    const query: Record<string, string | number> = {
      page,
      page_size: size,
    }
    if (filters.action_type) query.action_type = filters.action_type
    if (filters.actor_id?.trim()) query.actor_id = filters.actor_id.trim()
    if (filters.start_date) query.start_date = filters.start_date
    if (filters.end_date) query.end_date = filters.end_date

    try {
      const response = await apiFetch<PaginatedAuditLogResponse>('/moderation/audit-logs/', {
        method: 'GET',
        query,
      })
      logs.value = Array.isArray(response.results) ? response.results : []
      totalCount.value = typeof response.count === 'number' ? response.count : logs.value.length
      currentPage.value = page
      pageSize.value = size
      nextUrl.value = response.next ?? null
      previousUrl.value = response.previous ?? null
      return response
    } catch (err: unknown) {
      error.value = extractApiErrorMessage(err, 'No se pudo cargar el registro de auditoría.')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function suspendChallenge(
    challengeId: string,
    justification: string,
  ): Promise<SuspensionActionResponse> {
    submitting.value = true
    error.value = null
    try {
      const response = await apiFetch<SuspensionActionResponse>(
        `/moderation/challenges/${encodeURIComponent(challengeId.trim())}/suspend/`,
        {
          method: 'POST',
          retry: 0,
          body: { justification: justification.trim() },
        },
      )
      if (response.audit_log) {
        logs.value = [response.audit_log, ...logs.value]
        totalCount.value += 1
      }
      return response
    } catch (err: unknown) {
      error.value = extractApiErrorMessage(err, 'No se pudo suspender el desafío.')
      throw err
    } finally {
      submitting.value = false
    }
  }

  async function suspendUser(
    userId: string,
    justification: string,
  ): Promise<SuspensionActionResponse> {
    submitting.value = true
    error.value = null
    try {
      const response = await apiFetch<SuspensionActionResponse>(
        `/moderation/users/${encodeURIComponent(userId.trim())}/suspend/`,
        {
          method: 'POST',
          retry: 0,
          body: { justification: justification.trim() },
        },
      )
      if (response.audit_log) {
        logs.value = [response.audit_log, ...logs.value]
        totalCount.value += 1
      }
      return response
    } catch (err: unknown) {
      error.value = extractApiErrorMessage(err, 'No se pudo suspender la cuenta de usuario.')
      throw err
    } finally {
      submitting.value = false
    }
  }

  return {
    logs,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    loading,
    submitting,
    error,
    clearError,
    fetchAuditLogs,
    suspendChallenge,
    suspendUser,
  }
}
