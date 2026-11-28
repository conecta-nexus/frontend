<script setup lang="ts">
import { ref } from 'vue'
import type { AuditLogEntry } from '~/types/moderation'

defineProps<{
  logs: AuditLogEntry[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const selectedEntry = ref<AuditLogEntry | null>(null)

interface ActionMeta {
  label: string
  badgeClass: string
}

const ACTION_META: Record<string, ActionMeta> = {
  CHALLENGE_SUSPEND: {
    label: 'Reto suspendido',
    badgeClass: 'border-institutional-500 bg-pastel-coral text-neutral-900 dark:border-rose-400 dark:bg-rose-950/70 dark:text-rose-200',
  },
  USER_SUSPEND: {
    label: 'Usuario suspendido',
    badgeClass: 'border-amber-700 bg-pastel-peach text-neutral-900 dark:border-amber-400 dark:bg-amber-950/70 dark:text-amber-200',
  },
  CONTENT_FLAG: {
    label: 'Contenido marcado',
    badgeClass: 'border-blue-700 bg-pastel-blue text-neutral-900 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-200',
  },
}

function getActionMeta(actionType: string): ActionMeta {
  return ACTION_META[actionType] ?? {
    label: actionType,
    badgeClass: 'border-neutral-700 bg-neutral-100 text-neutral-900 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-200',
  }
}

function getTargetLabel(targetType: string): string {
  if (targetType === 'CHALLENGE') return 'Reto'
  if (targetType === 'USER') return 'Usuario'
  return targetType
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function shortUuid(value: string): string {
  if (value.length <= 14) return value
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

function toggleInspection(entry: AuditLogEntry) {
  selectedEntry.value = selectedEntry.value?.id === entry.id ? null : entry
}
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Loading Skeleton -->
    <div
      v-if="loading && logs.length === 0"
      class="overflow-hidden rounded-2xl border-2 border-neutral-900 bg-surface p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700"
      aria-busy="true"
      aria-label="Cargando registros de auditoría"
    >
      <div class="space-y-3">
        <div
          v-for="row in 4"
          :key="row"
          class="h-12 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/70"
        />
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && logs.length === 0"
      role="alert"
      class="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-neutral-900 bg-pastel-coral/50 p-6 text-neutral-900 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center dark:border-rose-500/70 dark:bg-rose-950/50 dark:text-rose-100"
    >
      <div class="space-y-1">
        <h2 class="text-base font-black">
          No fue posible consultar el historial de auditoría
        </h2>
        <p class="text-sm font-medium">
          {{ error }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-xl border-2 border-neutral-900 bg-white px-4 py-2 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
        @click="emit('retry')"
      >
        Reintentar
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="logs.length === 0"
      class="rounded-2xl border-2 border-neutral-900 bg-surface p-10 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700"
    >
      <h2 class="text-lg font-black text-text-main">
        Sin eventos de moderación registrados
      </h2>
      <p class="mx-auto mt-2 max-w-md text-sm font-medium text-text-muted">
        No se encontraron entradas que coincidan con los filtros seleccionados o aún no se han ejecutado acciones administrativas.
      </p>
    </div>

    <!-- Immutable Audit Log Table -->
    <div
      v-else
      class="overflow-hidden rounded-2xl border-2 border-neutral-900 bg-surface shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.1)]"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b-2 border-neutral-900 bg-neutral-100 text-xs font-black uppercase tracking-wider text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              <th
                scope="col"
                class="px-4 py-3.5 whitespace-nowrap"
              >
                Fecha
              </th>
              <th
                scope="col"
                class="px-4 py-3.5 whitespace-nowrap"
              >
                Acción
              </th>
              <th
                scope="col"
                class="px-4 py-3.5 whitespace-nowrap"
              >
                Administrador
              </th>
              <th
                scope="col"
                class="px-4 py-3.5 whitespace-nowrap"
              >
                Objetivo
              </th>
              <th
                scope="col"
                class="px-4 py-3.5"
              >
                Justificación
              </th>
              <th
                scope="col"
                class="px-4 py-3.5 whitespace-nowrap"
              >
                IP origen
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr
              v-for="entry in logs"
              :key="entry.id"
              class="transition-colors hover:bg-neutral-50/90 dark:hover:bg-neutral-800/40"
            >
              <td class="px-4 py-3.5 font-medium tabular-nums text-xs text-text-main whitespace-nowrap">
                {{ formatDateTime(entry.created_at) }}
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span
                  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-black"
                  :class="getActionMeta(entry.action_type).badgeClass"
                >
                  {{ getActionMeta(entry.action_type).label }}
                </span>
              </td>
              <td class="px-4 py-3.5">
                <div class="font-bold text-xs text-text-main">
                  {{ entry.actor_email }}
                </div>
                <div class="font-mono text-xs text-text-muted">
                  {{ shortUuid(entry.actor_id) }}
                </div>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span class="inline-flex items-center rounded-md border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
                  {{ getTargetLabel(entry.target_type) }}
                </span>
                <span
                  :title="entry.target_id"
                  class="ml-1.5 font-mono text-xs text-text-muted"
                >
                  {{ shortUuid(entry.target_id) }}
                </span>
              </td>
              <td class="max-w-xs px-4 py-3.5">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs font-medium text-text-main">
                    {{ entry.justification }}
                  </p>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg border border-neutral-900 bg-white px-2.5 py-1 text-xs font-black text-neutral-900 hover:bg-pastel-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                    :aria-expanded="selectedEntry?.id === entry.id"
                    @click="toggleInspection(entry)"
                  >
                    {{ selectedEntry?.id === entry.id ? 'Ocultar' : 'Ver detalle' }}
                  </button>
                </div>
              </td>
              <td class="px-4 py-3.5 font-mono text-xs tabular-nums text-text-muted whitespace-nowrap">
                {{ entry.ip_address }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Justification Detail Popover / Panel -->
    <section
      v-if="selectedEntry"
      aria-label="Detalle completo del registro de auditoría"
      class="rounded-2xl border-2 border-neutral-900 bg-pastel-blue/40 p-5 text-text-main shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:bg-neutral-900"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-black">
            Justificación institucional registrada
          </h3>
          <p class="mt-0.5 font-mono text-xs text-text-muted">
            Evento {{ selectedEntry.id }} · Objetivo {{ selectedEntry.target_type }} ({{ selectedEntry.target_id }})
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border-2 border-neutral-900 bg-white px-3 py-1 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          @click="selectedEntry = null"
        >
          Cerrar detalle
        </button>
      </div>
      <p class="mt-3 whitespace-pre-line rounded-xl border border-neutral-900/20 bg-white p-3.5 text-sm font-medium leading-relaxed text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
        {{ selectedEntry.justification }}
      </p>
    </section>
  </div>
</template>
