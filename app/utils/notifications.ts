import type { NotificationItem } from '~/types/notification'

export const DEFAULT_NOTIFICATION_LIMIT = 20
export const NOTIFICATION_POLL_INTERVAL_MS = 15_000
export const NOTIFICATION_TOAST_DURATION_MS = 5_000
export const MAX_TRACKED_NOTIFICATION_IDS = 500

export type NotificationToastColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface NotificationEventMeta {
  label: string
  icon: string
  toastColor: NotificationToastColor
  iconContainerClass: string
  badgeClass: string
}

const KNOWN_EVENT_META: Record<string, NotificationEventMeta> = {
  APPLICATION_CREATED: {
    label: 'Nueva postulación',
    icon: 'i-lucide-inbox',
    toastColor: 'info',
    iconContainerClass: 'border-neutral-900 bg-pastel-blue text-neutral-900 dark:border-neutral-600 dark:bg-pastel-blue/25 dark:text-blue-200',
    badgeClass: 'border-blue-600 bg-blue-100 text-blue-900 dark:border-blue-400/60 dark:bg-blue-950/60 dark:text-blue-200',
  },
  APPLICATION_ACCEPTED: {
    label: 'Postulación aceptada',
    icon: 'i-lucide-circle-check',
    toastColor: 'success',
    iconContainerClass: 'border-neutral-900 bg-pastel-mint text-neutral-900 dark:border-neutral-600 dark:bg-pastel-mint/25 dark:text-emerald-200',
    badgeClass: 'border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-400/60 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
  APPLICATION_REJECTED: {
    label: 'Postulación rechazada',
    icon: 'i-lucide-circle-x',
    toastColor: 'error',
    iconContainerClass: 'border-neutral-900 bg-pastel-coral text-neutral-900 dark:border-neutral-600 dark:bg-pastel-coral/25 dark:text-rose-200',
    badgeClass: 'border-rose-600 bg-rose-100 text-rose-900 dark:border-rose-400/60 dark:bg-rose-950/60 dark:text-rose-200',
  },
  CHALLENGE_CLOSED: {
    label: 'Reto cerrado',
    icon: 'i-lucide-lock',
    toastColor: 'warning',
    iconContainerClass: 'border-neutral-900 bg-pastel-peach text-neutral-900 dark:border-neutral-600 dark:bg-pastel-peach/25 dark:text-amber-200',
    badgeClass: 'border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-400/60 dark:bg-amber-950/60 dark:text-amber-200',
  },
}

const FALLBACK_EVENT_META: NotificationEventMeta = {
  label: 'Notificación',
  icon: 'i-lucide-bell',
  toastColor: 'primary',
  iconContainerClass: 'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100',
  badgeClass: 'border-neutral-500 bg-neutral-100 text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200',
}

const IMPLEMENTED_EXACT_ROUTES = new Set([
  '/',
  '/me',
  '/challenges',
  '/challenges/new',
  '/challenges/manage',
  '/auth/login',
  '/auth/register',
])

const CHALLENGE_DETAIL_ROUTE_PATTERN = /^\/challenges\/[A-Za-z0-9_-]+$/

/**
 * Resolve presentation metadata for a notification event type with a safe fallback.
 */
export function getNotificationEventMeta(eventType: string | null | undefined): NotificationEventMeta {
  if (!eventType) return FALLBACK_EVENT_META
  return KNOWN_EVENT_META[eventType] ?? FALLBACK_EVENT_META
}

/**
 * Format unread badge count according to notification center bounds.
 */
export function formatUnreadBadge(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return ''
  const normalized = Math.floor(count)
  return normalized > 99 ? '99+' : String(normalized)
}

/**
 * Validate and restrict notification link_url strictly to safe implemented internal routes.
 */
export function sanitizeNotificationLink(linkUrl: string | null | undefined): string | null {
  if (typeof linkUrl !== 'string') return null

  const trimmed = linkUrl.trim()
  if (!trimmed || trimmed !== linkUrl) return null
  if (!trimmed.startsWith('/')) return null
  if (trimmed.includes('//')) return null

  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i)
    const ch = trimmed[i] || ''
    if (code < 33 || code > 126 || '%\\?#:'.includes(ch)) {
      return null
    }
  }

  const segments = trimmed.split('/')
  if (segments.some(segment => segment === '.' || segment === '..')) {
    return null
  }

  if (IMPLEMENTED_EXACT_ROUTES.has(trimmed)) {
    return trimmed
  }

  if (CHALLENGE_DETAIL_ROUTE_PATTERN.test(trimmed)) {
    return trimmed
  }

  return null
}

/**
 * Format notification timestamp in Spanish (Colombia) with recent relative cues.
 */
export function formatNotificationTimestamp(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMs >= 0 && diffMinutes < 1) {
    return 'Hace un momento'
  }
  if (diffMs >= 0 && diffMinutes < 60) {
    return `Hace ${diffMinutes} min`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffMs >= 0 && diffHours < 24) {
    return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Format full localized timestamp for accessible tooltips and screen readers.
 */
export function formatNotificationFullDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Deduplicate and sort notification items newest-first while preserving fresher server state.
 */
export function mergeNotificationItems(
  existing: NotificationItem[],
  incoming: NotificationItem[],
  options: { preserveReadFlagsFromExisting?: boolean } = {},
): NotificationItem[] {
  const byId = new Map<string, NotificationItem>()
  for (const item of existing) {
    byId.set(item.id, item)
  }
  for (const item of incoming) {
    const prev = byId.get(item.id)
    if (options.preserveReadFlagsFromExisting && prev?.is_read && !item.is_read) {
      byId.set(item.id, { ...item, is_read: true })
    } else {
      byId.set(item.id, item)
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
      return timeDiff
    }
    return b.id.localeCompare(a.id)
  })
}

export function parseTimestampMs(isoDate: string): number | null {
  const parsed = Date.parse(isoDate)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Track known notification IDs with bounded memory while advancing the session watermark monotonically.
 */
export function trackKnownNotifications(
  items: NotificationItem[],
  seenIds: Map<string, number>,
  currentWatermarkMs: number | null,
  options: { advanceWatermark?: boolean; maxSize?: number } = {},
): number | null {
  const maxSize = options.maxSize ?? MAX_TRACKED_NOTIFICATION_IDS
  let nextWatermark = currentWatermarkMs

  for (const item of items) {
    const itemMs = parseTimestampMs(item.created_at) ?? 0
    if (options.advanceWatermark && (nextWatermark === null || itemMs > nextWatermark)) {
      nextWatermark = itemMs
    }
    if (!seenIds.has(item.id)) {
      seenIds.set(item.id, itemMs)
    }
  }

  // Evict oldest historical entries below watermark first so watermark-boundary IDs are retained
  if (seenIds.size > maxSize) {
    const watermarkBoundary = nextWatermark ?? 0
    for (const [id, ts] of seenIds) {
      if (seenIds.size <= maxSize) break
      if (ts < watermarkBoundary) {
        seenIds.delete(id)
      }
    }
    while (seenIds.size > maxSize) {
      const oldestKey = seenIds.keys().next().value
      if (oldestKey === undefined) break
      seenIds.delete(oldestKey)
    }
  }

  return nextWatermark
}

/**
 * Filter incoming page-0 items to genuinely unseen unread notifications at or after the session watermark.
 */
export function selectNewlyArrivedNotifications(
  incoming: NotificationItem[],
  seenIds: Map<string, number>,
  watermarkCreatedAtMs: number | null,
): NotificationItem[] {
  const fresh: NotificationItem[] = []
  for (const item of incoming) {
    if (item.is_read) continue
    if (seenIds.has(item.id)) continue

    const itemMs = parseTimestampMs(item.created_at)
    if (watermarkCreatedAtMs !== null && itemMs !== null && itemMs < watermarkCreatedAtMs) {
      continue
    }
    fresh.push(item)
  }
  return fresh
}
