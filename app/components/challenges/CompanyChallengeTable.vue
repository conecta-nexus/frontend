<script setup lang="ts">
import { ref } from 'vue'
import type { Challenge, ChallengeStatus, Modality } from '~/types/challenge'

export type CompanyChallenge = Challenge & {
  applications_count?: number
}

defineProps<{
  challenges: CompanyChallenge[]
  publishingId?: string | null
}>()

const emit = defineEmits<{
  edit: [challenge: CompanyChallenge]
  publish: [challenge: CompanyChallenge]
  manageFiles: [challenge: CompanyChallenge]
  close: [challenge: CompanyChallenge]
}>()

const openMenuId = ref<string | null>(null)

const statusConfig: Record<ChallengeStatus, { label: string, classes: string }> = {
  DRAFT: {
    label: 'Borrador',
    classes: 'border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200',
  },
  OPEN: {
    label: 'Abierto',
    classes: 'border-emerald-600 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  IN_PROGRESS: {
    label: 'En progreso',
    classes: 'border-blue-600 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  CLOSED: {
    label: 'Cerrado',
    classes: 'border-neutral-600 bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
  },
  CANCELLED: {
    label: 'Cancelado',
    classes: 'border-red-600 bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  },
}

const modalityLabels: Record<Modality, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ON_SITE: 'Presencial',
}

function toggleMenu(challengeId: string) {
  openMenuId.value = openMenuId.value === challengeId ? null : challengeId
}

function runAction(
  action: 'edit' | 'publish' | 'manageFiles' | 'close',
  challenge: CompanyChallenge,
) {
  openMenuId.value = null
  emit(action, challenge)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatApplications(value: number | undefined): string {
  return new Intl.NumberFormat('es-CO').format(value ?? 0)
}
</script>

<template>
  <div
    v-if="challenges.length > 0"
    class="overflow-x-auto rounded-3xl border-2 border-neutral-900 bg-surface shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.12)]"
  >
    <table class="min-w-full border-collapse text-left">
      <caption class="sr-only">
        Retos empresariales administrados por la organización
      </caption>
      <thead class="border-b-2 border-neutral-900 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
        <tr class="text-xs font-black uppercase tracking-wider text-text-muted">
          <th scope="col" class="px-5 py-4">
            Reto
          </th>
          <th scope="col" class="px-4 py-4">
            Estado
          </th>
          <th scope="col" class="px-4 py-4">
            Fecha
          </th>
          <th scope="col" class="px-4 py-4 text-center">
            Postulaciones
          </th>
          <th scope="col" class="px-5 py-4 text-right">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody class="divide-y-2 divide-border-subtle">
        <tr
          v-for="challenge in challenges"
          :key="challenge.id"
          class="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
        >
          <td class="min-w-72 px-5 py-4">
            <p class="max-w-md truncate text-sm font-black text-text-main" :title="challenge.title">
              {{ challenge.title }}
            </p>
            <p class="mt-1 text-xs font-semibold text-text-muted">
              {{ challenge.economic_sector }} · {{ modalityLabels[challenge.modality] }}
            </p>
          </td>
          <td class="whitespace-nowrap px-4 py-4">
            <span
              :class="[
                statusConfig[challenge.status].classes,
                'inline-flex rounded-full border px-2.5 py-1 text-xs font-black',
              ]"
            >
              {{ statusConfig[challenge.status].label }}
            </span>
          </td>
          <td class="whitespace-nowrap px-4 py-4 text-xs font-bold text-text-muted">
            {{ formatDate(challenge.created_at) }}
          </td>
          <td class="px-4 py-4 text-center">
            <span class="inline-flex min-w-9 justify-center rounded-lg border-2 border-neutral-900/30 bg-pastel-blue px-2 py-1 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-pastel-blue/20 dark:text-neutral-100">
              {{ formatApplications(challenge.applications_count) }}
            </span>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-right">
            <div
              class="relative inline-block text-left"
              @keydown.esc="openMenuId = null"
            >
              <button
                type="button"
                class="inline-flex min-h-10 items-center gap-2 rounded-xl border-2 border-neutral-900 bg-white px-3 py-2 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:shadow-none"
                aria-haspopup="menu"
                :aria-expanded="openMenuId === challenge.id"
                :aria-controls="`challenge-actions-${challenge.id}`"
                :aria-label="`Acciones para ${challenge.title}`"
                @click="toggleMenu(challenge.id)"
              >
                Acciones
                <span aria-hidden="true">⌄</span>
              </button>

              <div
                v-if="openMenuId === challenge.id"
                :id="`challenge-actions-${challenge.id}`"
                role="menu"
                class="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border-2 border-neutral-900 bg-surface p-1.5 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  class="block w-full rounded-xl px-3 py-2 text-left text-xs font-black text-text-main hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  @click="runAction('edit', challenge)"
                >
                  Editar
                </button>
                <button
                  v-if="challenge.status === 'DRAFT'"
                  type="button"
                  role="menuitem"
                  class="block w-full rounded-xl px-3 py-2 text-left text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  :disabled="publishingId === challenge.id"
                  @click="runAction('publish', challenge)"
                >
                  {{ publishingId === challenge.id ? 'Publicando…' : 'Publicar' }}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="block w-full rounded-xl px-3 py-2 text-left text-xs font-black text-text-main hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  @click="runAction('manageFiles', challenge)"
                >
                  Gestionar archivos
                </button>
                <button
                  v-if="challenge.status === 'OPEN' || challenge.status === 'IN_PROGRESS'"
                  type="button"
                  role="menuitem"
                  class="block w-full rounded-xl px-3 py-2 text-left text-xs font-black text-institutional-700 hover:bg-institutional-50 dark:text-institutional-300 dark:hover:bg-institutional-950/40"
                  @click="runAction('close', challenge)"
                >
                  Cerrar reto
                </button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div
    v-else
    class="rounded-3xl border-2 border-dashed border-neutral-400 bg-neutral-50 px-6 py-14 text-center dark:border-neutral-700 dark:bg-neutral-900"
    role="status"
  >
    <div class="mx-auto flex size-14 items-center justify-center rounded-2xl border-2 border-neutral-900 bg-pastel-coral text-2xl dark:border-neutral-600 dark:bg-pastel-coral/25" aria-hidden="true">
      ◇
    </div>
    <h3 class="mt-4 text-lg font-black text-text-main">
      No hay retos en este estado
    </h3>
    <p class="mt-1 text-sm text-text-muted">
      Cambia el filtro o publica un nuevo reto empresarial.
    </p>
  </div>
</template>
