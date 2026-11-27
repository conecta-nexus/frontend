import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CatalogEmptyState, { type ActiveFilters } from '~/components/challenges/CatalogEmptyState.vue'

describe('CatalogEmptyState Component', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(CatalogEmptyState)

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('No se encontraron desafíos')
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toContain('El catálogo no informó cuántas oportunidades están abiertas.')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('h2').attributes('id')).toBe(wrapper.attributes('aria-labelledby'))
    expect(wrapper.get('p').attributes('id')).toBe(wrapper.attributes('aria-describedby'))
  })

  it('renders custom title and description when provided', () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        title: 'Búsqueda sin coincidencias',
        description: 'No se hallaron resultados para la consulta personalizada.',
      },
    })

    expect(wrapper.find('h2').text()).toBe('Búsqueda sin coincidencias')
    expect(wrapper.text()).toContain('No se hallaron resultados para la consulta personalizada.')
  })

  it('renders default contextual explanatory text without active filters', () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        activeFilters: {},
        totalActiveCount: 0,
      },
    })

    expect(wrapper.text()).toContain(
      'En este momento no hay convocatorias de desafíos disponibles. Vuelve a consultar más adelante para explorar nuevas oportunidades.',
    )
    expect(wrapper.find('[role="list"]').exists()).toBe(false)
    expect(wrapper.find('h2').text()).toBe('No hay oportunidades abiertas')
  })

  it('renders contextual explanatory text and active filters list when filters are active', () => {
    const activeFilters: ActiveFilters = {
      q: { label: 'Búsqueda', value: '"Frontend"' },
      modality: { label: 'Modalidad', value: 'Remoto' },
      difficulty: { label: 'Dificultad', value: 'Intermedio' },
      sector: { label: 'Sector', value: 'Tecnología' },
      'skill-0': { label: 'Habilidad', value: '#Vue' },
      'skill-1': { label: 'Habilidad', value: '#PostgreSQL' },
      knowledge_area: { label: 'Área de conocimiento', value: 'Software' },
      min_semester: { label: 'Semestre mín.', value: '6°' },
    }

    const wrapper = mount(CatalogEmptyState, {
      props: {
        activeFilters,
        totalActiveCount: 14,
      },
    })

    expect(wrapper.text()).toContain(
      'No hay convocatorias abiertas que coincidan con los filtros seleccionados.',
    )
    expect(wrapper.get('h2').text()).toBe('No hay desafíos que coincidan con los filtros seleccionados')
    expect(wrapper.find('[role="list"]').exists()).toBe(true)

    expect(wrapper.findAll('[role="listitem"]').map(item => item.text())).toEqual([
      'Búsqueda: "Frontend"', 'Modalidad: Remoto', 'Dificultad: Intermedio', 'Sector: Tecnología',
      'Habilidad: #Vue', 'Habilidad: #PostgreSQL', 'Área de conocimiento: Software', 'Semestre mín.: 6°',
    ])
    expect(wrapper.text()).toContain('Hay 14 oportunidades abiertas en el catálogo.')
  })

  it('renders the reset button by default and when showReset is true', () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        showReset: true,
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Limpiar todos los filtros')
    expect(button.attributes('type')).toBe('button')
  })

  it('hides the reset button when showReset is false', () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        showReset: false,
      },
    })

    expect(wrapper.findAll('button').map(button => button.text())).toEqual([
      'Explorar todas las oportunidades abiertas',
    ])
  })

  it('emits reset event when clicking the reset button', async () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        activeFilters: { q: { label: 'Búsqueda', value: '"Docker"' } },
        showReset: true,
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)

    await button.trigger('click')

    expect(wrapper.emitted('reset')).toBeTruthy()
    expect(wrapper.emitted('reset')?.length).toBe(1)
  })

  it('emits the same reset event from the secondary action', async () => {
    const wrapper = mount(CatalogEmptyState)
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('updates the heading, filter list and count as props change', async () => {
    const wrapper = mount(CatalogEmptyState, { props: { totalActiveCount: 0 } })
    await wrapper.setProps({
      totalActiveCount: 1,
      activeFilters: { q: { label: 'Búsqueda', value: '"Vue"' } },
    })
    expect(wrapper.get('h2').text()).toBe('No hay desafíos que coincidan con los filtros seleccionados')
    expect(wrapper.get('li').text()).toBe('Búsqueda: "Vue"')
    expect(wrapper.text()).toContain('Hay 1 oportunidad abierta en el catálogo.')
    await wrapper.setProps({ totalActiveCount: undefined })
    expect(wrapper.text()).toContain('El catálogo no informó cuántas oportunidades están abiertas.')
    expect(wrapper.get('h2').text()).toBe('No hay desafíos que coincidan con los filtros seleccionados')
    await wrapper.setProps({ totalActiveCount: 0 })
    expect(wrapper.get('h2').text()).toBe('No hay oportunidades abiertas')
    await wrapper.setProps({ activeFilters: {}, totalActiveCount: undefined })
    expect(wrapper.get('h2').text()).toBe('No se encontraron desafíos')
  })
})
