<script setup lang="ts">
import { computed, watch } from 'vue'
import ChallengeCard from '~/components/challenges/ChallengeCard.vue'
import { useChallenges } from '~/composables/useChallenges'

useHead({
  title: 'Catálogo de Retos de la Industria | Conecta Nexus UFPS',
  meta: [
    {
      name: 'description',
      content: 'Banco oficial de problemáticas y retos de la industria regional para estudiantes de ingeniería de sistemas de la UFPS.',
    },
  ],
})

const route = useRoute()
const router = useRouter()

const {
  challenges,
  pagination,
  loading,
  error,
  fetchCatalog,
} = useChallenges()

const ALLOWED_SIZES = [12, 24, 48] as const
type AllowedSize = (typeof ALLOWED_SIZES)[number]

function parsePage(value: unknown): number {
  if (typeof value !== 'string' || value.trim() === '') return 1
  const num = Number(value)
  return Number.isInteger(num) && num >= 1 ? num : 1
}

function parseSize(value: unknown): AllowedSize {
  if (typeof value !== 'string' || value.trim() === '') return 12
  const num = Number(value)
  if (!Number.isInteger(num)) return 12
  return ALLOWED_SIZES.includes(num as AllowedSize) ? (num as AllowedSize) : 12
}

const currentPage = computed<number>(() => parsePage(route.query.page))
const currentSize = computed<AllowedSize>(() => parseSize(route.query.size))

const totalCount = computed<number>(() => {
  if (pagination.value && typeof pagination.value.total === 'number') {
    return pagination.value.total
  }
  return challenges.value.length
})

const resultsSummaryText = computed<string>(() => {
  const total = totalCount.value
  const count = challenges.value.length

  if (total === 0 || count === 0) {
    return '0 oportunidades disponibles'
  }

  const start = (currentPage.value - 1) * currentSize.value + 1
  const end = Math.min(start + count - 1, total)

  if (total === 1) {
    return 'Mostrando 1 de 1 oportunidad disponible'
  }

  return `Mostrando ${start}–${end} de ${total} oportunidades`
})

async function loadData(): Promise<void> {
  try {
    await fetchCatalog({
      page: currentPage.value,
      limit: currentSize.value,
    })
  } catch {
    // El composable useChallenges ya captura y asigna error.value de forma reactiva
  }
}

async function handlePageChange(newPage: number): Promise<void> {
  const normalizedPage = Math.max(1, newPage)
  if (normalizedPage === currentPage.value) return

  await router.push({
    query: {
      ...route.query,
      page: String(normalizedPage),
    },
  })
}

async function handleSizeChange(newSize: AllowedSize): Promise<void> {
  if (newSize === currentSize.value) return

  await router.push({
    query: {
      ...route.query,
      size: String(newSize),
      page: '1',
    },
  })
}

// Sincronización reactiva con URL query params (inicial y subsecuente)
watch(
  [() => route.query.page, () => route.query.size],
  () => {
    loadData()
  },
  { immediate: true },
)
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
    <!-- 1. Encabezado Compacto del Catálogo (Masthead) -->
    <header
      class="p-6 sm:p-8 rounded-3xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] space-y-3"
    >
      <div
        class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 border-neutral-900/30 dark:border-neutral-600 bg-pastel-mint/30 dark:bg-pastel-mint/15 text-text-main"
      >
        <span class="w-2.5 h-2.5 rounded-full bg-institutional-500 animate-pulse" />
        <span>Ecosistema de Innovación UFPS · Periodo Activo</span>
      </div>

      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-text-main tracking-tight">
        Catálogo de Retos de la Industria
      </h1>

      <p class="text-sm sm:text-base text-text-muted font-medium max-w-2xl leading-relaxed">
        Problemáticas reales planteadas por empresas y PYMEs de la región para ser desarrolladas por estudiantes de Ingeniería de Sistemas UFPS en cursos y prácticas curriculares (semestres 6.º a 10.º).
      </p>
    </header>

    <!-- 2. Barra de Resultados y Selector de Tamaño -->
    <section
      aria-label="Controles del catálogo"
      class="p-4 sm:p-5 rounded-2xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <!-- Resumen de Oportunidades -->
      <div class="text-sm font-bold text-text-main">
        <span v-if="loading" class="text-text-muted">Actualizando oportunidades...</span>
        <span v-else>{{ resultsSummaryText }}</span>
      </div>

      <!-- Selector de Tamaño de Página -->
      <div class="flex items-center gap-2.5 self-end sm:self-auto">
        <span class="text-xs font-black uppercase tracking-wider text-text-muted">Por página:</span>
        <div
          role="group"
          aria-label="Seleccionar cantidad de retos por página"
          class="inline-flex rounded-xl border-2 border-neutral-900 dark:border-neutral-700 p-0.5 bg-canvas"
        >
          <button
            v-for="size in ALLOWED_SIZES"
            :key="size"
            type="button"
            :aria-pressed="currentSize === size"
            :class="[
              currentSize === size
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-text-muted hover:text-text-main hover:bg-surface/50',
              'min-w-[44px] min-h-[44px] px-3.5 rounded-lg text-xs font-black transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500',
            ]"
            @click="handleSizeChange(size)"
          >
            {{ size }}
          </button>
        </div>
      </div>
    </section>

    <!-- 3. Estados de la Superficie -->

    <!-- 3.1. Estado de Carga (Skeleton Grid: 6 tarjetas) -->
    <div
      v-if="loading"
      role="status"
      aria-live="polite"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
    >
      <span class="sr-only">Cargando catálogo de retos disponibles...</span>

      <div
        v-for="i in 6"
        :key="'skeleton-' + i"
        class="rounded-3xl border-2 border-neutral-900/15 dark:border-neutral-700/30 p-6 sm:p-7 bg-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.04)] animate-pulse flex flex-col justify-between space-y-6"
      >
        <div class="space-y-4">
          <!-- Cabecera Skeleton -->
          <div class="flex items-center justify-between">
            <div class="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div class="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
          </div>

          <!-- Sector & Dificultad Skeleton -->
          <div class="flex items-center justify-between pt-1">
            <div class="h-5 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div class="h-5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
          </div>

          <!-- Título Skeleton -->
          <div class="space-y-2 pt-2">
            <div class="h-6 w-5/6 bg-neutral-300 dark:bg-neutral-700 rounded-lg" />
            <div class="h-6 w-3/5 bg-neutral-300 dark:bg-neutral-700 rounded-lg" />
            <div class="h-3 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>

          <!-- Descripción Skeleton -->
          <div class="space-y-1.5 pt-1">
            <div class="h-3.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div class="h-3.5 w-11/12 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div class="h-3.5 w-4/5 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        </div>

        <!-- Footer Skeleton -->
        <div class="pt-5 border-t-2 border-neutral-200 dark:border-neutral-800 space-y-3">
          <div class="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          <div class="flex gap-2">
            <div class="h-5 w-14 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
            <div class="h-5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
            <div class="h-5 w-12 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          </div>
        </div>
      </div>
    </div>

    <!-- 3.2. Estado de Error -->
    <div
      v-else-if="error"
      role="alert"
      class="rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 p-8 sm:p-12 text-center bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] max-w-xl mx-auto space-y-5"
    >
      <div
        class="w-16 h-16 mx-auto rounded-2xl bg-pastel-coral dark:bg-pastel-coral/25 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-neutral-900 dark:text-neutral-100"
      >
        <svg
          class="w-8 h-8 text-neutral-900 dark:text-neutral-100"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h2 class="text-xl sm:text-2xl font-black text-text-main tracking-tight">
        No pudimos conectar con el banco de oportunidades
      </h2>

      <p class="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
        Ocurrió un problema al cargar los retos de la industria. Por favor, verifica tu conexión e inténtalo de nuevo.
      </p>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-institutional-500 hover:bg-institutional-600 text-white font-black text-sm uppercase tracking-wider border-2 border-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
        @click="loadData"
      >
        <span>Reintentar</span>
      </button>
    </div>

    <!-- 3.3. Estado Vacío Básico -->
    <div
      v-else-if="challenges.length === 0"
      class="rounded-3xl border-2 border-dashed border-border-prominent p-10 sm:p-14 text-center bg-surface/40 max-w-xl mx-auto space-y-4"
    >
      <div
        class="w-16 h-16 mx-auto rounded-2xl bg-pastel-blue/40 dark:bg-pastel-blue/20 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-text-main"
      >
        <svg
          class="w-8 h-8 text-neutral-900 dark:text-neutral-100"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>

      <h2 class="text-xl font-black text-text-main tracking-tight">
        No hay oportunidades disponibles en este momento.
      </h2>

      <p class="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
        Las empresas aliadas publican nuevos retos periódicamente para el semestre académico.
      </p>

      <div class="pt-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface hover:bg-canvas text-text-main font-bold text-sm border-2 border-neutral-900 dark:border-neutral-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
          @click="loadData"
        >
          <span>Actualizar lista</span>
        </button>
      </div>
    </div>

    <!-- 3.4. Cuadrícula de Retos Poblada -->
    <div
      v-else
      class="space-y-8"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <ChallengeCard
          v-for="challenge in challenges"
          :key="challenge.id"
          :challenge="challenge"
        />
      </div>

      <!-- 4. Paginación con UPagination de Nuxt UI 4.x -->
      <nav
        v-if="totalCount > currentSize"
        aria-label="Paginación de oportunidades"
        class="flex justify-center pt-4 pb-8"
      >
        <UPagination
          :page="currentPage"
          :total="totalCount"
          :items-per-page="currentSize"
          :show-edges="true"
          :sibling-count="1"
          size="md"
          @update:page="handlePageChange"
        />
      </nav>
    </div>
  </div>
</template>
