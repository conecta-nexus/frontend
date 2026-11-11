<script setup lang="ts">
import { computed } from 'vue'

export interface ActiveFilterItem {
  key: string
  label: string
  value: string
}

interface Props {
  title?: string
  description?: string
  activeFilters?: ActiveFilterItem[]
  showReset?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'No se encontraron desafíos',
  description: '',
  activeFilters: () => [],
  showReset: undefined,
})

const emit = defineEmits<{
  (e: 'reset'): void
}>()

const hasActiveFilters = computed(() => props.activeFilters.length > 0)

const displayDescription = computed(() => {
  if (props.description) return props.description
  if (hasActiveFilters.value) {
    return 'No hay convocatorias abiertas que coincidan con los filtros seleccionados. Intenta ajustar la búsqueda o restablecer los criterios.'
  }
  return 'En este momento no hay convocatorias de desafíos disponibles. Vuelve a consultar más adelante para explorar nuevas oportunidades.'
})

const shouldShowReset = computed(() => {
  if (typeof props.showReset === 'boolean') {
    return props.showReset
  }
  return true
})
</script>

<template>
  <section
    class="w-full bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-8 sm:p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)] my-4"
    aria-live="polite"
  >
    <!-- Badge Superior Neo-brutalista -->
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-coral dark:bg-pastel-coral/25 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-900/30 dark:border-neutral-600 mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)]">
      <span>🔍</span>
      <span>Catálogo de Oportunidades</span>
    </div>

    <!-- Icono Ilustrativo Central -->
    <div
      class="w-20 h-20 mx-auto mb-6 bg-pastel-peach dark:bg-pastel-peach/20 border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
      aria-hidden="true"
    >
      <svg
        class="w-10 h-10 text-neutral-900 dark:text-neutral-100"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M8 11h6" />
      </svg>
    </div>

    <!-- Título Principal -->
    <h2 class="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight mb-3">
      {{ title }}
    </h2>

    <!-- Texto Explicativo -->
    <p class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto font-medium leading-relaxed mb-6">
      {{ displayDescription }}
    </p>

    <!-- Filtros Activos que limitaron el resultado -->
    <div
      v-if="hasActiveFilters"
      class="mb-8 p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-950/60 border-2 border-neutral-900/20 dark:border-neutral-700/60 rounded-2xl max-w-2xl mx-auto"
    >
      <p class="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 text-center">
        Filtros aplicados:
      </p>
      <div
        class="flex flex-wrap items-center justify-center gap-2"
        role="list"
        aria-label="Filtros aplicados que limitan la búsqueda"
      >
        <span
          v-for="filter in activeFilters"
          :key="filter.key"
          role="listitem"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-600 rounded-xl text-xs font-bold text-neutral-900 dark:text-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)]"
        >
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">{{ filter.label }}: </span>
          <span class="font-black">{{ filter.value }}</span>
        </span>
      </div>
    </div>

    <!-- Botón de Acción Principal -->
    <div v-if="shouldShowReset">
      <button
        type="button"
        class="inline-flex items-center gap-2.5 px-6 py-3.5 bg-institutional-500 hover:bg-institutional-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-institutional-500 transition-all cursor-pointer"
        aria-label="Restablecer todos los filtros"
        @click="emit('reset')"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span>Restablecer todos los filtros</span>
      </button>
    </div>
  </section>
</template>
