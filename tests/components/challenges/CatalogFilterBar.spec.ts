import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import type { LocationQuery, NavigationGuard } from 'vue-router'
import CatalogFilterBar from '~/components/challenges/CatalogFilterBar.vue'

const mockRoute = reactive<{ query: LocationQuery }>({ query: {} })
const mockRouterPush = vi.fn().mockImplementation(async (target: { query: LocationQuery }) => {
  mockRoute.query = target.query || {}
})

vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('useRouter', () => ({ push: mockRouterPush }))
vi.stubGlobal('onBeforeRouteLeave', vi.fn<(guard: NavigationGuard) => void>())

describe('CatalogFilterBar', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    mockRoute.query = {}
    mockRouterPush.mockClear()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.useRealTimers()
  })

  it('hydrates local filter controls from route query including min_semester and aliases', async () => {
    mockRoute.query = {
      q: 'FastAPI',
      economic_sector: 'Tecnología y Software',
      modality: 'REMOTE',
      min_semester: '8',
      skills: 'Python,Docker',
    }

    wrapper = mount(CatalogFilterBar)
    await nextTick()

    expect((wrapper.find('#catalog-search').element as HTMLInputElement).value).toBe('FastAPI')
    expect((wrapper.find('#catalog-sector').element as HTMLSelectElement).value).toBe('Tecnología y Software')
    expect((wrapper.find('#catalog-modality').element as HTMLSelectElement).value).toBe('REMOTE')
    expect((wrapper.find('#catalog-min-semester').element as HTMLSelectElement).value).toBe('8')
    expect(wrapper.text()).toContain('Semestre mín.: 8°')
    expect(wrapper.text()).toContain('Habilidad: Python')
    expect(wrapper.text()).toContain('Habilidad: Docker')
    expect(wrapper.text()).toContain('6 filtros activos')
  })

  it('debounces search input by 300ms and clears immediately when clicking clear search button', async () => {
    wrapper = mount(CatalogFilterBar)
    const searchInput = wrapper.find('#catalog-search')

    await searchInput.setValue('Microservicios')
    await searchInput.trigger('input')

    expect(mockRouterPush).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(299)
    expect(mockRouterPush).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(mockRouterPush).toHaveBeenCalledWith({ query: { q: 'Microservicios' } })
    expect(wrapper.emitted('filter-change')?.[0]?.[0]).toMatchObject({ q: 'Microservicios' })

    await wrapper.find('button[aria-label="Limpiar búsqueda"]').trigger('click')
    expect(mockRouterPush).toHaveBeenLastCalledWith({ query: {} })
  })

  it('updates query params for min_semester select and allows dismissing individual chips', async () => {
    wrapper = mount(CatalogFilterBar)
    const semesterSelect = wrapper.find('#catalog-min-semester')
    await semesterSelect.setValue('9')
    await semesterSelect.trigger('change')

    expect(mockRouterPush).toHaveBeenCalledWith({ query: { min_semester: '9' } })
    expect(wrapper.text()).toContain('Semestre mín.: 9°')

    await wrapper.find('button[aria-label="Quitar filtro de semestre mínimo"]').trigger('click')
    expect(mockRouterPush).toHaveBeenLastCalledWith({ query: {} })
  })

  it('adds skills on Enter key and resets all filters with Restablecer button', async () => {
    wrapper = mount(CatalogFilterBar)
    const skillInput = wrapper.find('#catalog-skill')
    await skillInput.setValue('Kubernetes')
    await skillInput.trigger('keydown.enter')

    expect(mockRouterPush).toHaveBeenCalledWith({ query: { skill: 'Kubernetes' } })
    expect(wrapper.text()).toContain('Habilidad: Kubernetes')

    const resetBtn = wrapper.findAll('button').find(btn => btn.text().trim() === 'Restablecer')
    expect(resetBtn).toBeDefined()
    await resetBtn!.trigger('click')

    expect(wrapper.emitted('reset')).toBeTruthy()
    expect(mockRoute.query).toEqual({})
  })
})
