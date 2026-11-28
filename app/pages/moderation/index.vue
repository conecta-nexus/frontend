<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AuditLogTable from '~/components/moderation/AuditLogTable.vue'
import SuspensionModal from '~/components/moderation/SuspensionModal.vue'
import { useAuth } from '~/composables/useAuth'
import { useModeration } from '~/composables/useModeration'
import type { ModerationActionType, ModerationTargetType } from '~/types/moderation'
import { extractApiErrorMessage } from '~/utils/errors'

definePageMeta({
  middleware: [
    'auth',
    () => {
      const { userRole } = useAuth()
      if (userRole.value !== 'ADMIN') {
        const toast = useToast()
        toast.add({
          title: 'Acceso denegado (403)',
          description: 'El panel de moderación y auditoría está restringido a administradores.',
          color: 'warning',
          icon: 'i-lucide-shield-alert',
        })
        return navigateTo('/')
      }
    },
  ],
})

useHead({
  title: 'Panel de Moderación | Conecta Nexus UFPS',
  htmlAttrs: {
    lang: 'es-CO',
  },
  meta: [
    {
      name: 'description',
      content: 'Registro institucional inmutable de auditoría y acciones de suspensión en Conecta Nexus.',
    },
  ],
})

const toast = useToast()
const {
  logs,
  totalCount,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  loading,
  submitting,
  error,
  fetchAuditLogs,
  suspendChallenge,
  suspendUser,
} = useModeration()

const selectedActionType = ref<ModerationActionType | ''>('')
const startDate = ref('')
const endDate = ref('')
const filterValidationError = ref<string | null>(null)

const isSuspensionModalOpen = ref(false)
const suspensionTargetType = ref<ModerationTargetType>('CHALLENGE')
const suspensionServerError = ref<string | null>(null)

const hasActiveFilters = computed(() =>
  Boolean(selectedActionType.value || startDate.value || endDate.value),
)

async function loadLogs(page = 1) {
  filterValidationError.value = null
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    filterValidationError.value = 'La fecha inicial no puede ser posterior a la fecha final.'
    return
  }

  try {
    await fetchAuditLogs({
      page,
      action_type: selectedActionType.value,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    })
  } catch {
    // Reactive error banner rendered by AuditLogTable
  }
}

function applyFilters() {
  void loadLogs(1)
}

function clearFilters() {
  selectedActionType.value = ''
  startDate.value = ''
  endDate.value = ''
  filterValidationError.value = null
  void loadLogs(1)
}

function openSuspensionModal(targetType: ModerationTargetType) {
  suspensionTargetType.value = targetType
  suspensionServerError.value = null
  isSuspensionModalOpen.value = true
}

async function handleSuspensionSubmit(payload: {
  targetType: ModerationTargetType
  targetId: string
  justification: string
}) {
  suspensionServerError.value = null
  try {
    if (payload.targetType === 'CHALLENGE') {
      await suspendChallenge(payload.targetId, payload.justification)
      toast.add({
        title: 'Reto suspendido',
        description: 'La suspensión del reto quedó registrada en el historial de auditoría.',
        color: 'success',
        icon: 'i-lucide-shield-check',
      })
    } else {
      await suspendUser(payload.targetId, payload.justification)
      toast.add({
        title: 'Usuario suspendido',
        description: 'La cuenta fue desactivada y auditada correctamente.',
        color: 'success',
        icon: 'i-lucide-shield-check',
      })
    }
    isSuspensionModalOpen.value = false
  } catch (err: unknown) {
    suspensionServerError.value = extractApiErrorMessage(
      err,
      'No se pudo ejecutar la acción de moderación.',
    )
  }
}

onMounted(() => {
  void loadLogs(1)
})
</script>

<template>
  <main class="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
    <!-- Top Header & Administrative Enforcement Actions -->
    <header class="mb-8 flex flex-col justify-between gap-5 rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] lg:flex-row lg:items-center dark:border-neutral-700 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-text-main sm:text-3xl">
          Panel de Moderación e Inmutabilidad
        </h1>
        <p class="mt-1.5 max-w-2xl text-sm font-medium text-text-muted">
          Consulta el historial append-only de auditoría administrativa y ejecuta suspensiones trazables sobre retos o cuentas.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 shrink-0">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-2xl border-2 border-neutral-900 bg-institutional-500 px-4 py-2.5 text-xs font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
          @click="openSuspensionModal('CHALLENGE')"
        >
          <svg
            aria-hidden="true"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>
          <span>Suspender reto</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-2xl border-2 border-neutral-900 bg-pastel-peach px-4 py-2.5 text-xs font-black text-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 dark:border-neutral-600"
          @click="openSuspensionModal('USER')"
        >
          <svg
            aria-hidden="true"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <span>Suspender usuario</span>
        </button>
      </div>
    </header>

    <!-- Audit Log Filters -->
    <section
      aria-label="Filtros del registro de auditoría"
      class="mb-6 rounded-2xl border-2 border-neutral-900 bg-surface p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700"
    >
      <form
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        @submit.prevent="applyFilters"
      >
        <div class="flex flex-col gap-1.5">
          <label
            for="audit-action-type"
            class="text-xs font-black uppercase tracking-wider text-text-muted"
          >
            Tipo de acción
          </label>
          <select
            id="audit-action-type"
            v-model="selectedActionType"
            class="w-full rounded-xl border-2 border-neutral-900 bg-neutral-50 px-3 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            @change="applyFilters"
          >
            <option value="">
              Todas las acciones
            </option>
            <option value="CHALLENGE_SUSPEND">
              Reto suspendido
            </option>
            <option value="USER_SUSPEND">
              Usuario suspendido
            </option>
            <option value="CONTENT_FLAG">
              Contenido marcado
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="audit-start-date"
            class="text-xs font-black uppercase tracking-wider text-text-muted"
          >
            Desde
          </label>
          <input
            id="audit-start-date"
            v-model="startDate"
            type="date"
            class="w-full rounded-xl border-2 border-neutral-900 bg-neutral-50 px-3 py-2 text-xs font-semibold tabular-nums text-neutral-900 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="audit-end-date"
            class="text-xs font-black uppercase tracking-wider text-text-muted"
          >
            Hasta
          </label>
          <input
            id="audit-end-date"
            v-model="endDate"
            type="date"
            class="w-full rounded-xl border-2 border-neutral-900 bg-neutral-50 px-3 py-2 text-xs font-semibold tabular-nums text-neutral-900 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="submit"
            class="rounded-xl border-2 border-neutral-900 bg-neutral-900 px-4 py-2.5 text-xs font-black text-white shadow-[2px_2px_0px_0px_rgba(188,0,23,1)] transition-transform hover:-translate-y-0.5 dark:border-neutral-600 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Filtrar historial
          </button>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="rounded-xl border-2 border-neutral-900 bg-neutral-200 px-3.5 py-2.5 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            @click="clearFilters"
          >
            Limpiar
          </button>
        </div>
      </form>

      <p
        v-if="filterValidationError"
        role="alert"
        class="mt-3 text-xs font-bold text-institutional-500"
      >
        {{ filterValidationError }}
      </p>
    </section>

    <!-- Results Summary & Table -->
    <div class="mb-3 flex items-center justify-between gap-2 text-xs font-bold text-text-muted">
      <span class="tabular-nums">
        {{ totalCount }} {{ totalCount === 1 ? 'evento registrado' : 'eventos registrados' }}
      </span>
      <span class="tabular-nums">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
    </div>

    <AuditLogTable
      :logs="logs"
      :loading="loading"
      :error="error"
      @retry="loadLogs(currentPage)"
    />

    <!-- Pagination Controls -->
    <nav
      v-if="totalCount > 0"
      aria-label="Paginación de registros de auditoría"
      class="mt-6 flex items-center justify-between gap-4"
    >
      <button
        type="button"
        :disabled="!hasPreviousPage || loading"
        class="rounded-xl border-2 border-neutral-900 bg-surface px-4 py-2 text-xs font-black text-text-main shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
        @click="loadLogs(currentPage - 1)"
      >
        Anterior
      </button>

      <button
        type="button"
        :disabled="!hasNextPage || loading"
        class="rounded-xl border-2 border-neutral-900 bg-surface px-4 py-2 text-xs font-black text-text-main shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
        @click="loadLogs(currentPage + 1)"
      >
        Siguiente
      </button>
    </nav>

    <SuspensionModal
      :is-open="isSuspensionModalOpen"
      :target-type="suspensionTargetType"
      :submitting="submitting"
      :server-error="suspensionServerError"
      @update:is-open="isSuspensionModalOpen = $event"
      @submit="handleSuspensionSubmit"
    />
  </main>
</template>
