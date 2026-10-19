<script setup lang="ts">
import { ref, computed } from 'vue'

useHead({
  title: 'Iniciar Sesión | Conecta Nexus UFPS',
  meta: [
    {
      name: 'description',
      content: 'Ingreso al portal Conecta Nexus para estudiantes de ingeniería de sistemas UFPS y empresas de la región.',
    },
  ],
})

type UserRole = 'student' | 'company'
const activeRole = ref<UserRole>('student')

// Form states
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)

const isSubmitting = ref(false)
const loginSuccess = ref(false)
const errorMessage = ref('')

const isStudentEmailValid = computed(() => {
  if (activeRole.value !== 'student' || !email.value) return true
  return email.value.toLowerCase().endsWith('@ufps.edu.co')
})

function switchRole(role: UserRole) {
  activeRole.value = role
  errorMessage.value = ''
  loginSuccess.value = false
  email.value = ''
  password.value = ''
}

function handleLogin() {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor completa todos los campos requeridos.'
    return
  }

  if (activeRole.value === 'student' && !isStudentEmailValid.value) {
    errorMessage.value = 'El correo institucional debe terminar en @ufps.edu.co'
    return
  }

  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    loginSuccess.value = true
  }, 700)
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col justify-center min-h-[calc(100vh-140px)]">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
      <!-- Izquierda: Titular y Mensaje de Gran Presencia -->
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
          <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide uppercase border-2 border-neutral-900 dark:border-neutral-700 bg-pastel-coral dark:bg-pastel-coral/25 text-neutral-900 dark:text-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]">
            <span class="w-2.5 h-2.5 rounded-full bg-institutional-500 animate-pulse motion-reduce:animate-none" />
            Acceso al Ecosistema
          </div>
          <h1 class="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-text-main leading-[1.08]">
            Conecta tu talento con <span class="text-institutional-500">retos reales</span>
          </h1>
          <p class="text-base sm:text-lg text-text-muted font-medium leading-relaxed max-w-xl">
            Ingresa a tu cuenta para gestionar retos técnicos de la industria regional bajo acompañamiento y supervisión docente UFPS.
          </p>
        </div>

        <!-- 2 Tarjetas de Rol Fuertes y Claras -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div class="p-5 rounded-2xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-pastel-blue dark:bg-pastel-blue/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-lg font-black shrink-0">🎓</span>
              <h2 class="text-sm sm:text-base font-black text-text-main uppercase tracking-wide">Para Estudiantes</h2>
            </div>
            <p class="text-xs sm:text-sm font-medium text-text-muted leading-snug">
              Semestres 6° a 10°. Práctica curricular con proyectos reales y portafolio verificado.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-surface border-2 border-neutral-900 dark:border-neutral-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-pastel-coral dark:bg-pastel-coral/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-lg font-black shrink-0">🏢</span>
              <h2 class="text-sm sm:text-base font-black text-text-main uppercase tracking-wide">Para PYMEs</h2>
            </div>
            <p class="text-xs sm:text-sm font-medium text-text-muted leading-snug">
              Postula necesidades de software y automatización con asesoría universitaria UFPS.
            </p>
          </div>
        </div>

        <!-- Micro Certificación Institucional -->
        <div class="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-text-muted pt-1">
          <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Universidad Francisco de Paula Santander • Habeas Data Ley 1581</span>
        </div>
      </div>

      <!-- Derecha: Formulario de Alta Convención Visual -->
      <div>
        <div class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-9 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.18)]">
          <!-- Role Switcher Tabs (Grandes, audaces y claras) -->
          <div
            role="tablist"
            aria-label="Selecciona tipo de usuario"
            class="grid grid-cols-2 gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-900/80 border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl mb-7"
          >
            <button
              id="tab-login-student"
              type="button"
              role="tab"
              :aria-selected="activeRole === 'student'"
              aria-controls="panel-login"
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
              id="tab-login-company"
              type="button"
              role="tab"
              :aria-selected="activeRole === 'company'"
              aria-controls="panel-login"
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
            class="mb-5 p-3.5 rounded-xl bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-red-900 dark:text-red-200 text-sm font-bold flex items-center gap-2.5"
          >
            <svg class="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <div
            v-if="loginSuccess"
            role="status"
            class="mb-5 p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-200 text-sm font-bold flex items-center gap-2.5"
          >
            <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Autenticación exitosa. Redirigiendo a tu panel...</span>
          </div>

          <!-- Formulario Dinámico con Tipografía Sólida -->
          <form
            id="panel-login"
            role="tabpanel"
            :aria-labelledby="activeRole === 'student' ? 'tab-login-student' : 'tab-login-company'"
            class="space-y-5"
            @submit.prevent="handleLogin"
          >
            <!-- Campo Correo -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="login-email" class="block text-sm font-black text-text-main uppercase tracking-wide">
                  {{ activeRole === 'student' ? 'Correo Institucional UFPS' : 'Correo Corporativo o NIT' }}
                </label>
                <span v-if="activeRole === 'student'" class="text-xs font-black text-institutional-500">
                  @ufps.edu.co
                </span>
              </div>
              <input
                id="login-email"
                v-model="email"
                :type="activeRole === 'student' ? 'email' : 'text'"
                required
                autocomplete="username"
                :placeholder="activeRole === 'student' ? 'nombre.apellido@ufps.edu.co' : 'contacto@empresa.com o NIT'"
                class="w-full px-4 py-3 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                :class="{ 'border-red-500 focus-visible:ring-red-500': activeRole === 'student' && email && !isStudentEmailValid }"
              >
              <p
                v-if="activeRole === 'student' && email && !isStudentEmailValid"
                class="text-xs font-bold text-red-600 dark:text-red-400"
              >
                El correo institucional debe terminar en @ufps.edu.co
              </p>
            </div>

            <!-- Campo Contraseña -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="login-password" class="block text-sm font-black text-text-main uppercase tracking-wide">
                  Contraseña
                </label>
                <a
                  href="#olvide-contrasena"
                  class="text-xs font-bold text-institutional-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div class="relative">
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  class="w-full px-4 py-3 pr-12 rounded-2xl bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-text-main placeholder:text-text-muted/60 font-semibold text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 transition-all"
                >
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded-r-2xl"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Recordarme -->
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-text-muted">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="w-4 h-4 rounded border-2 border-neutral-900 text-institutional-500 focus-visible:ring-institutional-500"
                >
                <span>Mantener sesión iniciada</span>
              </label>
            </div>

            <!-- Submit Button (Grande, Negro/Rojo, Audaz) -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full mt-2 py-4 rounded-2xl bg-institutional-500 hover:bg-institutional-600 active:scale-[0.99] disabled:opacity-70 text-white font-black text-base sm:text-lg border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              <span v-if="!isSubmitting">
                {{ activeRole === 'student' ? 'Iniciar Sesión como Estudiante' : 'Iniciar Sesión como Empresa' }}
              </span>
              <span v-else>Validando credenciales...</span>
              <svg v-if="!isSubmitting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          <!-- Toggle Link to Register -->
          <div class="mt-6 pt-4 border-t-2 border-border-subtle text-center text-sm font-semibold text-text-muted">
            ¿Aún no tienes cuenta registrada?
            <NuxtLink
              to="/auth/register"
              class="font-black text-institutional-500 hover:underline ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded"
            >
              Regístrate aquí
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
