<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { ChallengeCatalogFilter, DifficultyLevel, Modality } from '~/types/challenge'
import { catalogRequestKey, catalogTerms, readCatalogQuery, resetCatalogQuery } from '~/utils/catalogQuery'

withDefaults(
  defineProps<{
    loading?: boolean
    totalResults?: number
  }>(),
  {
    loading: false,
    totalResults: 0,
  },
)

const emit = defineEmits<{
  (e: 'filter-change', filters: ChallengeCatalogFilter): void
  (e: 'reset'): void
}>()

const route = useRoute()
const router = useRouter()

// Filter options
const SECTOR_OPTIONS = [
  'Tecnología y Software',
  'Logística y Transporte',
  'Salud y Biotecnología',
  'Finanzas y Fintech',
  'Educación',
  'Agroindustria',
  'Comercio y Retail',
  'Manufactura',
]

const MODALITY_OPTIONS: { label: string, value: Modality }[] = [
  { label: 'Remoto', value: 'REMOTE' },
  { label: 'Híbrido', value: 'HYBRID' },
  { label: 'Presencial', value: 'ON_SITE' },
]

const DIFFICULTY_OPTIONS: { label: string, value: DifficultyLevel }[] = [
  { label: 'Inicial / Básico', value: 'BEGINNER' },
  { label: 'Intermedio', value: 'INTERMEDIATE' },
  { label: 'Avanzado', value: 'ADVANCED' },
]

const KNOWLEDGE_AREA_OPTIONS = [
  'Ingeniería de Software',
  'Inteligencia Artificial y ML',
  'Ciberseguridad',
  'Bases de Datos y Big Data',
  'Redes y Telecomunicaciones',
  'Investigación de Operaciones',
  'Sistemas Distribuidos y Cloud',
]

const MIN_SEMESTER_OPTIONS = [6, 7, 8, 9, 10]

// Local reactive filter state
const searchInput = ref('')
const selectedSector = ref('')
const selectedModality = ref<Modality | ''>('')
const selectedDifficulty = ref<DifficultyLevel | ''>('')
const selectedKnowledgeArea = ref('')
const selectedMinSemester = ref('')
const skillInput = ref('')
const skillsList = ref<string[]>([])
const isMobileExpanded = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function cancelPendingSearch() {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = null
}

function syncFromRoute(query = route.query) {
  cancelPendingSearch()
  const filters = readCatalogQuery(query)
  searchInput.value = filters.q ?? ''
  selectedSector.value = filters.sector ?? ''
  selectedModality.value = filters.modality ?? ''
  selectedDifficulty.value = filters.difficulty ?? ''
  selectedKnowledgeArea.value = filters.knowledge_area ?? ''
  selectedMinSemester.value = filters.min_semester ? String(filters.min_semester) : ''
  skillsList.value = catalogTerms(filters.skill)
}

function clearDraftFilters() {
  syncFromRoute({})
  skillInput.value = ''
}

defineExpose({ clearDraftFilters })

// Active filter count
const activeFiltersCount = computed(() => {
  let count = 0
  if (searchInput.value.trim()) count++
  if (selectedSector.value) count++
  if (selectedModality.value) count++
  if (selectedDifficulty.value) count++
  if (selectedKnowledgeArea.value) count++
  if (selectedMinSemester.value) count++
  count += skillsList.value.length
  return count
})

// Build current filter object
function getCurrentFilters() {
  return {
    q: searchInput.value.trim(),
    sector: selectedSector.value,
    modality: selectedModality.value,
    difficulty: selectedDifficulty.value,
    knowledge_area: selectedKnowledgeArea.value,
    min_semester: selectedMinSemester.value,
    skill: skillsList.value.join(','),
  }
}

async function applyFilters() {
  cancelPendingSearch()
  const filters = getCurrentFilters()
  const routeFilters = readCatalogQuery(route.query)
  const preserveLegacyMaxSemester = Boolean(
    route.query.max_semester
    && !route.query.min_semester
    && String(routeFilters.min_semester ?? '') === selectedMinSemester.value,
  )
  const effectiveFilters = preserveLegacyMaxSemester
    ? { ...filters, min_semester: '' }
    : filters
  const aliases = ['economic_sector', 'difficulty_level', 'knowledge_areas', 'skills']
  if (!preserveLegacyMaxSemester) {
    aliases.push('max_semester')
  }
  const newQuery = {
    ...Object.fromEntries(Object.entries(route.query).filter(([key]) => !Object.hasOwn(effectiveFilters, key) && !aliases.includes(key))),
    ...Object.fromEntries(Object.entries(effectiveFilters).filter(([, value]) => value)),
  }

  if (catalogRequestKey(readCatalogQuery(newQuery)) === catalogRequestKey(routeFilters)) return
  delete newQuery.page
  await router.push({ query: newQuery })
  emit('filter-change', readCatalogQuery(newQuery))
}

// Debounced search trigger
function onSearchInput() {
  cancelPendingSearch()
  debounceTimer = setTimeout(applyFilters, 300)
}

// Skill tags handling
function addSkill() {
  const skills = catalogTerms(skillInput.value)
  if (!skills.length) return
  skillsList.value = catalogTerms(skillsList.value, skills)
  skillInput.value = ''
  applyFilters()
}

function removeSkill(skillToRemove: string) {
  skillsList.value = skillsList.value.filter(s => s !== skillToRemove)
  applyFilters()
}

// Individual chip dismissals
function clearSearch() {
  searchInput.value = ''
  applyFilters()
}

function clearSector() {
  selectedSector.value = ''
  applyFilters()
}

function clearModality() {
  selectedModality.value = ''
  applyFilters()
}

function clearDifficulty() {
  selectedDifficulty.value = ''
  applyFilters()
}

function clearKnowledgeArea() {
  selectedKnowledgeArea.value = ''
  applyFilters()
}

function clearMinSemester() {
  selectedMinSemester.value = ''
  applyFilters()
}

// Global reset action
function resetAllFilters() {
  const query = resetCatalogQuery(route.query)
  syncFromRoute(query)
  skillInput.value = ''
  const current = readCatalogQuery(route.query)
  const unfiltered = { ...readCatalogQuery(query), page: current.page }
  if (catalogRequestKey(unfiltered) !== catalogRequestKey(current)) {
    router.push({ query })
  }
  emit('reset')
  emit('filter-change', {})
}

// Watch external route changes (e.g., reset from EmptyState or browser back/forward)
watch(
  () => route.query,
  () => {
    syncFromRoute()
  },
  { deep: true },
)

onMounted(() => {
  syncFromRoute()
})

onBeforeRouteLeave((_to, _from, next) => {
  cancelPendingSearch()
  next()
})
onBeforeUnmount(cancelPendingSearch)
</script>

<template>
  <div class="w-full bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] p-4 sm:p-6 mb-8 transition-all">
    <!-- Top Bar: Search Input, Mobile Toggle, and Quick Badges -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <!-- Search Input with Debounce -->
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <label
          for="catalog-search"
          class="sr-only"
        >
          Buscar desafíos
        </label>
        <input
          id="catalog-search"
          v-model="searchInput"
          type="text"
          placeholder="Buscar desafíos por título, descripción o proceso..."
          class="w-full pl-11 pr-10 py-3 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-institutional-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
          @input="onSearchInput"
        >
        <button
          v-if="searchInput"
          type="button"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded-r-xl"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
          @click="clearSearch"
        >
          <svg
            aria-hidden="true"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Action Buttons: Filter Counter & Mobile Drawer Toggle -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @click="isMobileExpanded = !isMobileExpanded"
        >
          <span>Filtros</span>
          <span
            v-if="activeFiltersCount > 0"
            class="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-black"
          >
            {{ activeFiltersCount }}
          </span>
          <svg
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-180': isMobileExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <!-- Active Filter Badge Counter (Desktop) -->
        <div
          v-if="activeFiltersCount > 0"
          class="hidden sm:flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/40 border-2 border-red-600 text-red-700 dark:text-red-400 font-bold text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
        >
          <span>{{ activeFiltersCount }} {{ activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos' }}</span>
        </div>

        <!-- Global Reset Button -->
        <button
          v-if="activeFiltersCount > 0"
          type="button"
          class="px-4 py-2.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-black text-xs text-neutral-800 dark:text-neutral-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5"
          @click="resetAllFilters"
        >
          Restablecer
        </button>
      </div>
    </div>

    <!-- Dropdown Filters Grid (Desktop visible, Collapsible on Mobile) -->
    <div
      class="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5"
      :class="{ 'hidden sm:grid': !isMobileExpanded, 'grid': isMobileExpanded }"
    >
      <!-- Economic Sector Select -->
      <div class="flex flex-col gap-1.5">
        <label
          for="catalog-sector"
          class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
        >
          Sector Económico
        </label>
        <select
          id="catalog-sector"
          v-model="selectedSector"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @change="applyFilters"
        >
          <option value="">
            Todos los sectores
          </option>
          <option
            v-for="sec in SECTOR_OPTIONS"
            :key="sec"
            :value="sec"
          >
            {{ sec }}
          </option>
        </select>
      </div>

      <!-- Modality Select -->
      <div class="flex flex-col gap-1.5">
        <label
          for="catalog-modality"
          class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
        >
          Modalidad
        </label>
        <select
          id="catalog-modality"
          v-model="selectedModality"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @change="applyFilters"
        >
          <option value="">
            Todas las modalidades
          </option>
          <option
            v-for="mod in MODALITY_OPTIONS"
            :key="mod.value"
            :value="mod.value"
          >
            {{ mod.label }}
          </option>
        </select>
      </div>

      <!-- Difficulty Level Select -->
      <div class="flex flex-col gap-1.5">
        <label
          for="catalog-difficulty"
          class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
        >
          Dificultad
        </label>
        <select
          id="catalog-difficulty"
          v-model="selectedDifficulty"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @change="applyFilters"
        >
          <option value="">
            Todos los niveles
          </option>
          <option
            v-for="dif in DIFFICULTY_OPTIONS"
            :key="dif.value"
            :value="dif.value"
          >
            {{ dif.label }}
          </option>
        </select>
      </div>

      <!-- Knowledge Area Select -->
      <div class="flex flex-col gap-1.5">
        <label
          for="catalog-knowledge-area"
          class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
        >
          Área de Conocimiento
        </label>
        <select
          id="catalog-knowledge-area"
          v-model="selectedKnowledgeArea"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @change="applyFilters"
        >
          <option value="">
            Todas las áreas
          </option>
          <option
            v-for="area in KNOWLEDGE_AREA_OPTIONS"
            :key="area"
            :value="area"
          >
            {{ area }}
          </option>
        </select>
      </div>

      <!-- Minimum Semester Select -->
      <div class="flex flex-col gap-1.5">
        <label
          for="catalog-min-semester"
          class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
        >
          Semestre Mínimo
        </label>
        <select
          id="catalog-min-semester"
          v-model="selectedMinSemester"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @change="applyFilters"
        >
          <option value="">
            Todos los semestres
          </option>
          <option
            v-for="sem in MIN_SEMESTER_OPTIONS"
            :key="sem"
            :value="String(sem)"
          >
            Desde {{ sem }}° semestre
          </option>
        </select>
      </div>
    </div>

    <!-- Skills Tag Input Field -->
    <div
      class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      :class="{ 'hidden sm:flex': !isMobileExpanded, 'flex': isMobileExpanded }"
    >
      <div class="flex-1 flex items-center gap-2">
        <label
          for="catalog-skill"
          class="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 shrink-0"
        >
          Habilidad:
        </label>
        <input
          id="catalog-skill"
          v-model="skillInput"
          type="text"
          placeholder="Escribe una tecnología (ej: Python, Docker) y presiona Enter..."
          class="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-institutional-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @keydown.enter.prevent="addSkill"
        >
        <button
          type="button"
          class="px-3 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
          @click="addSkill"
        >
          Agregar
        </button>
      </div>
    </div>

    <!-- Active Filter Chips Bar -->
    <div
      v-if="activeFiltersCount > 0"
      class="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-2"
    >
      <span class="text-xs font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
        Aplicados:
      </span>

      <!-- Search Chip -->
      <span
        v-if="searchInput"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-900 dark:border-neutral-600 rounded-full text-xs font-bold text-neutral-900 dark:text-neutral-100"
      >
        <span>Búsqueda: "{{ searchInput }}"</span>
        <button
          type="button"
          aria-label="Quitar filtro de búsqueda"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="clearSearch"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <!-- Sector Chip -->
      <span
        v-if="selectedSector"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-700 dark:border-amber-500 rounded-full text-xs font-bold text-amber-900 dark:text-amber-200"
      >
        <span>Sector: {{ selectedSector }}</span>
        <button
          type="button"
          aria-label="Quitar filtro de sector"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="clearSector"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <!-- Modality Chip -->
      <span
        v-if="selectedModality"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-700 dark:border-blue-500 rounded-full text-xs font-bold text-blue-900 dark:text-blue-200"
      >
        <span>Modalidad: {{ MODALITY_OPTIONS.find(m => m.value === selectedModality)?.label || selectedModality }}</span>
        <button
          type="button"
          aria-label="Quitar filtro de modalidad"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="clearModality"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <!-- Difficulty Chip -->
      <span
        v-if="selectedDifficulty"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-700 dark:border-purple-500 rounded-full text-xs font-bold text-purple-900 dark:text-purple-200"
      >
        <span>Dificultad: {{ DIFFICULTY_OPTIONS.find(d => d.value === selectedDifficulty)?.label || selectedDifficulty }}</span>
        <button
          type="button"
          aria-label="Quitar filtro de dificultad"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="clearDifficulty"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <!-- Knowledge Area Chip -->
      <span
        v-if="selectedKnowledgeArea"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-700 dark:border-emerald-500 rounded-full text-xs font-bold text-emerald-900 dark:text-emerald-200"
      >
        <span>Área: {{ selectedKnowledgeArea }}</span>
        <button
          type="button"
          aria-label="Quitar filtro de área de conocimiento"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="clearKnowledgeArea"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <!-- Minimum Semester Chip -->
      <span
        v-if="selectedMinSemester"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-pastel-peach/60 dark:bg-amber-950/40 border border-neutral-900 dark:border-amber-500 rounded-full text-xs font-bold text-neutral-900 dark:text-amber-200"
      >
        <span>Semestre mín.: {{ selectedMinSemester }}°</span>
        <button
          type="button"
          aria-label="Quitar filtro de semestre mínimo"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="clearMinSemester"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>

      <!-- Skill Tag Chips -->
      <span
        v-for="s in skillsList"
        :key="s"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-700 dark:border-rose-500 rounded-full text-xs font-bold text-rose-900 dark:text-rose-200"
      >
        <span>Habilidad: {{ s }}</span>
        <button
          type="button"
          :aria-label="`Quitar habilidad ${s}`"
          class="hover:text-institutional-500 font-black inline-flex items-center"
          @click="removeSkill(s)"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>
