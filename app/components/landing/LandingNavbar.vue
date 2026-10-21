<script setup lang="ts">
import { computed } from 'vue'

const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

function toggleTheme() {
  isDark.value = !isDark.value
}

const route = useRoute()
const { isAuthenticated } = useAuth()

const navLinks = [
  { name: 'Inicio', href: '/' },
  { name: 'Retos', href: '/#retos' },
  { name: 'Para Empresas', href: '/#empresas' },
  { name: 'Estudiantes UFPS', href: '/#estudiantes' },
]

const authCta = computed(() => {
  if (isAuthenticated.value) {
    return { name: 'Mi Perfil', href: '/me' }
  }
  if (route.path === '/auth/login') {
    return { name: 'Registrarse', href: '/auth/register' }
  }
  return { name: 'Ingresar', href: '/auth/login' }
})
</script>

<template>
  <header class="w-full pt-4 md:pt-6 px-4 sm:px-6 lg:px-8">
    <!-- Floating Horizontal Bar with Modern Rounded Corners -->
    <nav
      class="mx-auto max-w-[1480px] w-full bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl sm:rounded-3xl px-6 sm:px-10 lg:px-12 py-3 sm:py-3.5 shadow-sm flex items-center justify-between transition-all duration-200"
      aria-label="Navegación principal"
    >
      <!-- Big Bold Logo / Brand -->
      <NuxtLink
        to="/"
        class="flex items-center gap-2 group rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
      >
        <span class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-text-main">
          Conecta <span class="text-institutional-500">Nexus</span>
        </span>
        <span class="inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-institutional-500 group-hover:scale-125 transition-transform" />
      </NuxtLink>

      <!-- Center Links / Tabs in Spanish -->
      <div class="hidden lg:flex items-center gap-8 xl:gap-11">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.href"
          class="text-base xl:text-lg font-bold text-text-main hover:text-institutional-500 dark:hover:text-institutional-400 transition-colors relative py-1 rounded px-1 hover:after:w-full after:w-0 after:h-0.5 after:bg-institutional-500 after:absolute after:bottom-0 after:left-0 after:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
        >
          {{ link.name }}
        </NuxtLink>
      </div>

      <!-- Right Action Controls (Auth Button + Theme Toggle + Portal UFPS) -->
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Botón de Ingreso / Registro al Sistema -->
        <NuxtLink
          :to="authCta.href"
          class="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-institutional-500 hover:bg-institutional-600 active:scale-95 text-white text-sm font-black border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
        >
          <span>{{ authCta.name }}</span>
        </NuxtLink>

        <!-- Theme Toggle (Claro / Oscuro) sincronizado con useColorMode -->
        <ClientOnly>
          <button
            type="button"
            class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-text-main hover:bg-pastel-coral/30 dark:hover:bg-pastel-blue/20 transition-all hover:scale-105 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            @click="toggleTheme"
          >
            <!-- Si está en modo oscuro: muestra el ícono de Sol para pasar a modo claro -->
            <svg
              v-if="isDark"
              class="w-5 h-5 sm:w-6 sm:h-6 text-amber-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <!-- Si está en modo claro: muestra el ícono de Luna para pasar a modo oscuro -->
            <svg
              v-else
              class="w-5 h-5 sm:w-6 sm:h-6 text-neutral-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
          <template #fallback>
            <div class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
          </template>
        </ClientOnly>

        <!-- Social / Institutional Button (UFPS Portal) -->
        <a
          href="https://ufps.edu.co"
          target="_blank"
          rel="noopener noreferrer"
          class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-text-main hover:bg-pastel-coral/30 dark:hover:bg-pastel-blue/20 transition-all hover:scale-105 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          title="Portal Institucional UFPS"
          aria-label="Portal Institucional UFPS"
        >
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </a>
      </div>
    </nav>
  </header>
</template>
