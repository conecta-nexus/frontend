import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { computed, ref } from 'vue'
import ModerationPage from '~/pages/moderation/index.vue'
import type { AuditLogEntry } from '~/types/moderation'

const mockRole = ref<'ADMIN' | 'STUDENT' | 'COMPANY' | null>('ADMIN')
const mockToastAdd = vi.fn()
const mockNavigateTo = vi.fn()
const mockLogs = ref<AuditLogEntry[]>([])
const mockTotalCount = ref(0)
const mockCurrentPage = ref(1)
const mockHasNextPage = ref(false)
const mockHasPreviousPage = ref(false)
const mockLoading = ref(false)
const mockSubmitting = ref(false)
const mockError = ref<string | null>(null)
const mockFetchAuditLogs = vi.fn()
const mockSuspendChallenge = vi.fn()
const mockSuspendUser = vi.fn()

let capturedMeta: { middleware?: Array<string | (() => unknown)> } | null = null

vi.stubGlobal('definePageMeta', (meta: { middleware?: Array<string | (() => unknown)> }) => {
  capturedMeta = meta
})
vi.stubGlobal('useHead', vi.fn())
vi.stubGlobal('useToast', () => ({ add: mockToastAdd }))
vi.stubGlobal('navigateTo', mockNavigateTo)

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    userRole: mockRole,
  }),
}))

vi.mock('~/composables/useModeration', () => ({
  useModeration: () => ({
    logs: mockLogs,
    totalCount: mockTotalCount,
    currentPage: mockCurrentPage,
    totalPages: computed(() => Math.max(1, Math.ceil(mockTotalCount.value / 20))),
    hasNextPage: mockHasNextPage,
    hasPreviousPage: mockHasPreviousPage,
    loading: mockLoading,
    submitting: mockSubmitting,
    error: mockError,
    fetchAuditLogs: mockFetchAuditLogs,
    suspendChallenge: mockSuspendChallenge,
    suspendUser: mockSuspendUser,
  }),
}))

const UModalStub = {
  name: 'UModal',
  props: ['open', 'title', 'description'],
  template: `
    <div v-if="open" data-testid="u-modal-stub">
      <h2>{{ title }}</h2>
      <slot name="body" />
      <slot name="footer" />
    </div>
  `,
}

const sampleEntry: AuditLogEntry = {
  id: '11111111-1111-4111-8111-111111111111',
  actor_id: '22222222-2222-4222-8222-222222222222',
  actor_email: 'admin@ufps.edu.co',
  actor_role: 'ADMIN',
  action_type: 'CHALLENGE_SUSPEND',
  target_id: '33333333-3333-4333-8333-333333333333',
  target_type: 'CHALLENGE',
  justification: 'Contenido engañoso reportado por la coordinación académica.',
  ip_address: '127.0.0.1',
  created_at: '2026-11-27T15:30:00Z',
}

describe('Moderation Admin Dashboard Page', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    mockRole.value = 'ADMIN'
    mockToastAdd.mockClear()
    mockNavigateTo.mockClear()
    mockFetchAuditLogs.mockReset().mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleEntry],
    })
    mockSuspendChallenge.mockReset().mockResolvedValue({ audit_log: sampleEntry, target: {} })
    mockSuspendUser.mockReset().mockResolvedValue({ audit_log: sampleEntry, target: {} })
    mockLogs.value = [sampleEntry]
    mockTotalCount.value = 1
    mockCurrentPage.value = 1
    mockHasNextPage.value = false
    mockHasPreviousPage.value = false
    mockLoading.value = false
    mockSubmitting.value = false
    mockError.value = null
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('redirects non-ADMIN users to / with a 403 warning toast via route middleware', () => {
    mount(ModerationPage, { global: { stubs: { UModal: UModalStub } } })
    const roleGuard = capturedMeta?.middleware?.[1] as (() => unknown) | undefined
    expect(roleGuard).toBeTypeOf('function')

    mockRole.value = 'STUDENT'
    roleGuard!()
    expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Acceso denegado (403)',
      color: 'warning',
    }))
    expect(mockNavigateTo).toHaveBeenCalledWith('/')
  })

  it('loads audit logs on mount, applies filters, and inspects full justification details', async () => {
    wrapper = mount(ModerationPage, { global: { stubs: { UModal: UModalStub } } })
    expect(mockFetchAuditLogs).toHaveBeenCalledWith({
      page: 1,
      action_type: '',
      start_date: undefined,
      end_date: undefined,
    })

    expect(wrapper.text()).toContain('Panel de Moderación e Inmutabilidad')
    expect(wrapper.text()).toContain('Reto suspendido')
    expect(wrapper.text()).toContain('admin@ufps.edu.co')

    const inspectBtn = wrapper.findAll('button').find(b => b.text().trim() === 'Ver detalle')
    expect(inspectBtn).toBeDefined()
    await inspectBtn!.trigger('click')
    expect(wrapper.text()).toContain('Justificación institucional registrada')

    const actionSelect = wrapper.find('#audit-action-type')
    await actionSelect.setValue('USER_SUSPEND')
    await actionSelect.trigger('change')

    expect(mockFetchAuditLogs).toHaveBeenLastCalledWith({
      page: 1,
      action_type: 'USER_SUSPEND',
      start_date: undefined,
      end_date: undefined,
    })
  })

  it('validates date ranges before querying backend audit logs', async () => {
    wrapper = mount(ModerationPage, { global: { stubs: { UModal: UModalStub } } })
    mockFetchAuditLogs.mockClear()

    await wrapper.find('#audit-start-date').setValue('2026-11-28')
    await wrapper.find('#audit-end-date').setValue('2026-11-20')
    await wrapper.find('form').trigger('submit')

    expect(mockFetchAuditLogs).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('La fecha inicial no puede ser posterior a la fecha final.')
  })

  it('opens suspension modal and submits challenge suspension with UUID + 15-char justification', async () => {
    wrapper = mount(ModerationPage, { global: { stubs: { UModal: UModalStub } } })

    const suspendChallengeBtn = wrapper.findAll('button').find(b => b.text().includes('Suspender reto'))
    await suspendChallengeBtn!.trigger('click')

    expect(wrapper.find('[data-testid="u-modal-stub"]').exists()).toBe(true)

    await wrapper.find('#moderation-target-id').setValue('33333333-3333-4333-8333-333333333333')
    await wrapper.find('#moderation-justification').setValue('Incumplimiento verificado de términos académicos.')
    await wrapper.find('#moderation-suspension-form').trigger('submit')

    await vi.waitFor(() => {
      expect(mockSuspendChallenge).toHaveBeenCalledWith(
        '33333333-3333-4333-8333-333333333333',
        'Incumplimiento verificado de términos académicos.',
      )
    })
    expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reto suspendido',
      color: 'success',
    }))
  })
})
