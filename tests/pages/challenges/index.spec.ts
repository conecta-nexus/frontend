import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import IndexPage from '~/pages/challenges/index.vue'
import CatalogEmptyState from '~/components/challenges/CatalogEmptyState.vue'
import type { Challenge } from '~/types/challenge'

// Deterministic mock state for useChallenges
const mockChallenges = ref<Challenge[]>([])
const mockPagination = ref<{ total: number; page: number; pages: number; limit: number } | null>(null)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchCatalog = vi.fn().mockImplementation(async () => {
  return { items: mockChallenges.value, total: mockChallenges.value.length, page: 1, limit: 10, pages: 1 }
})

// Route and Router mock state
const mockRoute = reactive<{ query: Record<string, string> }>({
  query: {},
})

const mockRouterPush = vi.fn().mockImplementation(async (target: { query: Record<string, string> }) => {
  mockRoute.query = target.query || {}
})

// Component stubs
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const CatalogFilterBarStub = {
  name: 'CatalogFilterBar',
  props: ['loading', 'totalResults'],
  emits: ['reset'],
  template: '<div class="catalog-filter-bar-stub"><slot /></div>',
}

// Auto-import mocks for Nuxt runtime globals
vi.stubGlobal('useHead', vi.fn())
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('useRouter', () => ({
  push: mockRouterPush,
}))
vi.stubGlobal('useChallenges', () => ({
  challenges: mockChallenges,
  pagination: mockPagination,
  loading: mockLoading,
  error: mockError,
  fetchCatalog: mockFetchCatalog,
}))

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({
    challenges: mockChallenges,
    pagination: mockPagination,
    loading: mockLoading,
    error: mockError,
    fetchCatalog: mockFetchCatalog,
  }),
}))

describe('Challenges Index Page - Empty State Integration', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    vi.clearAllMocks()
    mockChallenges.value = []
    mockPagination.value = { total: 0, page: 1, pages: 0, limit: 10 }
    mockLoading.value = false
    mockError.value = null
    mockRoute.query = {}
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  it('renders CatalogEmptyState when challenges array is empty and request is successful', async () => {
    mockLoading.value = false
    mockError.value = null
    mockChallenges.value = []

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('No se encontraron desafíos')
  })

  it('does NOT render CatalogEmptyState while catalog is loading', async () => {
    mockLoading.value = true
    mockError.value = null
    mockChallenges.value = []

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(false)
    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
  })

  it('does NOT render CatalogEmptyState when there is an API error', async () => {
    mockLoading.value = false
    mockError.value = 'Error al conectar con el servidor de retos'
    mockChallenges.value = []

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(false)
    expect(wrapper.text()).toContain('Error al conectar con el servidor de retos')
  })

  it('does NOT render CatalogEmptyState when challenges exist', async () => {
    mockLoading.value = false
    mockError.value = null
    mockChallenges.value = [
      {
        id: 'challenge-1',
        company_id: 'comp-1',
        title: 'Sistema de Telemetría Agropecuaria',
        description: 'Desarrollo de plataforma IoT para monitoreo de humedad.',
        business_process: 'Operaciones',
        status: 'OPEN',
        difficulty_level: 'INTERMEDIATE',
        modality: 'REMOTE',
        min_semester: 7,
        economic_sector: 'Agroindustria',
        required_skills: ['Vue', 'FastAPI'],
        knowledge_areas: ['Ingeniería de Software'],
        created_at: '2026-11-10T00:00:00Z',
        updated_at: '2026-11-10T00:00:00Z',
      },
    ]
    mockPagination.value = { total: 1, page: 1, pages: 1, limit: 10 }

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(false)
    expect(wrapper.text()).toContain('Sistema de Telemetría Agropecuaria')
  })

  it('passes derived active filters to CatalogEmptyState and enables reset action', async () => {
    mockRoute.query = {
      q: 'React',
      modality: 'REMOTE',
      sector: 'Tecnología y Software',
    }
    mockLoading.value = false
    mockChallenges.value = []

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.props('showReset')).toBe(true)

    const activeFilters = emptyState.props('activeFilters')
    expect(activeFilters).toHaveLength(3)
    expect(activeFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'q', label: 'Búsqueda', value: '"React"' }),
        expect.objectContaining({ key: 'modality', label: 'Modalidad', value: 'Remoto' }),
        expect.objectContaining({ key: 'sector', label: 'Sector', value: 'Tecnología y Software' }),
      ]),
    )
  })

  it('handles reset action cleanly by pushing empty query and preventing duplicate fetch requests', async () => {
    mockRoute.query = {
      q: 'Cloud',
      modality: 'HYBRID',
    }
    mockLoading.value = false
    mockChallenges.value = []

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    // Initial mount calls fetchCatalog once
    expect(mockFetchCatalog).toHaveBeenCalledTimes(1)

    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(true)

    // Trigger reset from CatalogEmptyState
    await emptyState.vm.$emit('reset')

    // Router push was called with empty query to clear URL filters
    expect(mockRouterPush).toHaveBeenCalledWith({ query: {} })

    // Wait for route.query watcher to trigger following router.push
    await wrapper.vm.$nextTick()

    // Exactly 1 additional load was triggered (2 total: 1 on mount, 1 on query reset)
    // and no parallel duplicate calls were made
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
  })
})
