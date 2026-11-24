import { EditorContent, type Editor } from '@tiptap/vue-3'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import ChallengeForm from '~/components/challenges/ChallengeForm.vue'
import type { ChallengeCreatePayload } from '~/types/challenge'

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ companyProfile: ref(null) }),
}))
enableAutoUnmount(afterEach)

const valid: Partial<ChallengeCreatePayload> = {
  title: 'Inventario de empresas',
  business_process: 'Gestión logística',
  description: '**Datos** de inventarios para analizar.',
  economic_sector: 'Comercio',
  modality: 'REMOTE',
  difficulty_level: 'INTERMEDIATE',
  min_semester: 7,
}

async function form(initialData: Partial<ChallengeCreatePayload> = valid) {
  const wrapper = mount(ChallengeForm, {
    attachTo: document.body,
    props: { initialData },
    global: { stubs: { ClientOnly: { template: '<slot />' } } },
  })
  await flushPromises()
  const editor = wrapper.getComponent(EditorContent).props('editor') as Editor
  await vi.waitFor(() => expect(editor.isInitialized).toBe(true))
  const publish = () => wrapper.findAll('button').find(button => button.text() === 'Publicar reto')!
  const draft = () => wrapper.findAll('button').find(button => button.text() === 'Guardar borrador')!
  return { wrapper, editor, publish, draft }
}

describe('ChallengeForm', () => {
  it.each([
    { field: '#challenge-title', values: [9, 10, 255, 256], validLengths: [10, 255] },
    { field: '#challenge-process', values: [4, 5, 255, 256], validLengths: [5, 255] },
    { field: '#challenge-sector', values: [0, 1, 100, 101], validLengths: [1, 100] },
  ])('validates the exact boundaries of $field and clears errors as the user corrects them', async ({ field, values, validLengths }) => {
    const { wrapper, publish } = await form()
    const input = wrapper.get(field)
    await input.setValue('x'.repeat(values[0]!))
    expect(input.attributes('aria-invalid')).toBe('false')
    await input.trigger('blur')
    for (const length of values) {
      await input.setValue('x'.repeat(length))
      const accepts = validLengths.includes(length)
      expect(input.attributes('aria-invalid')).toBe(String(!accepts))
      expect(input.classes().includes('border-red-500')).toBe(!accepts)
      expect(publish().attributes('aria-disabled') === 'true').toBe(!accepts)
    }
  })

  it('counts editor text, rejects formatting-only content, and serializes Markdown on submit', async () => {
    const { wrapper, editor, publish } = await form()
    const count = () => wrapper.get('#challenge-description-count')
    editor.commands.setContent('<p><strong>   </strong></p>')
    editor.emit('blur', { editor, event: new FocusEvent('blur') })
    await flushPromises()
    expect(count().text()).toContain('0 caracteres')
    expect(wrapper.get('#challenge-description-error').text()).toContain('30')
    expect(wrapper.get('.tiptap').attributes('aria-invalid')).toBe('true')
    editor.commands.setContent(`**${'x'.repeat(29)}**`, { contentType: 'markdown' })
    await flushPromises()
    expect(count().text()).toContain('29 caracteres')
    expect(count().classes()).not.toContain('text-emerald-700')
    editor.commands.setContent(`**${'x'.repeat(30)}**`, { contentType: 'markdown' })
    await flushPromises()
    expect(count().text()).toContain('30 caracteres')
    expect(count().classes()).toContain('text-emerald-700')
    expect(wrapper.find('#challenge-description-error').exists()).toBe(false)
    await publish().trigger('click')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual(expect.objectContaining({
      description: `**${'x'.repeat(30)}**`,
    }))
  })

  it('ignores whitespace and invalid semesters, enum values and submissions', async () => {
    const { wrapper, draft, publish } = await form({
      ...valid, title: '          ', modality: 'PRESENTIAL' as never, difficulty_level: 'UNKNOWN' as never, min_semester: 0,
    })
    expect(wrapper.findAll('[role=alert]')).toHaveLength(0)
    await draft().trigger('click')
    expect(wrapper.get('#challenge-title-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Selecciona una modalidad válida.')
    expect(wrapper.text()).toContain('Selecciona un nivel de dificultad válido.')
    expect(wrapper.text()).toContain('entre 6 y 10')
    expect(publish().attributes('aria-describedby')).toBe('publish-help')
    await publish().trigger('click')
    expect(wrapper.get('#publish-help').classes()).toContain('block')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it.each([
    ['Remoto', 'Básico', '6', 'REMOTE', 'BEGINNER'],
    ['Híbrido', 'Intermedio', '10', 'HYBRID', 'INTERMEDIATE'],
    ['Presencial', 'Avanzado', '8', 'ON_SITE', 'ADVANCED'],
  ])('emits the backend values for %s, %s and semester %s', async (mode, level, semester, modality, difficulty) => {
    const { wrapper, publish } = await form()
    for (const label of [mode, level, `Sem. ${semester}.º`]) {
      await wrapper.findAll('[role=radio]').find(button => button.text().includes(label!))!.trigger('click')
    }
    await publish().trigger('click')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual(expect.objectContaining({
      modality, difficulty_level: difficulty, min_semester: Number(semester), status: 'OPEN',
    }))
  })

  it('adds, deduplicates and removes independent skill and area chips', async () => {
    const { wrapper, draft } = await form()
    const skills = wrapper.get('#challenge-tags-skills')
    const areas = wrapper.get('#challenge-tags-areas')
    await skills.setValue('Vue, SQL, vue, , Docker')
    await skills.trigger('keydown', { key: 'Enter' })
    await areas.setValue('Datos, Logística, datos')
    await areas.trigger('keydown', { key: ',' })
    await wrapper.get('[aria-label="Eliminar habilidad SQL"]').trigger('click')
    await wrapper.get('[aria-label="Eliminar área Logística"]').trigger('click')
    await draft().trigger('click')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual(expect.objectContaining({
      required_skills: ['Vue', 'Docker'], knowledge_areas: ['Datos'],
    }))
  })

  it('preserves the form while locking editing and showing action-specific progress', async () => {
    const { wrapper, editor, draft, publish } = await form()
    await wrapper.setProps({ busyAction: 'DRAFT' })
    expect(wrapper.get('[role=status]').text()).toBe('Guardando el borrador…')
    expect(draft().attributes('disabled')).toBeDefined()
    expect(editor.isEditable).toBe(false)
    expect(wrapper.get('#challenge-title').element.closest('[inert]')).not.toBeNull()
    await wrapper.setProps({ busyAction: 'OPEN' })
    expect(wrapper.get('[role=status]').text()).toBe('Guardando el borrador para publicar…')
    await draft().trigger('click')
    await publish().trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.setProps({ busyAction: null })
    expect(editor.isEditable).toBe(true)
    expect((wrapper.get('#challenge-title').element as HTMLInputElement).value).toBe(valid.title)
    const button = publish().element as HTMLButtonElement
    button.click()
    button.click()
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })
})
