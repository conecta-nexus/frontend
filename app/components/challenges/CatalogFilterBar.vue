<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ChallengeCatalogFilter, DifficultyLevel, Modality } from '~/types/challenge'

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

// Local reactive filter state
const searchInput = ref('')
const selectedSector = ref('')
const selectedModality = ref<Modality | ''>('')
const selectedDifficulty = ref<DifficultyLevel | ''>('')
const selectedKnowledgeArea = ref('')
const skillInput = ref('')
const skillsList = ref<string[]>([])
const isMobileExpanded = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Initialize filters from URL query parameters
function syncFromRoute() {
  const q = route.query
  searchInput.value = typeof q.q === 'string' ? q.q : ''
  selectedSector.value = typeof q.sector === 'string' ? q.sector : (typeof q.economic_sector === 'string' ? q.economic_sector : '')
  selectedModality.value = typeof q.modality === 'string' && ['REMOTE', 'HYBRID', 'ON_SITE'].includes(q.modality)
    ? (q.modality as Modality)
    : ''
  selectedDifficulty.value = typeof q.difficulty === 'string' && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(q.difficulty)
    ? (q.difficulty as DifficultyLevel)
    : (typeof q.difficulty_level === 'string' && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(q.difficulty_level)
        ? (q.difficulty_level as DifficultyLevel)
        : '')
  selectedKnowledgeArea.value = typeof q.knowledge_area === 'string' ? q.knowledge_area : ''

  if (typeof q.skill === 'string' && q.skill.trim()) {
    skillsList.value = q.skill.split(',').map(s => s.trim()).filter(Boolean)
  } else if (Array.isArray(q.skill)) {
    skillsList.value = q.skill.flatMap(s => String(s).split(',').map(item => item.trim())).filter(Boolean)
  } else {
    skillsList.value = []
  }
}

// Active filter count
const activeFiltersCount = computed(() => {
  let count = 0
  if (searchInput.value.trim()) count++
  if (selectedSector.value) count++
  if (selectedModality.value) count++
  if (selectedDifficulty.value) count++
  if (selectedKnowledgeArea.value) count++
  count += skillsList.value.length
  return count
})

// Build current filter object
function getCurrentFilters(): ChallengeCatalogFilter {
  const filters: ChallengeCatalogFilter = {}
  if (searchInput.value.trim()) filters.q = searchInput.value.trim()
  if (selectedSector.value) filters.sector = selectedSector.value
  if (selectedModality.value) filters.modality = selectedModality.value
  if (selectedDifficulty.value) filters.difficulty = selectedDifficulty.value
  if (selectedKnowledgeArea.value) filters.knowledge_area = selectedKnowledgeArea.value
  if (skillsList.value.length === 1) {
    filters.skill = skillsList.value[0]
  } else if (skillsList.value.length > 1) {
    filters.skill = skillsList.value.join(',')
  }
  return filters
}

// Push to router and emit
async function applyFilters() {
  const filters = getCurrentFilters()
  const newQuery: Record<string, string> = {}

  if (filters.q) newQuery.q = filters.q
  if (filters.sector) newQuery.sector = filters.sector
  if (filters.modality) newQuery.modality = filters.modality
  if (filters.difficulty) newQuery.difficulty = filters.difficulty
  if (filters.knowledge_area) newQuery.knowledge_area = filters.knowledge_area
  if (filters.skill) newQuery.skill = filters.skill

  // Only update route if query genuinely changed
  const currentQueryStr = JSON.stringify(route.query)
  const newQueryStr = JSON.stringify(newQuery)
  if (currentQueryStr !== newQueryStr) {
    await router.push({ query: newQuery })
  }
  emit('filter-change', filters)
}

// Debounced search trigger
function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    applyFilters()
  }, 300)
}

// Skill tags handling
function addSkill() {
  const raw = skillInput.value.trim()
  if (!raw) return
  if (!skillsList.value.includes(raw)) {
    skillsList.value.push(raw)
    skillInput.value = ''
    applyFilters()
  } else {
    skillInput.value = ''
  }
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

// Global reset action
function resetAllFilters() {
  searchInput.value = ''
  selectedSector.value = ''
  selectedModality.value = ''
  selectedDifficulty.value = ''
  selectedKnowledgeArea.value = ''
  skillInput.value = ''
  skillsList.value = []

  router.push({ query: {} })
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

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
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
        <input
          v-model="searchInput"
          type="text"
          placeholder="Buscar desafíos por título, descripción o proceso..."
          class="w-full pl-11 pr-10 py-3 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
          @input="onSearchInput"
        >
        <!-- Search Loading Spinner -->
        <div
          v-if="loading"
          class="absolute inset-y-0 right-9 pr-1 flex items-center pointer-events-none"
        >
          <div class="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <button
          v-if="searchInput"
          type="button"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          title="Limpiar búsqueda"
          @click="clearSearch"
        >
          ✕
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

        <!-- Total Results Indicator -->
        <div
          v-if="totalResults > 0 && !loading"
          class="hidden md:flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl border-2 border-neutral-900 dark:border-neutral-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
        >
          <span>{{ totalResults }} {{ totalResults === 1 ? 'oportunidad' : 'oportunidades' }}</span>
        </div>

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
      class="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      :class="{ 'hidden sm:grid': !isMobileExpanded, 'grid': isMobileExpanded }"
    >
      <!-- Economic Sector Select -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Sector Económico
        </label>
        <select
          v-model="selectedSector"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
        <label class="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Modalidad
        </label>
        <select
          v-model="selectedModality"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
        <label class="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Dificultad
        </label>
        <select
          v-model="selectedDifficulty"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
        <label class="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Área de Conocimiento
        </label>
        <select
          v-model="selectedKnowledgeArea"
          class="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
    </div>

    <!-- Skills Tag Input Field -->
    <div
      class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      :class="{ 'hidden sm:flex': !isMobileExpanded, 'flex': isMobileExpanded }"
    >
      <div class="flex-1 flex items-center gap-2">
        <label class="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 shrink-0">
          Habilidad:
        </label>
        <input
          v-model="skillInput"
          type="text"
          placeholder="Escribe una tecnología (ej: Python, Docker) y presiona Enter..."
          class="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-xl font-medium text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @keydown.enter.prevent="addSkill"
        >
        <button
          type="button"
          class="px-3 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
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
      <span class="text-xs font-black text-neutral-500 uppercase tracking-wider">
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
          class="hover:text-red-500 font-black"
          @click="clearSearch"
        >✕</button>
      </span>

      <!-- Sector Chip -->
      <span
        v-if="selectedSector"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-600 rounded-full text-xs font-bold text-amber-800 dark:text-amber-300"
      >
        <span>Sector: {{ selectedSector }}</span>
        <button
          type="button"
          class="hover:text-red-500 font-black"
          @click="clearSector"
        >✕</button>
      </span>

      <!-- Modality Chip -->
      <span
        v-if="selectedModality"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-600 rounded-full text-xs font-bold text-blue-800 dark:text-blue-300"
      >
        <span>Modalidad: {{ MODALITY_OPTIONS.find(m => m.value === selectedModality)?.label || selectedModality }}</span>
        <button
          type="button"
          class="hover:text-red-500 font-black"
          @click="clearModality"
        >✕</button>
      </span>

      <!-- Difficulty Chip -->
      <span
        v-if="selectedDifficulty"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-600 rounded-full text-xs font-bold text-purple-800 dark:text-purple-300"
      >
        <span>Dificultad: {{ DIFFICULTY_OPTIONS.find(d => d.value === selectedDifficulty)?.label || selectedDifficulty }}</span>
        <button
          type="button"
          class="hover:text-red-500 font-black"
          @click="clearDifficulty"
        >✕</button>
      </span>

      <!-- Knowledge Area Chip -->
      <span
        v-if="selectedKnowledgeArea"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-600 rounded-full text-xs font-bold text-emerald-800 dark:text-emerald-300"
      >
        <span>Área: {{ selectedKnowledgeArea }}</span>
        <button
          type="button"
          class="hover:text-red-500 font-black"
          @click="clearKnowledgeArea"
        >✕</button>
      </span>

      <!-- Skill Tag Chips -->
      <span
        v-for="s in skillsList"
        :key="s"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-600 rounded-full text-xs font-bold text-rose-800 dark:text-rose-300"
      >
        <span>Habilidad: {{ s }}</span>
        <button
          type="button"
          class="hover:text-red-500 font-black"
          @click="removeSkill(s)"
        >✕</button>
      </span>
    </div>
  </div>
</template>
