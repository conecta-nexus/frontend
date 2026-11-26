import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import ChallengeDetailPage from '~/pages/challenges/[id].vue'
import type { PublicChallengeDetail } from '~/types/challenge'
import { formatApplicationError } from '~/composables/useApplications'
import SafeRichTextContent from '~/components/challenges/SafeRichTextContent.vue'

const getCatalogChallenge = vi.fn()
const apiFetch = vi.fn()
const fetchProfile = vi.fn()
const fetchConsent = vi.fn()
const initSession = vi.fn()
const routerPush = vi.fn()
const addToast = vi.fn()

const isAuthenticated = ref(false)
const userRole = ref<'STUDENT' | 'COMPANY' | 'ADMIN' | null>(null)
const user = ref<{ id: string, email: string, role: 'STUDENT' | 'COMPANY' | 'ADMIN' } | null>(null)
const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const studentProfile = ref<{ user_id: string, current_semester: number } | null>(null)
const consent = ref<{ user_id: string, is_accepted: boolean } | null>(null)
const studentId = '11111111-1111-4111-8111-111111111111'
const otherStudentId = '22222222-2222-4222-8222-222222222222'

function authenticateStudent(semester = 8) {
  isAuthenticated.value = true
  userRole.value = 'STUDENT'
  accessToken.value = 'synthetic-session'
  user.value = { id: studentId, email: 'student@example.test', role: 'STUDENT' }
  studentProfile.value = { user_id: studentId, current_semester: semester }
  consent.value = { user_id: studentId, is_accepted: true }
}

const route = reactive({
  params: { id: 'challenge-1' },
  fullPath: '/challenges/challenge-1',
})

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({ getCatalogChallenge }),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated,
    userRole,
    user,
    accessToken,
    refreshToken,
    studentProfile,
    consent,
    initSession,
    fetchProfile,
    fetchConsent,
  }),
}))

const challenge: PublicChallengeDetail = {
  id: 'challenge-1',
  company_id: 'company-1',
  company_name: 'Soluciones Tecnológicas del Oriente S.A.S.',
  title: 'Automatización logística con analítica predictiva',
  description: '## Objetivo\n\nDiseñar una solución para **anticipar necesidades** de inventario.\n\n- Integración API REST\n- Panel analítico',
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

const UIconStub = {
  name: 'UIcon',
  props: ['name'],
  template: '<span :data-icon="name" class="u-icon-stub" />',
}

const UModalStub = {
  name: 'UModal',
  props: ['open', 'title', 'description', 'dismissible', 'close', 'ui'],
  emits: ['update:open'],
  template: `
    <section v-if="open" role="dialog" :aria-label="title" data-testid="application-modal">
      <header>
        <h2>{{ title }}</h2>
        <button type="button" data-testid="close-application-modal" @click="$emit('update:open', false)">Cerrar</button>
      </header>
      <div><slot name="body" /></div>
      <footer><slot name="footer" /></footer>
    </section>
  `,
}

let activeWrapper: ReturnType<typeof mount> | null = null

function createWrapper() {
  activeWrapper?.unmount()
  activeWrapper = mount(ChallengeDetailPage, {
    global: {
      stubs: {
        NuxtLink: NuxtLinkStub,
        AttachmentList: AttachmentListStub,
        UIcon: UIconStub,
        UModal: UModalStub,
      },
    },
  })
  return activeWrapper
}

describe('safeRichText sanitizer', () => {
  it('renders Markdown formatting, nested lists, and preserves generics in code while neutralizing XSS vectors (B-03)', () => {
    const dirty = [
      '## Contexto real',
      'Texto con **énfasis**, _cursiva_, `List<String> users`, [enlace seguro](https://ufps.edu.co), [no https](http://insecure.test), [creds](https://user:pass@evil.test/secret) y [xss](javascript:alert(1)).',
      '1. Paso principal\n  - Subpunto **técnico** con `Map<UUID, User>`\n  - Subpunto con [enlace](https://docs.ufps.edu.co/guia)',
      '```java\nList<String> users = getUsers();\n<script>literalInCode()</script>\n```',
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<div onclick="alert(2)">peligroso</div>',
      '<svg onload="alert(3)"></svg>',
      '<iframe src="https://evil.test"></iframe>',
      '<a href="data:text/html,<script>alert(1)</script>">malicioso</a>',
    ].join('\n\n')

    const richText = mount(SafeRichTextContent, { props: { content: dirty } })
    const html = richText.html()

    expect(html).toContain('<h3')
    expect(html).toContain('Contexto real')
    expect(html).toContain('<strong')
    expect(html).toContain('<em')
    expect(html).toContain('List&lt;String&gt; users')
    expect(html).toContain('Map&lt;UUID, User&gt;')
    expect(html).toContain('<pre')
    expect(html).toContain('href="https://ufps.edu.co/"')
    expect(html).toContain('href="https://docs.ufps.edu.co/guia"')
    expect(html).toContain('<ol')
    expect(html).toContain('<ul')
    expect(html).not.toContain('http://insecure.test')
    expect(html).not.toContain('user:pass@')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;literalInCode()&lt;/script&gt;')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('onerror=')
    expect(html).not.toContain('onclick=')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('data:text/html')
    richText.unmount()
  })
})

describe('Public challenge detail page redesign', () => {
  beforeEach(() => {
    route.params.id = 'challenge-1'
    route.fullPath = '/challenges/challenge-1'
    isAuthenticated.value = false
    userRole.value = null
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    studentProfile.value = null
    consent.value = null

    getCatalogChallenge.mockReset().mockResolvedValue({ ...challenge })
    apiFetch.mockReset()
    initSession.mockReset().mockResolvedValue(true)
    fetchProfile.mockReset().mockResolvedValue(null)
    fetchConsent.mockReset().mockResolvedValue(null)
    routerPush.mockReset()
    addToast.mockReset()

    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => ({ push: routerPush }))
    vi.stubGlobal('useToast', () => ({ add: addToast }))
    vi.stubGlobal('useHead', vi.fn())
    vi.stubGlobal('useApi', () => ({ apiFetch }))
  })

  afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = null
    vi.unstubAllGlobals()
  })

  it('loads and renders the privacy-safe detail, Law 1581 privacy notice, structured Markdown, and read-only attachments', async () => {
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

    expect(getCatalogChallenge).toHaveBeenCalledWith('challenge-1', expect.any(AbortSignal))
    expect(wrapper.text()).toContain(challenge.title)
    expect(wrapper.text()).toContain('Soluciones Tecnológicas del Oriente S.A.S.')
    expect(wrapper.get('[data-testid="challenge-description-content"]').html()).toContain('anticipar necesidades')
    expect(wrapper.get('[data-testid="challenge-description-content"]').html()).toContain('<ul')
    expect(wrapper.text()).toContain(challenge.business_process)
    expect(wrapper.text()).toContain('#Vue')
    expect(wrapper.text()).toContain('Analítica de Datos')
    expect(wrapper.text()).toContain('Híbrido')
    expect(wrapper.text()).toContain('Intermedio')
    expect(wrapper.text()).toContain('Creado el 12 de noviembre de 2026')
    expect(wrapper.get('[data-testid="law-1581-privacy-card"]').text()).toContain(
      'Los datos de contacto corporativos están protegidos por la Ley 1581 y se revelarán mutuamente cuando la empresa acepte tu postulación académica.',
    )

    // Private contact details must never leak
    expect(wrapper.text()).not.toContain('Contacto Privado')
    expect(wrapper.text()).not.toContain('privado@empresa.com')
    expect(wrapper.text()).not.toContain('+57 300 000 0000')
    expect(wrapper.html()).not.toContain('privado@empresa.com')

    const attachmentList = wrapper.getComponent(AttachmentListStub)
    expect(attachmentList.props('attachments')).toEqual(challenge.attachments)
    expect(attachmentList.props('canDelete')).toBe(false)
  })

  it('uses "Empresa sin nombre público" fallback when company_name is absent and renders real SafeRichTextContent code blocks without stripping generics (B-03, B-06)', async () => {
    getCatalogChallenge.mockResolvedValueOnce({
      ...challenge,
      company_name: undefined,
      description: '## Stack\n\nSoporte para `List<String> users`.\n\n```\n<div onclick="x">List<String></div>\n```\n\n<img src="x" onerror="alert(1)">',
    })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="challenge-hero"]').text()).toContain('Empresa sin nombre público')
    expect(wrapper.get('[data-testid="challenge-hero"]').text()).not.toContain('Empresa Aliada UFPS')
    const descEl = wrapper.get('[data-testid="challenge-description-content"]')
    expect(descEl.text()).toContain('List<String> users')
    expect(descEl.find('pre code').text()).toContain('<div onclick="x">List<String></div>')
    expect(descEl.find('img').exists()).toBe(false)
    expect(wrapper.get('[data-testid="challenge-detail-grid"]').classes()).toContain(
      'lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]',
    )
  })

  it('renders 404/non-OPEN/invalid ID fallback cleanly without showing CTA', async () => {
    getCatalogChallenge.mockRejectedValueOnce({ status: 404 })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="challenge-not-found"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Reto no disponible')
    expect(wrapper.find('[data-testid="apply-challenge"]').exists()).toBe(false)

    // Invalid UUID (422 from FastAPI) also renders unavailable fallback
    getCatalogChallenge.mockRejectedValueOnce({ status: 422 })
    route.params.id = 'not-a-valid-uuid'
    await flushPromises()
    expect(wrapper.find('[data-testid="challenge-not-found"]').exists()).toBe(true)
  })

  it('prevents stale route switch responses from overwriting the latest challenge', async () => {
    let resolveFirst: ((value: PublicChallengeDetail) => void) | undefined
    getCatalogChallenge
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce({
        ...challenge,
        id: 'challenge-2',
        title: 'Segundo reto más reciente',
      })

    const wrapper = createWrapper()
    route.params.id = 'challenge-2'
    route.fullPath = '/challenges/challenge-2'
    await flushPromises()

    expect(wrapper.text()).toContain('Segundo reto más reciente')

    // First delayed promise resolves late -> must be ignored cleanly
    resolveFirst?.({
      ...challenge,
      id: 'challenge-1',
      title: 'Primer reto obsoleto',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Segundo reto más reciente')
    expect(wrapper.text()).not.toContain('Primer reto obsoleto')
  })

  it('shows a recoverable error and retries the request', async () => {
    getCatalogChallenge
      .mockRejectedValueOnce(new Error('Gateway unavailable'))
      .mockResolvedValueOnce({ ...challenge })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="challenge-load-error"]').text()).toContain('Gateway unavailable')
    await wrapper.get('[data-testid="challenge-load-error"] button').trigger('click')
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

  it('disables application CTA for company accounts with the required Spanish tooltip and blocks clicks', async () => {
    isAuthenticated.value = true
    userRole.value = 'COMPANY'
    user.value = { id: otherStudentId, email: 'company@example.test', role: 'COMPANY' }
    accessToken.value = 'synthetic-company-session'
    const wrapper = createWrapper()
    await flushPromises()

    const applyButton = wrapper.get('[data-testid="apply-challenge"]')
    expect(applyButton.attributes('disabled')).toBeDefined()
    expect(applyButton.attributes('title')).toBe('Solo los estudiantes pueden postularse a los retos.')
    expect(wrapper.get('[data-testid="company-cta-tooltip"]').text()).toBe(
      'Solo los estudiantes pueden postularse a los retos.',
    )

    await applyButton.trigger('click')
    expect(routerPush).not.toHaveBeenCalled()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('blocks ineligible students (semester < 6 or missing consent) with clear guidance', async () => {
    authenticateStudent(4)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="student-ineligible-banner"]').text()).toContain('6.º a 10.º semestre')
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()
  })

  it('opens the application modal for eligible students, validates 50-char minimum, submits to POST /applications/, and handles 409 duplicate cleanly', async () => {
    authenticateStudent()

    apiFetch
      .mockResolvedValueOnce({
        id: 'app-uuid-1',
        student_id: studentId,
        challenge_id: 'challenge-1',
        motivation_letter: 'A'.repeat(60),
        status: 'PENDING',
        created_at: '2026-11-25T19:00:00Z',
        updated_at: '2026-11-25T19:00:00Z',
      })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="application-modal"]').exists()).toBe(true)
    const submitBtn = wrapper.get('[data-testid="submit-application-btn"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()

    const validMotivation = 'Tengo sólida experiencia con Vue, Python y SQL aplicando arquitectura moderna en proyectos UFPS.'
    await wrapper.get('[data-testid="application-motivation-input"]').setValue(validMotivation)
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await wrapper.get('#challenge-application-form').trigger('submit')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith('/applications/', {
      method: 'POST',
      body: {
        challenge_id: 'challenge-1',
        motivation_letter: validMotivation,
      },
    })
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Postulación enviada correctamente',
      color: 'success',
    }))
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Postulación enviada')
  })

  it.each([
    ['ASCII 49', 'A', 49, false],
    ['ASCII 50', 'A', 50, true],
    ['ASCII 2000', 'A', 2000, true],
    ['ASCII 2001', 'A', 2001, false],
    ['supplementary 25', '🙂', 25, false],
    ['supplementary 49', '🙂', 49, false],
    ['supplementary 50', '🙂', 50, true],
    ['supplementary 2000', '🙂', 2000, true],
    ['supplementary 2001', '🙂', 2001, false],
  ] as const)('validates and submits the letter by code point (%s, B-01)', async (_label, character, count, valid) => {
    authenticateStudent()
    apiFetch.mockRejectedValueOnce({ status: 502 })
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')

    const letter = character.repeat(count)
    const textarea = wrapper.get<HTMLTextAreaElement>('[data-testid="application-motivation-input"]')
    await textarea.setValue(letter)
    expect(textarea.element.value).toBe(letter)
    expect(wrapper.get('[data-testid="application-char-counter"]').text()).toBe(
      count < 50 ? `${count}/50 caracteres mínimos` : `${count}/2000 caracteres`,
    )
    expect(wrapper.get<HTMLButtonElement>('[data-testid="submit-application-btn"]').element.disabled).toBe(!valid)
    if (count > 2000) expect(wrapper.text()).toContain('La carta de motivación no puede superar 2000 caracteres.')

    // A direct submit event must also be rejected for an invalid letter.
    await wrapper.get('#challenge-application-form').trigger('submit')
    await flushPromises()
    if (valid) {
      expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/applications/', {
        method: 'POST',
        body: { challenge_id: 'challenge-1', motivation_letter: letter },
      })
    } else {
      expect(apiFetch).not.toHaveBeenCalled()
    }
  })

  it.each([
    ['mixed text with combining marks', 'Aé🙂e\u0301'.repeat(10), '\u0085\u001C\u00A0', '\u2003\u001F', 50],
    ['a non-whitespace BOM and mixed text', '\uFEFF' + 'Aé🙂e\u0301'.repeat(9) + ' é🙂A', ' \t', '\u00A0 ', 50],
    ['a supplementary letter at the limit', '🙂'.repeat(2000), ' \t', '\u2003 ', 2000],
  ] as const)('preserves editing and sends the Python-trimmed payload for %s (B-01)', async (_label, normalized, start, end, count) => {
    authenticateStudent()
    apiFetch.mockRejectedValueOnce({ status: 502 })
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')

    const textarea = wrapper.get<HTMLTextAreaElement>('[data-testid="application-motivation-input"]')
    const raw = start + normalized + end
    await textarea.setValue(raw)
    expect(textarea.element.value).toBe(raw)
    expect(wrapper.get('[data-testid="application-char-counter"]').text()).toBe(`${count}/2000 caracteres`)
    expect(wrapper.get<HTMLButtonElement>('[data-testid="submit-application-btn"]').element.disabled).toBe(false)
    await wrapper.get('#challenge-application-form').trigger('submit')
    await flushPromises()
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/applications/', {
      method: 'POST',
      body: { challenge_id: 'challenge-1', motivation_letter: normalized },
    })
  })

  it('does not impose a native UTF-16 editing limit (B-01)', async () => {
    authenticateStudent()
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    expect(wrapper.get('[data-testid="application-motivation-input"]').attributes('maxlength')).toBeUndefined()
  })

  it('displays server 409 duplicate application error inside the modal cleanly', async () => {
    authenticateStudent()

    apiFetch.mockRejectedValueOnce({ status: 409 })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    await wrapper.get('[data-testid="application-motivation-input"]').setValue(
      'Cuento con experiencia práctica en analítica predictiva e integración de microservicios.',
    )
    await wrapper.get('#challenge-application-form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="application-submit-error"]').text()).toContain(
      'Ya enviaste una postulación para este reto.',
    )
    expect(wrapper.get('[data-testid="submit-application-btn"]').attributes('disabled')).toBeDefined()
    await wrapper.get('#challenge-application-form').trigger('submit')
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(addToast).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Postulación enviada')
    expect(wrapper.get('[data-testid="apply-challenge-mobile"]').text()).toContain('Postulado')
    await wrapper.get('[data-testid="close-application-modal"]').trigger('click')
    expect(wrapper.find('[data-testid="application-modal"]').exists()).toBe(false)
  })

  it('renders the public detail while the student profile is still loading', async () => {
    authenticateStudent()
    studentProfile.value = null

    let finishProfile!: () => void
    fetchProfile.mockImplementationOnce(() => new Promise<typeof studentProfile.value>((resolve) => {
      finishProfile = () => {
        studentProfile.value = { user_id: studentId, current_semester: 8 }
        resolve(studentProfile.value)
      }
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="challenge-hero"]').text()).toContain(challenge.title)
    const cta = wrapper.get<HTMLButtonElement>('[data-testid="apply-challenge"]')
    expect(cta.element.disabled).toBe(true)
    expect(cta.text()).toContain('Verificando elegibilidad')

    finishProfile()
    await flushPromises()
    expect(cta.element.disabled).toBe(false)
  })

  it('restores student session via initSession when reloading the public detail route with a refresh cookie', async () => {
    isAuthenticated.value = true
    refreshToken.value = 'refresh-cookie'
    accessToken.value = null
    userRole.value = null
    initSession.mockImplementationOnce(async () => {
      authenticateStudent()
      return true
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(initSession).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Postularme a este reto')
  })

  it('enforces strict student eligibility matrix: 6-10 semesters allowed, missing/error profile or consent disabled with recovery, non-student roles disabled (B-01)', async () => {
    // 1. Missing profile & consent must NOT enable CTA, yet challenge detail renders cleanly with recovery action
    authenticateStudent()
    studentProfile.value = null
    consent.value = null

    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.get('[data-testid="challenge-hero"]').text()).toContain(challenge.title)
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="student-ineligible-banner"]').exists()).toBe(true)

    // Recovery succeeds when profile & consent load cleanly for matching user_id
    fetchProfile.mockImplementationOnce(async () => {
      studentProfile.value = { user_id: studentId, current_semester: 6 }
      return studentProfile.value
    })
    fetchConsent.mockImplementationOnce(async () => {
      consent.value = { user_id: studentId, is_accepted: true }
      return consent.value
    })
    await wrapper.get('[data-testid="retry-eligibility-btn"]').trigger('click')
    await flushPromises()
    // Semester 6 on challenge with min_semester=7 is eligible (range 6-10) and keeps the published minimum visible
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Semestre mínimo: 7.º semestre')

    // Semester 10 is eligible
    studentProfile.value = { user_id: studentId, current_semester: 10 }
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeUndefined()

    // Semester 5 and non-integer semester are blocked
    studentProfile.value = { user_id: studentId, current_semester: 5 }
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()

    studentProfile.value = { user_id: studentId, current_semester: 7.5 }
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()

    // Rejected consent blocks CTA
    studentProfile.value = { user_id: studentId, current_semester: 8 }
    consent.value = { user_id: studentId, is_accepted: false }
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()

    // Mismatched profile user_id blocks CTA
    consent.value = { user_id: studentId, is_accepted: true }
    studentProfile.value = { user_id: otherStudentId, current_semester: 8 }
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()

    // ADMIN role is blocked cleanly
    userRole.value = 'ADMIN'
    user.value = { id: 'admin-1', email: 'admin@ufps.edu.co', role: 'ADMIN' }
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="company-cta-tooltip"]').text()).toBe(
      'Solo los estudiantes pueden postularse a los retos.',
    )
  })

  it('isolates in-flight applications against route switch, account change, logout, double submit, and preserves letter on 502/503 (B-02)', async () => {
    isAuthenticated.value = true
    userRole.value = 'STUDENT'
    user.value = { id: studentId, email: 'a@ufps.edu.co', role: 'STUDENT' }
    accessToken.value = 'tok-a'
    studentProfile.value = { user_id: studentId, current_semester: 8 }
    consent.value = { user_id: studentId, is_accepted: true }

    let resolveFirstPost: ((v: unknown) => void) | undefined
    let rejectRecoverable: ((e: unknown) => void) | undefined
    apiFetch
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstPost = resolve }))
      .mockImplementationOnce(() => new Promise((_res, rej) => { rejectRecoverable = rej }))
      .mockResolvedValueOnce({
        id: 'app-retry-ok',
        student_id: otherStudentId,
        challenge_id: 'challenge-2',
        motivation_letter: 'A'.repeat(60),
        status: 'PENDING',
        created_at: '2026-11-25T20:00:00Z',
        updated_at: '2026-11-25T20:00:00Z',
      })

    getCatalogChallenge
      .mockResolvedValueOnce({ ...challenge, id: 'challenge-1' })
      .mockResolvedValueOnce({ ...challenge, id: 'challenge-2', title: 'Segundo reto abierto' })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    const letter = 'Carta de motivación suficientemente extensa para demostrar la validación completa del formulario.'
    await wrapper.get('[data-testid="application-motivation-input"]').setValue(letter)

    // Double submit triggers only ONE network request
    const form = wrapper.get('#challenge-application-form')
    void form.trigger('submit')
    void form.trigger('submit')
    await flushPromises()
    expect(apiFetch).toHaveBeenCalledTimes(1)

    // Switch challenge & user while first POST is still pending -> letter cleared, stale 201 ignored
    route.params.id = 'challenge-2'
    route.fullPath = '/challenges/challenge-2'
    user.value = { id: otherStudentId, email: 'b@ufps.edu.co', role: 'STUDENT' }
    accessToken.value = 'tok-b'
    studentProfile.value = { user_id: otherStudentId, current_semester: 9 }
    consent.value = { user_id: otherStudentId, is_accepted: true }
    await flushPromises()

    resolveFirstPost?.({
      id: 'app-stale-1',
      student_id: studentId,
      challenge_id: 'challenge-1',
      motivation_letter: letter,
      status: 'PENDING',
      created_at: '2026-11-25T20:00:00Z',
      updated_at: '2026-11-25T20:00:00Z',
    })
    await flushPromises()

    // Challenge 2 for Student B must NOT be marked applied and no toast may fire
    expect(addToast).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Postularme a este reto')

    // Open modal on Challenge 2 as Student B, hit 502 recoverable -> letter MUST stay intact & retry succeeds
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    const letterB = 'Carta nueva del estudiante B con contenido válido y específico para el segundo reto.'
    const textarea = wrapper.get('[data-testid="application-motivation-input"]')
    await textarea.setValue(letterB)
    await wrapper.get('#challenge-application-form').trigger('submit')

    rejectRecoverable?.({ status: 502 })
    await flushPromises()
    expect(wrapper.get('[data-testid="application-submit-error"]').text()).toContain('no está disponible temporalmente')
    expect((wrapper.get('[data-testid="application-motivation-input"]').element as HTMLTextAreaElement).value).toBe(letterB)
    expect(addToast).not.toHaveBeenCalled()

    await wrapper.get('#challenge-application-form').trigger('submit')
    await flushPromises()
    expect(addToast).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Postulación enviada')
  })

  it.each([
    ['los permisos cambian a empresa', () => { userRole.value = 'COMPANY' }],
    ['se retira el consentimiento', () => { consent.value = { user_id: studentId, is_accepted: false } }],
    ['cambia el semestre', () => { studentProfile.value = { user_id: studentId, current_semester: 11 } }],
    ['se carga el perfil de otra persona', () => { studentProfile.value = { user_id: otherStudentId, current_semester: 8 } }],
    ['se carga el consentimiento de otra persona', () => { consent.value = { user_id: otherStudentId, is_accepted: true } }],
  ])('bloquea el formulario abierto cuando %s', async (_scenario, revoke) => {
    authenticateStudent()
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    await wrapper.get('[data-testid="application-motivation-input"]').setValue('A'.repeat(60))
    expect(wrapper.get('[data-testid="submit-application-btn"]').attributes('disabled')).toBeUndefined()

    revoke()
    await wrapper.get('#challenge-application-form').trigger('submit')
    expect(apiFetch).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="submit-application-btn"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="application-submit-error"]').text()).toContain('Tu elegibilidad cambió')
  })

  it('rejects apparent sessions that lack the authenticated user UUID', async () => {
    authenticateStudent()
    user.value = null
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.get('[data-testid="challenge-hero"]').text()).toContain(challenge.title)
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="student-ineligible-banner"]').text()).toContain('confirmar tu identidad')
    expect(wrapper.find('[data-testid="retry-eligibility-btn"]').exists()).toBe(true)
  })

  it('cannot reuse a cached profile if the forced profile refresh fails', async () => {
    authenticateStudent()
    studentProfile.value = null
    const wrapper = createWrapper()
    await flushPromises()

    fetchProfile.mockImplementationOnce(async () => {
      studentProfile.value = { user_id: studentId, current_semester: 8 }
      return null
    })
    fetchConsent.mockResolvedValueOnce(consent.value)
    await wrapper.get('[data-testid="retry-eligibility-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="student-ineligible-banner"]').text()).toContain('actualizar tu elegibilidad')

    fetchProfile.mockResolvedValueOnce(studentProfile.value)
    fetchConsent.mockResolvedValueOnce(consent.value)
    await wrapper.get('[data-testid="retry-eligibility-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="apply-challenge"]').attributes('disabled')).toBeUndefined()
  })

  it.each([404, 422])('stops attempts on both layouts after a terminal %s', async (status) => {
    authenticateStudent()
    apiFetch.mockRejectedValueOnce({ status })
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    await wrapper.get('[data-testid="application-motivation-input"]').setValue('A'.repeat(60))
    const form = wrapper.get('#challenge-application-form')
    await form.trigger('submit')
    await flushPromises()
    await form.trigger('submit')
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(addToast).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="application-submit-error"]').text()).toContain('reto')
    expect(wrapper.get('[data-testid="submit-application-btn"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Reto no disponible')
    expect(wrapper.get('[data-testid="apply-challenge-mobile"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="close-application-modal"]').trigger('click')
    expect(wrapper.find('#challenge-application-form').exists()).toBe(false)
  })

  it('does not submit the previous account form during the same update cycle', async () => {
    authenticateStudent()
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    await wrapper.get('[data-testid="application-motivation-input"]').setValue('A'.repeat(60))
    const previousForm = wrapper.get('#challenge-application-form')

    user.value = { id: otherStudentId, email: 'other@example.test', role: 'STUDENT' }
    accessToken.value = 'other-synthetic-session'
    studentProfile.value = { user_id: otherStudentId, current_semester: 8 }
    consent.value = { user_id: otherStudentId, is_accepted: true }
    await previousForm.trigger('submit')
    await flushPromises()

    expect(apiFetch).not.toHaveBeenCalled()
    expect(wrapper.find('#challenge-application-form').exists()).toBe(false)
  })

  it('closes the modal on logout and ignores a late result for that account', async () => {
    authenticateStudent()
    let rejectPost!: (error: unknown) => void
    apiFetch.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectPost = reject }))
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="apply-challenge"]').trigger('click')
    await wrapper.get('[data-testid="application-motivation-input"]').setValue('A'.repeat(60))
    await wrapper.get('#challenge-application-form').trigger('submit')
    isAuthenticated.value = false
    accessToken.value = null
    userRole.value = null
    user.value = null
    await flushPromises()
    rejectPost({ status: 409 })
    await flushPromises()
    expect(wrapper.find('#challenge-application-form').exists()).toBe(false)
    expect(wrapper.get('[data-testid="apply-challenge"]').text()).toContain('Inicia sesión')
    expect(addToast).not.toHaveBeenCalled()
  })

  it('handles legacy HTML/blockquote/heading formatting, HTTP status error formatters, and read-only attachment edge cases cleanly', async () => {
    const legacyHtml = [
      '<h1>Título legacy</h1>',
      '<h4>Subtítulo</h4>',
      '<blockquote>Cita importante con <b>negrita</b> y <i>cursiva</i></blockquote>',
      '<pre><code>Array&lt;String&gt; items;</code></pre>',
      '<p>Línea 1<br>Línea 2 con <a href="https://ufps.edu.co">UFPS</a></p>',
    ].join('\n')

    const richText = mount(SafeRichTextContent, { props: { content: legacyHtml } })
    const rendered = richText.html()
    expect(rendered).toContain('<h3')
    expect(rendered).toContain('<h4')
    expect(rendered).toContain('<blockquote')
    expect(rendered).toContain('Array&lt;String&gt; items;')
    expect(rendered).toContain('href="https://ufps.edu.co/"')
    richText.unmount()

    expect(formatApplicationError({ status: 401 })).toContain('sesión ha expirado')
    expect(formatApplicationError({ status: 403 })).toContain('Solo los estudiantes')
    expect(formatApplicationError({ status: 404 })).toContain('ya no se encuentra disponible')
    expect(formatApplicationError({ status: 422 })).toContain('no se encuentra abierto')
    expect(formatApplicationError({ status: 503 })).toContain('no está disponible temporalmente')
    expect(formatApplicationError(new Error('Fallo de red'))).toContain('Fallo de red')

    // Challenge without attachments renders cleanly
    getCatalogChallenge.mockResolvedValueOnce({
      ...challenge,
      attachments: [],
    })
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.getComponent(AttachmentListStub).props('attachments')).toEqual([])
  })
})
