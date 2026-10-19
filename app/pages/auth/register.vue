<script setup lang="ts">
import { ref, computed } from 'vue'

useHead({
  title: 'Registro de Cuenta | Conecta Nexus UFPS',
  meta: [
    {
      name: 'description',
      content: 'Crea tu cuenta institucional como estudiante de ingeniería de sistemas UFPS o como empresa aliada.',
    },
  ],
})

type UserRole = 'student' | 'company'
const activeRole = ref<UserRole>('student')

// Student Form fields
const studentName = ref('')
const studentEmail = ref('')
const studentCode = ref('')
const studentSemester = ref('6')
const studentDocType = ref('CC')
const studentDocNumber = ref('')
const studentPassword = ref('')
const studentConsent = ref(false)
const showStudentPassword = ref(false)

// Company Form fields
const companyName = ref('')
const companyNit = ref('')
const companySector = ref('')
const companyRep = ref('')
const companyEmail = ref('')
const companyPhone = ref('')
const companyCity = ref('Cúcuta')
const companyPassword = ref('')
const companyConsent = ref(false)
const showCompanyPassword = ref(false)

// UI States
const isSubmitting = ref(false)
const registerSuccess = ref(false)
const errorMessage = ref('')
const showPrivacyModal = ref(false)

const isStudentEmailValid = computed(() => {
  if (!studentEmail.value) return true
  return studentEmail.value.toLowerCase().endsWith('@ufps.edu.co')
})

function switchRole(role: UserRole) {
  activeRole.value = role
  errorMessage.value = ''
  registerSuccess.value = false
}

function handleRegister() {
  errorMessage.value = ''

  if (activeRole.value === 'student') {
    if (!studentName.value || !studentEmail.value || !studentCode.value || !studentDocNumber.value || !studentPassword.value) {
      errorMessage.value = 'Completa todos los campos obligatorios del estudiante.'
      return
    }
    if (!isStudentEmailValid.value) {
      errorMessage.value = 'El correo debe terminar en @ufps.edu.co'
      return
    }
    if (studentPassword.value.length < 8) {
      errorMessage.value = 'La contraseña debe tener mínimo 8 caracteres.'
      return
    }
    if (!studentConsent.value) {
      errorMessage.value = 'Debes aceptar la autorización de tratamiento de datos (Ley 1581).'
      return
    }
  } else {
    if (!companyName.value || !companyNit.value || !companySector.value || !companyRep.value || !companyEmail.value || !companyPhone.value || !companyPassword.value) {
      errorMessage.value = 'Completa todos los campos obligatorios de la empresa.'
      return
    }
    if (companyPassword.value.length < 8) {
      errorMessage.value = 'La contraseña debe tener mínimo 8 caracteres.'
      return
    }
    if (!companyConsent.value) {
      errorMessage.value = 'Debes certificar la personería jurídica y tratamiento de datos (Ley 1581).'
      return
    }
  }

  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    registerSuccess.value = true
  }, 800)
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col justify-center min-h-[calc(100vh-140px)]">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start lg:items-center">
      <!-- Izquierda: Titular y Propuesta de Valor Audaz -->
      <div class="space-y-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-sm font-black text-text-muted hover:text-institutional-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded px-1 -ml-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al inicio</span>
        </NuxtLink>

        <div class="space-y-3">
          <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide uppercase border-2 border-neutral-900 dark:border-neutral-700 bg-pastel-mint dark:bg-pastel-mint/25 text-neutral-900 dark:text-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse motion-reduce:animate-none" />
            Registro Institucional
          </div>
          <h1 class="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-text-main leading-[1.08]">
            Únete a la red de innovación <span class="text-institutional-500">UFPS</span>
          </h1>
          <p class="text-base sm:text-lg text-text-muted font-medium leading-relaxed max-w-xl">
            Conecta retos de desarrollo e ingeniería reales con estudiantes avanzados y docentes de la región.
          </p>
        </div>

        <!-- 3 Puntos Clave de Gran Escala -->
        <div class="space-y-3 pt-1">
          <div class="flex items-center gap-3.5 p-4 rounded-2xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]">
            <span class="w-10 h-10 rounded-xl bg-pastel-blue dark:bg-pastel-blue/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-lg font-black shrink-0">🎓</span>
            <div class="text-sm sm:text-base font-bold text-text-main">
              <strong class="font-black text-text-main">Estudiantes UFPS:</strong> Semestres 6° en adelante con evaluación curricular y portafolio profesional.
            </div>
          </div>

          <div class="flex items-center gap-3.5 p-4 rounded-2xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]">
            <span class="w-10 h-10 rounded-xl bg-pastel-coral dark:bg-pastel-coral/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-lg font-black shrink-0">🏢</span>
            <div class="text-sm sm:text-base font-bold text-text-main">
              <strong class="font-black text-text-main">Empresas & PYMEs:</strong> Soluciones de software a la medida con tutoría de docentes del programa.
            </div>
          </div>

          <div class="flex items-center gap-3.5 p-4 rounded-2xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]">
            <span class="w-10 h-10 rounded-xl bg-pastel-mint dark:bg-pastel-mint/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-lg font-black shrink-0">⚖️</span>
            <div class="text-sm sm:text-base font-bold text-text-main flex items-center gap-2 flex-wrap">
              <span>Tratamiento de datos conforme a la <strong>Ley 1581 de 2012</strong>.</span>
              <button
                type="button"
                class="text-institutional-500 hover:underline font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded"
                @click="showPrivacyModal = true"
              >
                (Ver política)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Derecha: Formulario Amplio, Cómodo y Bolder -->
      <div>
        <div class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-9 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.18)]">
          <!-- Role Switcher Tabs (Audaces y Convincentes) -->
          <div
            role="tablist"
            aria-label="Selecciona tipo de registro"
            class="grid grid-cols-2 gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-900/80 border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl mb-6"
          >
            <button
              id="tab-reg-student"
              type="button"
              role="tab"
              :aria-selected="activeRole === 'student'"
              aria-controls="panel-reg"
              class="py-3 px-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
              :class="[
                activeRole === 'student'
                  ? 'bg-pastel-blue dark:bg-pastel-blue/30 text-neutral-900 dark:text-neutral-50 border-2 border-neutral-900 dark:border-neutral-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]'
                  : 'text-text-muted hover:text-text-main border-2 border-transparent'
              ]"
              @click="switchRole('student')"
            >
              <span>🎓 Estudiante UFPS</span>
            </button>

            <button
              id="tab-reg-company"
              type="button"
              role="tab"
              :aria-selected="activeRole === 'company'"
              aria-controls="panel-reg"
              class="py-3 px-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
              :class="[
                activeRole === 'company'
                  ? 'bg-pastel-coral dark:bg-pastel-coral/30 text-neutral-900 dark:text-neutral-50 border-2 border-neutral-900 dark:border-neutral-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]'
                  : 'text-text-muted hover:text-text-main border-2 border-transparent'
              ]"
              @click="switchRole('company')"
            >
              <span>🏢 Empresa o PYME</span>
            </button>
          </div>

          <!-- Alert Messages -->
          <div
            v-if="errorMessage"
            role="alert"
            class="mb-4 p-3.5 rounded-xl bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 text-sm font-bold flex items-center gap-2.5"
          >
            <svg class="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <div
            v-if="registerSuccess"
            role="status"
            class="mb-4 p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-200 text-sm font-bold flex items-center justify-between gap-2"
          >
            <span>¡Cuenta creada con éxito! Revisa tu correo institucional para activar tu acceso.</span>
            <NuxtLink to="/auth/login" class="underline font-black hover:text-emerald-700 whitespace-nowrap ml-2">
              Ingresar →
            </NuxtLink>
          </div>

          <!-- Formulario Estudiante -->
          <form
            v-if="activeRole === 'student'"
            id="panel-reg"
            role="tabpanel"
            aria-labelledby="tab-reg-student"
            class="space-y-4"
            @submit.prevent="handleRegister"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label for="student-name" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Nombre Completo *
                </label>
                <input
                  id="student-name"
                  v-model="studentName"
                  type="text"
                  required
                  placeholder="Carlos Rodríguez Sánchez"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>

              <div class="space-y-1.5">
                <label for="student-code" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Código Estudiantil *
                </label>
                <input
                  id="student-code"
                  v-model="studentCode"
                  type="text"
                  required
                  placeholder="Ej. 1152000"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label for="student-reg-email" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                    Correo UFPS *
                  </label>
                  <span class="text-xs font-black text-institutional-500">@ufps.edu.co</span>
                </div>
                <input
                  id="student-reg-email"
                  v-model="studentEmail"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="nombre.apellido@ufps.edu.co"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                  :class="{ 'border-red-500': studentEmail && !isStudentEmailValid }"
                >
              </div>

              <div class="space-y-1.5">
                <label for="student-sem" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Semestre Actual *
                </label>
                <select
                  id="student-sem"
                  v-model="studentSemester"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main font-bold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all cursor-pointer"
                >
                  <option value="6">6° Semestre</option>
                  <option value="7">7° Semestre</option>
                  <option value="8">8° Semestre</option>
                  <option value="9">9° Semestre</option>
                  <option value="10">10° Semestre o Superior</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div class="sm:col-span-4 space-y-1.5">
                <label for="student-doctype" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Tipo Doc. *
                </label>
                <select
                  id="student-doctype"
                  v-model="studentDocType"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main font-bold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all cursor-pointer"
                >
                  <option value="CC">C.C. (Cédula)</option>
                  <option value="TI">T.I. (Tarjeta)</option>
                  <option value="CE">C.E. (Extranjería)</option>
                </select>
              </div>

              <div class="sm:col-span-8 space-y-1.5">
                <label for="student-docnum" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Número de Documento *
                </label>
                <input
                  id="student-docnum"
                  v-model="studentDocNumber"
                  type="text"
                  required
                  placeholder="Número de identidad"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="student-reg-password" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                Contraseña (Mínimo 8 caracteres) *
              </label>
              <div class="relative">
                <input
                  id="student-reg-password"
                  v-model="studentPassword"
                  :type="showStudentPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  placeholder="Crea una contraseña segura"
                  class="w-full px-4 py-2.5 pr-12 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded-r-2xl"
                  :aria-label="showStudentPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                  @click="showStudentPassword = !showStudentPassword"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Checkbox Ley 1581 -->
            <label class="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-text-muted pt-1">
              <input
                v-model="studentConsent"
                type="checkbox"
                required
                class="w-4 h-4 rounded border-2 border-neutral-900 text-institutional-500 focus-visible:ring-institutional-500 shrink-0"
              >
              <span>Acepto el tratamiento de mis datos personales según la Ley 1581 y la política institucional UFPS.</span>
            </label>

            <!-- Submit Button (Grande y Audaz) -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full mt-2 py-4 rounded-2xl bg-institutional-500 hover:bg-institutional-600 active:scale-[0.99] disabled:opacity-70 text-white font-black text-base sm:text-lg border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              <span v-if="!isSubmitting">Crear Cuenta de Estudiante</span>
              <span v-else>Procesando registro...</span>
              <svg v-if="!isSubmitting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          <!-- Formulario Empresa -->
          <form
            v-else
            id="panel-reg"
            role="tabpanel"
            aria-labelledby="tab-reg-company"
            class="space-y-4"
            @submit.prevent="handleRegister"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label for="company-reg-name" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Razón Social *
                </label>
                <input
                  id="company-reg-name"
                  v-model="companyName"
                  type="text"
                  required
                  placeholder="Distribuciones del Norte S.A.S."
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>

              <div class="space-y-1.5">
                <label for="company-reg-nit" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  NIT de la Empresa *
                </label>
                <input
                  id="company-reg-nit"
                  v-model="companyNit"
                  type="text"
                  required
                  placeholder="900.123.456-7"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label for="company-reg-sector" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Sector o Industria *
                </label>
                <select
                  id="company-reg-sector"
                  v-model="companySector"
                  required
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main font-bold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all cursor-pointer"
                >
                  <option value="" disabled selected>Selecciona sector</option>
                  <option value="tecnologia">Tecnología & Software</option>
                  <option value="agroindustria">Agroindustria & Alimentos</option>
                  <option value="comercio">Comercio & Retail</option>
                  <option value="servicios">Servicios Empresariales</option>
                  <option value="salud">Salud & Bienestar</option>
                  <option value="manufactura">Manufactura & Calzado</option>
                  <option value="otro">Otro Sector</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label for="company-reg-city" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Ciudad / Municipio *
                </label>
                <input
                  id="company-reg-city"
                  v-model="companyCity"
                  type="text"
                  required
                  placeholder="Cúcuta, Los Patios, etc."
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label for="company-reg-rep" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Representante o Contacto *
                </label>
                <input
                  id="company-reg-rep"
                  v-model="companyRep"
                  type="text"
                  required
                  placeholder="Nombre de contacto"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>

              <div class="space-y-1.5">
                <label for="company-reg-phone" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Teléfono / WhatsApp *
                </label>
                <input
                  id="company-reg-phone"
                  v-model="companyPhone"
                  type="tel"
                  required
                  placeholder="312 000 0000"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label for="company-reg-email" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Correo Corporativo *
                </label>
                <input
                  id="company-reg-email"
                  v-model="companyEmail"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="contacto@empresa.com"
                  class="w-full px-4 py-2.5 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
              </div>

              <div class="space-y-1.5">
                <label for="company-reg-password" class="block text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
                  Contraseña (8+ car.) *
                </label>
                <div class="relative">
                  <input
                    id="company-reg-password"
                    v-model="companyPassword"
                    :type="showCompanyPassword ? 'text' : 'password'"
                    required
                    autocomplete="new-password"
                    placeholder="Contraseña segura"
                    class="w-full px-4 py-2.5 pr-12 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                  >
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded-r-2xl"
                    :aria-label="showCompanyPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                    @click="showCompanyPassword = !showCompanyPassword"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Checkbox Ley 1581 -->
            <label class="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-text-muted pt-1">
              <input
                v-model="companyConsent"
                type="checkbox"
                required
                class="w-4 h-4 rounded border-2 border-neutral-900 text-institutional-500 focus-visible:ring-institutional-500 shrink-0"
              >
              <span>Certifico la personería jurídica y acepto el tratamiento de datos según la Ley 1581.</span>
            </label>

            <!-- Submit Button (Grande y Audaz) -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full mt-2 py-4 rounded-2xl bg-institutional-500 hover:bg-institutional-600 active:scale-[0.99] disabled:opacity-70 text-white font-black text-base sm:text-lg border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              <span v-if="!isSubmitting">Registrar Empresa en Conecta Nexus</span>
              <span v-else>Procesando registro...</span>
              <svg v-if="!isSubmitting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          <!-- Toggle Link to Login -->
          <div class="mt-6 pt-4 border-t-2 border-border-subtle text-center text-sm font-semibold text-text-muted">
            ¿Ya tienes una cuenta registrada?
            <NuxtLink
              to="/auth/login"
              class="font-black text-institutional-500 hover:underline ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded"
            >
              Inicia sesión aquí
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Protección de Datos (Ley 1581) -->
    <div
      v-if="showPrivacyModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] space-y-4">
        <div class="flex items-center justify-between">
          <h3 id="privacy-modal-title" class="text-base sm:text-lg font-black text-text-main">
            Política de Privacidad y Ley 1581 de 2012
          </h3>
          <button
            type="button"
            class="w-8 h-8 rounded-full border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-text-muted hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 text-sm font-black"
            aria-label="Cerrar modal"
            @click="showPrivacyModal = false"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3 text-xs sm:text-sm text-text-muted max-h-[50vh] overflow-y-auto pr-2 leading-relaxed">
          <p>
            Conforme a la <strong>Ley Estatutaria 1581 de 2012</strong>, los datos personales y empresariales serán tratados por la Universidad Francisco de Paula Santander exclusivamente para:
          </p>
          <ul class="list-disc pl-5 space-y-1">
            <li>Verificación académica de estudiantes en Ingeniería de Sistemas (Semestres 6° a 10°).</li>
            <li>Validación tributaria y de personería jurídica (NIT) de PYMEs y organizaciones aliadas.</li>
            <li>Seguimiento y evaluación docente curricular de los retos asignados.</li>
          </ul>
          <p class="font-bold text-text-main">
            Los datos recolectados no se comercializan ni se transfieren a terceros sin consentimiento previo.
          </p>
        </div>

        <div class="pt-3 flex justify-end">
          <button
            type="button"
            class="px-5 py-2.5 rounded-xl bg-institutional-500 hover:bg-institutional-600 text-white font-black text-sm border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
            @click="showPrivacyModal = false"
          >
            Entendido y Aceptado
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
