<script setup lang="ts">
import type { Challenge, ChallengeStatus } from '~/types/challenge'

interface Props {
  challenges: Challenge[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'publish' | 'close' | 'manage-files', challenge: Challenge): void
}>()

interface StatusConfig {
  label: string
  badgeClass: string
  dotClass: string
}

const STATUS_CONFIG: Record<ChallengeStatus, StatusConfig> = {
  DRAFT: {
    label: 'Borrador',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  OPEN: {
    label: 'Abierto / En Convocatoria',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  IN_PROGRESS: {
    label: 'En Ejecución',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  CLOSED: {
    label: 'Cerrado',
    badgeClass: 'bg-neutral-200 text-neutral-800 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-300',
    dotClass: 'bg-neutral-500',
  },
  CANCELLED: {
    label: 'Cancelado',
    badgeClass: 'bg-red-100 text-red-900 border-red-500/40 dark:bg-red-950/60 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
}

function getStatusInfo(status: ChallengeStatus): StatusConfig {
  return STATUS_CONFIG[status] || {
    label: status,
    badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    dotClass: 'bg-neutral-400',
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="w-full overflow-hidden border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl bg-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]">
    <!-- Estado de Carga -->
    <div v-if="loading" class="p-12 text-center space-y-3">
      <div class="inline-block animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" />
      <p class="text-xs font-bold text-text-muted">
        Cargando retos empresariales...
      </p>
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="!challenges || challenges.length === 0"
      class="p-12 text-center space-y-4"
    >
      <div class="w-16 h-16 mx-auto rounded-2xl bg-pastel-coral dark:bg-pastel-coral/20 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <svg class="w-8 h-8 text-neutral-900 dark:text-neutral-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-black text-text-main">
          No hay desafíos en esta sección
        </h3>
        <p class="text-xs text-text-muted mt-1 max-w-sm mx-auto font-medium">
          Publica un nuevo reto para iniciar la recepción de soluciones y colaboraciones con estudiantes.
        </p>
      </div>
      <NuxtLink
        to="/challenges/new"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-neutral-900 bg-red-600 text-white font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
      >
        <span>+ Publicar Nuevo Reto</span>
      </NuxtLink>
    </div>

    <!-- Tabla Responsiva de Desafíos -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b-2 border-neutral-900 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-[11px] font-black uppercase tracking-wider text-text-main">
            <th class="py-3 px-4 sm:px-6">Desafío / Proceso</th>
            <th class="py-3 px-4">Estado</th>
            <th class="py-3 px-4">Modalidad</th>
            <th class="py-3 px-4">Archivos</th>
            <th class="py-3 px-4">Fecha</th>
            <th class="py-3 px-4 sm:px-6 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y border-border-subtle text-xs">
          <tr
            v-for="ch in challenges"
            :key="ch.id"
            class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
          >
            <!-- Título y Proceso -->
            <td class="py-4 px-4 sm:px-6 max-w-xs">
              <NuxtLink
                :to="`/challenges/${ch.id}`"
                class="font-black text-text-main hover:text-red-600 dark:hover:text-red-400 line-clamp-1 block"
                :title="ch.title"
              >
                {{ ch.title }}
              </NuxtLink>
              <p
                v-if="ch.business_process"
                class="text-[11px] text-text-muted mt-0.5 truncate font-medium"
                :title="'Proceso: ' + ch.business_process"
              >
                Proceso: {{ ch.business_process }}
              </p>
            </td>

            <!-- Estado -->
            <td class="py-4 px-4 whitespace-nowrap">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border"
                :class="getStatusInfo(ch.status).badgeClass"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="getStatusInfo(ch.status).dotClass" />
                {{ getStatusInfo(ch.status).label }}
              </span>
            </td>

            <!-- Modalidad y Dificultad -->
            <td class="py-4 px-4 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-md border border-neutral-900/20 text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800">
                  {{ ch.modality }}
                </span>
                <span class="text-[10px] font-bold text-text-muted">
                  {{ ch.difficulty_level }}
                </span>
              </div>
            </td>

            <!-- Archivos Adjuntos -->
            <td class="py-4 px-4 whitespace-nowrap">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-neutral-900/30 text-[11px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title="Gestionar archivos adjuntos"
                @click="emit('manage-files', ch)"
              >
                <span>📎</span>
                <span>{{ ch.attachments?.length || 0 }}</span>
              </button>
            </td>

            <!-- Fecha -->
            <td class="py-4 px-4 whitespace-nowrap text-text-muted font-medium">
              {{ formatDate(ch.created_at) }}
            </td>

            <!-- Acciones -->
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
              <div class="inline-flex items-center gap-2">
                <!-- Publicar (Solo en Borrador) -->
                <button
                  v-if="ch.status === 'DRAFT'"
                  type="button"
                  class="px-2.5 py-1 rounded-lg border border-neutral-900 bg-pastel-mint dark:bg-pastel-mint/30 hover:bg-pastel-mint/60 font-black text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  title="Abrir convocatoria al público"
                  @click="emit('publish', ch)"
                >
                  Publicar
                </button>

                <!-- Gestionar Archivos -->
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg border border-neutral-900 bg-canvas font-bold text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 active:translate-x-0.5 active:translate-y-0.5"
                  title="Subir o revisar anexos técnicos"
                  @click="emit('manage-files', ch)"
                >
                  Anexos
                </button>

                <!-- Cerrar (Solo si está Abierto o En Progreso) -->
                <button
                  v-if="ch.status === 'OPEN' || ch.status === 'IN_PROGRESS'"
                  type="button"
                  class="px-2.5 py-1 rounded-lg border border-neutral-900 bg-red-100 hover:bg-red-200 text-red-700 font-black text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  title="Cierre voluntario con justificación"
                  @click="emit('close', ch)"
                >
                  Cerrar
                </button>

                <!-- Ver Detalle -->
                <NuxtLink
                  :to="`/challenges/${ch.id}`"
                  class="px-2.5 py-1 rounded-lg border border-neutral-900 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-black text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  title="Ver vista pública del reto"
                >
                  Ver →
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
