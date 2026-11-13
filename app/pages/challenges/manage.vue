<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CompanyChallengeTable, {
  type CompanyChallenge,
} from '~/components/challenges/CompanyChallengeTable.vue'
import { useAuth } from '~/composables/useAuth'
import { useChallenges } from '~/composables/useChallenges'
import type { ChallengeStatus } from '~/types/challenge'
import { extractApiErrorMessage } from '~/utils/errors'

definePageMeta({
  middleware: [
    'auth',
    () => {
      const { userRole } = useAuth()
      if (userRole.value !== 'COMPANY') {
        const toast = useToast()
        toast.add({
          title: 'Acceso restringido',
          description: 'La gestión de retos está reservada para empresas y organizaciones aliadas.',
          color: 'warning',
          icon: 'i-lucide-shield-alert',
        })
        return navigateTo('/challenges')
      }
    },
  ],
})

useHead({
  title: 'Gestión de Retos Empresariales | Conecta Nexus UFPS',
  htmlAttrs: {
    lang: 'es-CO',
  },
  meta: [
    {
      name: 'description',
      content: 'Administra el portafolio de retos, publicaciones y postulaciones de tu organización.',
    },
  ],
})

type DashboardStatus = 'ALL' | 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const {
  loading,
  error,
  fetchCompanyChallenges,
  updateChallenge,
} = useChallenges()

const portfolio = ref<CompanyChallenge[]>([])
const selectedStatus = ref<DashboardStatus>('ALL')
const pageError = ref<string | null>(null)
const publishingId = ref<string | null>(null)

const statusTabs: Array<{ value: DashboardStatus, label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'CLOSED', label: 'Cerrados' },
]

function countByStatus(status: ChallengeStatus): number {
  return portfolio.value.filter(challenge => challenge.status === status).length
}

const metrics = computed(() => [
  {
    status: 'DRAFT' as const,
    label: 'Borradores',
    value: countByStatus('DRAFT'),
    classes: 'bg-slate-100 dark:bg-slate-900/60',
  },
  {
    status: 'OPEN' as const,
    label: 'Abiertos',
    value: countByStatus('OPEN'),
    classes: 'bg-pastel-mint/70 dark:bg-pastel-mint/15',
  },
  {
    status: 'IN_PROGRESS' as const,
    label: 'En progreso',
    value: countByStatus('IN_PROGRESS'),
    classes: 'bg-pastel-blue dark:bg-pastel-blue/20',
  },
  {
    status: 'CLOSED' as const,
    label: 'Cerrados',
    value: countByStatus('CLOSED'),
    classes: 'bg-neutral-200 dark:bg-neutral-800',
  },
])

const filteredChallenges = computed(() => {
  if (selectedStatus.value === 'ALL') return portfolio.value
  return portfolio.value.filter(
    challenge => challenge.status === selectedStatus.value,
  )
})

function tabCount(status: DashboardStatus): number {
  if (status === 'ALL') return portfolio.value.length
  return portfolio.value.filter(challenge => challenge.status === status).length
}

async function loadPortfolio() {
  pageError.value = null
  try {
    const response = await fetchCompanyChallenges({ page: 1, limit: 100 })
    portfolio.value = response.items as CompanyChallenge[]
  } catch (loadError: unknown) {
    pageError.value = extractApiErrorMessage(
      loadError,
      'No fue posible cargar los retos de la organización.',
    )
  }
}

async function publishChallenge(challenge: CompanyChallenge) {
  if (publishingId.value) return

  publishingId.value = challenge.id
  try {
    const updated = await updateChallenge(challenge.id, { status: 'OPEN' })
    const index = portfolio.value.findIndex(item => item.id === challenge.id)
    if (index !== -1) {
      portfolio.value[index] = {
        ...updated,
        applications_count: challenge.applications_count,
      }
    }
    toast.add({
      title: 'Reto publicado',
      description: `${challenge.title} ahora está disponible en el catálogo público.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch (publishError: unknown) {
    toast.add({
      title: 'No fue posible publicar el reto',
      description: extractApiErrorMessage(
        publishError,
        'Verifica el estado del reto e intenta nuevamente.',
      ),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    publishingId.value = null
  }
}

function editChallenge(challenge: CompanyChallenge) {
  router.push(`/challenges/${challenge.id}/edit`)
}

function manageFiles(challenge: CompanyChallenge) {
  router.push({
    path: `/challenges/${challenge.id}`,
    query: { tab: 'files' },
  })
}

function requestClosure(challenge: CompanyChallenge) {
  router.push({
    query: {
      ...route.query,
      close: challenge.id,
    },
  })
}

onMounted(() => {
  loadPortfolio()
})
</script>

<template>
  <main class="min-h-screen bg-canvas px-4 py-8 text-text-main sm:px-6 sm:py-12 lg:px-8">
    <div class="mx-auto max-w-[1400px] space-y-8">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full border-2 border-neutral-900/30 bg-pastel-coral px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-neutral-900 dark:border-neutral-600 dark:bg-pastel-coral/25 dark:text-neutral-100">
            Portal empresarial UFPS
          </div>
          <h1 class="mt-3 text-3xl font-black uppercase tracking-tight text-text-main sm:text-4xl lg:text-5xl">
            Gestión de retos
          </h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted sm:text-base">
            Consulta el estado de tus convocatorias, revisa postulaciones y administra su publicación.
          </p>
        </div>

        <NuxtLink
          to="/challenges/new"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-neutral-900 bg-institutional-600 px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 dark:border-institutional-400 dark:shadow-none"
        >
          <span aria-hidden="true">＋</span>
          Publicar nuevo reto
        </NuxtLink>
      </header>

      <section aria-labelledby="portfolio-summary-title">
        <h2 id="portfolio-summary-title" class="sr-only">
          Resumen del portafolio
        </h2>
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <button
            v-for="metric in metrics"
            :key="metric.status"
            type="button"
            :class="[
              metric.classes,
              selectedStatus === metric.status
                ? 'ring-4 ring-institutional-500/30'
                : '',
              'rounded-3xl border-2 border-neutral-900 p-5 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 dark:border-neutral-700 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]',
            ]"
            :aria-label="`Filtrar por ${metric.label}`"
            @click="selectedStatus = metric.status"
          >
            <span class="block text-3xl font-black text-text-main sm:text-4xl">
              {{ metric.value }}
            </span>
            <span class="mt-1 block text-xs font-black uppercase tracking-wider text-text-muted">
              {{ metric.label }}
            </span>
          </button>
        </div>
      </section>

      <section aria-labelledby="challenge-portfolio-title" class="space-y-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
              Portafolio de la organización
            </p>
            <h2 id="challenge-portfolio-title" class="mt-1 text-2xl font-black text-text-main sm:text-3xl">
              Retos registrados
            </h2>
          </div>

          <div
            class="flex max-w-full gap-2 overflow-x-auto pb-2 xl:pb-0"
            role="tablist"
            aria-label="Filtrar retos por estado"
          >
            <button
              v-for="tab in statusTabs"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="selectedStatus === tab.value"
              :class="[
                selectedStatus === tab.value
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-neutral-900/40 bg-surface text-text-muted hover:text-text-main dark:border-neutral-600',
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-black transition-colors',
              ]"
              @click="selectedStatus = tab.value"
            >
              {{ tab.label }}
              <span class="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                {{ tabCount(tab.value) }}
              </span>
            </button>
          </div>
        </div>

        <div
          v-if="pageError || error"
          role="alert"
          class="flex flex-col gap-3 rounded-2xl border-2 border-institutional-600 bg-institutional-50 p-4 shadow-[3px_3px_0px_0px_rgba(179,38,30,1)] sm:flex-row sm:items-center sm:justify-between dark:bg-institutional-950/40"
        >
          <p class="text-sm font-bold text-institutional-700 dark:text-institutional-300">
            {{ pageError || error }}
          </p>
          <button
            type="button"
            class="rounded-xl bg-institutional-600 px-4 py-2 text-xs font-black text-white"
            @click="loadPortfolio"
          >
            Reintentar
          </button>
        </div>

        <div
          v-if="loading && portfolio.length === 0"
          class="space-y-3"
          aria-label="Cargando retos empresariales"
        >
          <div
            v-for="item in 4"
            :key="item"
            class="h-20 animate-pulse rounded-2xl border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <CompanyChallengeTable
          v-else-if="!pageError && !error"
          :challenges="filteredChallenges"
          :publishing-id="publishingId"
          @edit="editChallenge"
          @publish="publishChallenge"
          @manage-files="manageFiles"
          @close="requestClosure"
        />
      </section>
    </div>
  </main>
</template>
