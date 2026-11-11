<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useChallenges } from '~/composables/useChallenges'
import type { Challenge, DifficultyLevel, Modality } from '~/types/challenge'
import AttachmentList from '~/components/challenges/AttachmentList.vue'
import ApplicationModal from '~/components/challenges/ApplicationModal.vue'

const route = useRoute()
const challengeId = computed(() => route.params.id as string)

const { getChallenge, loading, error } = useChallenges()
const { isAuthenticated, userRole } = useAuth()

const challenge = ref<Challenge | null>(null)
const isApplicationModalOpen = ref(false)
const hasApplied = ref(false)

const companyDisplayName = computed<string>(() => {
  return 'Empresa Aliada Verificada'
})

interface ModalityConfig {
  label: string
}

const MODALITY_CONFIG: Record<Modality, ModalityConfig> = {
  REMOTE: { label: 'Remoto' },
  HYBRID: { label: 'Híbrido' },
  ON_SITE: { label: 'Presencial' },
}

interface DifficultyConfig {
  label: string
  badgeClass: string
}

const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyConfig> = {
  BEGINNER: {
    label: 'Inicial / Básico',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  INTERMEDIATE: {
    label: 'Intermedio',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300',
  },
  ADVANCED: {
    label: 'Avanzado',
    badgeClass: 'bg-red-100 text-red-900 border-red-500/30 dark:bg-red-950/60 dark:text-red-300',
  },
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

async function loadChallenge() {
  if (!challengeId.value) return
  try {
    const data = await getChallenge(challengeId.value)
    challenge.value = data
  } catch {
    // handled via error reactive ref
  }
}

function handleApplicationSuccess() {
  hasApplied.value = true
}

useHead(() => ({
  title: challenge.value
    ? `${challenge.value.title} | Catálogo Conecta Nexus UFPS`
    : 'Detalle del Desafío Empresarial | Conecta Nexus UFPS',
}))

onMounted(() => {
  loadChallenge()
})
</script>

<template>
  <main class="min-h-screen bg-canvas text-text-main py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto space-y-8">
      <!-- Barra de Navegación / Volver -->
      <div class="flex items-center justify-between gap-4">
        <NuxtLink
          to="/challenges"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-surface font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <span>← Volver al Catálogo</span>
        </NuxtLink>

        <span
          v-if="challenge"
          class="text-xs font-bold text-text-muted"
        >
          Publicado el {{ formatDate(challenge.created_at) }}
        </span>
      </div>

      <!-- Estado de Carga -->
      <div v-if="loading && !challenge" class="p-16 text-center space-y-4">
        <div class="inline-block animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
        <p class="text-sm font-bold text-text-muted">
          Cargando especificaciones del reto...
        </p>
      </div>

      <!-- Estado de Error / 404 Fallback -->
      <div
        v-else-if="error || !challenge"
        class="border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-8 sm:p-12 text-center bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
      >
        <div class="w-16 h-16 mx-auto rounded-2xl bg-pastel-coral dark:bg-pastel-coral/20 border-2 border-neutral-900 flex items-center justify-center text-2xl">
          🔍
        </div>
        <h2 class="text-2xl font-black text-text-main">
          Desafío no disponible
        </h2>
        <p class="text-sm text-text-muted max-w-md mx-auto font-medium">
          {{ error || 'El reto solicitado no existe, fue cerrado voluntariamente o no está disponible públicamente.' }}
        </p>
        <NuxtLink
          to="/challenges"
          class="inline-flex items-center px-4 py-2.5 rounded-xl border-2 border-neutral-900 bg-red-600 text-white font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          Explorar otros desafíos
        </NuxtLink>
      </div>

      <!-- Contenido Principal del Desafío -->
      <div v-else class="space-y-8">
        <!-- Tarjeta de Encabezado -->
        <article class="border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-10 bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] space-y-6">
          <!-- Insignias Superiores -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Sector -->
            <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-peach/50 dark:bg-pastel-peach/20 border-2 border-neutral-900/30 text-neutral-900 dark:text-neutral-100">
              {{ challenge.economic_sector }}
            </span>
            <!-- Modalidad -->
            <span class="px-3 py-1 rounded-full text-xs font-bold border-2 border-neutral-900/30 bg-neutral-100 dark:bg-neutral-800 text-text-main">
              Modalidad: {{ MODALITY_CONFIG[challenge.modality]?.label || challenge.modality }}
            </span>
            <!-- Dificultad -->
            <span
              class="px-3 py-1 rounded-full text-xs font-bold border-2 border-neutral-900/30"
              :class="DIFFICULTY_CONFIG[challenge.difficulty_level]?.badgeClass || ''"
            >
              Nivel: {{ DIFFICULTY_CONFIG[challenge.difficulty_level]?.label || challenge.difficulty_level }}
            </span>
            <!-- Semestre Mínimo -->
            <span class="px-3 py-1 rounded-full text-xs font-black bg-pastel-blue dark:bg-pastel-blue/20 border-2 border-neutral-900/30 text-neutral-900 dark:text-neutral-100">
              Semestre mín. {{ challenge.min_semester }}°
            </span>
            <!-- Estado -->
            <span
              v-if="challenge.status !== 'OPEN'"
              class="px-3 py-1 rounded-full text-xs font-black bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-400 text-neutral-700 dark:text-neutral-300"
            >
              Estado: {{ challenge.status }}
            </span>
          </div>

          <!-- Título y Organización -->
          <div>
            <h1 class="text-2xl sm:text-4xl font-black text-text-main tracking-tight leading-tight">
              {{ challenge.title }}
            </h1>
            <div class="flex items-center gap-2 mt-2 text-xs sm:text-sm font-bold text-text-muted">
              <span>🏢 {{ companyDisplayName }}</span>
              <span>•</span>
              <span>Enmascaramiento de contacto corporativo activo (RB-05)</span>
            </div>
          </div>

          <!-- Proceso de Negocio Afectado -->
          <div
            v-if="challenge.business_process"
            class="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-300 dark:border-neutral-700"
          >
            <p class="text-[11px] font-black uppercase tracking-wider text-text-muted">
              Proceso Organizacional / Cadena de Valor
            </p>
            <p class="text-sm font-bold text-text-main mt-0.5">
              {{ challenge.business_process }}
            </p>
          </div>
        </article>

        <!-- Descripción y Especificaciones Técnicas -->
        <section class="border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-10 bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] space-y-6">
          <div>
            <h2 class="text-lg sm:text-xl font-black text-text-main mb-3 flex items-center gap-2">
              <span>📋</span>
              <span>Planteamiento del Problema Técnico</span>
            </h2>
            <div class="text-sm sm:text-base text-text-muted leading-relaxed font-normal whitespace-pre-line">
              {{ challenge.description }}
            </div>
          </div>

          <!-- Áreas de Conocimiento y Habilidades Requeridas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t-2 border-border-subtle">
            <!-- Habilidades Técnicas -->
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-text-main mb-3">
                Habilidades y Tecnologías Esperadas
              </h3>
              <div
                v-if="challenge.required_skills && challenge.required_skills.length > 0"
                class="flex flex-wrap gap-2"
              >
                <span
                  v-for="skill in challenge.required_skills"
                  :key="skill"
                  class="px-3 py-1 rounded-xl text-xs font-black bg-pastel-mint dark:bg-pastel-mint/20 text-neutral-900 dark:text-neutral-100 border border-neutral-900/30"
                >
                  #{{ skill }}
                </span>
              </div>
              <p v-else class="text-xs text-text-muted italic">
                No se especificaron tecnologías excluyentes.
              </p>
            </div>

            <!-- Áreas de Conocimiento -->
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-text-main mb-3">
                Áreas de Conocimiento UFPS
              </h3>
              <div
                v-if="challenge.knowledge_areas && challenge.knowledge_areas.length > 0"
                class="flex flex-wrap gap-2"
              >
                <span
                  v-for="area in challenge.knowledge_areas"
                  :key="area"
                  class="px-3 py-1 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-text-main border border-neutral-900/20"
                >
                  {{ area }}
                </span>
              </div>
              <p v-else class="text-xs text-text-muted italic">
                Ingeniería de Sistemas y disciplinas afines.
              </p>
            </div>
          </div>
        </section>

        <!-- Anexos y Documentación de Soporte (HU-07) -->
        <section class="border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-10 bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] space-y-4">
          <div>
            <h2 class="text-lg sm:text-xl font-black text-text-main flex items-center gap-2">
              <span>📎</span>
              <span>Anexos Técnicos y Documentación de Soporte</span>
            </h2>
            <p class="text-xs text-text-muted mt-1 font-medium">
              Documentos proporcionados por la empresa para contextualizar el desafío (descargas seguras protegidas con URLs efímeras).
            </p>
          </div>

          <AttachmentList
            :attachments="challenge.attachments || []"
            :challenge-id="challenge.id"
            :can-delete="false"
          />
        </section>

        <!-- Tarjeta de Llamado a la Acción (Postulación / Microservicios Síncronos) -->
        <aside class="border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-red-50 to-orange-50 dark:from-neutral-900 dark:to-neutral-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-red-100 dark:bg-red-950/60 border border-red-600 text-red-700 dark:text-red-300">
              <span>🎓</span>
              <span>Convocatoria Abierta para Estudiantes</span>
            </div>
            <h3 class="text-xl font-black text-text-main">
              ¿Cumples los requisitos y quieres postularte?
            </h3>
            <p class="text-xs text-text-muted font-medium">
              Al enviar tu postulación, el orquestador verificará síncronamente tu semestre en curso y la disponibilidad del reto en vivo.
            </p>
          </div>

          <div>
            <!-- Si no está autenticado -->
            <NuxtLink
              v-if="!isAuthenticated"
              to="/auth/login"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-neutral-900 bg-red-600 text-white font-black text-xs sm:text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <span>Inicia sesión como Estudiante →</span>
            </NuxtLink>

            <!-- Si es empresa -->
            <div
              v-else-if="userRole === 'COMPANY'"
              class="px-4 py-2.5 rounded-xl border border-neutral-900/30 bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-text-muted"
            >
              Cuenta empresarial activa (solo lectura de convocatorias)
            </div>

            <!-- Si ya aplicó -->
            <div
              v-else-if="hasApplied"
              class="px-5 py-2.5 rounded-xl border-2 border-emerald-600 bg-emerald-100 text-emerald-900 font-black text-xs flex items-center gap-2"
            >
              <span>✓</span>
              <span>Postulación enviada a este reto</span>
            </div>

            <!-- Si es estudiante y el reto está abierto -->
            <button
              v-else-if="challenge.status === 'OPEN'"
              type="button"
              class="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-neutral-900 bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              @click="isApplicationModalOpen = true"
            >
              <span>🚀 Postularme a esta Oportunidad</span>
            </button>

            <!-- Reto no abierto -->
            <div
              v-else
              class="px-4 py-2.5 rounded-xl border border-neutral-900/30 bg-neutral-200 dark:bg-neutral-800 text-xs font-bold text-text-muted"
            >
              Convocatoria no disponible para nuevas postulaciones
            </div>
          </div>
        </aside>
      </div>

      <!-- Modal de Postulación Síncrona -->
      <ApplicationModal
        v-model="isApplicationModalOpen"
        :challenge="challenge"
        @applied="handleApplicationSuccess"
      />
    </div>
  </main>
</template>
