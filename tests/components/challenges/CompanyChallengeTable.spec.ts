import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompanyChallengeTable, {
  type CompanyChallenge,
} from '~/components/challenges/CompanyChallengeTable.vue'

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
    applications_count: 4,
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
    created_at: '2026-11-11T12:00:00Z',
    updated_at: '2026-11-11T12:00:00Z',
  },
]

function createWrapper(componentChallenges = challenges) {
  return mount(CompanyChallengeTable, {
    props: {
      challenges: componentChallenges,
      publishingId: null,
    },
  })
}

async function openActions(
  wrapper: ReturnType<typeof createWrapper>,
  challengeTitle: string,
) {
  await wrapper
    .get(`[aria-label="Acciones para ${challengeTitle}"]`)
    .trigger('click')
}

describe('CompanyChallengeTable', () => {
  it('renders challenge information, status badges, dates, and application totals', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Automatización de inventario')
    expect(wrapper.text()).toContain('Portal de analítica empresarial')
    expect(wrapper.text()).toContain('Borrador')
    expect(wrapper.text()).toContain('Abierto')
    expect(wrapper.text()).toContain('Comercio · Híbrido')
    expect(wrapper.text()).toContain('Tecnología · Remoto')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('12 de nov de 2026')
  })

  it('offers publish for drafts and emits the selected challenge', async () => {
    const wrapper = createWrapper()
    await openActions(wrapper, 'Automatización de inventario')

    const menu = wrapper.get('[role="menu"]')
    expect(menu.text()).toContain('Publicar')
    expect(menu.text()).not.toContain('Cerrar reto')

    const publishButton = menu
      .findAll('[role="menuitem"]')
      .find(button => button.text() === 'Publicar')
    await publishButton?.trigger('click')

    expect(wrapper.emitted('publish')).toEqual([[challenges[0]]])
  })

  it('offers closure for open challenges without showing publish', async () => {
    const wrapper = createWrapper()
    await openActions(wrapper, 'Portal de analítica empresarial')

    const menu = wrapper.get('[role="menu"]')
    expect(menu.text()).toContain('Cerrar reto')
    expect(menu.text()).not.toContain('Publicar')

    const closeButton = menu
      .findAll('[role="menuitem"]')
      .find(button => button.text() === 'Cerrar reto')
    await closeButton?.trigger('click')

    expect(wrapper.emitted('close')).toEqual([[challenges[1]]])
  })

  it('emits edit and file management actions', async () => {
    const wrapper = createWrapper()
    await openActions(wrapper, 'Automatización de inventario')

    let menuItems = wrapper.get('[role="menu"]').findAll('[role="menuitem"]')
    await menuItems.find(button => button.text() === 'Editar')?.trigger('click')
    expect(wrapper.emitted('edit')).toEqual([[challenges[0]]])

    await openActions(wrapper, 'Automatización de inventario')
    menuItems = wrapper.get('[role="menu"]').findAll('[role="menuitem"]')
    await menuItems
      .find(button => button.text() === 'Gestionar archivos')
      ?.trigger('click')
    expect(wrapper.emitted('manageFiles')).toEqual([[challenges[0]]])
  })

  it('closes an open action menu with Escape', async () => {
    const wrapper = createWrapper()
    await openActions(wrapper, 'Automatización de inventario')

    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    await wrapper.get('[aria-haspopup="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('renders an empty state when the selected status has no challenges', () => {
    const wrapper = createWrapper([])

    expect(wrapper.get('[role="status"]').text()).toContain(
      'No hay retos en este estado',
    )
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
