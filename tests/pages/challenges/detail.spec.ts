import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import ChallengeDetailPage from '~/pages/challenges/[id].vue'
import type { PublicChallengeDetail } from '~/types/challenge'

const getCatalogChallenge = vi.fn()
const routerPush = vi.fn()
const addToast = vi.fn()
const isAuthenticated = ref(false)
const userRole = ref<'STUDENT' | 'COMPANY' | 'ADMIN' | null>(null)
const route = reactive({
  params: { id: 'challenge-1' },
  fullPath: '/challenges/challenge-1',
})

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({ getCatalogChallenge }),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ isAuthenticated, userRole }),
}))

const challenge: PublicChallengeDetail = {
  id: 'challenge-1',
  company_id: 'company-1',
  company_name: 'Soluciones Tecnológicas del Oriente S.A.S.',
  title: 'Automatización logística con analítica predictiva',
  description: 'Diseñar una solución para anticipar necesidades de inventario.',
  business_process: 'Cadena de suministro y gestión de inventarios.',
  status: 'OPEN',
  difficulty_level: 'INTERMEDIATE',
  modality: 'HYBRID',
  min_semester: 7,
  economic_sector: 'Tecnología y Software',
  required_skills: ['Vue', 'Python', 'SQL'],
  knowledge_areas: ['Ingeniería de Software', 'Analítica de Datos'],
  attachments: [
    {
      id: 'attachment-1',
      challenge_id: 'challenge-1',
      file_name: 'especificacion-tecnica.pdf',
      file_size_bytes: 2048,
      mime_type: 'application/pdf',
      download_url: 'https://storage.example.com/signed/file',
      created_at: '2026-11-12T12:00:00Z',
    },
  ],
  created_at: '2026-11-12T12:00:00Z',
  updated_at: '2026-11-12T12:00:00Z',
}

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
}

const AttachmentListStub = {
  name: 'AttachmentList',
  props: ['attachments', 'canDelete'],
  template: `
    <div data-testid="attachment-list">
      {{ attachments.length }} archivos · eliminar: {{ canDelete }}
    </div>
  `,
}

function createWrapper() {
  return mount(ChallengeDetailPage, {
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
        AttachmentList: AttachmentListStub,
      },
    },
  })
}

describe('Public challenge detail page', () => {
  beforeEach(() => {
    route.params.id = 'challenge-1'
    route.fullPath = '/challenges/challenge-1'
    isAuthenticated.value = false
    userRole.value = null
    getCatalogChallenge.mockReset().mockResolvedValue({ ...challenge })
    routerPush.mockReset()
    addToast.mockReset()

    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => ({ push: routerPush }))
    vi.stubGlobal('useToast', () => ({ add: addToast }))
    vi.stubGlobal('useHead', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads and renders the complete privacy-safe challenge projection', async () => {
    getCatalogChallenge.mockResolvedValueOnce(Object.assign(
      { ...challenge },
      {
        contact_name: 'Contacto Privado',
        contact_email: 'privado@empresa.com',
        contact_phone: '+57 300 000 0000',
      },
    ))
    const wrapper = createWrapper()
    await flushPromises()

    expect(getCatalogChallenge).toHaveBeenCalledWith('challenge-1')
    expect(wrapper.text()).toContain(challenge.title)
    expect(wrapper.text()).toContain('Soluciones Tecnológicas del Oriente S.A.S.')
    expect(wrapper.text()).toContain(challenge.description)
    expect(wrapper.text()).toContain(challenge.business_process)
    expect(wrapper.text()).toContain('#Vue')
    expect(wrapper.text()).toContain('Analítica de Datos')
    expect(wrapper.text()).toContain('Híbrido')
    expect(wrapper.text()).toContain('Intermedio')
    expect(wrapper.text()).toContain('12 de noviembre de 2026')
    expect(wrapper.text()).not.toContain('Contacto Privado')
    expect(wrapper.text()).not.toContain('privado@empresa.com')
    expect(wrapper.text()).not.toContain('+57 300 000 0000')

    const attachmentList = wrapper.getComponent(AttachmentListStub)
    expect(attachmentList.props('attachments')).toEqual(challenge.attachments)
    expect(attachmentList.props('canDelete')).toBe(false)
  })

  it('renders the 404 fallback for a missing or closed challenge', async () => {
    getCatalogChallenge.mockRejectedValueOnce({ status: 404 })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Reto no disponible')
    expect(wrapper.text()).toContain('fue cerrado o ya no está publicado')
    expect(wrapper.find('[data-testid="apply-challenge"]').exists()).toBe(false)
  })

  it('shows a recoverable error and retries the request', async () => {
    getCatalogChallenge
      .mockRejectedValueOnce(new Error('Gateway unavailable'))
      .mockResolvedValueOnce({ ...challenge })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Gateway unavailable')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(getCatalogChallenge).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain(challenge.title)
  })

  it('redirects anonymous users to login while preserving the return URL', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/auth/login',
      query: { redirect: '/challenges/challenge-1' },
    })
  })

  it('prevents company accounts from applying to a challenge', async () => {
    isAuthenticated.value = true
    userRole.value = 'COMPANY'
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')

    expect(routerPush).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Acción exclusiva para estudiantes',
      color: 'warning',
    }))
  })

  it('routes authenticated students to the application flow', async () => {
    isAuthenticated.value = true
    userRole.value = 'STUDENT'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain(
      'Postularme a este reto',
    )
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/applications/new',
      query: { challenge_id: 'challenge-1' },
    })
  })
})
