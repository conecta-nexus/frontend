import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ClosureModal from '~/components/challenges/ClosureModal.vue'
import type { Challenge } from '~/types/challenge'

const mockCloseChallenge = vi.fn()

vi.stubGlobal('useToast', () => ({
  add: vi.fn(),
}))

vi.stubGlobal('useChallenges', () => ({
  closeChallenge: mockCloseChallenge,
}))

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({
    closeChallenge: mockCloseChallenge,
  }),
}))

describe('ClosureModal Component', () => {
  const dummyChallenge: Challenge = {
    id: 'ch-close-1',
    company_id: 'comp-1',
    title: 'Desafío de Optimización Logística',
    description: 'Descripción completa',
    business_process: 'Distribución y Entregas',
    status: 'OPEN',
    difficulty_level: 'INTERMEDIATE',
    modality: 'HYBRID',
    min_semester: 7,
    economic_sector: 'Logística',
    required_skills: ['Python', 'PostgreSQL'],
    knowledge_areas: ['Bases de Datos'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when modelValue is false', () => {
    const wrapper = mount(ClosureModal, {
      props: {
        modelValue: false,
        challenge: dummyChallenge,
      },
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('renders modal with warning and character requirement when open', () => {
    const wrapper = mount(ClosureModal, {
      props: {
        modelValue: true,
        challenge: dummyChallenge,
      },
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cerrar Convocatoria del Reto')
    expect(wrapper.text()).toContain('Desafío de Optimización Logística')
    expect(wrapper.text()).toContain('10 caracteres mínimos')
  })

  it('disables submit button when justification is too short', async () => {
    const wrapper = mount(ClosureModal, {
      props: {
        modelValue: true,
        challenge: dummyChallenge,
      },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Cierre') // 6 characters (< 10)

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('submits closure when justification is valid and emits closed event', async () => {
    const updatedChallenge = { ...dummyChallenge, status: 'CLOSED' as const }
    mockCloseChallenge.mockResolvedValueOnce(updatedChallenge)

    const wrapper = mount(ClosureModal, {
      props: {
        modelValue: true,
        challenge: dummyChallenge,
      },
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('El reto ha sido resuelto mediante colaboración interna con practicantes.')

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await submitBtn.trigger('submit')

    expect(mockCloseChallenge).toHaveBeenCalledWith(
      'ch-close-1',
      'El reto ha sido resuelto mediante colaboración interna con practicantes.',
    )

    await vi.waitFor(() => {
      expect(wrapper.emitted('closed')).toBeTruthy()
      expect(wrapper.emitted('closed')![0]).toEqual([updatedChallenge])
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })
})
