<script setup lang="ts">
import { computed, useId } from 'vue'

export type ActiveFilters = Record<string, {
  label: string
  value: string
}>

interface Props {
  title?: string
  description?: string
  activeFilters?: ActiveFilters
  totalActiveCount?: number
  showReset?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  activeFilters: () => ({}),
  totalActiveCount: undefined,
  showReset: true,
})

const emit = defineEmits<{
  (e: 'reset'): void
}>()

const headingId = useId()
const descriptionId = useId()
const hasFilters = computed(() => Object.keys(props.activeFilters).length > 0)
const displayTitle = computed(() => {
  if (props.title) return props.title
  if (props.totalActiveCount === 0) return 'No hay oportunidades abiertas'
  if (hasFilters.value) return 'No hay desafíos que coincidan con los filtros seleccionados'
  return 'No se encontraron desafíos'
})

const displayDescription = computed(() => {
  if (props.description) return props.description
  if (props.totalActiveCount === 0) {
    return 'En este momento no hay convocatorias de desafíos disponibles. Vuelve a consultar más adelante para explorar nuevas oportunidades.'
  }
  if (hasFilters.value) {
    return 'No hay convocatorias abiertas que coincidan con los filtros seleccionados. Prueba ajustando la búsqueda o quitando algún filtro.'
  }
  return 'Vuelve a consultar el catálogo para ver las oportunidades disponibles.'
})

const countLabel = computed(() => {
  const count = props.totalActiveCount
  if (count === undefined) return 'El catálogo no informó cuántas oportunidades están abiertas.'
  if (count === 0) return ''
  return count === 1
    ? 'Hay 1 oportunidad abierta en el catálogo.'
    : `Hay ${new Intl.NumberFormat('es-CO').format(count)} oportunidades abiertas en el catálogo.`
})
</script>

<template>
  <section
    class="my-4 w-full rounded-3xl border-2 border-neutral-900 bg-surface px-4 py-8 text-center shadow-[4px_4px_0_var(--border-prominent)] sm:px-8 sm:py-10 dark:border-neutral-700"
    :aria-labelledby="headingId"
    :aria-describedby="descriptionId"
    aria-live="polite"
  >
    <svg
      class="mx-auto mb-5 size-20 text-text-muted"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="38" cy="38" r="35" class="fill-canvas" />
      <circle cx="35" cy="34" r="17" class="fill-surface" stroke="currentColor" stroke-width="3" />
      <path d="m47 47 13 13M28 34h14" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <path d="M56 22h10M61 17v10M16 55h8" class="stroke-border-prominent" stroke-width="2" stroke-linecap="round" />
    </svg>

    <h2 :id="headingId" class="text-balance text-2xl font-black tracking-tight text-text-main sm:text-3xl">
      {{ displayTitle }}
    </h2>
    <p :id="descriptionId" class="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-text-muted">
      {{ displayDescription }}
    </p>

    <div v-if="hasFilters" class="mx-auto mt-5 max-w-2xl">
      <p class="mb-2 text-sm font-semibold text-text-main">
        Filtros aplicados
      </p>
      <ul
        class="flex flex-wrap justify-center gap-2"
        role="list"
        aria-label="Filtros aplicados que limitan la búsqueda"
      >
        <li
          v-for="(filter, key) in activeFilters"
          :key="key"
          role="listitem"
          class="max-w-full rounded-lg border border-border-prominent bg-canvas px-3 py-1.5 text-sm text-text-main [overflow-wrap:anywhere]"
        >
          <span class="text-text-muted">{{ filter.label }}: </span>
          <strong>{{ filter.value }}</strong>
        </li>
      </ul>
    </div>

    <p v-if="countLabel" class="mt-5 text-sm text-text-muted">
      {{ countLabel }}
    </p>

    <div class="mt-6 flex flex-wrap justify-center gap-3">
      <button
        v-if="showReset"
        type="button"
        class="min-h-11 w-full rounded-xl border-2 border-neutral-900 bg-institutional-500 px-4 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_var(--border-prominent)] hover:bg-institutional-600 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-institutional-500 sm:w-auto dark:border-neutral-700 dark:focus-visible:outline-institutional-300"
        @click="emit('reset')"
      >
        Limpiar todos los filtros
      </button>
      <button
        type="button"
        class="min-h-11 w-full rounded-xl border-2 border-neutral-900 bg-surface px-4 py-2.5 text-sm font-bold text-text-main hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-institutional-500 sm:w-auto dark:border-neutral-600 dark:focus-visible:outline-institutional-300"
        @click="emit('reset')"
      >
        Explorar todas las oportunidades abiertas
      </button>
    </div>
  </section>
</template>
