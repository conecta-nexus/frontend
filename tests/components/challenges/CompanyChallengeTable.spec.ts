import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CompanyChallengeTable from '~/components/challenges/CompanyChallengeTable.vue'
import type { Challenge } from '~/types/challenge'

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

describe('CompanyChallengeTable Component', () => {
  const mockChallenges: Challenge[] = [
    {
      id: 'ch-draft-1',
      company_id: 'comp-1',
      title: 'Sistema de Ruteo Inteligente',
      description: 'Descripción de prueba',
      business_process: 'Logística de Despacho',
      status: 'DRAFT',
      difficulty_level: 'ADVANCED',
      modality: 'REMOTE',
      min_semester: 8,
      economic_sector: 'Transporte',
      required_skills: ['Vue', 'FastAPI'],
      knowledge_areas: ['Redes'],
      attachments: [{ id: 'att-1', challenge_id: 'ch-draft-1', file_name: 'doc.pdf', file_size_bytes: 1024, mime_type: 'application/pdf', created_at: '' }],
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-01T10:00:00Z',
    },
    {
      id: 'ch-open-2',
      company_id: 'comp-1',
      title: 'Plataforma de Telemetría IoT',
      description: 'Descripción de IoT',
      business_process: 'Monitoreo de Sensores',
      status: 'OPEN',
      difficulty_level: 'INTERMEDIATE',
      modality: 'HYBRID',
      min_semester: 6,
      economic_sector: 'Agroindustria',
      required_skills: ['MQTT', 'Python'],
      knowledge_areas: ['IoT'],
      attachments: [],
      created_at: '2026-11-02T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    },
  ]

  it('renders loading state when loading prop is true', () => {
    const wrapper = mount(CompanyChallengeTable, {
      props: {
        challenges: [],
        loading: true,
      },
      global: {
        stubs: { NuxtLink: NuxtLinkStub },
      },
    })

    expect(wrapper.text()).toContain('Cargando retos empresariales...')
  })

  it('renders empty placeholder when no challenges provided', () => {
    const wrapper = mount(CompanyChallengeTable, {
      props: {
        challenges: [],
        loading: false,
      },
      global: {
        stubs: { NuxtLink: NuxtLinkStub },
      },
    })

    expect(wrapper.text()).toContain('No hay desafíos en esta sección')
    expect(wrapper.text()).toContain('Publicar Nuevo Reto')
  })

  it('renders table rows with status badges and actions', async () => {
    const wrapper = mount(CompanyChallengeTable, {
      props: {
        challenges: mockChallenges,
        loading: false,
      },
      global: {
        stubs: { NuxtLink: NuxtLinkStub },
      },
    })

    expect(wrapper.text()).toContain('Sistema de Ruteo Inteligente')
    expect(wrapper.text()).toContain('Borrador')
    expect(wrapper.text()).toContain('Plataforma de Telemetría IoT')
    expect(wrapper.text()).toContain('Abierto / En Convocatoria')

    // Draft challenge should have 'Publicar' button
    const publishBtn = wrapper.find('button[title="Abrir convocatoria al público"]')
    expect(publishBtn.exists()).toBe(true)
    await publishBtn.trigger('click')
    expect(wrapper.emitted('publish')).toBeTruthy()
    expect(wrapper.emitted('publish')![0]).toEqual([mockChallenges[0]])

    // Open challenge should have 'Cerrar' button
    const closeBtn = wrapper.find('button[title="Cierre voluntario con justificación"]')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')![0]).toEqual([mockChallenges[1]])
  })
})
