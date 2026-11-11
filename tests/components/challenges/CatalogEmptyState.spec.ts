import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CatalogEmptyState, { type ActiveFilterItem } from '~/components/challenges/CatalogEmptyState.vue'

describe('CatalogEmptyState Component', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(CatalogEmptyState)

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('No se encontraron desafíos')
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toContain('Catálogo de Oportunidades')
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
        activeFilters: [],
      },
    })

    expect(wrapper.text()).toContain(
      'En este momento no hay convocatorias de desafíos disponibles. Vuelve a consultar más adelante para explorar nuevas oportunidades.',
    )
    expect(wrapper.find('[role="list"]').exists()).toBe(false)
  })

  it('renders contextual explanatory text and active filters list when filters are active', () => {
    const activeFilters: ActiveFilterItem[] = [
      { key: 'q', label: 'Búsqueda', value: '"Frontend"' },
      { key: 'modality', label: 'Modalidad', value: 'Remoto' },
      { key: 'difficulty', label: 'Dificultad', value: 'Intermedio' },
    ]

    const wrapper = mount(CatalogEmptyState, {
      props: {
        activeFilters,
      },
    })

    expect(wrapper.text()).toContain(
      'No hay convocatorias abiertas que coincidan con los filtros seleccionados.',
    )
    expect(wrapper.find('[role="list"]').exists()).toBe(true)

    const listItems = wrapper.findAll('[role="listitem"]')
    expect(listItems.length).toBe(3)
    expect(listItems[0].text()).toContain('Búsqueda: "Frontend"')
    expect(listItems[1].text()).toContain('Modalidad: Remoto')
    expect(listItems[2].text()).toContain('Dificultad: Intermedio')
  })

  it('renders the reset button by default and when showReset is true', () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        showReset: true,
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Restablecer todos los filtros')
    expect(button.attributes('aria-label')).toBe('Restablecer todos los filtros')
  })

  it('hides the reset button when showReset is false', () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        showReset: false,
      },
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('emits reset event when clicking the reset button', async () => {
    const wrapper = mount(CatalogEmptyState, {
      props: {
        activeFilters: [{ key: 'q', label: 'Búsqueda', value: '"Docker"' }],
        showReset: true,
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)

    await button.trigger('click')

    expect(wrapper.emitted('reset')).toBeTruthy()
    expect(wrapper.emitted('reset')?.length).toBe(1)
  })
})
