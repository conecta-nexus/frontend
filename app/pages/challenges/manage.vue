<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useChallenges } from '~/composables/useChallenges'
import type { Challenge } from '~/types/challenge'
import CompanyChallengeTable from '~/components/challenges/CompanyChallengeTable.vue'
import ClosureModal from '~/components/challenges/ClosureModal.vue'
import AttachmentManagerModal from '~/components/challenges/AttachmentManagerModal.vue'

definePageMeta({
  middleware: [
    'auth',
    () => {
      const { userRole } = useAuth()
      if (userRole.value !== 'COMPANY') {
        try {
          const toast = useToast()
          toast.add({
            title: 'Acceso restringido',
            description: 'El panel de gestión de retos está reservado para empresas registradas.',
            color: 'warning',
            icon: 'i-lucide-shield-alert',
          })
        } catch {
          // testing fallback
        }
        return navigateTo('/challenges')
      }
    },
  ],
})

useHead({
  title: 'Gestión de Retos Empresariales | Conecta Nexus UFPS',
})

const {
  challenges,
  loading,
  error,
  fetchCompanyChallenges,
  updateChallenge,
} = useChallenges()

const selectedStatusTab = ref<string>('ALL')
const activeChallengeForClosure = ref<Challenge | null>(null)
const isClosureModalOpen = ref(false)

const activeChallengeForAttachments = ref<Challenge | null>(null)
const isAttachmentsModalOpen = ref(false)

// Cómputo de métricas resumen del portafolio
const metrics = computed(() => {
  const total = challenges.value.length
  const draft = challenges.value.filter(c => c.status === 'DRAFT').length
  const open = challenges.value.filter(c => c.status === 'OPEN').length
  const inProgress = challenges.value.filter(c => c.status === 'IN_PROGRESS').length
  const closed = challenges.value.filter(c => c.status === 'CLOSED').length
  return { total, draft, open, inProgress, closed }
})

// Filtrado según la pestaña seleccionada
const filteredChallenges = computed(() => {
  if (selectedStatusTab.value === 'ALL') {
    return challenges.value
  }
  return challenges.value.filter(c => c.status === selectedStatusTab.value)
})

const statusTabs: { id: string; label: string; count: number }[] = [
  { id: 'ALL', label: 'Todos', count: metrics.value.total },
  { id: 'DRAFT', label: 'Borradores', count: metrics.value.draft },
  { id: 'OPEN', label: 'Abiertos', count: metrics.value.open },
  { id: 'IN_PROGRESS', label: 'En Progreso', count: metrics.value.inProgress },
  { id: 'CLOSED', label: 'Cerrados', count: metrics.value.closed },
]

function showNotification(title: string, description: string, color: 'success' | 'error' | 'warning') {
  try {
    const toast = useToast()
    toast.add({
      title,
      description,
      color,
      icon: color === 'success' ? 'i-lucide-check-circle' : 'i-lucide-alert-circle',
    })
  } catch {
    // testing fallback
  }
}

async function loadData() {
  try {
    await fetchCompanyChallenges()
  } catch {
    // handled reactively
  }
}

async function handlePublish(challenge: Challenge) {
  try {
    await updateChallenge(challenge.id, { status: 'OPEN' })
    showNotification(
      'Reto publicado',
      `El reto "${challenge.title}" ha sido abierto y ahora es visible en el catálogo.`,
      'success',
    )
    await loadData()
  } catch (err: unknown) {
    const fetchErr = err as { data?: { detail?: string }; message?: string }
    const msg = fetchErr?.data?.detail || fetchErr?.message || 'Error al publicar el reto.'
    showNotification('Error al publicar', msg, 'error')
  }
}

function handleOpenClosureModal(challenge: Challenge) {
  activeChallengeForClosure.value = challenge
  isClosureModalOpen.value = true
}

function handleChallengeClosed() {
  loadData()
}

function handleOpenAttachmentsModal(challenge: Challenge) {
  activeChallengeForAttachments.value = challenge
  isAttachmentsModalOpen.value = true
}

function handleAttachmentsUpdated() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <main class="min-h-screen bg-canvas text-text-main py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-[1400px] mx-auto space-y-8">
      <!-- Encabezado de la página -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-mint dark:bg-pastel-mint/30 border-2 border-neutral-900 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span>🏢</span>
            <span>Panel Organizacional (HU-08)</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-text-main tracking-tight">
            Gestión de Retos Empresariales
          </h1>
          <p class="text-sm text-text-muted mt-1 font-medium">
            Supervisa el estado de tus convocatorias, revisa anexos técnicos y publica nuevos desafíos.
          </p>
        </div>

        <NuxtLink
          to="/challenges/new"
          class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-neutral-900 bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0.5 active:translate-y-0.5 transition-all self-start sm:self-auto"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Publicar Nuevo Reto</span>
        </NuxtLink>
      </div>

      <!-- Tarjetas de Métricas Resumen -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <!-- Total -->
        <div class="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4 bg-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]">
          <p class="text-[11px] font-black uppercase tracking-wider text-text-muted">Total Retos</p>
          <p class="text-2xl sm:text-3xl font-black text-text-main mt-1">{{ metrics.total }}</p>
        </div>
        <!-- Borradores -->
        <div class="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4 bg-pastel-peach/30 dark:bg-pastel-peach/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]">
          <p class="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">Borradores</p>
          <p class="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200 mt-1">{{ metrics.draft }}</p>
        </div>
        <!-- Abiertos -->
        <div class="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4 bg-pastel-mint/30 dark:bg-pastel-mint/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]">
          <p class="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Abiertos</p>
          <p class="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{{ metrics.open }}</p>
        </div>
        <!-- En Progreso -->
        <div class="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4 bg-pastel-blue/30 dark:bg-pastel-blue/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]">
          <p class="text-[11px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">En Progreso</p>
          <p class="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-200 mt-1">{{ metrics.inProgress }}</p>
        </div>
        <!-- Cerrados -->
        <div class="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4 bg-neutral-100 dark:bg-neutral-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)] col-span-2 sm:col-span-1">
          <p class="text-[11px] font-black uppercase tracking-wider text-text-muted">Cerrados</p>
          <p class="text-2xl sm:text-3xl font-black text-text-main mt-1">{{ metrics.closed }}</p>
        </div>
      </div>

      <!-- Pestañas de Filtrado por Estado -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b-2 border-border-subtle">
        <button
          v-for="tab in statusTabs"
          :key="tab.id"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-black transition-all border-2 border-neutral-900 dark:border-neutral-700 shrink-0"
          :class="[
            selectedStatusTab === tab.id
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-surface text-text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800',
          ]"
          @click="selectedStatusTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <span class="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]" :class="selectedStatusTab === tab.id ? 'bg-neutral-700 text-neutral-100 dark:bg-neutral-300 dark:text-neutral-900' : 'bg-neutral-200 dark:bg-neutral-700 text-text-main'">
            {{ tab.id === 'ALL' ? metrics.total : (tab.id === 'DRAFT' ? metrics.draft : (tab.id === 'OPEN' ? metrics.open : (tab.id === 'IN_PROGRESS' ? metrics.inProgress : metrics.closed))) }}
          </span>
        </button>
      </div>

      <!-- Banner de Error si la consulta falla -->
      <div
        v-if="error"
        class="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <span class="text-xl">⚠️</span>
          <span class="text-sm font-bold text-red-800 dark:text-red-300">{{ error }}</span>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 bg-red-600 text-white font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @click="loadData"
        >
          Reintentar
        </button>
      </div>

      <!-- Tabla de Desafíos -->
      <CompanyChallengeTable
        :challenges="filteredChallenges"
        :loading="loading"
        @publish="handlePublish"
        @close="handleOpenClosureModal"
        @manage-files="handleOpenAttachmentsModal"
      />

      <!-- Modal de Cierre Voluntario (FRONTEND-TASK-06) -->
      <ClosureModal
        v-model="isClosureModalOpen"
        :challenge="activeChallengeForClosure"
        @closed="handleChallengeClosed"
      />

      <!-- Modal de Gestión de Archivos Adjuntos (FRONTEND-TASK-03 / TASK-04) -->
      <AttachmentManagerModal
        v-model="isAttachmentsModalOpen"
        :challenge="activeChallengeForAttachments"
        @updated="handleAttachmentsUpdated"
      />
    </div>
  </main>
</template>
