import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import NewChallengePage from '~/pages/challenges/new.vue'
import type { ChallengeCreatePayload } from '~/types/challenge'

const { createChallenge, getChallenge, publishChallenge } = vi.hoisted(() => ({
  createChallenge: vi.fn(),
  getChallenge: vi.fn(),
  publishChallenge: vi.fn(),
}))
vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({ createChallenge, getChallenge, publishChallenge }),
}))
vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ user: ref({ id: 'company-test' }) }),
}))

enableAutoUnmount(afterEach)

const navigate = vi.fn()
const toast = vi.fn()
const fields: ChallengeCreatePayload = {
  title: 'Optimización de inventarios',
  business_process: 'Gestión logística',
  description: '**Diagnóstico** de inventarios con trazabilidad mensual.',
  economic_sector: 'Comercio',
  modality: 'ON_SITE',
  difficulty_level: 'ADVANCED',
  min_semester: 8,
  required_skills: ['Vue'],
  knowledge_areas: ['Logística'],
  status: 'DRAFT',
}
const draft = { ...fields, id: 'saved-draft' }
const opened = { ...draft, status: 'OPEN' }

function mountPage() {
  return mount(NewChallengePage, {
    attachTo: document.body,
    global: {
      stubs: {
        NuxtLink: true,
        ChallengeForm: {
          name: 'ChallengeForm',
          props: ['busyAction', 'locked'],
          emits: ['submit'],
          template: '<div />',
        },
      },
    },
  })
}

describe('new company challenge page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useSeoMeta', vi.fn())
    vi.stubGlobal('useToast', () => ({ add: toast, remove: vi.fn() }))
    vi.stubGlobal('onBeforeRouteLeave', vi.fn())
    vi.stubGlobal('navigateTo', navigate)
    createChallenge.mockResolvedValue(draft)
    publishChallenge.mockResolvedValue(opened)
  })

  it('saves a draft and confirms only after the server responds', async () => {
    const wrapper = mountPage()
    wrapper.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', fields)
    expect(toast).not.toHaveBeenCalled()
    await flushPromises()
    expect(createChallenge).toHaveBeenCalledExactlyOnceWith(fields)
    expect(publishChallenge).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Borrador guardado' }))
    expect(navigate).toHaveBeenCalledWith('/challenges/manage')
  })

  it('persists a draft before publishing and ignores concurrent submissions', async () => {
    const wrapper = mountPage()
    const form = wrapper.getComponent({ name: 'ChallengeForm' })
    form.vm.$emit('submit', { ...fields, status: 'OPEN' })
    form.vm.$emit('submit', { ...fields, status: 'OPEN' })
    await flushPromises()
    expect(createChallenge).toHaveBeenCalledExactlyOnceWith(fields)
    expect(publishChallenge).toHaveBeenCalledExactlyOnceWith(draft.id)
    expect(createChallenge.mock.invocationCallOrder[0]).toBeLessThan(publishChallenge.mock.invocationCallOrder[0]!)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reto publicado' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/challenges/manage')
  })

  it('retries the persisted draft after failure without creating a duplicate', async () => {
    publishChallenge.mockRejectedValueOnce(new Error('Red no disponible'))
    getChallenge.mockResolvedValue(draft)
    const wrapper = mountPage()
    wrapper.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', { ...fields, status: 'OPEN' })
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('Se perdió la conexión al publicar')
    expect(wrapper.get('details').text()).toContain(draft.id)
    expect(toast).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()

    const retry = wrapper.findAll('button').find(button => button.text() === 'Verificar y reintentar publicación')!
    await retry.trigger('click')
    await flushPromises()
    expect(createChallenge).toHaveBeenCalledTimes(1)
    expect(publishChallenge.mock.calls).toEqual([[draft.id], [draft.id]])
    expect(getChallenge.mock.invocationCallOrder[1]).toBeLessThan(publishChallenge.mock.invocationCallOrder[1]!)
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/challenges/manage')
  })

  it('accepts an independently confirmed OPEN status when the publish response was lost', async () => {
    publishChallenge.mockRejectedValueOnce(new Error('Respuesta no disponible'))
    getChallenge.mockResolvedValue(opened)
    const wrapper = mountPage()
    wrapper.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', { ...fields, status: 'OPEN' })
    await flushPromises()
    expect(getChallenge).toHaveBeenCalledExactlyOnceWith(draft.id)
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reto publicado' }))
  })

  it('keeps the form after a failed create without attempting publication or confirming success', async () => {
    createChallenge.mockRejectedValueOnce({ statusCode: 422, data: { detail: [{ loc: ['body', 'title'], msg: 'http://localhost/secret' }] } })
    const wrapper = mountPage()
    wrapper.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', { ...fields, status: 'OPEN' })
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('Revisa estos campos e inténtalo de nuevo: título.')
    expect(wrapper.get('[role=alert]').text()).not.toContain('localhost')
    expect(wrapper.findComponent({ name: 'ChallengeForm' }).exists()).toBe(true)
    expect(wrapper.getComponent({ name: 'ChallengeForm' }).props('locked')).toBe(false)
    expect(publishChallenge).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })

  it('persists a recovery marker and never repeats an ambiguously completed create', async () => {
    createChallenge.mockRejectedValueOnce(new Error('[POST] http://localhost/internal Failed to fetch'))
    const first = mountPage()
    const submit = () => first.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', fields)
    submit()
    await flushPromises()
    expect(first.get('[role=alert]').text()).toContain('Se perdió la conexión al guardar')
    expect(document.activeElement).toBe(first.get('[role=alert]').element)
    expect(first.get('[role=alert]').text()).not.toContain('localhost')
    expect(first.text()).toContain('Guardado sin confirmar')
    submit()
    const revisited = mountPage()
    await flushPromises()
    expect(revisited.text()).toContain('Guardado sin confirmar')
    expect(revisited.getComponent({ name: 'ChallengeForm' }).props('locked')).toBe(true)
    revisited.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', fields)
    await flushPromises()
    expect(createChallenge).toHaveBeenCalledExactlyOnceWith(fields)
    expect(publishChallenge).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })

  it('checks a failed publication before retrying and accepts an already OPEN row', async () => {
    publishChallenge.mockRejectedValueOnce({ status: 503 })
    getChallenge.mockRejectedValueOnce(new Error()).mockResolvedValueOnce(opened)
    const wrapper = mountPage()
    wrapper.getComponent({ name: 'ChallengeForm' }).vm.$emit('submit', { ...fields, status: 'OPEN' })
    await flushPromises()
    const retry = wrapper.findAll('button').find(button => button.text() === 'Verificar y reintentar publicación')!
    await retry.trigger('click')
    await flushPromises()
    expect(publishChallenge).toHaveBeenCalledTimes(1)
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reto publicado' }))
  })
})
