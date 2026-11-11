<script setup lang="ts">
import { onMounted, watch } from 'vue'
import type { ChallengeCatalogFilter } from '~/types/challenge'
import CatalogFilterBar from '~/components/challenges/CatalogFilterBar.vue'

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
const { challenges, pagination, loading, error, fetchCatalog } = useChallenges()

// Fetch opportunities using route query parameters
async function loadCatalog() {
  try {
    const filters: ChallengeCatalogFilter = {
      q: typeof route.query.q === 'string' ? route.query.q : undefined,
      sector: typeof route.query.sector === 'string' ? route.query.sector : (typeof route.query.economic_sector === 'string' ? route.query.economic_sector : undefined),
      modality: typeof route.query.modality === 'string' ? (route.query.modality as ChallengeCatalogFilter['modality']) : undefined,
      difficulty: typeof route.query.difficulty === 'string' ? (route.query.difficulty as ChallengeCatalogFilter['difficulty']) : undefined,
      skill: typeof route.query.skill === 'string' ? route.query.skill : undefined,
      knowledge_area: typeof route.query.knowledge_area === 'string' ? route.query.knowledge_area : undefined,
      min_semester: typeof route.query.min_semester === 'string' ? parseInt(route.query.min_semester, 10) : undefined,
      page: typeof route.query.page === 'string' ? parseInt(route.query.page, 10) : 1,
      limit: typeof route.query.limit === 'string' ? parseInt(route.query.limit, 10) : 10,
    }
    await fetchCatalog(filters)
  } catch {
    // Error is handled reactively by useChallenges()
  }
}

function handleFilterChange() {
  loadCatalog()
}

function handleReset() {
  router.push({ query: {} })
  loadCatalog()
}

function changePage(newPage: number) {
  router.push({
    query: {
      ...route.query,
      page: String(newPage),
    },
  })
}

watch(
  () => route.query,
  () => {
    loadCatalog()
  },
  { deep: true },
)

onMounted(() => {
  loadCatalog()
})
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-140px)]">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-950/60 border border-red-600 rounded-full text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-3">
        <span>Oportunidades Reales</span>
      </div>
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
        Catálogo de Desafíos Empresariales
      </h1>
      <p class="mt-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-3xl font-medium">
        Encuentra proyectos reales del sector empresarial, filtra por tecnologías y aplica con tu carta de motivación académica.
      </p>
    </div>

    <!-- Reactive Filter Bar Component -->
    <CatalogFilterBar
      :loading="loading"
      :total-results="pagination?.total || 0"
      @filter-change="handleFilterChange"
      @reset="handleReset"
    />

    <!-- Error Banner -->
    <div
      v-if="error"
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

    <!-- Loading Skeleton Grid -->
    <div
      v-if="loading && (!challenges || challenges.length === 0)"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="h-64 bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 rounded-2xl animate-pulse"
      />
    </div>

    <!-- Challenges Cards Grid -->
    <div
      v-else-if="challenges && challenges.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="challenge in challenges"
        :key="challenge.id"
        class="bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all"
      >
        <div>
          <!-- Header Badges -->
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-600 text-amber-900 dark:text-amber-300 rounded-full text-xs font-black uppercase">
              {{ challenge.economic_sector }}
            </span>
            <span class="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 border border-blue-600 text-blue-900 dark:text-blue-300 rounded-full text-xs font-bold">
              {{ challenge.modality }}
            </span>
            <span class="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 border border-purple-600 text-purple-900 dark:text-purple-300 rounded-full text-xs font-bold">
              {{ challenge.difficulty_level }}
            </span>
          </div>

          <!-- Challenge Title -->
          <h2 class="text-xl font-black text-neutral-900 dark:text-neutral-100 line-clamp-2 mb-2">
            {{ challenge.title }}
          </h2>

          <!-- Description Preview -->
          <p class="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm line-clamp-3 mb-4 font-normal">
            {{ challenge.description }}
          </p>

          <!-- Skills Badges -->
          <div
            v-if="challenge.required_skills && challenge.required_skills.length > 0"
            class="flex flex-wrap gap-1.5 mb-4"
          >
            <span
              v-for="skill in challenge.required_skills.slice(0, 4)"
              :key="skill"
              class="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-[11px] font-bold text-neutral-700 dark:text-neutral-300"
            >
              #{{ skill }}
            </span>
            <span
              v-if="challenge.required_skills.length > 4"
              class="px-1.5 py-0.5 text-[10px] font-black text-neutral-500"
            >
              +{{ challenge.required_skills.length - 4 }}
            </span>
          </div>
        </div>

        <!-- Footer / CTA -->
        <div class="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between mt-2">
          <span class="text-xs font-bold text-neutral-500 dark:text-neutral-400">
            Semestre mín. {{ challenge.min_semester }}°
          </span>
          <NuxtLink
            :to="`/challenges/${challenge.id}`"
            class="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            Ver Detalles →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Empty State Fallback (To be extended by FRONTEND-TASK-10 CatalogEmptyState.vue) -->
    <div
      v-else-if="!loading && challenges && challenges.length === 0"
      class="w-full bg-neutral-50 dark:bg-neutral-900 border-2 border-dashed border-neutral-400 dark:border-neutral-700 rounded-3xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]"
    >
      <div class="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-[3px_3px_0px_0px_rgba(217,119,6,1)]">
        🔍
      </div>
      <h3 class="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
        No se encontraron desafíos
      </h3>
      <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6">
        No hay convocatorias abiertas que coincidan con los filtros seleccionados. Intenta ajustar la búsqueda o restablecer los criterios.
      </p>
      <button
        type="button"
        class="px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-black text-sm rounded-xl shadow-[3px_3px_0px_0px_rgba(220,38,38,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5"
        @click="handleReset"
      >
        Restablecer todos los filtros
      </button>
    </div>

    <!-- Pagination Controls -->
    <div
      v-if="pagination && pagination.pages > 1"
      class="mt-12 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        :disabled="pagination.page <= 1"
        class="px-4 py-2 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        @click="changePage(pagination.page - 1)"
      >
        ← Anterior
      </button>
      <span class="text-xs font-black text-neutral-700 dark:text-neutral-300 px-2">
        Página {{ pagination.page }} de {{ pagination.pages }}
      </span>
      <button
        type="button"
        :disabled="pagination.page >= pagination.pages"
        class="px-4 py-2 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        @click="changePage(pagination.page + 1)"
      >
        Siguiente →
      </button>
    </div>
  </div>
</template>
