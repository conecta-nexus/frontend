<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { catalogDifficultyLabels, catalogModalityLabels, catalogRequestKey, catalogTerms, readCatalogQuery } from '~/utils/catalogQuery'
import { useChallenges } from '~/composables/useChallenges'
import ChallengeCard from '~/components/challenges/ChallengeCard.vue'
import CatalogFilterBar from '~/components/challenges/CatalogFilterBar.vue'
import CatalogEmptyState, { type ActiveFilters } from '~/components/challenges/CatalogEmptyState.vue'

useHead({
  title: 'Catálogo de Desafíos Empresariales | Conecta Nexus UFPS',
  meta: [
    {
      name: 'description',
      content: 'Explora y postúlate a desafíos tecnológicos reales planteados por el sector empresarial para estudiantes de Ingeniería de Sistemas UFPS.',
    },
  ],
})

const route = useRoute()
const router = useRouter()
const { catalog, catalogLoading, catalogError: error, fetchCatalog } = useChallenges()
const challenges = computed(() => catalog.value?.items ?? [])
const mounted = ref(false)
const isLoading = computed(() => !mounted.value || catalogLoading.value)

const filters = computed(() => readCatalogQuery(route.query))
const filterBar = ref<InstanceType<typeof CatalogFilterBar> | null>(null)
const catalogHeading = ref<HTMLElement | null>(null)
let resetting = false
const emptyMetadata = computed(() => catalog.value?.empty_state)
const totalActiveCount = computed(() => {
  const count = emptyMetadata.value?.total_active_challenges
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : undefined
})
const emptyDescription = computed(() => {
  const metadata = emptyMetadata.value
  if (totalActiveCount.value !== 0
    && metadata?.code === 'NO_MATCHING_CHALLENGES'
    && metadata.message === 'No challenges match your selected search criteria.') {
    return 'No hay convocatorias abiertas que coincidan con los filtros seleccionados. Prueba con menos filtros o explora el catálogo completo.'
  }
  return undefined
})

const activeFilters = computed<ActiveFilters>(() => {
  const items: ActiveFilters = {}
  const reported = emptyMetadata.value?.query_params
  const backendFilters = readCatalogQuery({
    ...reported,
    min_semester: typeof reported?.min_semester === 'number' ? String(reported.min_semester) : null,
  })
  const {
    q = filters.value.q,
    sector = filters.value.sector,
    modality = filters.value.modality,
    difficulty = filters.value.difficulty,
    knowledge_area = filters.value.knowledge_area,
    skill = filters.value.skill,
    min_semester = filters.value.min_semester,
  } = backendFilters

  if (q) items.q = { label: 'Búsqueda', value: `"${q}"` }
  if (sector) items.sector = { label: 'Sector', value: sector }
  if (modality) items.modality = { label: 'Modalidad', value: catalogModalityLabels[modality] }
  if (difficulty) items.difficulty = { label: 'Dificultad', value: catalogDifficultyLabels[difficulty] }
  if (knowledge_area) items.knowledge_area = { label: 'Área de conocimiento', value: catalogTerms(knowledge_area).join(', ') }
  catalogTerms(skill).forEach((s, index) => {
    items[`skill-${index}`] = { label: 'Habilidad', value: `#${s}` }
  })
  if (min_semester) items.min_semester = { label: 'Semestre mín.', value: `${min_semester}°` }

  return items
})

const unavailablePage = computed(() => {
  const result = catalog.value
  return result && result.total > 0 && result.page > result.pages ? result.pages : null
})

async function loadCatalog() {
  try {
    await fetchCatalog(filters.value)
  } catch {
    // Error is handled reactively by useChallenges()
  }
}

async function handleReset() {
  if (resetting) return
  resetting = true
  // Only a changed request key triggers the route watcher.
  const reloadDirectly = catalogRequestKey(filters.value) === catalogRequestKey(readCatalogQuery({}))

  try {
    filterBar.value?.clearDraftFilters?.()
    if (Object.keys(route.query).length && await router.push({ query: {} })) return
    const refresh = reloadDirectly ? loadCatalog() : undefined
    await nextTick()
    catalogHeading.value?.focus()
    await refresh
  } finally {
    resetting = false
  }
}

function changePage(newPage: number) {
  router.push({
    query: {
      ...route.query,
      page: String(newPage),
    },
  })
}

// Single source of truth for URL query changes
watch(() => catalogRequestKey(filters.value), loadCatalog)

onMounted(() => {
  mounted.value = true
  loadCatalog()
})
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-140px)]">
    <!-- Header Section -->
    <div class="mb-8">
      <h1
        ref="catalogHeading"
        tabindex="-1"
        class="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight"
      >
        Catálogo de Desafíos Empresariales
      </h1>
      <p class="mt-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-3xl font-medium">
        Encuentra proyectos reales del sector empresarial, filtra por tecnologías y aplica con tu carta de motivación académica.
      </p>
    </div>

    <!-- Reactive Filter Bar Component -->
    <CatalogFilterBar
      ref="filterBar"
      :loading="isLoading"
      :total-results="catalog?.total ?? 0"
    />

    <!-- Error Banner -->
    <div
      v-if="!isLoading && error"
      role="alert"
      class="mb-8 p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-600 rounded-2xl shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-xl">⚠️</span>
        <span class="text-sm font-bold text-red-800 dark:text-red-300">{{ error }}</span>
      </div>
      <button
        type="button"
        class="px-3 py-1.5 bg-red-600 text-white font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        @click="loadCatalog"
      >
        Reintentar
      </button>
    </div>

    <p class="sr-only" role="status">
      {{ isLoading ? 'Cargando desafíos…' : '' }}
    </p>

    <div
      :aria-busy="isLoading"
      class="catalog-grid grid gap-5"
    >
      <template v-if="isLoading">
        <div
          v-for="n in 6"
          :key="n"
          data-testid="catalog-skeleton"
          aria-hidden="true"
          class="rounded-2xl border-2 border-neutral-900/25 bg-surface p-5 shadow-[3px_3px_0_var(--border-prominent)] dark:border-neutral-700"
        >
          <div class="flex gap-2">
            <div class="catalog-placeholder h-6 w-18 rounded-full" />
            <div class="catalog-placeholder h-6 w-22 rounded-full" />
          </div>
          <div class="catalog-placeholder mt-4 h-5 w-4/5 rounded" />
          <div class="catalog-placeholder mt-2 h-4 w-1/2 rounded" />
          <div class="catalog-placeholder mt-2 h-3 w-1/3 rounded" />
          <div class="mt-4 space-y-2">
            <div class="catalog-placeholder h-3 w-full rounded" />
            <div class="catalog-placeholder h-3 w-11/12 rounded" />
            <div class="catalog-placeholder h-3 w-2/3 rounded" />
          </div>
          <div class="mt-4 flex gap-1.5">
            <div class="catalog-placeholder h-6 w-12 rounded-md" />
            <div class="catalog-placeholder h-6 w-14 rounded-md" />
            <div class="catalog-placeholder h-6 w-10 rounded-md" />
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <div class="catalog-placeholder h-6 w-16 rounded-full" />
            <div class="catalog-placeholder h-4 w-24 rounded" />
          </div>
        </div>
      </template>

      <template v-else-if="!error">
        <ChallengeCard
          v-for="challenge in challenges"
          :key="challenge.id"
          :challenge="challenge"
        />
      </template>
    </div>

    <div
      v-if="!isLoading && !error && unavailablePage"
      class="py-8 text-center text-text-main"
    >
      <p>La página solicitada no está disponible.</p>
      <button
        type="button"
        class="mt-2 rounded px-2 py-1 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
        @click="changePage(unavailablePage)"
      >
        Ir a la página {{ unavailablePage }}
      </button>
    </div>

    <CatalogEmptyState
      v-else-if="!isLoading && !error && catalog?.total === 0 && challenges.length === 0"
      :active-filters="activeFilters"
      :description="emptyDescription"
      :total-active-count="totalActiveCount"
      :show-reset="Object.keys(activeFilters).length > 0 && emptyMetadata?.suggested_reset !== false"
      @reset="handleReset"
    />

    <nav
      v-if="!isLoading && !error && catalog && catalog.total > 0 && !unavailablePage"
      aria-label="Paginación del catálogo"
      class="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-4"
    >
      <button
        type="button"
        :disabled="catalog.page <= 1"
        class="rounded-xl border-2 border-neutral-900/25 bg-surface px-3 py-2 text-sm font-semibold text-text-main shadow-[2px_2px_0_var(--border-prominent)] enabled:hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institutional-500 disabled:opacity-45 dark:border-neutral-700"
        @click="changePage(catalog.page - 1)"
      >
        <span aria-hidden="true">←</span> Anterior
      </button>
      <span class="text-sm font-semibold tabular-nums text-text-main">
        Página <span aria-current="page">{{ catalog.page }}</span> de {{ catalog.pages }}
      </span>
      <button
        type="button"
        :disabled="catalog.page >= catalog.pages"
        class="rounded-xl border-2 border-neutral-900/25 bg-surface px-3 py-2 text-sm font-semibold text-text-main shadow-[2px_2px_0_var(--border-prominent)] enabled:hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institutional-500 disabled:opacity-45 dark:border-neutral-700"
        @click="changePage(catalog.page + 1)"
      >
        Siguiente <span aria-hidden="true">→</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.catalog-grid {
  grid-template-columns: minmax(0, 1fr);
}

@media (width >= 640px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width > 1024px) {
  .catalog-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.catalog-placeholder {
  --placeholder: #e5e5e5;
  --highlight: #f5f5f5;
  background: linear-gradient(100deg, var(--placeholder) 25%, var(--highlight) 50%, var(--placeholder) 75%);
  background-size: 200% 100%;
}

:global(.dark) .catalog-placeholder {
  --placeholder: #262626;
  --highlight: #404040;
}

@media (prefers-reduced-motion: no-preference) {
  .catalog-placeholder {
    animation: catalog-shimmer 1.5s ease-in-out infinite;
  }
}

@keyframes catalog-shimmer {
  from { background-position: 200% 0; }
  to { background-position: 0 0; }
}
</style>
