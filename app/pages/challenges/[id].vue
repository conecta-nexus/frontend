<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AttachmentList from '~/components/challenges/AttachmentList.vue'
import ChallengeApplicationModal from '~/components/challenges/ChallengeApplicationModal.vue'
import SafeRichTextContent from '~/components/challenges/SafeRichTextContent.vue'
import type { StudentApplicationResponse } from '~/composables/useApplications'
import { useAuth } from '~/composables/useAuth'
import { useChallenges } from '~/composables/useChallenges'
import type {
  ChallengeAttachment,
  DifficultyLevel,
  Modality,
  PublicChallengeDetail,
} from '~/types/challenge'
import { extractApiErrorMessage } from '~/utils/errors'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuth()
const { getCatalogChallenge } = useChallenges()

const isAuthenticated = computed(() => Boolean(auth.isAuthenticated?.value))
const userRole = computed(() => auth.userRole?.value ?? null)
const studentProfile = computed(() => auth.studentProfile?.value ?? null)
const consent = computed(() => auth.consent?.value ?? null)
const isSessionRestoring = computed(() =>
  Boolean(
    auth.isInitializing?.value ||
    (auth.refreshToken?.value && (!auth.accessToken?.value || !userRole.value)),
  ),
)

const activeUserKey = computed<string | null>(() => {
  const id = auth.user.value?.id
  return isAuthenticated.value && auth.accessToken.value
    && typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null
})

const challenge = ref<PublicChallengeDetail | null>(null)
const loading = ref(true)
const notFound = ref(false)
const pageError = ref<string | null>(null)
const applicationModalOpen = ref(false)
const unavailableApplicationChallenge = ref<string | null>(null)
const appliedChallengesByUser = ref<Record<string, Record<string, true>>>({})
const eligibilitySyncState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
let latestChallengeSeq = 0
let detailRequest: AbortController | undefined
let latestEligibilitySeq = 0

const COMPANY_TOOLTIP_TEXT = 'Solo los estudiantes pueden postularse a los retos.'

const challengeId = computed(() => {
  const id = route.params.id
  return Array.isArray(id) ? id[0] || '' : String(id || '')
})

const hasApplied = computed(() => {
  const userKey = activeUserKey.value
  const cId = challengeId.value
  if (!userKey || !cId) return false
  return Boolean(appliedChallengesByUser.value[userKey]?.[cId])
})

const companyDisplayName = computed(() => {
  const name = challenge.value?.company_name?.trim()
  return name || 'Empresa sin nombre público'
})

const attachments = computed<ChallengeAttachment[]>(
  () => challenge.value?.attachments || [],
)

const modalityLabels: Record<Modality, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ON_SITE: 'Presencial',
}

const difficultyMeta: Record<DifficultyLevel, { label: string, badgeClass: string }> = {
  BEGINNER: {
    label: 'Básico',
    badgeClass: 'border-emerald-700/40 bg-pastel-mint/70 text-neutral-900 dark:border-emerald-500/50 dark:bg-pastel-mint/20 dark:text-emerald-100',
  },
  INTERMEDIATE: {
    label: 'Intermedio',
    badgeClass: 'border-amber-700/40 bg-pastel-peach text-neutral-900 dark:border-amber-500/50 dark:bg-pastel-peach/20 dark:text-amber-100',
  },
  ADVANCED: {
    label: 'Avanzado',
    badgeClass: 'border-institutional-600/40 bg-institutional-100 text-institutional-800 dark:border-institutional-500/60 dark:bg-institutional-950/60 dark:text-institutional-200',
  },
}

const isNonStudentAuthenticated = computed(
  () => isAuthenticated.value && !isSessionRestoring.value && userRole.value !== null && userRole.value !== 'STUDENT',
)

const validStudentProfile = computed(() =>
  activeUserKey.value && studentProfile.value?.user_id === activeUserKey.value
    ? studentProfile.value
    : null,
)

const validConsent = computed(() =>
  activeUserKey.value && consent.value?.user_id === activeUserKey.value
    ? consent.value
    : null,
)

const isApplicationUnavailable = computed(() => unavailableApplicationChallenge.value === challengeId.value)

const isEligibilitySyncing = computed(() => {
  if (!isAuthenticated.value || isSessionRestoring.value) return false
  if (userRole.value !== 'STUDENT') return false
  if (eligibilitySyncState.value === 'loading') return true
  // Prevent enabling CTA on unverified null profile/consent before initial check settles
  return Boolean(activeUserKey.value) && eligibilitySyncState.value === 'idle' && (!validStudentProfile.value || !validConsent.value)
})

const studentEligibilityIssue = computed<{
  message: string
  recoverable: boolean
} | null>(() => {
  if (!isAuthenticated.value || isSessionRestoring.value || userRole.value !== 'STUDENT') {
    return null
  }
  if (isEligibilitySyncing.value) return null

  if (!activeUserKey.value) {
    return {
      message: 'No pudimos confirmar tu identidad. Reintenta la verificación o vuelve a iniciar sesión.',
      recoverable: true,
    }
  }

  if (eligibilitySyncState.value === 'error' && validStudentProfile.value && validConsent.value) {
    return {
      message: 'No pudimos actualizar tu elegibilidad. Reintenta la verificación antes de postularte.',
      recoverable: true,
    }
  }

  if (!validStudentProfile.value && !validConsent.value) {
    return {
      message: 'No pudimos verificar tu perfil estudiantil ni tu consentimiento de datos (Ley 1581). Completa tu perfil o reintenta la verificación.',
      recoverable: true,
    }
  }

  if (!validStudentProfile.value) {
    return {
      message: 'No pudimos verificar tu perfil académico estudiantil. Completa tu perfil en la plataforma o reintenta sincronizar.',
      recoverable: true,
    }
  }

  if (!validConsent.value) {
    return {
      message: 'No pudimos verificar tu consentimiento de tratamiento de datos (Ley 1581). Revísalo en tu perfil o reintenta sincronizar.',
      recoverable: true,
    }
  }

  if (!validConsent.value.is_accepted) {
    return {
      message: 'Debes aceptar el consentimiento de tratamiento de datos (Ley 1581) en tu perfil para postularte.',
      recoverable: false,
    }
  }

  const semester = validStudentProfile.value.current_semester
  if (!Number.isInteger(semester) || semester < 6 || semester > 10) {
    const semText = Number.isFinite(semester) ? `${semester}.º` : 'no válido'
    return {
      message: `Solo estudiantes de 6.º a 10.º semestre pueden postularse (tu semestre registrado es ${semText}).`,
      recoverable: false,
    }
  }

  return null
})

function canSubmitApplication(userId = activeUserKey.value, targetId = challengeId.value): boolean {
  return Boolean(
    userId && userId === activeUserKey.value && userRole.value === 'STUDENT'
    && !isSessionRestoring.value && !isEligibilitySyncing.value && !studentEligibilityIssue.value
    && targetId === challengeId.value && challenge.value?.id === targetId && challenge.value.status === 'OPEN'
    && !hasApplied.value && !isApplicationUnavailable.value,
  )
}

const isCtaDisabled = computed(() =>
  challenge.value?.status !== 'OPEN' || isSessionRestoring.value
  || isApplicationUnavailable.value || (isAuthenticated.value && !canSubmitApplication()),
)

const applicationButtonLabel = computed(() => {
  if (!isAuthenticated.value) return 'Inicia sesión para postularte'
  if (isSessionRestoring.value || isEligibilitySyncing.value) return 'Verificando elegibilidad...'
  if (userRole.value !== 'STUDENT') return 'Postulación exclusiva para estudiantes'
  if (hasApplied.value) return 'Postulación enviada'
  if (isApplicationUnavailable.value) return 'Reto no disponible para postulación'
  if (studentEligibilityIssue.value) return 'No cumples los requisitos aún'
  return 'Postularme a este reto'
})

useHead({
  title: computed(() => challenge.value
    ? `${challenge.value.title} | Conecta Nexus UFPS`
    : 'Detalle del reto empresarial | Conecta Nexus UFPS'),
  htmlAttrs: {
    lang: 'es-CO',
  },
  meta: [
    {
      name: 'description',
      content: 'Consulta los requisitos técnicos, protección de contacto Ley 1581 y postulación del reto empresarial en Conecta Nexus.',
    },
  ],
})

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const apiError = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  return apiError.status ?? apiError.statusCode ?? apiError.response?.status
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function isMalformedIdentifier(id: string): boolean {
  const trimmed = id.trim()
  return !trimmed || trimmed !== id || /[/\\?#%\s]/.test(trimmed) || trimmed === '.' || trimmed === '..'
}

function markChallengeApplied(cId: string, userKey: string | null) {
  if (!cId || !userKey) return
  appliedChallengesByUser.value = {
    ...appliedChallengesByUser.value,
    [userKey]: {
      ...(appliedChallengesByUser.value[userKey] || {}),
      [cId]: true,
    },
  }
}

async function syncStudentContext(options: { forceRefresh?: boolean } = {}) {
  const syncSeq = ++latestEligibilitySeq

  if (
    auth.refreshToken?.value &&
    (!auth.accessToken?.value || !userRole.value) &&
    typeof auth.initSession === 'function'
  ) {
    await auth.initSession()
    if (syncSeq !== latestEligibilitySeq) return
  }

  if (!isAuthenticated.value || userRole.value !== 'STUDENT') {
    eligibilitySyncState.value = 'idle'
    return
  }

  const resolvedUserKey = activeUserKey.value
  if (!resolvedUserKey) {
    eligibilitySyncState.value = 'error'
    return
  }

  const refreshBoth = options.forceRefresh || eligibilitySyncState.value === 'error'
  if (!refreshBoth && validStudentProfile.value && validConsent.value) {
    eligibilitySyncState.value = 'ready'
    return
  }

  eligibilitySyncState.value = 'loading'
  const [profileResult, consentResult] = await Promise.allSettled([
    refreshBoth || !validStudentProfile.value ? auth.fetchProfile() : validStudentProfile.value,
    refreshBoth || !validConsent.value ? auth.fetchConsent() : validConsent.value,
  ])

  if (syncSeq !== latestEligibilitySeq || activeUserKey.value !== resolvedUserKey) return

  const confirmed = profileResult.status === 'fulfilled' && profileResult.value?.user_id === resolvedUserKey
    && consentResult.status === 'fulfilled' && consentResult.value?.user_id === resolvedUserKey
    && validStudentProfile.value && validConsent.value

  eligibilitySyncState.value = confirmed ? 'ready' : 'error'
}

function retryEligibilityCheck() {
  void syncStudentContext({ forceRefresh: true })
}

async function loadChallenge() {
  const requestSeq = ++latestChallengeSeq
  detailRequest?.abort()
  loading.value = true
  notFound.value = false
  pageError.value = null
  challenge.value = null
  applicationModalOpen.value = false

  if (isMalformedIdentifier(challengeId.value)) {
    notFound.value = true
    loading.value = false
    return
  }

  detailRequest = new AbortController()
  try {
    const result = await getCatalogChallenge(challengeId.value, detailRequest.signal)
    if (requestSeq !== latestChallengeSeq) return

    if (!result || result.status !== 'OPEN') {
      notFound.value = true
      challenge.value = null
      return
    }

    challenge.value = result
    void syncStudentContext()
  } catch (error: unknown) {
    if (requestSeq !== latestChallengeSeq) return

    const status = getHttpStatus(error)
    if (status === 404 || status === 422) {
      notFound.value = true
    } else {
      pageError.value = extractApiErrorMessage(
        error,
        'No fue posible cargar la información del reto.',
      )
    }
  } finally {
    if (requestSeq === latestChallengeSeq) {
      loading.value = false
    }
  }
}

function handleApplyClick() {
  if (!challenge.value || isCtaDisabled.value) return

  if (!isAuthenticated.value) {
    void router.push({
      path: '/auth/login',
      query: { redirect: route.fullPath },
    })
    return
  }

  if (userRole.value !== 'STUDENT') {
    return
  }

  applicationModalOpen.value = true
}

function handleApplicationSubmitted(application: StudentApplicationResponse, submitUserKey: string) {
  if (
    !submitUserKey ||
    submitUserKey !== activeUserKey.value ||
    application.challenge_id !== challengeId.value
  ) {
    return
  }

  markChallengeApplied(application.challenge_id, submitUserKey)
  toast.add({
    title: 'Postulación enviada correctamente',
    description: 'La empresa evaluará tu perfil y recibirás notificaciones sobre el avance.',
    color: 'success',
    icon: 'i-lucide-circle-check',
  })
}

function handleAlreadyApplied(targetChallengeId: string, submitUserKey: string) {
  if (
    !submitUserKey ||
    submitUserKey !== activeUserKey.value ||
    targetChallengeId !== challengeId.value
  ) {
    return
  }

  markChallengeApplied(targetChallengeId, submitUserKey)
}

function handleApplicationUnavailable(targetChallengeId: string, submitUserKey: string) {
  if (submitUserKey === activeUserKey.value && targetChallengeId === challengeId.value) {
    unavailableApplicationChallenge.value = targetChallengeId
  }
}

onMounted(() => {
  void loadChallenge()
})

onBeforeUnmount(() => {
  latestChallengeSeq += 1
  latestEligibilitySeq += 1
  detailRequest?.abort()
})

watch(challengeId, (id, previousId) => {
  if (previousId !== undefined && id !== previousId) {
    void loadChallenge()
  }
})

watch(
  [activeUserKey, isAuthenticated, userRole] as const,
  ([nextUserKey, authenticated, role], [prevUserKey]) => {
    if (nextUserKey !== prevUserKey) {
      latestEligibilitySeq += 1
      applicationModalOpen.value = false
      eligibilitySyncState.value = 'idle'
      if (!authenticated) {
        appliedChallengesByUser.value = {}
      }
    }

    if (authenticated && role === 'STUDENT') {
      void syncStudentContext()
    }
  },
)
</script>

<template>
  <main class="min-h-[calc(100vh-140px)] bg-canvas px-4 pt-6 pb-28 text-text-main sm:px-6 sm:pt-10 lg:px-8 lg:pb-14">
    <div class="mx-auto max-w-[1320px]">
      <NuxtLink
        to="/challenges"
        data-testid="back-to-catalog-link"
        class="inline-flex items-center gap-2 rounded-xl border-2 border-transparent px-2.5 py-1.5 text-sm font-black text-text-muted transition-colors hover:border-neutral-900/20 hover:bg-surface hover:text-institutional-600 dark:hover:border-neutral-700"
      >
        <UIcon name="i-lucide-arrow-left" class="h-4 w-4" aria-hidden="true" />
        <span>Volver al catálogo</span>
      </NuxtLink>

      <!-- Estado de carga -->
      <div
        v-if="loading"
        data-testid="challenge-loading-skeleton"
        class="mt-6 space-y-6"
        aria-busy="true"
        aria-label="Cargando detalle del reto"
      >
        <div class="h-56 animate-pulse rounded-3xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
        <div class="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <div class="h-96 animate-pulse rounded-3xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
          <div class="h-72 animate-pulse rounded-3xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
        </div>
      </div>

      <!-- Estado no disponible (404, 422 UUID inválido o no OPEN) -->
      <section
        v-else-if="notFound"
        data-testid="challenge-not-found"
        class="mx-auto mt-10 max-w-2xl rounded-3xl border-2 border-neutral-900 bg-surface p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)]"
        aria-labelledby="challenge-not-found-title"
      >
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl border-2 border-neutral-900 bg-pastel-coral text-2xl font-black text-neutral-900 dark:border-neutral-600 dark:bg-pastel-coral/25 dark:text-neutral-100" aria-hidden="true">
          404
        </div>
        <h1 id="challenge-not-found-title" class="mt-5 text-2xl font-black sm:text-3xl">
          Reto no disponible
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">
          El reto no existe, el enlace es inválido, fue cerrado o ya no está publicado en el catálogo.
        </p>
        <NuxtLink
          to="/challenges"
          class="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-neutral-900 bg-institutional-600 px-5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 dark:border-institutional-400 dark:shadow-none"
        >
          Explorar otros retos
        </NuxtLink>
      </section>

      <!-- Estado error recuperable -->
      <section
        v-else-if="pageError"
        data-testid="challenge-load-error"
        class="mx-auto mt-10 max-w-2xl rounded-3xl border-2 border-institutional-600 bg-institutional-50 p-8 text-center shadow-[5px_5px_0px_0px_rgba(179,38,30,1)] dark:bg-institutional-950/40"
        role="alert"
      >
        <h1 class="text-2xl font-black text-institutional-700 dark:text-institutional-300">
          No pudimos cargar el reto
        </h1>
        <p class="mt-3 text-sm font-semibold text-institutional-700 dark:text-institutional-300">
          {{ pageError }}
        </p>
        <button
          type="button"
          class="mt-6 min-h-11 rounded-xl border-2 border-neutral-900 bg-institutional-600 px-5 py-2.5 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @click="loadChallenge"
        >
          Reintentar
        </button>
      </section>

      <!-- Vista completa del reto -->
      <template v-else-if="challenge">
        <!-- Hero Header -->
        <header
          data-testid="challenge-hero"
          class="mt-5 rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-8 lg:p-10 dark:border-neutral-700 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)]"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full border-2 border-neutral-900/30 bg-pastel-mint/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-neutral-900 dark:border-neutral-600 dark:bg-pastel-mint/20 dark:text-emerald-200">
              <span class="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
              Oportunidad abierta
            </span>
            <span class="rounded-full border-2 border-neutral-900/30 bg-pastel-coral px-3 py-1 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-pastel-coral/25 dark:text-neutral-100">
              {{ challenge.economic_sector }}
            </span>
            <span
              class="rounded-full border-2 px-3 py-1 text-xs font-black"
              :class="difficultyMeta[challenge.difficulty_level]?.badgeClass || 'border-neutral-900/30 bg-neutral-100 text-neutral-900'"
            >
              {{ difficultyMeta[challenge.difficulty_level]?.label || challenge.difficulty_level }}
            </span>
          </div>

          <h1 class="mt-5 max-w-5xl break-words text-2xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {{ challenge.title }}
          </h1>

          <div class="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t-2 border-border-subtle pt-5 text-sm font-bold text-text-muted">
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="h-4 w-4 text-institutional-600 dark:text-institutional-400" aria-hidden="true" />
              <span>{{ companyDisplayName }}</span>
            </span>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="h-4 w-4 text-institutional-600 dark:text-institutional-400" aria-hidden="true" />
              <span>{{ modalityLabels[challenge.modality] || challenge.modality }}</span>
            </span>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-graduation-cap" class="h-4 w-4 text-institutional-600 dark:text-institutional-400" aria-hidden="true" />
              <span>Desde {{ challenge.min_semester }}.º semestre</span>
            </span>
            <span class="inline-flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="h-4 w-4 text-institutional-600 dark:text-institutional-400" aria-hidden="true" />
              <span>Creado el {{ formatDate(challenge.created_at) }}</span>
            </span>
          </div>
        </header>

        <!-- Layout asimétrico exacto 70/30 en desktop y 1 columna en móvil -->
        <div
          data-testid="challenge-detail-grid"
          class="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
        >
          <!-- Columna Principal (70%) -->
          <div class="min-w-0 space-y-6">
            <section
              class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
              aria-labelledby="problem-title"
            >
              <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Contexto técnico
              </p>
              <h2 id="problem-title" class="mt-2 text-xl font-black sm:text-2xl">
                Problema por resolver
              </h2>
              <SafeRichTextContent
                data-testid="challenge-description-content"
                class="mt-5"
                :content="challenge.description"
              />
            </section>

            <section
              class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
              aria-labelledby="process-title"
            >
              <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Entorno empresarial
              </p>
              <h2 id="process-title" class="mt-2 text-xl font-black sm:text-2xl">
                Proceso de negocio
              </h2>
              <SafeRichTextContent
                data-testid="challenge-process-content"
                class="mt-5"
                :content="challenge.business_process"
              />
            </section>

            <section
              class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
              aria-labelledby="requirements-title"
            >
              <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Perfil recomendado
              </p>
              <h2 id="requirements-title" class="mt-2 text-xl font-black sm:text-2xl">
                Requisitos académicos y técnicos
              </h2>

              <div class="mt-5 rounded-2xl border-2 border-neutral-900/20 bg-pastel-blue p-4 text-sm font-black text-neutral-900 dark:border-neutral-700 dark:bg-pastel-blue/20 dark:text-neutral-100">
                Semestre mínimo: {{ challenge.min_semester }}.º semestre
              </div>

              <div class="mt-6">
                <h3 class="text-xs font-black uppercase tracking-wider text-text-main">
                  Habilidades requeridas
                </h3>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="skill in challenge.required_skills"
                    :key="skill"
                    class="rounded-xl border-2 border-neutral-900/30 bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    #{{ skill }}
                  </span>
                  <span v-if="challenge.required_skills.length === 0" class="text-sm text-text-muted">
                    No se especificaron habilidades adicionales.
                  </span>
                </div>
              </div>

              <div class="mt-6">
                <h3 class="text-xs font-black uppercase tracking-wider text-text-main">
                  Áreas de conocimiento
                </h3>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="area in challenge.knowledge_areas"
                    :key="area"
                    class="rounded-xl border-2 border-neutral-900/30 bg-pastel-peach px-3 py-1.5 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-pastel-peach/20 dark:text-neutral-100"
                  >
                    {{ area }}
                  </span>
                  <span v-if="challenge.knowledge_areas.length === 0" class="text-sm text-text-muted">
                    No se especificaron áreas adicionales.
                  </span>
                </div>
              </div>
            </section>

            <section class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <AttachmentList
                :attachments="attachments"
                :can-delete="false"
              />
            </section>
          </div>

          <!-- Sidebar Derecha (30%, Sticky con scroll seguro y separación de navbar) -->
          <aside
            data-testid="challenge-sidebar"
            class="min-w-0 space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1.5 lg:pb-1.5"
          >
            <!-- Card de Resumen / Requisitos clave -->
            <section
              data-testid="challenge-sidebar-summary"
              class="rounded-3xl border-2 border-neutral-900 bg-surface p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
            >
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Ficha rápida
              </p>
              <dl class="mt-3 space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <dt class="font-bold text-text-muted">Semestre mínimo</dt>
                  <dd class="font-black text-text-main">{{ challenge.min_semester }}.º semestre</dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="font-bold text-text-muted">Modalidad</dt>
                  <dd class="font-black text-text-main">{{ modalityLabels[challenge.modality] || challenge.modality }}</dd>
                </div>
                <div v-if="challenge.required_skills.length > 0" class="pt-1">
                  <dt class="font-bold text-text-muted">Habilidades clave</dt>
                  <dd class="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      v-for="skill in challenge.required_skills.slice(0, 6)"
                      :key="skill"
                      class="rounded-lg border border-neutral-900/25 bg-canvas px-2 py-0.5 text-[11px] font-black text-text-main dark:border-neutral-700"
                    >
                      #{{ skill }}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <!-- Card de Postulación CTA -->
            <section class="rounded-3xl border-2 border-neutral-900 bg-neutral-900 p-6 text-white shadow-[5px_5px_0px_0px_rgba(179,38,30,1)] dark:border-neutral-600 dark:bg-neutral-950">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-pastel-coral">
                {{ hasApplied ? 'Postulación registrada' : 'Convocatoria abierta' }}
              </p>
              <h2 class="mt-2 text-2xl font-black">
                {{ hasApplied ? '¡Ya te postulaste!' : '¿Te interesa este reto?' }}
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-neutral-300">
                <template v-if="hasApplied">
                  Tu carta de motivación ya fue registrada. La empresa revisará tu perfil académico y te notificará su decisión.
                </template>
                <template v-else-if="isNonStudentAuthenticated">
                  Esta vista corresponde al flujo público de postulación estudiantil.
                </template>
                <template v-else>
                  Presenta tu perfil académico (semestres 6.º a 10.º) y explica cómo tus conocimientos pueden aportar a la solución.
                </template>
              </p>

              <!-- Alerta de elegibilidad o error de perfil/consentimiento -->
              <div
                v-if="studentEligibilityIssue"
                data-testid="student-ineligible-banner"
                role="status"
                class="mt-4 rounded-2xl border border-amber-400/60 bg-amber-950/60 p-3 text-xs font-semibold leading-relaxed text-amber-100"
              >
                <p>{{ studentEligibilityIssue.message }}</p>
                <div class="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    v-if="studentEligibilityIssue.recoverable"
                    type="button"
                    data-testid="retry-eligibility-btn"
                    class="rounded-lg border border-amber-300/70 bg-amber-900/60 px-2.5 py-1 text-[11px] font-black text-amber-200 hover:bg-amber-800/70"
                    @click="retryEligibilityCheck"
                  >
                    Reintentar verificación
                  </button>
                  <NuxtLink
                    to="/me"
                    class="inline-block font-black text-amber-300 underline"
                  >
                    Ir a mi perfil
                  </NuxtLink>
                </div>
              </div>

              <!-- Wrapper para tooltip visible y accesible sobre botón deshabilitado -->
              <div class="group/cta relative mt-6">
                <button
                  type="button"
                  data-testid="apply-challenge"
                  :disabled="isCtaDisabled"
                  :title="isNonStudentAuthenticated ? COMPANY_TOOLTIP_TEXT : undefined"
                  :aria-describedby="isNonStudentAuthenticated ? 'company-cta-tooltip' : undefined"
                  class="min-h-12 w-full rounded-2xl border-2 px-4 py-3 text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  :class="isCtaDisabled
                    ? 'cursor-not-allowed border-neutral-600 bg-neutral-700 text-neutral-300 opacity-75 shadow-none'
                    : 'border-white bg-institutional-600 text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.85)] hover:-translate-y-0.5 hover:bg-institutional-500'"
                  @click="handleApplyClick"
                >
                  {{ applicationButtonLabel }}
                </button>

                <div
                  v-if="isNonStudentAuthenticated"
                  id="company-cta-tooltip"
                  role="tooltip"
                  data-testid="company-cta-tooltip"
                  class="pointer-events-none mt-2 rounded-xl border border-neutral-600 bg-neutral-800 px-3 py-2 text-center text-xs font-bold text-neutral-100 opacity-95 transition-opacity group-hover/cta:opacity-100"
                >
                  {{ COMPANY_TOOLTIP_TEXT }}
                </div>
              </div>
            </section>

            <!-- Card de Privacidad Ley 1581 -->
            <section
              data-testid="law-1581-privacy-card"
              class="rounded-3xl border-2 border-neutral-900 bg-pastel-mint/45 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:bg-pastel-mint/10 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
              aria-labelledby="privacy-title"
            >
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-900 bg-surface text-neutral-900 dark:border-neutral-600 dark:text-emerald-300">
                  <UIcon name="i-lucide-lock" class="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="privacy-title" class="text-sm font-black text-text-main">
                    Contacto protegido (Ley 1581)
                  </h2>
                  <p class="mt-1.5 text-xs font-medium leading-relaxed text-text-muted">
                    Los datos de contacto corporativos están protegidos por la Ley 1581 y se revelarán mutuamente cuando la empresa acepte tu postulación académica.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <!-- Barra Sticky Inferior en Móvil con soporte safe-area-inset-bottom -->
        <div
          data-testid="mobile-sticky-cta-bar"
          class="fixed inset-x-0 bottom-0 z-40 border-t-2 border-neutral-900 bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.12)] backdrop-blur-sm lg:hidden dark:border-neutral-700"
        >
          <div class="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-xs font-black text-text-main">
                {{ challenge.title }}
              </p>
              <p class="text-[11px] font-bold text-text-muted">
                Desde {{ challenge.min_semester }}.º semestre · {{ modalityLabels[challenge.modality] || challenge.modality }}
              </p>
            </div>
            <button
              type="button"
              data-testid="apply-challenge-mobile"
              :disabled="isCtaDisabled"
              :title="isNonStudentAuthenticated ? COMPANY_TOOLTIP_TEXT : undefined"
              class="shrink-0 min-h-11 rounded-xl border-2 px-4 py-2 text-xs font-black transition-all"
              :class="isCtaDisabled
                ? 'cursor-not-allowed border-neutral-400 bg-neutral-200 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                : 'border-neutral-900 bg-institutional-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'"
              @click="handleApplyClick"
            >
              {{ hasApplied ? 'Postulado' : (isApplicationUnavailable ? 'Reto no disponible' : (!isAuthenticated ? 'Iniciar sesión' : (isNonStudentAuthenticated ? 'Solo estudiantes' : (studentEligibilityIssue || isEligibilitySyncing ? 'No elegible' : 'Postularme')))) }}
            </button>
          </div>
        </div>

        <!-- Modal de Postulación para Estudiantes -->
        <ChallengeApplicationModal
          v-model:open="applicationModalOpen"
          :challenge="challenge"
          :user-id="activeUserKey"
          :can-submit="canSubmitApplication"
          @unavailable="handleApplicationUnavailable"
          @submitted="handleApplicationSubmitted"
          @already-applied="handleAlreadyApplied"
        />
      </template>
    </div>
  </main>
</template>
