<script setup lang="ts">
import { computed } from 'vue'
import type { Challenge, DifficultyLevel, Modality } from '~/types/challenge'

export type CatalogChallenge = Challenge & {
  company_name?: string
}

interface Props {
  challenge: CatalogChallenge
}

const props = defineProps<Props>()

const companyDisplayName = computed<string>(() => {
  const name = props.challenge.company_name?.trim()
  return name && name.length > 0 ? name : 'Empresa Aliada UFPS'
})

interface ModalityConfig {
  label: string
}

const MODALITY_CONFIG: Record<Modality, ModalityConfig> = {
  REMOTE: { label: 'Remoto' },
  HYBRID: { label: 'Híbrido' },
  ON_SITE: { label: 'Presencial' },
}

const modalityInfo = computed<ModalityConfig>(() => {
  return MODALITY_CONFIG[props.challenge.modality] ?? { label: props.challenge.modality }
})

interface DifficultyConfig {
  label: string
  badgeClass: string
  dotClass: string
}

const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyConfig> = {
  BEGINNER: {
    label: 'Básico',
    badgeClass: 'bg-pastel-mint/40 dark:bg-pastel-mint/20 text-neutral-900 dark:text-neutral-100 border-neutral-900/30 dark:border-neutral-600',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
  },
  INTERMEDIATE: {
    label: 'Intermedio',
    badgeClass: 'bg-pastel-peach/50 dark:bg-pastel-peach/20 text-neutral-900 dark:text-neutral-100 border-neutral-900/30 dark:border-neutral-600',
    dotClass: 'bg-amber-600 dark:bg-amber-400',
  },
  ADVANCED: {
    label: 'Avanzado',
    badgeClass: 'bg-institutional-100 dark:bg-institutional-950/60 text-institutional-600 dark:text-institutional-400 border-institutional-500/30',
    dotClass: 'bg-institutional-500',
  },
}

const difficultyInfo = computed<DifficultyConfig>(() => {
  return (
    DIFFICULTY_CONFIG[props.challenge.difficulty_level] ?? {
      label: props.challenge.difficulty_level,
      badgeClass: 'bg-neutral-100 dark:bg-neutral-800 text-text-main border-neutral-300 dark:border-neutral-700',
      dotClass: 'bg-neutral-400',
    }
  )
})

const semesterLabel = computed<string>(() => {
  return `Semestre ${props.challenge.min_semester}.º+`
})

const truncatedDescription = computed<string>(() => {
  const text = props.challenge.description?.trim() || ''
  const MAX_CHARS = 180
  if (text.length <= MAX_CHARS) {
    return text
  }
  const cutIndex = text.lastIndexOf(' ', MAX_CHARS)
  const safeCut = cutIndex > 120 ? cutIndex : MAX_CHARS
  return `${text.slice(0, safeCut)}…`
})

const MAX_VISIBLE_SKILLS = 4

const visibleSkills = computed<string[]>(() => {
  const skills = props.challenge.required_skills || []
  return skills.slice(0, MAX_VISIBLE_SKILLS)
})

const hiddenSkillsCount = computed<number>(() => {
  const total = props.challenge.required_skills?.length || 0
  return Math.max(0, total - MAX_VISIBLE_SKILLS)
})

const remainingSkillsTooltip = computed<string>(() => {
  const skills = props.challenge.required_skills || []
  if (skills.length <= MAX_VISIBLE_SKILLS) return ''
  return skills.slice(MAX_VISIBLE_SKILLS).join(', ')
})
</script>

<template>
  <article
    class="group relative rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 p-6 sm:p-7 bg-surface flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.18)] transition-all duration-200"
  >
    <div class="space-y-4">
      <!-- Cabecera: Modalidad y Empresa -->
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <!-- Modalidad -->
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 border-neutral-900/30 dark:border-neutral-600 bg-canvas text-text-main"
        >
          <!-- Ícono Remoto -->
          <svg
            v-if="challenge.modality === 'REMOTE'"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <!-- Ícono Híbrido -->
          <svg
            v-else-if="challenge.modality === 'HYBRID'"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <!-- Ícono Presencial -->
          <svg
            v-else
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ modalityInfo.label }}</span>
        </span>

        <!-- Empresa (Representación institucional neutral) -->
        <span
          class="inline-flex items-center gap-1.5 text-xs font-bold text-text-main bg-canvas border-2 border-neutral-900/30 dark:border-neutral-600 px-2.5 py-1 rounded-full"
        >
          <svg
            class="w-3.5 h-3.5 shrink-0 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span class="truncate max-w-[170px]" :title="companyDisplayName">{{ companyDisplayName }}</span>
        </span>
      </div>

      <!-- Sector Económico y Dificultad -->
      <div class="flex items-center justify-between gap-2 flex-wrap pt-1">
        <!-- Sector Económico (Pastel Coral) -->
        <span
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border-2 border-neutral-900/30 dark:border-neutral-600 bg-pastel-coral dark:bg-pastel-coral/25 text-neutral-900 dark:text-neutral-100"
        >
          <svg
            class="w-3 h-3 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span class="truncate max-w-[160px]" :title="challenge.economic_sector">{{ challenge.economic_sector }}</span>
        </span>

        <!-- Nivel de Dificultad -->
        <span
          :class="[
            difficultyInfo.badgeClass,
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2',
          ]"
        >
          <span :class="[difficultyInfo.dotClass, 'w-2 h-2 rounded-full']" />
          <span>{{ difficultyInfo.label }}</span>
        </span>
      </div>

      <!-- Título del Reto -->
      <div class="pt-2">
        <h2 class="text-xl sm:text-2xl font-black text-text-main leading-snug tracking-tight line-clamp-2">
          {{ challenge.title }}
        </h2>
        <!-- Proceso de Negocio -->
        <p
          v-if="challenge.business_process"
          class="text-xs font-bold text-text-muted uppercase tracking-wider mt-1.5 line-clamp-1"
          :title="'Proceso: ' + challenge.business_process"
        >
          Proceso: {{ challenge.business_process }}
        </p>
      </div>

      <!-- Descripción Truncada Determinista -->
      <p class="text-sm text-text-muted leading-relaxed line-clamp-3">
        {{ truncatedDescription }}
      </p>
    </div>

    <!-- Requisitos Académicos y Skills -->
    <div class="pt-6 border-t-2 border-border-subtle mt-6 space-y-3.5">
      <!-- Semestre Mínimo (Pastel Ice Blue) -->
      <div class="flex items-center justify-between text-xs font-bold">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border-2 border-neutral-900/30 dark:border-neutral-600 bg-pastel-blue dark:bg-pastel-blue/20 text-neutral-900 dark:text-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.08)]"
        >
          <svg
            class="w-3.5 h-3.5 text-blue-700 dark:text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
          <span>{{ semesterLabel }}</span>
        </span>

        <span class="text-xs font-semibold text-text-muted">
          Requisito académico
        </span>
      </div>

      <!-- Skills Requeridas (Pastel Mint) -->
      <div
        v-if="visibleSkills.length > 0"
        class="flex flex-wrap items-center gap-1.5 pt-1"
      >
        <span
          v-for="skill in visibleSkills"
          :key="skill"
          class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-pastel-mint/30 dark:bg-pastel-mint/15 text-text-main border border-neutral-900/20 dark:border-neutral-700"
        >
          {{ skill }}
        </span>

        <!-- Badge de habilidades adicionales -->
        <span
          v-if="hiddenSkillsCount > 0"
          :title="remainingSkillsTooltip"
          class="text-[11px] font-black px-2 py-0.5 rounded-md bg-canvas text-text-muted border border-neutral-900/20 dark:border-neutral-700 cursor-help"
        >
          +{{ hiddenSkillsCount }} más
        </span>
      </div>
    </div>
  </article>
</template>
