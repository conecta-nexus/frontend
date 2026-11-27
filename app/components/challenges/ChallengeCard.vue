<script setup lang="ts">
import { computed } from 'vue'
import type { ChallengeCatalogItem, DifficultyLevel, Modality } from '~/types/challenge'

const props = defineProps<{
  challenge: ChallengeCatalogItem
}>()

const modalityBadges: Record<Modality, { label: string; color: string }> = {
  REMOTE: {
    label: 'Remoto',
    color: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  },
  HYBRID: {
    label: 'Híbrido',
    color: 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  },
  ON_SITE: {
    label: 'Presencial',
    color: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
}

const difficultyBadges: Record<DifficultyLevel, { label: string; color: string }> = {
  BEGINNER: {
    label: 'Básico',
    color: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
  },
  INTERMEDIATE: {
    label: 'Intermedio',
    color: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  ADVANCED: {
    label: 'Avanzado',
    color: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  },
}

const companyName = computed(() => props.challenge.company_name?.trim() || 'Empresa sin nombre público')
const modality = computed(() => modalityBadges[props.challenge.modality])
const difficulty = computed(() => difficultyBadges[props.challenge.difficulty_level])

const visibleSkillLimit = 4
const visibleSkills = computed(() => props.challenge.required_skills.slice(0, visibleSkillLimit))
const remainingSkills = computed(() => props.challenge.required_skills.slice(visibleSkillLimit))
</script>

<template>
  <article
    class="flex min-w-0 flex-col rounded-2xl border-2 border-neutral-900/25 bg-surface p-5 shadow-[3px_3px_0_var(--border-prominent)] transition-shadow duration-200 hover:shadow-[5px_5px_0_var(--border-prominent)] focus-within:shadow-[5px_5px_0_var(--border-prominent)] motion-safe:transition-[translate,box-shadow] motion-safe:hover:-translate-y-1 dark:border-neutral-700"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span
        v-if="modality"
        :class="modality.color"
        class="rounded-full px-2.5 py-1 text-xs font-semibold"
      >
        {{ modality.label }}
      </span>
      <span
        v-if="difficulty"
        :class="difficulty.color"
        class="rounded-full px-2.5 py-1 text-xs font-semibold"
      >
        {{ difficulty.label }}
      </span>
    </div>

    <div class="mt-4">
      <h2 class="line-clamp-2 text-xl font-extrabold leading-snug text-text-main [overflow-wrap:anywhere]">
        {{ challenge.title }}
      </h2>
      <p class="mt-1 text-sm font-medium text-text-muted [overflow-wrap:anywhere]">
        {{ companyName }}
      </p>
      <p class="mt-1 text-xs text-text-muted [overflow-wrap:anywhere]">
        {{ challenge.economic_sector }}
      </p>
      <p class="mt-3 line-clamp-3 text-sm leading-relaxed text-text-muted [overflow-wrap:anywhere]">
        {{ challenge.description_snippet }}
      </p>
    </div>

    <ul
      v-if="visibleSkills.length"
      aria-label="Habilidades requeridas"
      class="mt-4 flex flex-wrap items-center gap-1.5"
    >
      <li
        v-for="(skill, index) in visibleSkills"
        :key="index"
        class="min-w-0 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-text-main [overflow-wrap:anywhere] dark:bg-neutral-800"
      >
        {{ skill }}
      </li>
      <li
        v-if="remainingSkills.length"
        :title="remainingSkills.join(', ')"
        class="px-1 text-xs font-medium text-text-muted"
      >
        <span aria-hidden="true">+{{ remainingSkills.length }}</span>
        <span class="sr-only">{{ remainingSkills.join(', ') }}</span>
      </li>
    </ul>

    <div class="mt-auto pt-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <span class="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-text-main dark:bg-neutral-800">
          <span aria-hidden="true">Sem. {{ challenge.min_semester }}+</span>
          <span class="sr-only">Semestre mínimo {{ challenge.min_semester }}</span>
        </span>
        <NuxtLink
          :to="`/challenges/${challenge.id}`"
          :aria-label="`Ver detalles de ${challenge.title}`"
          class="rounded px-1 py-2 text-sm font-semibold text-institutional-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institutional-500 dark:text-institutional-300 dark:focus-visible:outline-institutional-300"
        >
          Ver detalles <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
