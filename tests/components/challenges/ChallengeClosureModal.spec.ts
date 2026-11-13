import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ChallengeClosureModal from '~/components/challenges/ChallengeClosureModal.vue'
import type { Challenge } from '~/types/challenge'

const closeChallenge = vi.fn()

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({ closeChallenge }),
}))

const challenge: Challenge = {
  id: 'challenge-1',
  company_id: 'company-1',
  title: 'Optimización del proceso logístico',
  description: 'Descripción del reto',
  business_process: 'Logística',
  status: 'OPEN',
  difficulty_level: 'INTERMEDIATE',
  modality: 'HYBRID',
  min_semester: 7,
  economic_sector: 'Comercio',
  required_skills: ['Vue'],
  knowledge_areas: ['Desarrollo web'],
  created_at: '2026-11-12T12:00:00Z',
  updated_at: '2026-11-12T12:00:00Z',
}

const UModalStub = {
  name: 'UModal',
  props: ['open', 'title', 'description', 'dismissible', 'close'],
  emits: ['update:open'],
  template: `
    <section v-if="open" role="dialog" :aria-label="title">
      <slot name="body" />
      <slot name="footer" />
    </section>
  `,
}

const UTextareaStub = {
  name: 'UTextarea',
  inheritAttrs: false,
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template: `
    <textarea
      v-bind="$attrs"
      :value="modelValue"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
}

function createWrapper(overrides: Partial<{ challenge: Challenge | null, isOpen: boolean }> = {}) {
  return mount(ChallengeClosureModal, {
    props: {
      challenge,
      isOpen: true,
      ...overrides,
    },
    global: {
      stubs: {
        UModal: UModalStub,
        UTextarea: UTextareaStub,
      },
    },
  })
}

describe('ChallengeClosureModal', () => {
  beforeEach(() => {
    closeChallenge.mockReset().mockResolvedValue({
      ...challenge,
      status: 'CLOSED',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps confirmation disabled until the trimmed reason has 15 characters', async () => {
    const wrapper = createWrapper()
    const confirmButton = wrapper.get('button[type="submit"]')

    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('0/15 caracteres mínimos')

    await wrapper.get('textarea').setValue('12345678901234')
    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('14/15 caracteres mínimos')

    await wrapper.get('textarea').setValue(' 123456789012345 ')
    expect(confirmButton.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('15/15 caracteres mínimos')
  })

  it('closes the challenge with the normalized reason and emits the result', async () => {
    const wrapper = createWrapper()
    const closedChallenge = { ...challenge, status: 'CLOSED' as const }
    closeChallenge.mockResolvedValueOnce(closedChallenge)

    await wrapper.get('textarea').setValue('  La convocatoria ya finalizó.  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(closeChallenge).toHaveBeenCalledWith('challenge-1', {
      reason: 'La convocatoria ya finalizó.',
    })
    expect(wrapper.emitted('closed')).toEqual([[closedChallenge]])
    expect(wrapper.emitted('update:isOpen')).toContainEqual([false])
  })

  it('shows the API error and keeps the modal open when closure fails', async () => {
    closeChallenge.mockRejectedValueOnce({
      data: { detail: 'El reto ya se encuentra cerrado.' },
    })
    const wrapper = createWrapper()

    await wrapper.get('textarea').setValue('La convocatoria ya finalizó.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'El reto ya se encuentra cerrado.',
    )
    expect(wrapper.emitted('closed')).toBeUndefined()
    expect(wrapper.emitted('update:isOpen')).toBeUndefined()
  })

  it('allows cancellation without calling the closure service', async () => {
    const wrapper = createWrapper()

    await wrapper.get('button[type="button"]').trigger('click')

    expect(closeChallenge).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:isOpen')).toEqual([[false]])
  })
})
