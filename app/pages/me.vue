<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { extractApiErrorMessage } from '~/utils/errors'

definePageMeta({
  middleware: ['auth'],
})

useHead({
  title: 'Mi Cuenta y Perfil | Conecta Nexus UFPS',
  meta: [
    {
      name: 'description',
      content: 'Panel personal de usuario autenticado en el ecosistema Conecta Nexus UFPS.',
    },
  ],
})

const {
  user,
  studentProfile,
  companyProfile,
  consent,
  userRole,
  isInitializing,
  fetchProfile,
  fetchConsent,
  updateStudentProfile,
  updateCompanyProfile,
  logout,
} = useAuth()

// Edit mode toggle
const isEditing = ref(false)
const isSaving = ref(false)
const editError = ref('')
const editSuccess = ref(false)

// Student editable state
const editSemester = ref(7)
const editBio = ref('')
const editSkills = ref<string[]>([])
const editAreas = ref<string[]>([])
const skillInput = ref('')
const areaInput = ref('')

// Curated technical presets for rapid student tag entry
const SUGGESTED_SKILLS = [
  'Python', 'FastAPI', 'Vue.js', 'TypeScript', 'Docker',
  'PostgreSQL', 'Java', 'Spring Boot', 'Tailwind CSS', 'Git',
  'Linux', 'Kubernetes', 'Django', 'React', 'Node.js',
]

const SUGGESTED_AREAS = [
  'Desarrollo Web', 'Computación en la Nube', 'DevOps & CI/CD',
  'Inteligencia Artificial', 'Arquitectura de Software', 'Ciberseguridad',
  'Bases de Datos', 'Aplicaciones Móviles',
]

// Company editable state
const editSector = ref('')
const editDescription = ref('')
const editWebsite = ref('')
const editContactName = ref('')
const editContactPhone = ref('')

// Toast notification state
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
const showToast = ref(false)

function triggerToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 4000)
}

onMounted(async () => {
  if (!studentProfile.value && !companyProfile.value) {
    await fetchProfile()
  }
  if (!consent.value) {
    await fetchConsent()
  }
  initEditFields()
})

function initEditFields() {
  if (userRole.value === 'STUDENT' && studentProfile.value) {
    editSemester.value = studentProfile.value.current_semester || 7
    editBio.value = studentProfile.value.bio || ''
    editSkills.value = [...(studentProfile.value.technical_skills || [])]
    editAreas.value = [...(studentProfile.value.interest_areas || [])]
    skillInput.value = ''
    areaInput.value = ''
  } else if (userRole.value === 'COMPANY' && companyProfile.value) {
    editSector.value = companyProfile.value.economic_sector || ''
    editDescription.value = companyProfile.value.description || ''
    editWebsite.value = companyProfile.value.website_url || ''
    editContactName.value = companyProfile.value.contact_name || ''
    editContactPhone.value = companyProfile.value.contact_phone || ''
  }
}

function startEditing() {
  initEditFields()
  editError.value = ''
  editSuccess.value = false
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  editError.value = ''
}

// Interactive Skill Tag Helpers
function addSkill(name: string) {
  const trimmed = name.trim().replace(/,/g, '')
  if (!trimmed) return
  if (trimmed.length > 30) {
    triggerToast('El nombre de la competencia es demasiado largo (máx. 30 caracteres).', 'info')
    return
  }
  if (editSkills.value.length >= 15) {
    triggerToast('Límite máximo de 15 competencias técnicas alcanzado.', 'info')
    return
  }
  const exists = editSkills.value.some(s => s.toLowerCase() === trimmed.toLowerCase())
  if (!exists) {
    editSkills.value.push(trimmed)
  }
  skillInput.value = ''
}

function removeSkill(index: number) {
  editSkills.value.splice(index, 1)
}

function handleSkillKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addSkill(skillInput.value)
  } else if (e.key === 'Backspace' && !skillInput.value && editSkills.value.length > 0) {
    editSkills.value.pop()
  }
}

// Interactive Area Tag Helpers
function addArea(name: string) {
  const trimmed = name.trim().replace(/,/g, '')
  if (!trimmed) return
  if (trimmed.length > 40) {
    triggerToast('El nombre del área es demasiado largo (máx. 40 caracteres).', 'info')
    return
  }
  if (editAreas.value.length >= 8) {
    triggerToast('Límite máximo de 8 áreas de enfoque alcanzado.', 'info')
    return
  }
  const exists = editAreas.value.some(a => a.toLowerCase() === trimmed.toLowerCase())
  if (!exists) {
    editAreas.value.push(trimmed)
  }
  areaInput.value = ''
}

function removeArea(index: number) {
  editAreas.value.splice(index, 1)
}

function handleAreaKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addArea(areaInput.value)
  } else if (e.key === 'Backspace' && !areaInput.value && editAreas.value.length > 0) {
    editAreas.value.pop()
  }
}

async function handleSaveStudent() {
  editError.value = ''
  editSuccess.value = false
  isSaving.value = true

  // Commit any pending unconfirmed input text
  if (skillInput.value.trim()) {
    addSkill(skillInput.value)
  }
  if (areaInput.value.trim()) {
    addArea(areaInput.value)
  }

  try {
    await updateStudentProfile({
      current_semester: Number(editSemester.value),
      bio: editBio.value.trim(),
      technical_skills: editSkills.value,
      interest_areas: editAreas.value,
    })

    editSuccess.value = true
    isEditing.value = false
    triggerToast('¡Perfil académico actualizado con éxito!', 'success')
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, 'No fue posible actualizar tu perfil académico.')
    editError.value = msg
    triggerToast(msg, 'error')
  } finally {
    isSaving.value = false
  }
}

async function handleSaveCompany() {
  editError.value = ''
  editSuccess.value = false
  isSaving.value = true

  try {
    await updateCompanyProfile({
      economic_sector: editSector.value.trim(),
      description: editDescription.value.trim(),
      website_url: editWebsite.value.trim() || null,
      contact_name: editContactName.value.trim(),
      contact_phone: editContactPhone.value.trim(),
    })

    editSuccess.value = true
    isEditing.value = false
    triggerToast('¡Perfil empresarial actualizado con éxito!', 'success')
  } catch (err: unknown) {
    const msg = extractApiErrorMessage(err, 'No fue posible actualizar la ficha empresarial.')
    editError.value = msg
    triggerToast(msg, 'error')
  } finally {
    isSaving.value = false
  }
}

function formatDate(isoDate?: string | null): string {
  if (!isoDate) return 'Fecha no registrada'
  try {
    return new Date(isoDate).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return isoDate
  }
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
    <!-- Toast / Notificación Flotante -->
    <Transition
      enter-active-class="transform transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transform transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="showToast"
        class="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"
        :class="{
          'bg-pastel-mint text-neutral-900': toastType === 'success',
          'bg-red-100 text-red-900 border-red-900': toastType === 'error',
          'bg-surface text-text-main': toastType === 'info'
        }"
      >
        <span class="text-xl font-black shrink-0">
          {{ toastType === 'success' ? '✓' : toastType === 'error' ? '✕' : 'ℹ' }}
        </span>
        <p class="text-xs sm:text-sm font-bold flex-1">
          {{ toastMessage }}
        </p>
        <button
          type="button"
          class="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm font-black hover:opacity-70"
          aria-label="Cerrar notificación"
          @click="showToast = false"
        >
          ✕
        </button>
      </div>
    </Transition>

    <!-- Indicador de Carga Inicial -->
    <div
      v-if="isInitializing"
      class="text-center py-20 space-y-4"
    >
      <div class="inline-block w-12 h-12 border-4 border-institutional-500 border-t-transparent rounded-full animate-spin" />
      <p class="text-base font-bold text-text-muted">
        Cargando expediente institucional...
      </p>
    </div>

    <div v-else class="space-y-6 sm:space-y-8">
      <!-- Masthead Superior Institucional -->
      <header class="p-5 sm:p-6 rounded-3xl bg-pastel-mint/30 dark:bg-pastel-mint/15 border-2 border-neutral-900 dark:border-neutral-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-black shrink-0 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ✓
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-text-main tracking-tight">
              Campus Virtual · Conecta Nexus UFPS
            </h1>
            <p class="text-xs sm:text-sm text-text-muted font-medium mt-0.5">
              Ecosistema de vinculación académica y resolución de retos empresariales · Periodo 2026-II
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <NuxtLink
            to="/"
            class="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl bg-surface hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-main font-bold text-sm border-2 border-neutral-900 dark:border-neutral-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
          >
            Explorar Retos
          </NuxtLink>

          <button
            type="button"
            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-text-main font-bold text-sm border-2 border-neutral-900 dark:border-neutral-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
            @click="logout"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <!-- Disposición Principal (12 Columnas: 4 Rail Identidad / 8 Dossier de Trabajo) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <!-- Columna Izquierda (4 Cols): Rail de Identidad Anclado -->
        <aside class="lg:col-span-4 lg:sticky lg:top-8 bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] space-y-6">
          <div class="text-center space-y-3.5">
            <div
              class="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-4xl sm:text-5xl font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              :class="userRole === 'STUDENT' ? 'bg-pastel-blue dark:bg-pastel-blue/30' : 'bg-pastel-coral dark:bg-pastel-coral/30'"
            >
              {{ userRole === 'STUDENT' ? '🎓' : '🏢' }}
            </div>

            <div class="space-y-1">
              <div
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-1"
                :class="userRole === 'STUDENT' ? 'bg-pastel-blue text-neutral-900' : 'bg-pastel-coral text-neutral-900'"
              >
                {{ userRole === 'STUDENT' ? 'Estudiante UFPS' : userRole === 'COMPANY' ? 'Empresa Aliada' : 'Administrador' }}
              </div>
              <h2 class="text-lg sm:text-xl font-black text-text-main break-words">
                {{ studentProfile?.full_name || companyProfile?.business_name || user?.email }}
              </h2>
              <p class="text-xs sm:text-sm font-semibold text-text-muted break-all">
                {{ user?.email }}
              </p>
            </div>
          </div>

          <div class="border-t-2 border-border-subtle pt-4 space-y-3 text-xs sm:text-sm">
            <div class="flex items-center justify-between">
              <span class="font-bold text-text-muted">Estado</span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Activa y Verificada
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="font-bold text-text-muted">Rol en Plataforma</span>
              <span class="font-bold text-text-main">
                {{ userRole === 'STUDENT' ? 'Postulante a Retos' : 'Publicador de Retos' }}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="font-bold text-text-muted">Sede Universitaria</span>
              <span class="font-bold text-text-main">Cúcuta, Principal</span>
            </div>

            <!-- Detalle técnico colapsable -->
            <details class="pt-3 border-t border-border-subtle group text-xs text-text-muted">
              <summary class="cursor-pointer font-bold select-none hover:text-text-main flex items-center justify-between py-1">
                <span>Información de Sesión & ID</span>
                <span class="text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div class="mt-2 space-y-1.5 font-mono text-xs bg-canvas p-2.5 rounded-xl border border-border-subtle">
                <div class="truncate" :title="user?.id">
                  <span class="font-sans font-bold text-text-muted">ID:</span> {{ user?.id }}
                </div>
                <div>
                  <span class="font-sans font-bold text-text-muted">Firma Criptográfica:</span> RS256 UFPS
                </div>
              </div>
            </details>
          </div>
        </aside>

        <!-- Columna Derecha (8 Cols): Dossier y Ficha de Trabajo -->
        <main class="lg:col-span-8 space-y-6 sm:space-y-8">
          <!-- ================= VISTA ESTUDIANTE ================= -->
          <section
            v-if="userRole === 'STUDENT'"
            class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] space-y-6"
          >
            <!-- MODO EDICIÓN ESTUDIANTE -->
            <template v-if="isEditing">
              <div class="flex items-center justify-between border-b-2 border-border-subtle pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-black text-text-main tracking-tight">
                    Modificar Datos Académicos
                  </h3>
                  <p class="text-xs text-text-muted font-medium mt-0.5">
                    Actualiza tu semestre, competencias y carta de presentación. Los registros oficiales de matrícula son inmutables.
                  </p>
                </div>
                <button
                  type="button"
                  class="text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-neutral-900 bg-surface hover:bg-neutral-100 text-text-main transition-colors"
                  @click="cancelEditing"
                >
                  Cancelar
                </button>
              </div>

              <div
                v-if="editError"
                class="p-3.5 rounded-xl bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 text-sm font-bold flex items-center gap-2"
              >
                <span>✕</span>
                <span>{{ editError }}</span>
              </div>

              <form class="space-y-6" @submit.prevent="handleSaveStudent">
                <!-- Registros oficiales inmutables (2x2) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="block text-xs font-black uppercase text-text-muted">Código Estudiantil UFPS</label>
                      <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">🔒 Oficial UFPS</span>
                    </div>
                    <input
                      :value="studentProfile?.student_code"
                      disabled
                      class="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 font-semibold text-sm text-text-muted cursor-not-allowed"
                    >
                  </div>

                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="block text-xs font-black uppercase text-text-muted">Programa Académico</label>
                      <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">🔒 Plan Oficial</span>
                    </div>
                    <input
                      :value="studentProfile?.academic_program"
                      disabled
                      class="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 font-semibold text-sm text-text-muted cursor-not-allowed"
                    >
                  </div>
                </div>

                <!-- Selector de Semestre -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="block text-xs font-black uppercase text-text-muted">Semestre de Cursado *</label>
                    <span class="text-xs text-text-muted font-medium">Habilita retos de 6° a 10° semestre</span>
                  </div>
                  <select
                    v-model="editSemester"
                    class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 cursor-pointer"
                  >
                    <option :value="6">6° Semestre</option>
                    <option :value="7">7° Semestre</option>
                    <option :value="8">8° Semestre</option>
                    <option :value="9">9° Semestre</option>
                    <option :value="10">10° Semestre o Superior</option>
                  </select>
                </div>

                <!-- Selector Interactivo de Competencias Técnicas -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="block text-xs font-black uppercase text-text-muted">
                      Competencias y Stack Técnico
                    </label>
                    <span class="text-xs text-text-muted font-medium">
                      {{ editSkills.length }}/15 agregadas (Presiona Enter o coma)
                    </span>
                  </div>

                  <div class="min-h-[48px] p-2 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-institutional-500">
                    <span
                      v-for="(skill, index) in editSkills"
                      :key="skill"
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-pastel-blue text-neutral-900 border border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <span>{{ skill }}</span>
                      <button
                        type="button"
                        class="w-4 h-4 rounded-full hover:bg-neutral-900 hover:text-white flex items-center justify-center text-xs leading-none font-black transition-colors"
                        :aria-label="`Eliminar ${skill}`"
                        @click="removeSkill(index)"
                      >
                        ✕
                      </button>
                    </span>

                    <input
                      v-model="skillInput"
                      type="text"
                      placeholder="Escribe y presiona Enter..."
                      class="flex-1 min-w-[140px] px-2 py-1 bg-transparent font-medium text-sm focus:outline-none placeholder:text-text-muted/60"
                      @keydown="handleSkillKeydown"
                      @blur="addSkill(skillInput)"
                    >
                  </div>

                  <!-- Sugerencias Rápidas de Habilidades -->
                  <div class="space-y-1.5 pt-1">
                    <span class="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      Stack sugerido:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="preset in SUGGESTED_SKILLS"
                        :key="preset"
                        type="button"
                        :disabled="editSkills.some(s => s.toLowerCase() === preset.toLowerCase())"
                        class="px-2.5 py-1 rounded-lg text-xs font-bold border border-neutral-900/40 dark:border-neutral-700/60 transition-all hover:bg-pastel-yellow hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        @click="addSkill(preset)"
                      >
                        + {{ preset }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Selector Interactivo de Áreas de Especialización -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="block text-xs font-black uppercase text-text-muted">
                      Áreas de Especialización o Interés
                    </label>
                    <span class="text-xs text-text-muted font-medium">
                      {{ editAreas.length }}/8 seleccionadas
                    </span>
                  </div>

                  <div class="min-h-[48px] p-2 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-institutional-500">
                    <span
                      v-for="(area, index) in editAreas"
                      :key="area"
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-pastel-mint text-neutral-900 border border-neutral-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <span>{{ area }}</span>
                      <button
                        type="button"
                        class="w-4 h-4 rounded-full hover:bg-neutral-900 hover:text-white flex items-center justify-center text-xs leading-none font-black transition-colors"
                        :aria-label="`Eliminar ${area}`"
                        @click="removeArea(index)"
                      >
                        ✕
                      </button>
                    </span>

                    <input
                      v-model="areaInput"
                      type="text"
                      placeholder="Escribe y presiona Enter..."
                      class="flex-1 min-w-[140px] px-2 py-1 bg-transparent font-medium text-sm focus:outline-none placeholder:text-text-muted/60"
                      @keydown="handleAreaKeydown"
                      @blur="addArea(areaInput)"
                    >
                  </div>

                  <!-- Sugerencias Rápidas de Áreas -->
                  <div class="space-y-1.5 pt-1">
                    <span class="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      Áreas recomendadas:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="areaPreset in SUGGESTED_AREAS"
                        :key="areaPreset"
                        type="button"
                        :disabled="editAreas.some(a => a.toLowerCase() === areaPreset.toLowerCase())"
                        class="px-2.5 py-1 rounded-lg text-xs font-bold border border-neutral-900/40 dark:border-neutral-700/60 transition-all hover:bg-pastel-yellow hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        @click="addArea(areaPreset)"
                      >
                        + {{ areaPreset }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Bio con Contador de Caracteres -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="block text-xs font-black uppercase text-text-muted">Perfil Profesional y Carta de Presentación</label>
                    <span class="text-xs font-bold" :class="editBio.length > 450 ? 'text-amber-600' : 'text-text-muted'">
                      {{ editBio.length }}/500
                    </span>
                  </div>
                  <textarea
                    v-model="editBio"
                    rows="3"
                    maxlength="500"
                    placeholder="Describe tus fortalezas, experiencia en proyectos de ingeniería y áreas de práctica profesional preferidas..."
                    class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 resize-none"
                  />
                </div>

                <!-- Botonera de Acción de Formulario -->
                <div class="flex flex-col sm:flex-row items-center gap-3 pt-3">
                  <button
                    type="submit"
                    :disabled="isSaving"
                    class="w-full sm:flex-1 py-3 px-6 rounded-xl bg-institutional-500 hover:bg-institutional-600 disabled:opacity-70 text-white font-black text-sm border-2 border-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all flex items-center justify-center gap-2"
                  >
                    <span v-if="!isSaving">Guardar Modificaciones</span>
                    <span v-else>Guardando modificaciones...</span>
                  </button>
                  <button
                    type="button"
                    class="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface hover:bg-neutral-100 text-text-main font-bold text-sm border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 transition-all"
                    @click="cancelEditing"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </template>

            <!-- MODO LECTURA ESTUDIANTE -->
            <template v-else>
              <div class="flex items-center justify-between border-b-2 border-border-subtle pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-black text-text-main tracking-tight">
                    Expediente Académico del Estudiante
                  </h3>
                  <p class="text-xs text-text-muted font-medium mt-0.5">
                    Información oficial vinculada a tu plan de estudios de Ingeniería de Sistemas.
                  </p>
                </div>
                <div class="flex items-center gap-2.5">
                  <span class="text-xs font-black uppercase tracking-wide px-3 py-1 bg-pastel-blue dark:bg-pastel-blue/30 rounded-xl border border-neutral-900 dark:border-neutral-700">
                    Semestre {{ studentProfile?.current_semester ?? '6+' }}°
                  </span>
                  <button
                    type="button"
                    class="text-xs font-black px-3.5 py-1.5 rounded-xl bg-pastel-yellow hover:bg-yellow-300 text-neutral-900 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 transition-all flex items-center gap-1.5"
                    @click="startEditing"
                  >
                    <span>✏️</span>
                    <span>Modificar Datos</span>
                  </button>
                </div>
              </div>

              <!-- Si existe perfil cargado -->
              <div v-if="studentProfile" class="space-y-6">
                <!-- Grilla 2x2 de Registros -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Código Institucional UFPS</div>
                    <div class="text-base font-bold text-text-main font-mono">{{ studentProfile.student_code }}</div>
                  </div>

                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Programa Académico</div>
                    <div class="text-base font-bold text-text-main">{{ studentProfile.academic_program }}</div>
                  </div>

                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Correo Institucional</div>
                    <div class="text-base font-bold text-text-main break-all">{{ studentProfile.contact_email }}</div>
                  </div>

                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Teléfono de Contacto</div>
                    <div class="text-base font-bold text-text-main">{{ studentProfile.contact_phone || 'No registrado' }}</div>
                  </div>
                </div>

                <!-- Habilidades Técnicas -->
                <div class="p-5 rounded-2xl bg-canvas border border-border-subtle space-y-3">
                  <div class="text-xs font-black text-text-muted uppercase tracking-wider">Competencias y Stack Técnico</div>
                  <div v-if="studentProfile.technical_skills && studentProfile.technical_skills.length > 0" class="flex flex-wrap gap-2">
                    <span
                      v-for="skill in studentProfile.technical_skills"
                      :key="skill"
                      class="px-3 py-1 rounded-xl text-xs font-bold bg-pastel-blue/40 border border-neutral-900 dark:border-neutral-700 text-text-main shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {{ skill }}
                    </span>
                  </div>
                  <p v-else class="text-xs text-text-muted italic">
                    Aún no has agregado competencias técnicas. Haz clic en "Modificar Datos" para registrarlas.
                  </p>
                </div>

                <!-- Áreas de Interés -->
                <div class="p-5 rounded-2xl bg-canvas border border-border-subtle space-y-3">
                  <div class="text-xs font-black text-text-muted uppercase tracking-wider">Áreas de Especialización o Interés</div>
                  <div v-if="studentProfile.interest_areas && studentProfile.interest_areas.length > 0" class="flex flex-wrap gap-2">
                    <span
                      v-for="area in studentProfile.interest_areas"
                      :key="area"
                      class="px-3 py-1 rounded-xl text-xs font-bold bg-pastel-mint/40 border border-neutral-900 dark:border-neutral-700 text-text-main shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {{ area }}
                    </span>
                  </div>
                  <p v-else class="text-xs text-text-muted italic">
                    Aún no has registrado áreas de interés. Haz clic en "Modificar Datos" para registrarlas.
                  </p>
                </div>

                <!-- Bio -->
                <div class="p-5 rounded-2xl bg-canvas border border-border-subtle space-y-2">
                  <div class="text-xs font-black text-text-muted uppercase tracking-wider">Perfil Profesional y Presentación</div>
                  <p class="text-sm font-medium text-text-main leading-relaxed">
                    {{ studentProfile.bio || 'Sin carta de presentación registrada.' }}
                  </p>
                </div>
              </div>

              <!-- En caso excepcional de sincronización pendiente -->
              <div v-else class="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 text-center space-y-3">
                <p class="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Sincronizando el expediente con el servicio de perfiles universitarios...
                </p>
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl bg-institutional-500 text-white font-bold text-xs border border-neutral-900"
                  @click="fetchProfile"
                >
                  Reintentar sincronización
                </button>
              </div>
            </template>
          </section>

          <!-- ================= VISTA EMPRESA ================= -->
          <section
            v-else-if="userRole === 'COMPANY'"
            class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] space-y-6"
          >
            <!-- MODO EDICIÓN EMPRESA -->
            <template v-if="isEditing">
              <div class="flex items-center justify-between border-b-2 border-border-subtle pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-black text-text-main tracking-tight">
                    Modificar Ficha Empresarial
                  </h3>
                  <p class="text-xs text-text-muted font-medium mt-0.5">
                    Actualiza la información corporativa y canales de contacto institucional. El NIT tributario es inmutable.
                  </p>
                </div>
                <button
                  type="button"
                  class="text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-neutral-900 bg-surface hover:bg-neutral-100 text-text-main transition-colors"
                  @click="cancelEditing"
                >
                  Cancelar
                </button>
              </div>

              <div
                v-if="editError"
                class="p-3.5 rounded-xl bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 text-sm font-bold flex items-center gap-2"
              >
                <span>✕</span>
                <span>{{ editError }}</span>
              </div>

              <form class="space-y-5" @submit.prevent="handleSaveCompany">
                <!-- Campos inmutables -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="block text-xs font-black uppercase text-text-muted">NIT de la Organización</label>
                      <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">🔒 Registro DIAN</span>
                    </div>
                    <input
                      :value="companyProfile?.nit"
                      disabled
                      class="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 font-mono font-semibold text-sm text-text-muted cursor-not-allowed"
                    >
                  </div>

                  <div class="space-y-1">
                    <label class="block text-xs font-black uppercase text-text-muted">Sector Económico *</label>
                    <input
                      v-model="editSector"
                      type="text"
                      required
                      placeholder="Tecnología, Banca, Consultoría, Manufactura..."
                      class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
                    >
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="block text-xs font-black uppercase text-text-muted">Persona de Contacto o Enlace Institucional *</label>
                    <input
                      v-model="editContactName"
                      type="text"
                      required
                      placeholder="Nombre del enlace institucional"
                      class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
                    >
                  </div>

                  <div class="space-y-1">
                    <label class="block text-xs font-black uppercase text-text-muted">Línea de Contacto Directo / WhatsApp *</label>
                    <input
                      v-model="editContactPhone"
                      type="tel"
                      required
                      placeholder="315 000 0000"
                      class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
                    >
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="block text-xs font-black uppercase text-text-muted">Portal Web o Enlace Institucional</label>
                  <input
                    v-model="editWebsite"
                    type="url"
                    placeholder="https://empresa.com"
                    class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
                  >
                </div>

                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="block text-xs font-black uppercase text-text-muted">Reseña de la Organización</label>
                    <span class="text-xs font-bold" :class="editDescription.length > 700 ? 'text-amber-600' : 'text-text-muted'">
                      {{ editDescription.length }}/800
                    </span>
                  </div>
                  <textarea
                    v-model="editDescription"
                    rows="3"
                    maxlength="800"
                    placeholder="Describe los objetivos y actividades de tu organización para los convenios de retos..."
                    class="w-full px-4 py-2.5 rounded-xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 resize-none"
                  />
                </div>

                <!-- Botonera de Acción de Formulario Empresa -->
                <div class="flex flex-col sm:flex-row items-center gap-3 pt-3">
                  <button
                    type="submit"
                    :disabled="isSaving"
                    class="w-full sm:flex-1 py-3 px-6 rounded-xl bg-institutional-500 hover:bg-institutional-600 disabled:opacity-70 text-white font-black text-sm border-2 border-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all flex items-center justify-center gap-2"
                  >
                    <span v-if="!isSaving">Guardar Modificaciones</span>
                    <span v-else>Guardando modificaciones...</span>
                  </button>
                  <button
                    type="button"
                    class="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface hover:bg-neutral-100 text-text-main font-bold text-sm border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 transition-all"
                    @click="cancelEditing"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </template>

            <!-- MODO LECTURA EMPRESA -->
            <template v-else>
              <div class="flex items-center justify-between border-b-2 border-border-subtle pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-black text-text-main tracking-tight">
                    Ficha Empresarial Aliada
                  </h3>
                  <p class="text-xs text-text-muted font-medium mt-0.5">
                    Información corporativa registrada ante la universidad para convenios institucionales y retos.
                  </p>
                </div>
                <div class="flex items-center gap-2.5">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border border-neutral-900 dark:border-neutral-700"
                    :class="companyProfile?.is_verified ? 'bg-emerald-100 text-emerald-900 border-emerald-600' : 'bg-amber-100 text-amber-900 border-amber-600'"
                  >
                    {{ companyProfile?.is_verified ? '✓ NIT Verificado' : 'En Verificación' }}
                  </span>
                  <button
                    type="button"
                    class="text-xs font-black px-3.5 py-1.5 rounded-xl bg-pastel-yellow hover:bg-yellow-300 text-neutral-900 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 transition-all flex items-center gap-1.5"
                    @click="startEditing"
                  >
                    <span>✏️</span>
                    <span>Modificar Datos</span>
                  </button>
                </div>
              </div>

              <!-- Si existe perfil cargado -->
              <div v-if="companyProfile" class="space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">NIT de la Organización</div>
                    <div class="text-base font-bold text-text-main font-mono">{{ companyProfile.nit }}</div>
                  </div>

                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Sector Económico</div>
                    <div class="text-base font-bold text-text-main capitalize">{{ companyProfile.economic_sector }}</div>
                  </div>

                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Persona de Contacto o Enlace</div>
                    <div class="text-base font-bold text-text-main">{{ companyProfile.contact_name }}</div>
                  </div>

                  <div class="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-1">
                    <div class="text-xs font-black text-text-muted uppercase tracking-wider">Línea de Contacto / WhatsApp</div>
                    <div class="text-base font-bold text-text-main">{{ companyProfile.contact_phone }}</div>
                  </div>
                </div>

                <div v-if="companyProfile.description" class="p-5 rounded-2xl bg-canvas border border-border-subtle space-y-2">
                  <div class="text-xs font-black text-text-muted uppercase tracking-wider">Reseña de la Organización</div>
                  <p class="text-sm font-medium text-text-main leading-relaxed">
                    {{ companyProfile.description }}
                  </p>
                </div>

                <div v-if="companyProfile.website_url" class="p-5 rounded-2xl bg-canvas border border-border-subtle space-y-2">
                  <div class="text-xs font-black text-text-muted uppercase tracking-wider">Portal Web Institucional</div>
                  <a
                    :href="companyProfile.website_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-bold text-institutional-500 hover:underline break-all"
                  >
                    {{ companyProfile.website_url }} ↗
                  </a>
                </div>
              </div>

              <!-- En caso excepcional de sincronización pendiente -->
              <div v-else class="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 text-center space-y-3">
                <p class="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Sincronizando la ficha empresarial con el servicio de perfiles universitarios...
                </p>
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl bg-institutional-500 text-white font-bold text-xs border border-neutral-900"
                  @click="fetchProfile"
                >
                  Reintentar sincronización
                </button>
              </div>
            </template>
          </section>

          <!-- Tarjeta de Cumplimiento Legal (Habeas Data Ley 1581) -->
          <footer class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <span class="w-10 h-10 rounded-xl bg-pastel-mint dark:bg-pastel-mint/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-lg font-black shrink-0">
                ⚖️
              </span>
              <div>
                <div class="text-sm sm:text-base font-black text-text-main">
                  Tratamiento de Datos Personales (Ley Estatutaria 1581 de 2012)
                </div>
                <div class="text-xs text-text-muted font-medium mt-0.5">
                  {{ consent?.is_accepted ? `Autorización registrada el ${formatDate(consent.accepted_at)} (${consent.policy_version}). Tus datos están protegidos y solo se emplean con fines de articulación académica.` : 'Autorización registrada conforme al marco institucional universitario.' }}
                </div>
                <a
                  href="https://ww2.ufps.edu.co/universidad/normatividad"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-xs font-bold text-institutional-500 hover:underline mt-1"
                >
                  <span>Consultar Política Institucional de Datos UFPS</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div class="text-xs font-black px-3 py-1 rounded-full border-2 border-neutral-900 dark:border-neutral-700 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shrink-0">
              ✓ Consentimiento Vigente
            </div>
          </footer>
        </main>
      </div>
    </div>
  </div>
</template>
