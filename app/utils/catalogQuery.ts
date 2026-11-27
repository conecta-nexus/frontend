import type { LocationQuery } from 'vue-router'
import type { ChallengeCatalogFilter } from '~/types/challenge'

export const catalogModalityLabels = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ON_SITE: 'Presencial',
}

export const catalogDifficultyLabels = {
  BEGINNER: 'Inicial / Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
}

function queryText(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function queryChoice<T extends string>(value: unknown, choices: Record<T, string>) {
  return typeof value === 'string' && Object.hasOwn(choices, value) ? value as T : undefined
}

function queryInteger(value: unknown, max: number) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 1 && number <= max ? number : undefined
}

export function catalogTerms(...values: (LocationQuery[string] | undefined)[]): string[] {
  return [...new Set(values.flat().flatMap(value => typeof value === 'string' ? value.split(',') : [])
    .map(term => term.trim()).filter(Boolean))]
}

export function readCatalogQuery(query: LocationQuery): ChallengeCatalogFilter {
  return {
    q: queryText(query.q),
    sector: queryText(query.sector) ?? queryText(query.economic_sector),
    modality: queryChoice(query.modality, catalogModalityLabels),
    difficulty: queryChoice(query.difficulty, catalogDifficultyLabels)
      ?? queryChoice(query.difficulty_level, catalogDifficultyLabels),
    skill: catalogTerms(query.skill, query.skills).join(',') || undefined,
    knowledge_area: catalogTerms(query.knowledge_area, query.knowledge_areas).join(',') || undefined,
    min_semester: queryInteger(query.min_semester, 10) ?? queryInteger(query.max_semester, 10),
    page: queryInteger(query.page, Number.MAX_SAFE_INTEGER) ?? 1,
    limit: queryInteger(query.page_size, 100) ?? queryInteger(query.limit, 100) ?? 10,
  }
}

export function catalogRequestKey(filters: ChallengeCatalogFilter) {
  return JSON.stringify({
    ...filters,
    skill: catalogTerms(filters.skill).sort(),
    knowledge_area: catalogTerms(filters.knowledge_area).sort(),
  })
}

export function resetCatalogQuery(query: LocationQuery): LocationQuery {
  const pageSize = queryInteger(query.page_size, 100)
  if (pageSize !== undefined) return { page_size: String(pageSize) }
  const limit = queryInteger(query.limit, 100)
  return limit === undefined ? {} : { limit: String(limit) }
}
