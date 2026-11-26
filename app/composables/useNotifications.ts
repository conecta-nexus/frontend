import { computed } from 'vue'
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationItem,
  NotificationListResponse,
} from '~/types/notification'
import {
  DEFAULT_NOTIFICATION_LIMIT,
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_TOAST_DURATION_MS,
  formatUnreadBadge,
  getNotificationEventMeta,
  mergeNotificationItems,
  sanitizeNotificationLink,
  selectNewlyArrivedNotifications,
  trackKnownNotifications,
} from '~/utils/notifications'

interface NotificationRuntimeState {
  activeSessionKey: string | null
  sessionEpoch: number
  mutationVersion: number
  markAllVersion: number
  reconcilingReadAll: boolean
  latestPageZeroSeq: number
  latestLoadMoreSeq: number
  latestPollOpSeq: number
  latestLoadMoreOpSeq: number
  initialFetchInFlight: boolean
  hasBaselineLoaded: boolean
  lastSyncedAt: number
  watermarkCreatedAtMs: number | null
  seenIds: Map<string, number>
  notificationToastIds: Set<string | number>
  clickingIds: Set<string>
  mutationQueue: Promise<void>
  pollTimer: ReturnType<typeof setInterval> | null
  pollInFlight: boolean
  pollingConsumerCount: number
  visibilityHandler: (() => void) | null
}

// Per-NuxtApp runtime state so SSR contexts, timers, toast IDs, and deduplication
// are completely isolated without storing Promises or Sets in hydration useState.
const runtimeByContext = new WeakMap<object, NotificationRuntimeState>()

function getNotificationRuntime(nuxtApp: object): NotificationRuntimeState {
  let runtime = runtimeByContext.get(nuxtApp)
  if (!runtime) {
    runtime = {
      activeSessionKey: null,
      sessionEpoch: 0,
      mutationVersion: 0,
      markAllVersion: 0,
      reconcilingReadAll: false,
      latestPageZeroSeq: 0,
      latestLoadMoreSeq: 0,
      latestPollOpSeq: 0,
      latestLoadMoreOpSeq: 0,
      initialFetchInFlight: false,
      hasBaselineLoaded: false,
      lastSyncedAt: 0,
      watermarkCreatedAtMs: null,
      seenIds: new Map<string, number>(),
      notificationToastIds: new Set<string | number>(),
      clickingIds: new Set<string>(),
      mutationQueue: Promise.resolve(),
      pollTimer: null,
      pollInFlight: false,
      pollingConsumerCount: 0,
      visibilityHandler: null,
    }
    runtimeByContext.set(nuxtApp, runtime)
  }
  return runtime
}

function extractHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const anyErr = err as { status?: number; statusCode?: number; response?: { status?: number } }
  return anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status
}

export function useNotifications() {
  const nuxtApp = useNuxtApp()
  const { apiFetch } = useApi()
  const { accessToken, user } = useAuth()
  const toast = useToast()

  const items = useState<NotificationItem[]>('notifications_items', () => [])
  const unreadCount = useState<number>('notifications_unread_count', () => 0)
  const loading = useState<boolean>('notifications_loading', () => false)
  const loadingMore = useState<boolean>('notifications_loading_more', () => false)
  const markingIds = useState<string[]>('notifications_marking_ids', () => [])
  const markingAll = useState<boolean>('notifications_marking_all', () => false)
  const hasMore = useState<boolean>('notifications_has_more', () => false)
  const error = useState<string | null>('notifications_error', () => null)
  const actionError = useState<string | null>('notifications_action_error', () => null)
  const isOpen = useState<boolean>('notifications_drawer_open', () => false)

  const runtime = getNotificationRuntime(nuxtApp)

  const currentSessionKey = computed(() =>
    accessToken.value && user.value?.id ? user.value.id : null,
  )

  const formattedBadge = computed(() => formatUnreadBadge(unreadCount.value))

  function isMarking(id: string): boolean {
    return markingIds.value.includes(id)
  }

  function clearPollingTimer() {
    if (runtime.pollTimer !== null) {
      clearInterval(runtime.pollTimer)
      runtime.pollTimer = null
    }
  }

  function dismissNotificationToasts() {
    if (typeof toast.remove === 'function') {
      for (const toastId of runtime.notificationToastIds) {
        try {
          toast.remove(toastId)
        } catch {
          // Ignore already removed toasts
        }
      }
    }
    runtime.notificationToastIds.clear()
  }

  function resetState(nextSessionKey: string | null = null) {
    runtime.sessionEpoch += 1
    runtime.mutationVersion = 0
    runtime.markAllVersion += 1
    runtime.reconcilingReadAll = false
    runtime.latestPageZeroSeq += 1
    runtime.latestLoadMoreSeq += 1
    runtime.latestPollOpSeq += 1
    runtime.latestLoadMoreOpSeq += 1
    runtime.activeSessionKey = nextSessionKey
    runtime.initialFetchInFlight = false
    runtime.hasBaselineLoaded = false
    runtime.lastSyncedAt = 0
    runtime.watermarkCreatedAtMs = null
    runtime.pollInFlight = false
    runtime.seenIds.clear()
    runtime.clickingIds.clear()
    dismissNotificationToasts()

    items.value = []
    unreadCount.value = 0
    loading.value = false
    loadingMore.value = false
    markingIds.value = []
    markingAll.value = false
    hasMore.value = false
    error.value = null
    actionError.value = null
    isOpen.value = false
  }

  function ensureSessionAlignment(): string | null {
    const key = currentSessionKey.value
    if (key !== runtime.activeSessionKey) {
      resetState(key)
    }
    return key
  }

  function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const next = runtime.mutationQueue.then(operation, operation)
    runtime.mutationQueue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  function addScopedToast(
    payload: Parameters<typeof toast.add>[0],
  ) {
    const created = toast.add(payload)
    if (created && created.id !== undefined) {
      runtime.notificationToastIds.add(created.id)
    }
    return created
  }

  function notifyArrivedItems(
    incoming: NotificationItem[],
    capturedEpoch: number,
    capturedSessionKey: string,
  ) {
    const freshUnread = selectNewlyArrivedNotifications(
      incoming,
      runtime.seenIds,
      runtime.watermarkCreatedAtMs,
    )

    runtime.watermarkCreatedAtMs = trackKnownNotifications(
      incoming,
      runtime.seenIds,
      runtime.watermarkCreatedAtMs,
      { advanceWatermark: true },
    )

    if (freshUnread.length === 0) return

    if (freshUnread.length <= 2) {
      for (const item of freshUnread) {
        const meta = getNotificationEventMeta(item.event_type)
        addScopedToast({
          title: item.title,
          description: item.message,
          icon: meta.icon,
          color: meta.toastColor,
          duration: NOTIFICATION_TOAST_DURATION_MS,
          onClick: () => {
            if (
              runtime.sessionEpoch !== capturedEpoch ||
              currentSessionKey.value !== capturedSessionKey
            ) {
              return
            }
            void handleNotificationClick(item)
          },
        })
      }
      return
    }

    const latest = freshUnread[0]!
    const meta = getNotificationEventMeta(latest.event_type)
    addScopedToast({
      title: `Tienes ${freshUnread.length} notificaciones nuevas`,
      description: latest.title,
      icon: meta.icon,
      color: 'primary',
      duration: NOTIFICATION_TOAST_DURATION_MS,
      onClick: () => {
        if (
          runtime.sessionEpoch !== capturedEpoch ||
          currentSessionKey.value !== capturedSessionKey
        ) {
          return
        }
        openDrawer()
      },
    })
  }

  async function fetchNotificationsPage(
    options: {
      limit?: number
      offset?: number
      isInitial?: boolean
      fromPoll?: boolean
      showLoader?: boolean
    } = {},
  ): Promise<NotificationListResponse | null> {
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey) {
      resetState(null)
      return null
    }

    const limit = options.limit ?? DEFAULT_NOTIFICATION_LIMIT
    const offset = options.offset ?? 0
    const isPageZero = offset === 0
    const capturedEpoch = runtime.sessionEpoch
    const capturedMutation = runtime.mutationVersion
    const capturedMarkAll = runtime.markAllVersion
    const capturedPageZeroSeq = isPageZero ? ++runtime.latestPageZeroSeq : runtime.latestPageZeroSeq
    const capturedLoadMoreSeq = isPageZero ? runtime.latestLoadMoreSeq : ++runtime.latestLoadMoreSeq

    const isInitialBaselineFetch = isPageZero && !runtime.hasBaselineLoaded
    if (isInitialBaselineFetch) {
      runtime.initialFetchInFlight = true
    }

    if (options.showLoader) {
      loading.value = true
      error.value = null
    }

    try {
      const response = await apiFetch<NotificationListResponse>('/notifications/me', {
        method: 'GET',
        query: { limit, offset },
      })

      // Guard session epoch & identity against late/stale responses
      if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
        return null
      }

      if (isPageZero) {
        // Any newer page-0 request, active read-all reconciliation, or mutation supersedes this snapshot
        if (
          runtime.reconcilingReadAll ||
          capturedPageZeroSeq !== runtime.latestPageZeroSeq ||
          capturedMutation !== runtime.mutationVersion ||
          capturedMarkAll !== runtime.markAllVersion
        ) {
          return null
        }
      } else if (
        runtime.reconcilingReadAll ||
        capturedLoadMoreSeq !== runtime.latestLoadMoreSeq ||
        capturedMarkAll !== runtime.markAllVersion
      ) {
        return null
      }

      const incomingItems = Array.isArray(response.items) ? response.items : []

      if (isPageZero) {
        if (!runtime.hasBaselineLoaded) {
          runtime.watermarkCreatedAtMs = trackKnownNotifications(
            incomingItems,
            runtime.seenIds,
            runtime.watermarkCreatedAtMs,
            { advanceWatermark: true },
          )
          runtime.hasBaselineLoaded = true
          items.value = mergeNotificationItems([], incomingItems)
        } else {
          // Any valid page-0 fetch after initial baseline (poll, drawer open, manual reload)
          // detects genuinely unseen arrivals once without losing alerts or duplicating on next poll.
          notifyArrivedItems(incomingItems, capturedEpoch, sessionKey)
          items.value = mergeNotificationItems(items.value, incomingItems)
        }

        if (options.isInitial || items.value.length <= limit) {
          hasMore.value = incomingItems.length >= limit
        }

        unreadCount.value = Math.max(0, Number(response.unread_count) || 0)
        runtime.lastSyncedAt = Date.now()
      } else {
        // Pagination (offset > 0) records historical IDs without emitting toasts or moving watermark
        trackKnownNotifications(
          incomingItems,
          runtime.seenIds,
          runtime.watermarkCreatedAtMs,
          { advanceWatermark: false },
        )

        const mutationHappenedDuringPagination = capturedMutation !== runtime.mutationVersion
        items.value = mergeNotificationItems(items.value, incomingItems, {
          preserveReadFlagsFromExisting: mutationHappenedDuringPagination,
        })
        hasMore.value = incomingItems.length >= limit

        // Never overwrite unreadCount with pre-mutation pagination snapshot
        if (!mutationHappenedDuringPagination) {
          unreadCount.value = Math.max(0, Number(response.unread_count) || 0)
        }
      }

      error.value = null
      if (isPageZero && !options.fromPoll) {
        actionError.value = null
      }
      return response
    } catch {
      if (
        capturedEpoch === runtime.sessionEpoch &&
        currentSessionKey.value === sessionKey &&
        !options.fromPoll &&
        !runtime.reconcilingReadAll &&
        (!isPageZero || (capturedPageZeroSeq === runtime.latestPageZeroSeq && capturedMutation === runtime.mutationVersion))
      ) {
        error.value = 'No pudimos cargar tus notificaciones. Intenta nuevamente.'
      }
      return null
    } finally {
      if (
        capturedEpoch === runtime.sessionEpoch &&
        currentSessionKey.value === sessionKey &&
        (!isPageZero || capturedPageZeroSeq === runtime.latestPageZeroSeq)
      ) {
        if (isInitialBaselineFetch) {
          runtime.initialFetchInFlight = false
        }
        if (options.showLoader) {
          loading.value = false
        }
      }
    }
  }

  async function fetchInitial(options: { showLoader?: boolean } = {}) {
    const showLoader = options.showLoader ?? items.value.length === 0
    return await fetchNotificationsPage({
      limit: DEFAULT_NOTIFICATION_LIMIT,
      offset: 0,
      isInitial: true,
      fromPoll: false,
      showLoader,
    })
  }

  async function pollNotifications() {
    if (runtime.pollInFlight || runtime.reconcilingReadAll) return
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey) {
      stopPolling({ force: true })
      return
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return
    }

    const capturedEpoch = runtime.sessionEpoch
    const pollOpId = ++runtime.latestPollOpSeq
    runtime.pollInFlight = true
    try {
      await fetchNotificationsPage({
        limit: DEFAULT_NOTIFICATION_LIMIT,
        offset: 0,
        isInitial: !runtime.hasBaselineLoaded,
        fromPoll: runtime.hasBaselineLoaded,
        showLoader: false,
      })
    } finally {
      if (
        capturedEpoch === runtime.sessionEpoch &&
        pollOpId === runtime.latestPollOpSeq
      ) {
        runtime.pollInFlight = false
      }
    }
  }

  async function loadMore() {
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey || loading.value || loadingMore.value || !hasMore.value) {
      return null
    }

    const capturedEpoch = runtime.sessionEpoch
    const loadMoreOpId = ++runtime.latestLoadMoreOpSeq
    loadingMore.value = true
    actionError.value = null
    try {
      return await fetchNotificationsPage({
        limit: DEFAULT_NOTIFICATION_LIMIT,
        offset: items.value.length,
        isInitial: false,
        fromPoll: false,
        showLoader: false,
      })
    } finally {
      if (
        capturedEpoch === runtime.sessionEpoch &&
        currentSessionKey.value === sessionKey &&
        loadMoreOpId === runtime.latestLoadMoreOpSeq
      ) {
        loadingMore.value = false
      }
    }
  }

  async function markAsRead(notificationId: string): Promise<boolean> {
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey || !notificationId || isMarking(notificationId)) {
      return false
    }

    const capturedEpoch = runtime.sessionEpoch

    return await enqueueMutation(async () => {
      if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
        return false
      }

      runtime.mutationVersion += 1
      actionError.value = null
      markingIds.value = [...markingIds.value, notificationId]

      try {
        const response = await apiFetch<MarkNotificationReadResponse>(
          `/notifications/${encodeURIComponent(notificationId)}/read`,
          {
            method: 'PATCH',
            body: {},
          },
        )

        if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
          return false
        }

        runtime.mutationVersion += 1
        items.value = items.value.map(item =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        )
        unreadCount.value = Math.max(0, Number(response.unread_count) || 0)
        return true
      } catch (err: unknown) {
        if (capturedEpoch === runtime.sessionEpoch && currentSessionKey.value === sessionKey) {
          const status = extractHttpStatus(err)
          actionError.value = status === 404
            ? 'Esta notificación ya no se encuentra disponible.'
            : 'No fue posible marcar la notificación como leída. Intenta nuevamente.'
        }
        return false
      } finally {
        if (capturedEpoch === runtime.sessionEpoch) {
          markingIds.value = markingIds.value.filter(id => id !== notificationId)
        }
      }
    })
  }

  async function markAllAsRead(): Promise<boolean> {
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey || markingAll.value || unreadCount.value <= 0) {
      return false
    }

    const capturedEpoch = runtime.sessionEpoch

    return await enqueueMutation(async () => {
      if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
        return false
      }

      runtime.mutationVersion += 1
      runtime.reconcilingReadAll = true
      actionError.value = null
      markingAll.value = true

      const prePatchIds = new Set(items.value.map(item => item.id))

      try {
        const patchResult = await apiFetch<MarkAllNotificationsReadResponse>(
          '/notifications/read-all',
          {
            method: 'PATCH',
            body: {},
          },
        )

        if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
          return false
        }

        const authoritativeUnread = Math.max(0, Number(patchResult.unread_count) || 0)
        unreadCount.value = authoritativeUnread
        runtime.mutationVersion += 1
        runtime.markAllVersion += 1
        runtime.latestPageZeroSeq += 1

        // Authoritative reconciliation against backend so concurrent arrivals remain unread,
        // newly arrived notifications emit one toast, and concurrent polling/reloads cannot invalidate it.
        try {
          const reconResult = await apiFetch<NotificationListResponse>('/notifications/me', {
            method: 'GET',
            query: { limit: DEFAULT_NOTIFICATION_LIMIT, offset: 0 },
          })

          if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
            return false
          }

          const serverItems = Array.isArray(reconResult.items) ? reconResult.items : []
          if (!runtime.hasBaselineLoaded) {
            runtime.watermarkCreatedAtMs = trackKnownNotifications(
              serverItems,
              runtime.seenIds,
              runtime.watermarkCreatedAtMs,
              { advanceWatermark: true },
            )
            runtime.hasBaselineLoaded = true
          } else {
            notifyArrivedItems(serverItems, capturedEpoch, sessionKey)
          }

          const reconUnreadCount = Math.max(0, Number(reconResult.unread_count) || 0)
          const pageZeroUnreadCount = serverItems.filter(item => !item.is_read).length
          const olderConfirmedRead =
            authoritativeUnread === 0 || pageZeroUnreadCount === reconUnreadCount

          const pageZeroIds = new Set(serverItems.map(item => item.id))
          const olderPreservedItems = items.value
            .filter(item => !pageZeroIds.has(item.id))
            .map(item =>
              // Only confirm older paginated items as read when server confirms zero unread remain beyond page 0
              olderConfirmedRead && prePatchIds.has(item.id)
                ? { ...item, is_read: true }
                : item,
            )

          // Bump sequence and versions when committing authoritative reconciliation so any
          // pre-reconciliation poll/reload/pagination in flight is discarded and never overwrites us.
          runtime.latestPageZeroSeq += 1
          runtime.latestLoadMoreSeq += 1
          runtime.mutationVersion += 1
          items.value = mergeNotificationItems(olderPreservedItems, serverItems)
          unreadCount.value = reconUnreadCount
          runtime.lastSyncedAt = Date.now()
          return true
        } catch {
          if (capturedEpoch !== runtime.sessionEpoch || currentSessionKey.value !== sessionKey) {
            return false
          }

          if (authoritativeUnread === 0) {
            items.value = items.value.map(item =>
              prePatchIds.has(item.id) ? { ...item, is_read: true } : item,
            )
            return true
          }

          // Server reported remaining unread notifications concurrently and reconciliation failed:
          // never fabricate unconfirmed read states; keep confirmed unread_count and surface recoverable error.
          actionError.value =
            'Se aplicó el marcado masivo, pero hay notificaciones nuevas sin sincronizar. Intenta actualizar.'
          return true
        }
      } catch {
        if (capturedEpoch === runtime.sessionEpoch && currentSessionKey.value === sessionKey) {
          actionError.value = 'No fue posible marcar todas las notificaciones como leídas.'
        }
        return false
      } finally {
        if (capturedEpoch === runtime.sessionEpoch && currentSessionKey.value === sessionKey) {
          runtime.reconcilingReadAll = false
          markingAll.value = false
        }
      }
    })
  }

  async function handleNotificationClick(item: NotificationItem) {
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey || runtime.clickingIds.has(item.id)) {
      return
    }

    const capturedEpoch = runtime.sessionEpoch
    runtime.clickingIds.add(item.id)

    try {
      if (!item.is_read) {
        const marked = await markAsRead(item.id)
        if (
          !marked ||
          capturedEpoch !== runtime.sessionEpoch ||
          currentSessionKey.value !== sessionKey
        ) {
          return
        }
      } else if (
        capturedEpoch !== runtime.sessionEpoch ||
        currentSessionKey.value !== sessionKey
      ) {
        return
      }

      const safeTarget = sanitizeNotificationLink(item.link_url)
      if (!safeTarget) {
        return
      }

      isOpen.value = false
      await navigateTo(safeTarget)
    } finally {
      if (capturedEpoch === runtime.sessionEpoch) {
        runtime.clickingIds.delete(item.id)
      }
    }
  }

  function openDrawer() {
    if (!ensureSessionAlignment()) return
    actionError.value = null
    isOpen.value = true

    const isStale = Date.now() - runtime.lastSyncedAt >= 5_000
    if (!runtime.hasBaselineLoaded || error.value || isStale) {
      void fetchInitial({ showLoader: items.value.length === 0 })
    }
  }

  function closeDrawer() {
    isOpen.value = false
  }

  function toggleDrawer() {
    if (isOpen.value) {
      closeDrawer()
    } else {
      openDrawer()
    }
  }

  function schedulePollInterval() {
    clearPollingTimer()
    if (!currentSessionKey.value) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

    runtime.pollTimer = setInterval(() => {
      void pollNotifications()
    }, NOTIFICATION_POLL_INTERVAL_MS)
  }

  function startPolling() {
    if (typeof window === 'undefined') return
    const sessionKey = ensureSessionAlignment()
    if (!sessionKey) {
      stopPolling({ force: true })
      return
    }

    runtime.pollingConsumerCount += 1

    if (!runtime.visibilityHandler && typeof document !== 'undefined') {
      runtime.visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          clearPollingTimer()
          return
        }
        if (currentSessionKey.value && runtime.pollingConsumerCount > 0) {
          void pollNotifications()
          schedulePollInterval()
        }
      }
      document.addEventListener('visibilitychange', runtime.visibilityHandler)
    }

    if (!runtime.hasBaselineLoaded && !runtime.pollInFlight && !runtime.initialFetchInFlight) {
      void fetchInitial({ showLoader: true })
    }
    schedulePollInterval()
  }

  function stopPolling(options: { force?: boolean } = {}) {
    if (options.force) {
      runtime.pollingConsumerCount = 0
    } else if (runtime.pollingConsumerCount > 0) {
      runtime.pollingConsumerCount -= 1
    }

    if (runtime.pollingConsumerCount <= 0) {
      clearPollingTimer()
      if (runtime.visibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', runtime.visibilityHandler)
        runtime.visibilityHandler = null
      }
    }
  }

  return {
    items,
    unreadCount,
    formattedBadge,
    loading,
    loadingMore,
    markingAll,
    hasMore,
    error,
    actionError,
    isOpen,
    isMarking,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    fetchInitial,
    pollNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    startPolling,
    stopPolling,
    resetState,
  }
}
