import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import NotificationBell from '~/components/notifications/NotificationBell.vue'
import NotificationDrawer from '~/components/notifications/NotificationDrawer.vue'
import LandingNavbar from '~/components/landing/LandingNavbar.vue'
import { useNotifications } from '~/composables/useNotifications'
import type { NotificationItem } from '~/types/notification'
import {
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_TOAST_DURATION_MS,
  formatNotificationTimestamp,
  formatUnreadBadge,
  getNotificationEventMeta,
  sanitizeNotificationLink,
} from '~/utils/notifications'

const apiFetch = vi.fn()
const navigateToMock = vi.fn()
const toastAddMock = vi.fn()
const toastRemoveMock = vi.fn()
const initSessionMock = vi.fn().mockResolvedValue(true)

const mockAccessToken = ref<string | null>('jwt-token-user-a')
const mockRefreshToken = ref<string | null>(null)
const mockUser = ref<{ id: string, email: string, role: 'STUDENT' | 'COMPANY' } | null>({
  id: 'user-a-uuid',
  email: 'student@ufps.edu.co',
  role: 'STUDENT',
})
const mockIsInitializing = ref(false)

let stateRegistry = new Map<string, ReturnType<typeof ref>>()
let mockNuxtApp: Record<string, unknown> = {}
let toastSeq = 0

function stubUseState<T>(key: string, init: () => T) {
  if (!stateRegistry.has(key)) {
    stateRegistry.set(key, ref(init()))
  }
  return stateRegistry.get(key)!
}

const USlideoverStub = {
  name: 'USlideover',
  props: ['open', 'side', 'title', 'description', 'ui'],
  emits: ['update:open'],
  template: `
    <section v-if="open" role="dialog" :aria-label="title" data-testid="slideover-dialog">
      <header>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
        <slot name="actions" />
        <button type="button" data-testid="close-drawer-btn" @click="$emit('update:open', false)">Cerrar</button>
      </header>
      <div>
        <slot name="body" />
      </div>
    </section>
  `,
}

const UIconStub = {
  name: 'UIcon',
  props: ['name'],
  template: '<span :data-icon="name" class="u-icon-stub" />',
}

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const ClientOnlyStub = {
  name: 'ClientOnly',
  template: '<slot />',
}

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'notif-1',
    event_type: 'APPLICATION_ACCEPTED',
    title: '¡Tu postulación fue aceptada!',
    message: 'La empresa TechCúcuta aceptó tu postulación al reto.',
    link_url: '/challenges/11111111-1111-1111-1111-111111111111',
    is_read: false,
    created_at: '2026-11-25T18:30:00Z',
    ...overrides,
  }
}

describe('Notification helpers and route sanitization', () => {
  it('formats unread badge bounds cleanly for 0, 1..99, and >99', () => {
    expect(formatUnreadBadge(0)).toBe('')
    expect(formatUnreadBadge(-3)).toBe('')
    expect(formatUnreadBadge(1)).toBe('1')
    expect(formatUnreadBadge(99)).toBe('99')
    expect(formatUnreadBadge(100)).toBe('99+')
    expect(formatUnreadBadge(245)).toBe('99+')
  })

  it('allows only safe implemented internal paths and rejects unsafe or unimplemented targets', () => {
    expect(sanitizeNotificationLink('/')).toBe('/')
    expect(sanitizeNotificationLink('/me')).toBe('/me')
    expect(sanitizeNotificationLink('/challenges')).toBe('/challenges')
    expect(sanitizeNotificationLink('/challenges/manage')).toBe('/challenges/manage')
    expect(sanitizeNotificationLink('/challenges/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/challenges/550e8400-e29b-41d4-a716-446655440000')

    expect(sanitizeNotificationLink(null)).toBeNull()
    expect(sanitizeNotificationLink('')).toBeNull()
    expect(sanitizeNotificationLink('https://evil.example/phish')).toBeNull()
    expect(sanitizeNotificationLink('//evil.example/path')).toBeNull()
    expect(sanitizeNotificationLink('javascript:alert(1)')).toBeNull()
    expect(sanitizeNotificationLink('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(sanitizeNotificationLink('/challenges/%2e%2e/admin')).toBeNull()
    expect(sanitizeNotificationLink('/challenges/../me')).toBeNull()
    expect(sanitizeNotificationLink('/challenges\\evil')).toBeNull()
    expect(sanitizeNotificationLink('/me?next=https://evil.example')).toBeNull()
    expect(sanitizeNotificationLink('/applications/123')).toBeNull()
  })

  it('maps known and unknown event types and formats es-CO timestamps safely', () => {
    expect(getNotificationEventMeta('APPLICATION_CREATED').label).toBe('Nueva postulación')
    expect(getNotificationEventMeta('APPLICATION_ACCEPTED').icon).toBe('i-lucide-circle-check')
    expect(getNotificationEventMeta('APPLICATION_REJECTED').toastColor).toBe('error')
    expect(getNotificationEventMeta('CHALLENGE_CLOSED').icon).toBe('i-lucide-lock')
    expect(getNotificationEventMeta('FUTURE_UNKNOWN_EVENT')).toEqual(
      expect.objectContaining({ label: 'Notificación', icon: 'i-lucide-bell' }),
    )

    expect(formatNotificationTimestamp('not-a-date')).toBe('Fecha no disponible')
    const now = new Date('2026-11-25T19:00:00Z')
    expect(formatNotificationTimestamp('2026-11-25T18:59:30Z', now)).toBe('Hace un momento')
    expect(formatNotificationTimestamp('2026-11-25T18:45:00Z', now)).toBe('Hace 15 min')
    expect(formatNotificationTimestamp('2026-11-25T17:00:00Z', now)).toBe('Hace 2 horas')
  })
})

describe('useNotifications, NotificationBell, and NotificationDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stateRegistry = new Map()
    mockNuxtApp = {}
    toastSeq = 0
    apiFetch.mockReset()
    navigateToMock.mockReset().mockResolvedValue(undefined)
    toastAddMock.mockReset().mockImplementation((payload: Record<string, unknown>) => ({
      id: `notif-toast-${++toastSeq}`,
      ...payload,
    }))
    toastRemoveMock.mockReset()
    initSessionMock.mockReset().mockResolvedValue(true)

    mockAccessToken.value = 'jwt-token-user-a'
    mockRefreshToken.value = null
    mockUser.value = { id: 'user-a-uuid', email: 'student@ufps.edu.co', role: 'STUDENT' }
    mockIsInitializing.value = false

    vi.stubGlobal('useNuxtApp', () => mockNuxtApp)
    vi.stubGlobal('useApi', () => ({ apiFetch }))
    vi.stubGlobal('useAuth', () => ({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      user: mockUser,
      isInitializing: mockIsInitializing,
      isAuthenticated: computed(() => Boolean(mockAccessToken.value || mockRefreshToken.value)),
      initSession: initSessionMock,
    }))
    vi.stubGlobal('useToast', () => ({ add: toastAddMock, remove: toastRemoveMock }))
    vi.stubGlobal('useState', stubUseState)
    vi.stubGlobal('navigateTo', navigateToMock)
    vi.stubGlobal('useRoute', () => ({ path: '/' }))
    vi.stubGlobal('useColorMode', () => ({ value: 'light', preference: 'light' }))
  })

  afterEach(() => {
    const notifications = useNotifications()
    notifications.stopPolling({ force: true })
    notifications.resetState(null)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('hides NotificationBell when anonymous and displays it when authenticated in LandingNavbar', async () => {
    mockAccessToken.value = null
    mockUser.value = null

    const anonNavbar = mount(LandingNavbar, {
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
          ClientOnly: ClientOnlyStub,
          UIcon: UIconStub,
          USlideover: USlideoverStub,
        },
      },
    })

    expect(anonNavbar.find('[data-testid="notification-bell-button"]').exists()).toBe(false)
    expect(apiFetch).not.toHaveBeenCalled()
    anonNavbar.unmount()

    mockAccessToken.value = 'jwt-token-user-a'
    mockUser.value = { id: 'user-a-uuid', email: 'student@ufps.edu.co', role: 'STUDENT' }
    apiFetch.mockResolvedValueOnce({ items: [makeNotification()], unread_count: 1 })

    const authNavbar = mount(LandingNavbar, {
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
          ClientOnly: ClientOnlyStub,
          UIcon: UIconStub,
          USlideover: USlideoverStub,
        },
      },
    })
    await flushPromises()

    expect(authNavbar.find('[data-testid="notification-bell-button"]').exists()).toBe(true)
    expect(authNavbar.get('[data-testid="notification-bell-badge"]').text()).toBe('1')
    authNavbar.unmount()
  })

  it('hides the badge at 0 unread, formats 99+ above 99, and renders distinct event styles & drawer open/close', async () => {
    apiFetch.mockResolvedValueOnce({
      items: [
        makeNotification({ id: 'n1', event_type: 'APPLICATION_CREATED', is_read: false }),
        makeNotification({ id: 'n2', event_type: 'APPLICATION_ACCEPTED', is_read: true, link_url: '/me' }),
        makeNotification({ id: 'n3', event_type: 'APPLICATION_REJECTED', is_read: false, link_url: null }),
        makeNotification({ id: 'n4', event_type: 'CHALLENGE_CLOSED', is_read: true, link_url: '/challenges/manage' }),
        makeNotification({ id: 'n5', event_type: 'UNMAPPED_CUSTOM_EVENT', title: 'Aviso del sistema', is_read: false, link_url: null }),
      ],
      unread_count: 120,
    })

    const wrapper = mount(NotificationBell, {
      global: { stubs: { USlideover: USlideoverStub, UIcon: UIconStub } },
    })
    await flushPromises()

    const bell = wrapper.get('[data-testid="notification-bell-button"]')
    expect(bell.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-testid="notification-bell-badge"]').text()).toBe('99+')

    await bell.trigger('click')
    await flushPromises()

    expect(bell.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="slideover-dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nueva postulación')
    expect(wrapper.text()).toContain('Postulación aceptada')
    expect(wrapper.text()).toContain('Postulación rechazada')
    expect(wrapper.text()).toContain('Reto cerrado')
    expect(wrapper.text()).toContain('Notificación')
    expect(wrapper.text()).toContain('Aviso del sistema')

    expect(wrapper.get('[data-testid="notification-item-n1"]').attributes('data-read')).toBe('false')
    expect(wrapper.get('[data-testid="notification-item-n2"]').attributes('data-read')).toBe('true')

    await wrapper.get('[data-testid="close-drawer-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="slideover-dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('marks individual notifications as read on click, skips redundant PATCH for already-read items, and enforces safe navigation', async () => {
    apiFetch
      .mockResolvedValueOnce({
        items: [
          makeNotification({
            id: 'n-safe',
            is_read: false,
            link_url: '/challenges/11111111-1111-1111-1111-111111111111',
          }),
          makeNotification({
            id: 'n-malicious',
            is_read: false,
            link_url: 'javascript:alert(1)',
          }),
          makeNotification({
            id: 'n-already-read',
            is_read: true,
            link_url: '/challenges/manage',
          }),
        ],
        unread_count: 2,
      })
      .mockResolvedValueOnce({ id: 'n-safe', is_read: true, unread_count: 1 })
      .mockResolvedValueOnce({ id: 'n-malicious', is_read: true, unread_count: 0 })

    const wrapper = mount(NotificationBell, {
      global: { stubs: { USlideover: USlideoverStub, UIcon: UIconStub } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="notification-bell-button"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="notification-item-n-safe"]').trigger('click')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith('/notifications/n-safe/read', {
      method: 'PATCH',
      body: {},
    })
    expect(navigateToMock).toHaveBeenCalledWith('/challenges/11111111-1111-1111-1111-111111111111')
    expect(wrapper.get('[data-testid="notification-bell-badge"]').text()).toBe('1')

    await wrapper.get('[data-testid="notification-bell-button"]').trigger('click')
    await flushPromises()
    navigateToMock.mockClear()

    await wrapper.get('[data-testid="notification-item-n-malicious"]').trigger('click')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith('/notifications/n-malicious/read', {
      method: 'PATCH',
      body: {},
    })
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="notification-bell-badge"]').exists()).toBe(false)

    const callsBeforeReadClick = apiFetch.mock.calls.length
    await wrapper.get('[data-testid="notification-item-n-already-read"]').trigger('click')
    await flushPromises()

    expect(apiFetch.mock.calls.length).toBe(callsBeforeReadClick)
    expect(navigateToMock).toHaveBeenCalledWith('/challenges/manage')
    wrapper.unmount()
  })

  it('prevents navigation when individual PATCH fails (503/404), allows retry, prevents double-click, and aborts navigation on logout/user switch (A-03)', async () => {
    let resolveDelayedPatch: ((value: unknown) => void) | undefined

    apiFetch
      .mockResolvedValueOnce({
        items: [
          makeNotification({ id: 'n-fail', is_read: false, link_url: '/challenges' }),
          makeNotification({ id: 'n-404', is_read: false, link_url: '/challenges' }),
          makeNotification({ id: 'n-race', is_read: false, link_url: '/me' }),
        ],
        unread_count: 3,
      })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ id: 'n-fail', is_read: true, unread_count: 2 })
      .mockRejectedValueOnce({ status: 404 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveDelayedPatch = resolve }))

    const wrapper = mount(NotificationBell, {
      global: { stubs: { USlideover: USlideoverStub, UIcon: UIconStub } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="notification-bell-button"]').trigger('click')
    await flushPromises()

    // 503 failure -> MUST NOT navigate, MUST NOT close drawer, MUST keep unread
    await wrapper.get('[data-testid="notification-item-n-fail"]').trigger('click')
    await flushPromises()

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="slideover-dialog"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="notification-action-error"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="notification-item-n-fail"]').attributes('data-read')).toBe('false')
    expect(wrapper.get('[data-testid="notification-bell-badge"]').text()).toBe('3')

    // Retry same notification -> succeeds and navigates!
    await wrapper.get('[data-testid="notification-item-n-fail"]').trigger('click')
    await flushPromises()
    expect(navigateToMock).toHaveBeenCalledWith('/challenges')
    expect(wrapper.find('[data-testid="slideover-dialog"]').exists()).toBe(false)

    // Reopen drawer -> 404 keeps notification unread without navigating
    navigateToMock.mockClear()
    await wrapper.get('[data-testid="notification-bell-button"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="notification-item-n-404"]').trigger('click')
    await flushPromises()
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="notification-action-error"]').text()).toContain('ya no se encuentra disponible')

    // Double click + logout during PATCH -> sends only ONE PATCH and does NOT navigate
    const callsBeforeDoubleClick = apiFetch.mock.calls.length
    const p1 = wrapper.get('[data-testid="notification-item-n-race"]').trigger('click')
    const p2 = wrapper.get('[data-testid="notification-item-n-race"]').trigger('click')
    await Promise.all([p1, p2])
    expect(apiFetch.mock.calls.length).toBe(callsBeforeDoubleClick + 1)

    mockAccessToken.value = null
    mockUser.value = null
    await flushPromises()
    resolveDelayedPatch?.({ id: 'n-race', is_read: true, unread_count: 1 })
    await flushPromises()
    expect(navigateToMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('reconciles Mark All as Read with concurrent arrivals, preserves paginated history, and handles PATCH or reconciliation failures (A-04)', async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      makeNotification({
        id: `n-page1-${i + 1}`,
        title: `Notificación ${i + 1}`,
        is_read: i > 0,
        created_at: `2026-11-25T18:${String(59 - i).padStart(2, '0')}:00Z`,
      }),
    )

    const concurrentArrival = makeNotification({
      id: 'n-concurrent-new',
      title: 'Llegada concurrente sin leer',
      is_read: false,
      created_at: '2026-11-25T19:01:00Z',
    })

    apiFetch
      .mockResolvedValueOnce({ items: firstPage, unread_count: 1 })
      .mockResolvedValueOnce({
        items: [
          makeNotification({
            id: 'n-page2-1',
            title: 'Notificación histórica 21',
            is_read: false,
            created_at: '2026-11-24T12:00:00Z',
          }),
        ],
        unread_count: 2,
      })
      // 1) PATCH /read-all fails
      .mockRejectedValueOnce(new Error('500 Server Error'))
      // 2) PATCH /read-all succeeds with unread_count: 1 + reconciliation GET returns concurrentArrival
      .mockResolvedValueOnce({ updated_count: 2, unread_count: 1 })
      .mockResolvedValueOnce({
        items: [
          concurrentArrival,
          ...firstPage.slice(0, 19).map(item => ({ ...item, is_read: true })),
        ],
        unread_count: 1,
      })
      // 3) PATCH /read-all succeeds with unread_count: 1, reconciliation GET fails -> must NOT mark concurrent item read falsely!
      .mockResolvedValueOnce({ updated_count: 1, unread_count: 1 })
      .mockRejectedValueOnce(new Error('503 Reconciliation failed'))

    const notifications = useNotifications()
    notifications.openDrawer()
    await flushPromises()

    const drawer = mount(NotificationDrawer, {
      global: { stubs: { USlideover: USlideoverStub, UIcon: UIconStub } },
    })

    expect(drawer.find('[data-testid="notifications-load-more-btn"]').exists()).toBe(true)

    await drawer.get('[data-testid="notifications-load-more-btn"]').trigger('click')
    await flushPromises()

    expect(drawer.text()).toContain('Notificación histórica 21')
    expect(toastAddMock).not.toHaveBeenCalled()

    // PATCH error preserves unread count
    await drawer.get('[data-testid="mark-all-read-btn"]').trigger('click')
    await flushPromises()
    expect(drawer.find('[data-testid="notification-action-error"]').exists()).toBe(true)
    expect(notifications.unreadCount.value).toBe(2)

    // Authoritative reconciliation preserves concurrentArrival as unread while older page-2 item becomes read!
    await drawer.get('[data-testid="mark-all-read-btn"]').trigger('click')
    await flushPromises()
    expect(notifications.unreadCount.value).toBe(1)
    expect(notifications.items.value.find(i => i.id === 'n-concurrent-new')?.is_read).toBe(false)
    expect(notifications.items.value.find(i => i.id === 'n-page2-1')?.is_read).toBe(true)

    // Failed reconciliation after positive unread_count keeps server unreadCount & surfaces recoverable notice
    await drawer.get('[data-testid="mark-all-read-btn"]').trigger('click')
    await flushPromises()
    expect(notifications.unreadCount.value).toBe(1)
    expect(drawer.get('[data-testid="notification-action-error"]').text()).toContain('notificaciones nuevas sin sincronizar')
    drawer.unmount()
  })

  it('polls every 15s, removes ONLY Notification toasts on logout/account switch, and avoids historical duplicate toasts (A-02, A-06, A-07)', async () => {
    const baselineItem = makeNotification({ id: 'base-1', title: 'Existente', is_read: false, created_at: '2026-11-25T19:00:00Z' })
    const newlyArrived = makeNotification({
      id: 'new-1',
      event_type: 'APPLICATION_CREATED',
      title: 'Nueva postulación recibida',
      message: 'Carlos Pérez se postuló a tu reto.',
      link_url: '/challenges/manage',
      is_read: false,
      created_at: '2026-11-25T19:05:00Z',
    })
    const historicalBackfill = makeNotification({
      id: 'very-old-1',
      title: 'Antigua ya conocida',
      is_read: false,
      created_at: '2026-11-20T10:00:00Z',
    })

    apiFetch
      .mockResolvedValueOnce({ items: [baselineItem], unread_count: 1 })
      .mockResolvedValueOnce({ items: [newlyArrived, baselineItem, historicalBackfill], unread_count: 2 })
      .mockResolvedValueOnce({ items: [newlyArrived, baselineItem, historicalBackfill], unread_count: 2 })
      .mockResolvedValueOnce({ items: [], unread_count: 0 })

    const notifications = useNotifications()
    notifications.startPolling()
    await flushPromises()

    expect(toastAddMock).not.toHaveBeenCalled()

    // First 15s poll emits 1 toast for newlyArrived ONLY (historicalBackfill older than watermark is ignored)
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS)
    await flushPromises()
    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nueva postulación recibida',
        duration: NOTIFICATION_TOAST_DURATION_MS,
      }),
    )

    // Capture toast onClick callback and verify second poll deduplicates
    const toastPayload = toastAddMock.mock.calls[0]?.[0] as { onClick?: () => void }
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS)
    await flushPromises()
    expect(toastAddMock).toHaveBeenCalledTimes(1)

    // Hidden tab pauses polling
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 2)
    await flushPromises()
    expect(apiFetch).toHaveBeenCalledTimes(3)

    // Switching account removes Notification's own toast ID ('notif-toast-1') WITHOUT touching unrelated toasts!
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    mockUser.value = { id: 'user-b-uuid', email: 'company@empresa.co', role: 'COMPANY' }
    await notifications.fetchInitial({ showLoader: true })
    await flushPromises()

    expect(toastRemoveMock).toHaveBeenCalledWith('notif-toast-1')
    expect(toastRemoveMock).toHaveBeenCalledTimes(1)

    // Stale toast onClick callback from previous user MUST NOT mark read or navigate!
    toastPayload?.onClick?.()
    await flushPromises()
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(notifications.items.value).toEqual([])
  })

  it('cleans up polling timers, toasts, and state when NotificationBell unmounts on logout (A-02)', async () => {
    apiFetch
      .mockResolvedValueOnce({
        items: [makeNotification({ id: 'u1', is_read: false, created_at: '2026-11-25T19:00:00Z' })],
        unread_count: 1,
      })
      .mockResolvedValueOnce({
        items: [
          makeNotification({ id: 'u2', title: 'Privada', is_read: false, created_at: '2026-11-25T19:02:00Z' }),
          makeNotification({ id: 'u1', is_read: false, created_at: '2026-11-25T19:00:00Z' }),
        ],
        unread_count: 2,
      })

    const wrapper = mount(NotificationBell, {
      global: { stubs: { USlideover: USlideoverStub, UIcon: UIconStub } },
    })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS)
    await flushPromises()
    expect(toastAddMock).toHaveBeenCalledTimes(1)

    // Simulate logout clearing reactive tokens before Navbar v-if unmounts NotificationBell
    mockAccessToken.value = null
    mockUser.value = null
    wrapper.unmount()

    const notifications = useNotifications()
    expect(toastRemoveMock).toHaveBeenCalledWith('notif-toast-1')
    expect(notifications.items.value).toEqual([])
    expect(notifications.unreadCount.value).toBe(0)

    const callsAfterUnmount = apiFetch.mock.calls.length
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 3)
    expect(apiFetch.mock.calls.length).toBe(callsAfterUnmount)
  })

  it('renders empty state and load error recovery inside NotificationDrawer', async () => {
    apiFetch
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce({ items: [], unread_count: 0 })

    const notifications = useNotifications()
    notifications.openDrawer()
    await flushPromises()

    const drawer = mount(NotificationDrawer, {
      global: { stubs: { USlideover: USlideoverStub, UIcon: UIconStub } },
    })

    expect(drawer.find('[data-testid="notifications-load-error"]').exists()).toBe(true)

    await drawer.get('[data-testid="notifications-retry-btn"]').trigger('click')
    await flushPromises()

    expect(drawer.find('[data-testid="notifications-empty-state"]').exists()).toBe(true)
    expect(drawer.text()).toContain('No tienes notificaciones por ahora')
    drawer.unmount()
  })

  it('discards out-of-order delayed fetchInitial, poll, retry, and loadMore responses after mutations or newer queries (A-05)', async () => {
    let resolveSlowInitial: ((value: unknown) => void) | undefined
    let resolveSlowLoadMore: ((value: unknown) => void) | undefined

    const initialPage = Array.from({ length: 20 }, (_, i) =>
      makeNotification({
        id: `ord-${i + 1}`,
        is_read: false,
        created_at: `2026-11-25T18:${String(59 - i).padStart(2, '0')}:00Z`,
      }),
    )

    apiFetch
      // 1) Initial load resolves normally
      .mockResolvedValueOnce({ items: initialPage, unread_count: 20 })
      // 2) Slow manual refresh starts BEFORE markAsRead
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSlowInitial = resolve }))
      // 3) markAsRead completes first -> unread_count becomes 19
      .mockResolvedValueOnce({ id: 'ord-1', is_read: true, unread_count: 19 })
      // 4) Slow loadMore starts -> superseded by a second markAsRead -> unread_count stays 18
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSlowLoadMore = resolve }))
      .mockResolvedValueOnce({ id: 'ord-2', is_read: true, unread_count: 18 })

    const notifications = useNotifications()
    await notifications.fetchInitial({ showLoader: true })

    // Start slow page-0 refresh, then run markAsRead
    const slowRefreshPromise = notifications.fetchInitial({ showLoader: false })
    await notifications.markAsRead('ord-1')
    expect(notifications.unreadCount.value).toBe(19)

    // Delayed slow refresh resolves with stale unread_count: 20 -> must be discarded!
    resolveSlowInitial?.({
      items: initialPage.map(item => ({ ...item, is_read: false })),
      unread_count: 20,
    })
    await slowRefreshPromise
    expect(notifications.unreadCount.value).toBe(19)
    expect(notifications.items.value.find(i => i.id === 'ord-1')?.is_read).toBe(true)

    // Start slow loadMore while another markAsRead completes
    const loadMorePromise = notifications.loadMore()
    await notifications.markAsRead('ord-2')
    expect(notifications.unreadCount.value).toBe(18)

    resolveSlowLoadMore?.({
      items: [makeNotification({ id: 'ord-21', is_read: false, created_at: '2026-11-24T10:00:00Z' })],
      unread_count: 19,
    })
    await loadMorePromise

    // Historical item is appended cleanly, while unread_count stays authoritative at 18!
    expect(notifications.unreadCount.value).toBe(18)
    expect(notifications.items.value.find(i => i.id === 'ord-21')).toBeDefined()
    expect(notifications.items.value.find(i => i.id === 'ord-2')?.is_read).toBe(true)
  })

  it('aggregates burst notifications into a single summary toast when 3+ arrive in one poll', async () => {
    apiFetch
      .mockResolvedValueOnce({ items: [], unread_count: 0 })
      .mockResolvedValueOnce({
        items: [
          makeNotification({ id: 'b1', title: 'Alerta 1', is_read: false }),
          makeNotification({ id: 'b2', title: 'Alerta 2', is_read: false }),
          makeNotification({ id: 'b3', title: 'Alerta 3', is_read: false }),
        ],
        unread_count: 3,
      })

    const notifications = useNotifications()
    notifications.startPolling()
    await flushPromises()

    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS)
    await flushPromises()

    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tienes 3 notificaciones nuevas',
        duration: NOTIFICATION_TOAST_DURATION_MS,
      }),
    )
  })

  it('shares runtime across multiple useNotifications invocations in same app and isolates independent SSR contexts (H-01)', async () => {
    apiFetch.mockResolvedValue({ items: [], unread_count: 0 })

    const notif1 = useNotifications()
    const notif2 = useNotifications()

    notif1.startPolling()
    notif2.startPolling()
    await flushPromises()

    // Two composable invocations in same Nuxt app must share one interval timer cleanly (1 initial + 1 poll at 15s)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS)
    await flushPromises()
    expect(apiFetch).toHaveBeenCalledTimes(2)

    // Verify independent SSR context gets completely isolated runtime & state
    const prevApp = mockNuxtApp
    const prevRegistry = stateRegistry
    mockNuxtApp = { ssrId: 'ssr-ctx-2' }
    stateRegistry = new Map()
    const ctx2AccessToken = ref<string | null>('jwt-ssr-2')
    const ctx2User = ref<{ id: string, email: string, role: 'STUDENT' | 'COMPANY' } | null>({
      id: 'user-ssr-2',
      email: 'ssr2@ufps.edu.co',
      role: 'COMPANY',
    })
    vi.stubGlobal('useAuth', () => ({
      accessToken: ctx2AccessToken,
      refreshToken: ref(null),
      user: ctx2User,
      isInitializing: ref(false),
      isAuthenticated: computed(() => true),
      initSession: initSessionMock,
    }))

    const ctx2Notif = useNotifications()
    expect(ctx2Notif.items.value).toEqual([])
    expect(ctx2Notif.unreadCount.value).toBe(0)
    for (const s of stateRegistry.values()) {
      expect(s.value).not.toBeInstanceOf(Promise)
    }

    ctx2Notif.stopPolling({ force: true })
    mockNuxtApp = prevApp
    stateRegistry = prevRegistry
  })

  it('notifies newly arrived alerts on manual reload or drawer open without duplicating on next poll (H-02)', async () => {
    const initialHistory = [
      makeNotification({
        id: 'hist-1',
        title: 'Historial previo',
        is_read: true,
        created_at: '2026-11-25T18:00:00Z',
      }),
    ]
    const manualArrival = makeNotification({
      id: 'manual-arrival-1',
      event_type: 'APPLICATION_ACCEPTED',
      title: 'Llegada en recarga manual',
      message: 'Detectada antes del próximo ciclo de polling.',
      link_url: '/challenges',
      is_read: false,
      created_at: '2026-11-25T18:05:00Z',
    })

    apiFetch
      // 1. Silent baseline load
      .mockResolvedValueOnce({ items: initialHistory, unread_count: 0 })
      // 2. Manual reload / drawer open receives manualArrival
      .mockResolvedValueOnce({ items: [manualArrival, ...initialHistory], unread_count: 1 })
      // 3. Subsequent 15s poll returns the same item
      .mockResolvedValueOnce({ items: [manualArrival, ...initialHistory], unread_count: 1 })

    const notifications = useNotifications()
    await notifications.fetchInitial({ showLoader: true })
    expect(toastAddMock).not.toHaveBeenCalled()

    // Simulate opening drawer / manual reload after stale threshold -> emits EXACTLY 1 toast
    await vi.advanceTimersByTimeAsync(5_500)
    notifications.openDrawer()
    await flushPromises()
    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Llegada en recarga manual' }),
    )

    // Subsequent poll returning the exact same notification must NOT duplicate the toast
    await notifications.pollNotifications()
    await flushPromises()
    expect(toastAddMock).toHaveBeenCalledTimes(1)
  })

  it('guards pollNotifications finally block across logout/account switch so stale poll never clears active session pollInFlight (H-03)', async () => {
    let resolvePollA: ((value: unknown) => void) | undefined
    let resolvePollB: ((value: unknown) => void) | undefined

    apiFetch
      // Baseline User A
      .mockResolvedValueOnce({ items: [], unread_count: 0 })
      // Delayed poll User A
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePollA = resolve }))
      // Active poll User B
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePollB = resolve }))

    const notifications = useNotifications()
    await notifications.fetchInitial({ showLoader: false })

    // Start Poll A
    const pollAPromise = notifications.pollNotifications()
    expect(apiFetch).toHaveBeenCalledTimes(2)

    // Switch identity to User B and start Poll B immediately
    mockAccessToken.value = 'jwt-user-b'
    mockUser.value = { id: 'user-b-uuid', email: 'b@ufps.edu.co', role: 'COMPANY' }
    notifications.resetState('user-b-uuid')
    const pollBPromise = notifications.pollNotifications()
    expect(apiFetch).toHaveBeenCalledTimes(3)

    // Late Poll A resolves while Poll B is STILL in-flight
    resolvePollA?.({ items: [], unread_count: 99 })
    await pollAPromise

    // Calling pollNotifications again during Poll B MUST still be blocked (pollInFlight stays true for User B)
    await notifications.pollNotifications()
    expect(apiFetch).toHaveBeenCalledTimes(3)
    expect(notifications.unreadCount.value).toBe(0)

    resolvePollB?.({ items: [], unread_count: 1 })
    await pollBPromise
    expect(notifications.unreadCount.value).toBe(1)
  })

  it('keeps Mark All reconciliation authoritative with positive unread_count, >20 paginated history, concurrent polling/reload, and error recovery (H-04)', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) =>
      makeNotification({
        id: `m20-${i + 1}`,
        is_read: false,
        created_at: `2026-11-25T17:${String(59 - i).padStart(2, '0')}:00Z`,
      }),
    )
    const page1 = [
      makeNotification({ id: 'm20-21', is_read: false, created_at: '2026-11-25T16:00:00Z' }),
      makeNotification({ id: 'm20-22', is_read: false, created_at: '2026-11-25T15:59:00Z' }),
    ]
    const concurrentNew = makeNotification({
      id: 'm20-concurrent-positive',
      title: 'Nueva llegada durante marcado masivo',
      is_read: false,
      created_at: '2026-11-25T18:10:00Z',
    })

    let resolveRecon: ((value: unknown) => void) | undefined
    let resolveDelayedManual: ((value: unknown) => void) | undefined

    apiFetch
      // 1. Page 0 (20 items)
      .mockResolvedValueOnce({ items: page0, unread_count: 22 })
      // 2. Page 1 (>20 history)
      .mockResolvedValueOnce({ items: page1, unread_count: 22 })
      // 3. PATCH /read-all returns positive unread_count: 2
      .mockResolvedValueOnce({ updated_count: 21, unread_count: 2 })
      // 4. Reconciliation GET deferred so concurrent manual reload can race against it
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRecon = resolve }))
      // 5. Concurrent manual fetchInitial GET deferred during reconciliation
      .mockImplementationOnce(() => new Promise((resolve) => { resolveDelayedManual = resolve }))
      // 6. Recovery fetchInitial after subsequent sync failure
      .mockResolvedValueOnce({
        items: [concurrentNew, ...page0.slice(0, 19).map(item => ({ ...item, is_read: true }))],
        unread_count: 1,
      })

    const notifications = useNotifications()
    await notifications.fetchInitial({ showLoader: true })
    await notifications.loadMore()
    expect(notifications.items.value).toHaveLength(22)

    const markAllPromise = notifications.markAllAsRead()
    await flushPromises()

    // Polling skips during active reconciliation, while concurrent manual reload races in-flight
    await notifications.pollNotifications()
    const concurrentReloadPromise = notifications.fetchInitial({ showLoader: false })

    // Concurrent manual reload resolves BEFORE reconciliation with stale unread_count -> MUST be discarded!
    resolveDelayedManual?.({
      items: page0.map(item => ({ ...item, is_read: false })),
      unread_count: 22,
    })
    await concurrentReloadPromise

    // Reconciliation resolves cleanly -> MUST NOT be invalidated by concurrent manual reload!
    resolveRecon?.({
      items: [concurrentNew, ...page0.slice(0, 19).map(item => ({ ...item, is_read: true }))],
      unread_count: 2,
    })
    await markAllPromise

    // Positive unread_count: server items are synced accurately, concurrent arrival triggers 1 toast,
    // and unconfirmed older page-1 item (>20) is NOT falsely forced to is_read=true!
    expect(notifications.unreadCount.value).toBe(2)
    expect(notifications.items.value.find(i => i.id === 'm20-concurrent-positive')?.is_read).toBe(false)
    expect(notifications.items.value.find(i => i.id === 'm20-1')?.is_read).toBe(true)
    expect(notifications.items.value.find(i => i.id === 'm20-22')?.is_read).toBe(false)
    expect(toastAddMock).toHaveBeenCalledTimes(1)

    // Subsequent page-0 sync clears recoverable action errors and preserves toast deduplication
    await notifications.fetchInitial({ showLoader: false })
    expect(notifications.unreadCount.value).toBe(1)
    expect(notifications.actionError.value).toBeNull()
    expect(toastAddMock).toHaveBeenCalledTimes(1)
  })
})
