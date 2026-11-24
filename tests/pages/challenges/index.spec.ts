import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { computed, reactive, ref } from 'vue'
import type { LocationQuery, NavigationGuard } from 'vue-router'
import IndexPage from '~/pages/challenges/index.vue'
import ChallengeCard from '~/components/challenges/ChallengeCard.vue'
import CatalogEmptyState from '~/components/challenges/CatalogEmptyState.vue'
import CatalogFilterBar from '~/components/challenges/CatalogFilterBar.vue'
import type { ChallengeCatalogItem, ChallengeCatalogResponse } from '~/types/challenge'

// Deterministic mock state for useChallenges
const mockChallenges = ref<ChallengeCatalogItem[]>([])
const mockPagination = ref<Omit<ChallengeCatalogResponse, 'items'> | null>(null)
const mockCatalog = computed(() => mockPagination.value && {
  ...mockPagination.value,
  items: mockChallenges.value,
})
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchCatalog = vi.fn().mockImplementation(async () => {
  return { items: mockChallenges.value, total: mockChallenges.value.length, page: 1, limit: 10, pages: 1 }
})

// Route and Router mock state
const mockRoute = reactive<{ query: LocationQuery }>({
  query: {},
})

const mockRouterPush = vi.fn().mockImplementation(async (target: { query: LocationQuery }) => {
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
const mockBeforeRouteLeave = vi.fn<(guard: NavigationGuard) => void>()
vi.stubGlobal('onBeforeRouteLeave', mockBeforeRouteLeave)
vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({
    catalog: mockCatalog,
    catalogLoading: mockLoading,
    catalogError: mockError,
    fetchCatalog: mockFetchCatalog,
  }),
}))

const challenge: ChallengeCatalogItem = {
  id: 'challenge-1',
  company_id: 'comp-1',
  company_name: 'Laboratorio Río Claro',
  title: 'Sistema de Telemetría Agropecuaria',
  description_snippet: 'Desarrollo de plataforma IoT para monitoreo de humedad.',
  difficulty_level: 'INTERMEDIATE',
  modality: 'REMOTE',
  min_semester: 7,
  economic_sector: 'Agroindustria',
  required_skills: ['Vue', 'FastAPI', 'PostgreSQL', 'Python', 'MQTT'],
  knowledge_areas: ['Ingeniería de Software'],
  created_at: '2026-11-10T00:00:00Z',
}

describe('Challenges Index Page', () => {
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
    vi.useRealTimers()
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

    await wrapper.vm.$nextTick()
    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('No se encontraron desafíos')
  })

  it('renders six skeletons and hides stale cards during a new request', async () => {
    mockLoading.value = true
    mockError.value = null
    mockChallenges.value = [challenge]

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    await wrapper.vm.$nextTick()
    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(false)
    const skeletons = wrapper.findAll('[data-testid="catalog-skeleton"]')
    expect(skeletons).toHaveLength(6)
    expect(skeletons.every(skeleton => skeleton.attributes('aria-hidden') === 'true')).toBe(true)
    expect(wrapper.findComponent(ChallengeCard).exists()).toBe(false)

    mockLoading.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-testid="catalog-skeleton"]')).toHaveLength(0)
    expect(wrapper.findComponent(ChallengeCard).exists()).toBe(true)
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

    await wrapper.vm.$nextTick()
    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(false)
    expect(wrapper.text()).toContain('Error al conectar con el servidor de retos')
  })

  it('does NOT render CatalogEmptyState when challenges exist', async () => {
    mockLoading.value = false
    mockError.value = null
    mockChallenges.value = [
      challenge,
      { ...challenge, id: 'challenge-2', company_name: undefined, modality: 'HYBRID', difficulty_level: 'BEGINNER' },
      { ...challenge, id: 'challenge-3', modality: 'ON_SITE', difficulty_level: 'ADVANCED' },
    ]
    mockPagination.value = { total: 3, page: 1, pages: 1, limit: 10 }

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          CatalogFilterBar: CatalogFilterBarStub,
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    await wrapper.vm.$nextTick()
    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(false)
    const [remote, hybrid, onSite] = wrapper.findAllComponents(ChallengeCard)
    expect(remote!.get('h2').text()).toBe(challenge.title)
    expect(remote!.text()).toContain(challenge.company_name)
    expect(remote!.get('.line-clamp-3').text()).toBe(challenge.description_snippet)
    expect(remote!.text()).toContain('Sem. 7+')
    expect(remote!.get('ul').text()).toContain('Vue')
    expect(remote!.get('ul').text()).toContain('+1')
    expect(remote!.get('a').attributes('href')).toBe('/challenges/challenge-1')
    expect(remote!.get('.bg-blue-50').text()).toBe('Remoto')
    expect(remote!.get('.bg-amber-50').text()).toBe('Intermedio')
    expect(hybrid!.get('.bg-purple-50').text()).toBe('Híbrido')
    expect(hybrid!.get('.bg-green-50').text()).toBe('Básico')
    expect(hybrid!.text()).toContain('Empresa sin nombre público')
    expect(onSite!.get('.bg-orange-50').text()).toBe('Presencial')
    expect(onSite!.get('.bg-red-50').text()).toBe('Avanzado')
  })

  it('paginates through the route, preserves filters, and disables navigation at each boundary', async () => {
    mockRoute.query = { q: 'IoT', limit: '1' }
    mockChallenges.value = [challenge]
    mockPagination.value = { total: 2, page: 1, pages: 2, limit: 1 }

    wrapper = mount(IndexPage, { global: { stubs: { CatalogFilterBar: CatalogFilterBarStub, NuxtLink: NuxtLinkStub } } })
    await wrapper.vm.$nextTick()
    const pagination = wrapper.get('nav[aria-label="Paginación del catálogo"]')
    const [previous, next] = pagination.findAll('button')
    expect(pagination.text()).toContain('Página 1 de 2')
    expect(previous!.element.disabled).toBe(true)
    expect(next!.element.disabled).toBe(false)

    await next!.trigger('click')
    expect(mockRouterPush).toHaveBeenLastCalledWith({ query: { q: 'IoT', limit: '1', page: '2' } })
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'IoT', page: 2, limit: 1 }))

    mockPagination.value = { total: 2, page: 2, pages: 2, limit: 1 }
    await wrapper.vm.$nextTick()
    expect(pagination.get('[aria-current="page"]').text()).toBe('2')
    expect(next!.element.disabled).toBe(true)
    expect(previous!.element.disabled).toBe(false)
    await previous!.trigger('click')
    expect(mockRouterPush).toHaveBeenLastCalledWith({ query: { q: 'IoT', limit: '1', page: '1' } })
  })

  it('uses pagination defaults and omits invalid filters from shared URLs', () => {
    mockRoute.query = {
      q: '  IoT  ',
      page: '2tail',
      limit: '101',
      min_semester: '6.5',
      modality: 'UNKNOWN',
      difficulty: 'constructor',
    }
    wrapper = mount(IndexPage, { global: { stubs: { CatalogFilterBar: CatalogFilterBarStub } } })

    expect(mockFetchCatalog).toHaveBeenCalledOnce()
    expect(mockFetchCatalog).toHaveBeenCalledWith(expect.objectContaining({
      q: 'IoT',
      page: 1,
      limit: 10,
      min_semester: undefined,
      modality: undefined,
      difficulty: undefined,
    }))
  })

  it('offers the last valid page when results exist outside the requested page', async () => {
    mockRoute.query = { q: 'IoT', page: '999' }
    mockPagination.value = { total: 11, page: 999, pages: 2, limit: 10 }
    wrapper = mount(IndexPage, { global: { stubs: { CatalogFilterBar: CatalogFilterBarStub } } })
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(CatalogEmptyState).exists()).toBe(false)
    expect(wrapper.text()).toContain('La página solicitada no está disponible.')
    await wrapper.get('button').trigger('click')
    expect(mockRouterPush).toHaveBeenLastCalledWith({ query: { q: 'IoT', page: '2' } })
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

    await wrapper.vm.$nextTick()
    const emptyState = wrapper.findComponent(CatalogEmptyState)
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.props('showReset')).toBe(true)

    expect(emptyState.props('activeFilters')).toEqual({
      q: { label: 'Búsqueda', value: '"React"' },
      sector: { label: 'Sector', value: 'Tecnología y Software' },
      modality: { label: 'Modalidad', value: 'Remoto' },
    })
    expect(emptyState.get('h2').text()).toBe('No hay desafíos que coincidan con los filtros seleccionados')
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

    await wrapper.vm.$nextTick()
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

  it('handles actual filter-bar reset flow cleanly with a single router push and exactly one catalog reload', async () => {
    mockRoute.query = {
      q: 'Cloud',
      modality: 'HYBRID',
    }
    mockLoading.value = false
    mockChallenges.value = []

    wrapper = mount(IndexPage, {
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    // Initial mount calls fetchCatalog once
    expect(mockFetchCatalog).toHaveBeenCalledTimes(1)

    // Verify CatalogFilterBar is mounted and has active filters
    const filterBar = wrapper.findComponent(CatalogFilterBar)
    expect(filterBar.exists()).toBe(true)

    // Wait for onMounted sync to update DOM in CatalogFilterBar
    await wrapper.vm.$nextTick()

    // Find the reset button rendered inside CatalogFilterBar ("Restablecer")
    const resetButton = filterBar.findAll('button').find(b => b.text().includes('Restablecer'))
    expect(resetButton?.exists()).toBe(true)

    // Trigger the reset button on CatalogFilterBar
    await resetButton!.trigger('click')

    // CatalogFilterBar performed its own router.push({ query: {} })
    // Parent IndexPage did NOT perform a second redundant router.push
    expect(mockRouterPush).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({ query: {} })

    // Wait for route.query watcher in IndexPage to trigger following the route change
    await wrapper.vm.$nextTick()

    // Exactly one catalog reload occurred (2 total: 1 on initial mount, 1 on filter-bar reset)
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
  })

  it('does not trigger redundant parent navigation when CatalogFilterBar emits reset', async () => {
    mockRoute.query = {
      q: 'DevOps',
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

    expect(mockFetchCatalog).toHaveBeenCalledTimes(1)

    const filterBar = wrapper.findComponent(CatalogFilterBarStub)
    expect(filterBar.exists()).toBe(true)

    // If CatalogFilterBar emits reset, IndexPage should NOT perform redundant parent router.push
    await filterBar.vm.$emit('reset')

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockFetchCatalog).toHaveBeenCalledTimes(1)
  })

  const skillButtons = '[aria-label^="Quitar habilidad "]'
  const searchInput = 'input[placeholder^="Buscar desafíos"]'

  function mountCatalog() {
    wrapper = mount(IndexPage, { global: { stubs: { NuxtLink: NuxtLinkStub } } })
    return wrapper
  }

  it('restores unique skills from comma-separated and repeated URL parameters', async () => {
    mockRoute.query = { skill: ['Vue, PostgreSQL', 'Vue', null, ' , '], skills: ['PostgreSQL', 'Python'] }
    const page = mountCatalog()
    await page.vm.$nextTick()

    expect(page.findAll(skillButtons).map(button => button.attributes('aria-label'))).toEqual([
      'Quitar habilidad Vue', 'Quitar habilidad PostgreSQL', 'Quitar habilidad Python',
    ])
    expect(mockFetchCatalog).toHaveBeenCalledWith(expect.objectContaining({ skill: 'Vue,PostgreSQL,Python' }))
    expect(mockFetchCatalog).toHaveBeenCalledOnce()
  })

  it('removes one skill and preserves other filters and the page size while resetting the page', async () => {
    mockRoute.query = {
      q: 'IoT', sector: 'Tecnología', skill: 'Vue,PostgreSQL', modality: 'REMOTE',
      difficulty_level: 'BEGINNER', knowledge_areas: ['Software', 'Redes'],
      min_semester: '7', limit: '1', page: '3',
    }
    const page = mountCatalog()
    await page.vm.$nextTick()
    await page.get('[aria-label="Quitar habilidad Vue"]').trigger('click')
    await page.vm.$nextTick()

    expect(page.findAll(skillButtons).map(button => button.attributes('aria-label'))).toEqual(['Quitar habilidad PostgreSQL'])
    expect(mockRouterPush).toHaveBeenCalledOnce()
    expect(mockRouterPush).toHaveBeenCalledWith({
      query: { q: 'IoT', sector: 'Tecnología', skill: 'PostgreSQL', modality: 'REMOTE', difficulty: 'BEGINNER', knowledge_area: 'Software,Redes', min_semester: '7', limit: '1' },
    })
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ skill: 'PostgreSQL', page: 1, limit: 1, min_semester: 7 }))
  })

  it('resynchronizes filters on history navigation and skips equivalent requests', async () => {
    const first = { q: 'Cloud', skill: 'Vue,PostgreSQL' }
    const second = { q: 'IoT', skill: ['Python', 'FastAPI'], page: '2', page_size: '2' }
    mockRoute.query = first
    const page = mountCatalog()
    await page.vm.$nextTick()

    mockRoute.query = second
    await page.vm.$nextTick()
    expect(page.get<HTMLInputElement>(searchInput).element.value).toBe('IoT')
    expect(page.findAll(skillButtons).map(button => button.attributes('aria-label'))).toEqual(['Quitar habilidad Python', 'Quitar habilidad FastAPI'])
    mockRoute.query = first
    await page.vm.$nextTick()
    expect(page.get<HTMLInputElement>(searchInput).element.value).toBe('Cloud')
    expect(page.get('[aria-label="Quitar habilidad Vue"]').exists()).toBe(true)
    mockRoute.query = { ...first, skill: ['PostgreSQL', 'Vue', 'Vue'] }
    await page.vm.$nextTick()
    expect(mockFetchCatalog).toHaveBeenCalledTimes(3)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('cancels a pending search on reset and retains the page-size preference', async () => {
    vi.useFakeTimers()
    mockRoute.query = { q: 'Cloud', skill: 'Vue', page: '3', page_size: '2' }
    const page = mountCatalog()
    await page.vm.$nextTick()
    await page.get(searchInput).setValue('Stale search')
    const reset = page.findAll('button').find(button => button.text() === 'Restablecer')!
    await reset.trigger('click')
    await vi.advanceTimersByTimeAsync(400)

    expect(mockRouterPush).toHaveBeenCalledExactlyOnceWith({ query: { page_size: '2' } })
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ q: undefined, page: 1, limit: 2 }))
  })

  it('cancels a pending search on unmount', async () => {
    vi.useFakeTimers()
    const page = mountCatalog()
    await page.get(searchInput).setValue('Stale search')
    page.unmount()
    wrapper = null
    await vi.advanceTimersByTimeAsync(400)

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockFetchCatalog).toHaveBeenCalledOnce()
  })

  it('cancels a pending search when a route navigation starts', async () => {
    vi.useFakeTimers()
    const page = mountCatalog()
    await page.get(searchInput).setValue('Stale search')
    const leave = mockBeforeRouteLeave.mock.calls[0]![0]
    const current = Object.assign({} as Parameters<NavigationGuard>[1], { path: '/challenges' })
    const nextRoute = { ...current, path: '/' }
    const next = vi.fn()
    await leave(nextRoute, current, next)
    await vi.advanceTimersByTimeAsync(400)

    expect(next).toHaveBeenCalledOnce()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockFetchCatalog).toHaveBeenCalledOnce()
  })

  it('applies a pending search with an immediate filter change in a single request', async () => {
    vi.useFakeTimers()
    mockRoute.query = { q: 'Cloud', skill: 'Vue', max_semester: '8', limit: '2', page: '2' }
    const page = mountCatalog()
    await page.vm.$nextTick()
    await page.get(searchInput).setValue('IoT')
    await page.findAll('select')[1]!.setValue('REMOTE')
    await vi.advanceTimersByTimeAsync(400)

    expect(mockRouterPush).toHaveBeenCalledExactlyOnceWith({
      query: { q: 'IoT', skill: 'Vue', modality: 'REMOTE', max_semester: '8', limit: '2' },
    })
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'IoT', modality: 'REMOTE', min_semester: 8, page: 1, limit: 2 }))
  })

  it('cancels a pending search when clearing the search field', async () => {
    vi.useFakeTimers()
    mockRoute.query = { q: 'Cloud', skill: 'Vue', page: '2' }
    const page = mountCatalog()
    await page.vm.$nextTick()
    await page.get(searchInput).setValue('Stale search')
    await page.get('[title="Limpiar búsqueda"]').trigger('click')
    await vi.advanceTimersByTimeAsync(400)

    expect(mockRouterPush).toHaveBeenCalledExactlyOnceWith({ query: { skill: 'Vue' } })
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ q: undefined, skill: 'Vue', page: 1 }))
  })

  it('uses backend metadata for the count, localized message and every reported filter', async () => {
    mockRoute.query = { q: 'DRAFT', modality: 'ON_SITE' }
    mockPagination.value = {
      total: 0, page: 1, pages: 1, limit: 10,
      empty_state: {
        code: 'NO_MATCHING_CHALLENGES',
        message: 'No challenges match your selected search criteria.',
        query_params: {
          q: 'Backend search', economic_sector: 'Tecnología', modality: 'REMOTE',
          difficulty_level: 'ADVANCED', skills: ['Vue', 'PostgreSQL'],
          knowledge_areas: ['Software', 'Redes'], min_semester: 6,
        },
        total_active_challenges: 14,
        suggested_reset: false,
      },
    }
    const page = mountCatalog()
    await page.vm.$nextTick()
    const empty = page.getComponent(CatalogEmptyState)
    expect(empty.props('totalActiveCount')).toBe(14)
    expect(empty.text()).toContain('Prueba con menos filtros')
    expect(empty.get('h2').text()).toBe('No hay desafíos que coincidan con los filtros seleccionados')
    expect(empty.findAll('li').map(item => item.text())).toEqual([
      'Búsqueda: "Backend search"', 'Sector: Tecnología', 'Modalidad: Remoto', 'Dificultad: Avanzado',
      'Área de conocimiento: Software, Redes', 'Habilidad: #Vue', 'Habilidad: #PostgreSQL', 'Semestre mín.: 6°',
    ])
    expect(empty.findAll('button').map(button => button.text())).toEqual(['Explorar todas las oportunidades abiertas'])
  })

  it('preserves filter guidance with partial metadata and switches to the confirmed empty catalog copy', async () => {
    mockRoute.query = { q: 'Vue', skill: 'Python' }
    mockPagination.value = {
      total: 0, page: 1, pages: 1, limit: 10,
      empty_state: { query_params: { q: 'Vue' } },
    }
    const page = mountCatalog()
    await page.vm.$nextTick()
    const empty = page.getComponent(CatalogEmptyState)
    expect(empty.text()).toContain('Habilidad: #Python')
    expect(empty.text()).toContain('El catálogo no informó cuántas oportunidades están abiertas.')
    expect(empty.props('totalActiveCount')).toBeUndefined()
    mockPagination.value.empty_state = { total_active_challenges: 0 }
    await page.vm.$nextTick()
    expect(empty.get('h2').text()).toBe('No hay oportunidades abiertas')
  })

  it.each([0, 1])('clears URL, controls, pending search and pagination once with empty-state action %i', async (index) => {
    vi.useFakeTimers()
    mockRoute.query = { q: 'Cloud', modality: 'REMOTE', page: '3', page_size: '2', unknown: 'remove' }
    const page = mountCatalog()
    await page.vm.$nextTick()
    await page.get(searchInput).setValue('Pending term')
    await page.getComponent(CatalogEmptyState).findAll('button')[index]!.trigger('click')
    await vi.advanceTimersByTimeAsync(400)
    expect(mockRouterPush).toHaveBeenCalledExactlyOnceWith({ query: {} })
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({
      q: undefined, modality: undefined, page: 1, limit: 10,
    }))
    expect(page.get<HTMLInputElement>(searchInput).element.value).toBe('')
    expect(page.getComponent(CatalogFilterBar).findAll('select')[1]!.element.value).toBe('')
  })

  it.each<LocationQuery>([{}, { page: '1', limit: '10', unknown: 'clear' }])('reloads once when the effective query is unchanged (%j)', async (query) => {
    vi.useFakeTimers()
    mockRoute.query = query
    const page = mountCatalog()
    await page.vm.$nextTick()
    await page.get(searchInput).setValue('Pending term')
    await page.getComponent(CatalogEmptyState).get('button').trigger('click')
    await vi.advanceTimersByTimeAsync(400)
    expect(mockRouterPush).toHaveBeenCalledTimes(Object.keys(query).length ? 1 : 0)
    expect(mockFetchCatalog).toHaveBeenCalledTimes(2)
    expect(mockFetchCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ q: undefined, page: 1, limit: 10 }))
    expect(page.get<HTMLInputElement>(searchInput).element.value).toBe('')
  })
})
