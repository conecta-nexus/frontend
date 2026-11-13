<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AttachmentList from '~/components/challenges/AttachmentList.vue'
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
const { isAuthenticated, userRole } = useAuth()
const { getCatalogChallenge } = useChallenges()

const challenge = ref<PublicChallengeDetail | null>(null)
const loading = ref(true)
const notFound = ref(false)
const pageError = ref<string | null>(null)

const challengeId = computed(() => {
  const id = route.params.id
  return Array.isArray(id) ? id[0] || '' : String(id || '')
})

const companyDisplayName = computed(() => {
  const name = challenge.value?.company_name?.trim()
  return name || 'Empresa Aliada UFPS'
})

const attachments = computed<ChallengeAttachment[]>(
  () => challenge.value?.attachments || [],
)

const modalityLabels: Record<Modality, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ON_SITE: 'Presencial',
}

const difficultyLabels: Record<DifficultyLevel, string> = {
  BEGINNER: 'Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
}

const applicationButtonLabel = computed(() => {
  if (!isAuthenticated.value) return 'Inicia sesión para postularte'
  if (userRole.value !== 'STUDENT') return 'Postulación exclusiva para estudiantes'
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
      content: 'Consulta los requisitos técnicos y académicos de este reto empresarial de Conecta Nexus.',
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
  return apiError.status || apiError.statusCode || apiError.response?.status
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

async function loadChallenge() {
  loading.value = true
  notFound.value = false
  pageError.value = null
  challenge.value = null

  if (!challengeId.value) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    challenge.value = await getCatalogChallenge(challengeId.value)
  } catch (error: unknown) {
    if (getHttpStatus(error) === 404) {
      notFound.value = true
    } else {
      pageError.value = extractApiErrorMessage(
        error,
        'No fue posible cargar la información del reto.',
      )
    }
  } finally {
    loading.value = false
  }
}

function applyToChallenge() {
  if (!challenge.value) return

  if (!isAuthenticated.value) {
    router.push({
      path: '/auth/login',
      query: { redirect: route.fullPath },
    })
    return
  }

  if (userRole.value !== 'STUDENT') {
    toast.add({
      title: 'Acción exclusiva para estudiantes',
      description: 'Solo los estudiantes UFPS pueden postularse a los retos empresariales.',
      color: 'warning',
      icon: 'i-lucide-graduation-cap',
    })
    return
  }

  router.push({
    path: '/applications/new',
    query: { challenge_id: challenge.value.id },
  })
}

onMounted(() => {
  loadChallenge()
})

watch(challengeId, (id, previousId) => {
  if (previousId !== undefined && id !== previousId) {
    loadChallenge()
  }
})
</script>

<template>
  <main class="min-h-[calc(100vh-140px)] bg-canvas px-4 py-8 text-text-main sm:px-6 sm:py-12 lg:px-8">
    <div class="mx-auto max-w-[1280px]">
      <NuxtLink
        to="/challenges"
        class="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-black text-text-muted transition-colors hover:text-institutional-600"
      >
        <span aria-hidden="true">←</span>
        Volver al catálogo
      </NuxtLink>

      <div
        v-if="loading"
        class="mt-8 space-y-6"
        aria-label="Cargando detalle del reto"
      >
        <div class="h-52 animate-pulse rounded-3xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="h-96 animate-pulse rounded-3xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
          <div class="h-72 animate-pulse rounded-3xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
        </div>
      </div>

      <section
        v-else-if="notFound"
        class="mx-auto mt-12 max-w-2xl rounded-3xl border-2 border-neutral-900 bg-surface p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)]"
        aria-labelledby="challenge-not-found-title"
      >
        <div class="mx-auto flex size-16 items-center justify-center rounded-2xl border-2 border-neutral-900 bg-pastel-coral text-3xl dark:border-neutral-600 dark:bg-pastel-coral/25" aria-hidden="true">
          404
        </div>
        <h1 id="challenge-not-found-title" class="mt-5 text-2xl font-black sm:text-3xl">
          Reto no disponible
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">
          El reto no existe, fue cerrado o ya no está publicado en el catálogo.
        </p>
        <NuxtLink
          to="/challenges"
          class="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-neutral-900 bg-institutional-600 px-5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-institutional-400 dark:shadow-none"
        >
          Explorar otros retos
        </NuxtLink>
      </section>

      <section
        v-else-if="pageError"
        class="mx-auto mt-12 max-w-2xl rounded-3xl border-2 border-institutional-600 bg-institutional-50 p-8 text-center shadow-[5px_5px_0px_0px_rgba(179,38,30,1)] dark:bg-institutional-950/40"
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
          class="mt-6 min-h-11 rounded-xl bg-institutional-600 px-5 py-2.5 text-sm font-black text-white"
          @click="loadChallenge"
        >
          Reintentar
        </button>
      </section>

      <template v-else-if="challenge">
        <header class="mt-7 rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-8 lg:p-10 dark:border-neutral-700 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)]">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border-2 border-neutral-900/30 bg-pastel-mint/60 px-3 py-1 text-xs font-black uppercase tracking-wider text-neutral-900 dark:border-neutral-600 dark:bg-pastel-mint/20 dark:text-neutral-100">
              Oportunidad abierta
            </span>
            <span class="rounded-full border-2 border-neutral-900/30 bg-pastel-coral px-3 py-1 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-pastel-coral/25 dark:text-neutral-100">
              {{ challenge.economic_sector }}
            </span>
          </div>

          <h1 class="mt-5 max-w-5xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {{ challenge.title }}
          </h1>

          <div class="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t-2 border-border-subtle pt-5 text-sm font-bold text-text-muted">
            <span>🏢 {{ companyDisplayName }}</span>
            <span>📍 {{ modalityLabels[challenge.modality] }}</span>
            <span>◈ {{ difficultyLabels[challenge.difficulty_level] }}</span>
            <span>📅 Publicado el {{ formatDate(challenge.created_at) }}</span>
          </div>
        </header>

        <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="space-y-8">
            <section class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]" aria-labelledby="problem-title">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Contexto técnico
              </p>
              <h2 id="problem-title" class="mt-2 text-2xl font-black sm:text-3xl">
                Problema por resolver
              </h2>
              <p class="mt-5 whitespace-pre-line text-sm leading-7 text-text-muted sm:text-base">
                {{ challenge.description }}
              </p>
            </section>

            <section class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]" aria-labelledby="process-title">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Entorno empresarial
              </p>
              <h2 id="process-title" class="mt-2 text-2xl font-black sm:text-3xl">
                Proceso de negocio
              </h2>
              <p class="mt-5 whitespace-pre-line text-sm leading-7 text-text-muted sm:text-base">
                {{ challenge.business_process }}
              </p>
            </section>

            <section class="rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]" aria-labelledby="requirements-title">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
                Perfil recomendado
              </p>
              <h2 id="requirements-title" class="mt-2 text-2xl font-black sm:text-3xl">
                Requisitos académicos y técnicos
              </h2>

              <div class="mt-6 rounded-2xl border-2 border-neutral-900/20 bg-pastel-blue p-4 text-sm font-black text-neutral-900 dark:border-neutral-700 dark:bg-pastel-blue/20 dark:text-neutral-100">
                Desde {{ challenge.min_semester }}.º semestre
              </div>

              <div class="mt-6">
                <h3 class="text-sm font-black uppercase tracking-wider text-text-main">
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
                <h3 class="text-sm font-black uppercase tracking-wider text-text-main">
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

          <aside class="space-y-5 lg:sticky lg:top-6">
            <section class="rounded-3xl border-2 border-neutral-900 bg-neutral-900 p-6 text-white shadow-[5px_5px_0px_0px_rgba(179,38,30,1)] dark:border-neutral-600 dark:bg-neutral-950">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-pastel-coral">
                Convocatoria abierta
              </p>
              <h2 class="mt-2 text-2xl font-black">
                ¿Te interesa este reto?
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-neutral-300">
                Presenta tu perfil académico y explica cómo tus conocimientos pueden aportar a la solución.
              </p>
              <button
                type="button"
                data-testid="apply-challenge"
                class="mt-6 min-h-12 w-full rounded-2xl border-2 border-white bg-institutional-600 px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.85)] transition-transform hover:-translate-y-0.5"
                @click="applyToChallenge"
              >
                {{ applicationButtonLabel }}
              </button>
            </section>

            <section class="rounded-3xl border-2 border-neutral-900/40 bg-pastel-mint/45 p-5 dark:border-neutral-700 dark:bg-pastel-mint/10" aria-labelledby="privacy-title">
              <h2 id="privacy-title" class="text-sm font-black text-text-main">
                Contacto protegido
              </h2>
              <p class="mt-2 text-xs leading-relaxed text-text-muted">
                Los nombres de contacto, correos y teléfonos corporativos permanecen ocultos durante la exploración pública, conforme a la regla RB-05.
              </p>
            </section>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
