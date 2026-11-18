import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import ManagePage from '~/pages/challenges/manage.vue'
import type { CompanyChallenge } from '~/components/challenges/CompanyChallengeTable.vue'

const fetchCompanyChallenges = vi.fn()
const updateChallenge = vi.fn()
const routerPush = vi.fn()
const routerReplace = vi.fn()
const addToast = vi.fn()
const loading = ref(false)
const error = ref<string | null>(null)
const userRole = ref<'COMPANY' | 'STUDENT'>('COMPANY')
const route = reactive<{ query: Record<string, string> }>({ query: {} })

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({
    loading,
    error,
    fetchCompanyChallenges,
    updateChallenge,
  }),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ userRole }),
}))

const challenges: CompanyChallenge[] = [
  {
    id: 'draft-1',
    company_id: 'company-1',
    title: 'Automatización de inventario',
    description: 'Descripción del reto',
    business_process: 'Logística',
    status: 'DRAFT',
    difficulty_level: 'INTERMEDIATE',
    modality: 'HYBRID',
    min_semester: 7,
    economic_sector: 'Comercio',
    required_skills: ['Vue'],
    knowledge_areas: ['Desarrollo web'],
    applications_count: 2,
    created_at: '2026-11-12T12:00:00Z',
    updated_at: '2026-11-12T12:00:00Z',
  },
  {
    id: 'open-1',
    company_id: 'company-1',
    title: 'Portal de analítica empresarial',
    description: 'Descripción del reto abierto',
    business_process: 'Analítica',
    status: 'OPEN',
    difficulty_level: 'ADVANCED',
    modality: 'REMOTE',
    min_semester: 8,
    economic_sector: 'Tecnología',
    required_skills: ['Python'],
    knowledge_areas: ['Datos'],
    applications_count: 5,
    created_at: '2026-11-11T12:00:00Z',
    updated_at: '2026-11-11T12:00:00Z',
  },
  {
    id: 'progress-1',
    company_id: 'company-1',
    title: 'Integración de procesos internos',
    description: 'Descripción del reto en progreso',
    business_process: 'Operaciones',
    status: 'IN_PROGRESS',
    difficulty_level: 'ADVANCED',
    modality: 'ON_SITE',
    min_semester: 9,
    economic_sector: 'Servicios',
    required_skills: ['APIs'],
    knowledge_areas: ['Integración'],
    applications_count: 3,
    created_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-10T12:00:00Z',
  },
  {
    id: 'closed-1',
    company_id: 'company-1',
    title: 'Reto finalizado',
    description: 'Descripción del reto cerrado',
    business_process: 'Calidad',
    status: 'CLOSED',
    difficulty_level: 'BEGINNER',
    modality: 'REMOTE',
    min_semester: 6,
    economic_sector: 'Educación',
    required_skills: ['QA'],
    knowledge_areas: ['Pruebas'],
    applications_count: 1,
    created_at: '2026-11-09T12:00:00Z',
    updated_at: '2026-11-09T12:00:00Z',
  },
]

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const CompanyChallengeTableStub = {
  name: 'CompanyChallengeTable',
  props: ['challenges', 'publishingId'],
  emits: ['edit', 'publish', 'manageFiles', 'close'],
  template: `
    <div data-testid="company-table">
      <span data-testid="visible-count">{{ challenges.length }}</span>
      <button data-testid="edit" @click="$emit('edit', challenges[0])">Edit</button>
      <button data-testid="publish" @click="$emit('publish', challenges[0])">Publish</button>
      <button data-testid="files" @click="$emit('manageFiles', challenges[0])">Files</button>
      <button data-testid="close" @click="$emit('close', challenges[1] || challenges[0])">Close</button>
    </div>
  `,
}

const ChallengeClosureModalStub = {
  name: 'ChallengeClosureModal',
  props: ['challenge', 'isOpen'],
  emits: ['update:isOpen', 'closed'],
  template: `
    <div v-if="isOpen" data-testid="closure-modal">
      <span data-testid="closure-challenge-id">{{ challenge?.id }}</span>
    </div>
  `,
}

function createWrapper() {
  return mount(ManagePage, {
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
        CompanyChallengeTable: CompanyChallengeTableStub,
        ChallengeClosureModal: ChallengeClosureModalStub,
      },
    },
  })
}

describe('Company challenge management page', () => {
  beforeEach(() => {
    loading.value = false
    error.value = null
    userRole.value = 'COMPANY'
    route.query = {}
    routerPush.mockReset()
    routerReplace.mockReset()
    addToast.mockReset()
    fetchCompanyChallenges.mockReset().mockResolvedValue({
      items: challenges.map(challenge => ({ ...challenge })),
      total: challenges.length,
      page: 1,
      limit: 100,
      pages: 1,
    })
    updateChallenge.mockReset().mockImplementation(async (id: string) => ({
      ...challenges.find(challenge => challenge.id === id),
      status: 'OPEN',
    }))

    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => ({
      push: routerPush,
      replace: routerReplace,
    }))
    vi.stubGlobal('useToast', () => ({ add: addToast }))
    vi.stubGlobal('navigateTo', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the company portfolio and displays status metrics', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(fetchCompanyChallenges).toHaveBeenCalledWith({ page: 1, limit: 100 })
    expect(wrapper.get('[aria-label="Filtrar por Borradores"]').text()).toContain('1')
    expect(wrapper.get('[aria-label="Filtrar por Abiertos"]').text()).toContain('1')
    expect(wrapper.get('[aria-label="Filtrar por En progreso"]').text()).toContain('1')
    expect(wrapper.get('[aria-label="Filtrar por Cerrados"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('4')
  })

  it('filters the table using the status tabs', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const draftTab = wrapper
      .findAll('[role="tab"]')
      .find(tab => tab.text().includes('Borradores'))
    await draftTab?.trigger('click')

    expect(wrapper.get('[data-testid="visible-count"]').text()).toBe('1')
    expect(draftTab?.attributes('aria-selected')).toBe('true')
  })

  it('publishes a draft and confirms the status change', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="publish"]').trigger('click')
    await flushPromises()

    expect(updateChallenge).toHaveBeenCalledWith('draft-1', { status: 'OPEN' })
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reto publicado',
      color: 'success',
    }))
    expect(wrapper.get('[aria-label="Filtrar por Abiertos"]').text()).toContain('2')
  })

  it('routes edit, file management, and closure actions', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="edit"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/challenges/draft-1/edit')

    await wrapper.get('[data-testid="files"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({
      path: '/challenges/draft-1',
      query: { tab: 'files' },
    })

    await wrapper.get('[data-testid="close"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({
      query: { close: 'open-1' },
    })
  })

  it('opens the requested closure modal and updates the portfolio after closing', async () => {
    route.query = { close: 'open-1' }
    const wrapper = createWrapper()
    await flushPromises()

    const closureModal = wrapper.getComponent(ChallengeClosureModalStub)
    expect(wrapper.get('[data-testid="closure-challenge-id"]').text()).toBe('open-1')

    closureModal.vm.$emit('closed', {
      ...challenges[1],
      status: 'CLOSED',
    })
    await flushPromises()

    expect(routerReplace).toHaveBeenCalledWith({ query: {} })
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reto cerrado',
      color: 'success',
    }))
    expect(wrapper.get('[aria-label="Filtrar por Abiertos"]').text()).toContain('0')
    expect(wrapper.get('[aria-label="Filtrar por Cerrados"]').text()).toContain('2')
  })

  it('shows an error state and allows retrying the request', async () => {
    fetchCompanyChallenges.mockRejectedValueOnce(new Error('Gateway unavailable'))
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Gateway unavailable')

    fetchCompanyChallenges.mockResolvedValueOnce({
      items: challenges.map(challenge => ({ ...challenge })),
      total: challenges.length,
      page: 1,
      limit: 100,
      pages: 1,
    })
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(fetchCompanyChallenges).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
