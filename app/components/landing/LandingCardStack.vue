<script setup lang="ts">
import { ref, computed } from 'vue'

const activeCategory = ref('all')

const categories = [
  { id: 'all', name: 'Todos los Retos' },
  { id: 'web', name: 'Software & Cloud' },
  { id: 'ai', name: 'Inteligencia Artificial' },
  { id: 'iot', name: 'IoT & Automatización' },
]

function selectCategory(id: string) {
  activeCategory.value = id
}

function onKeydown(event: KeyboardEvent, currentIndex: number) {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    const nextIndex = (currentIndex + 1) % categories.length
    activeCategory.value = categories[nextIndex].id
    if (import.meta.client) {
      const nextTab = document.getElementById(`tab-${categories[nextIndex].id}`)
      nextTab?.focus()
    }
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    const prevIndex = (currentIndex - 1 + categories.length) % categories.length
    activeCategory.value = categories[prevIndex].id
    if (import.meta.client) {
      const prevTab = document.getElementById(`tab-${categories[prevIndex].id}`)
      prevTab?.focus()
    }
  }
}

const challenges = [
  {
    id: 1,
    category: 'iot',
    categoryLabel: 'IoT & Borde',
    title: 'Red de Telemetría y Sensores IoT para Cultivos Locales',
    company: 'AgroTech Cúcuta S.A.S.',
    verified: true,
    description: 'Diseño de nodos sensores de bajo consumo y dashboard web para monitoreo hídrico en tiempo real para agricultores del departamento.',
    semester: 'Semestres 7° a 10°',
    spots: '3 cupos estudiantes',
    duration: '16 semanas (1 Semestre)',
    stack: ['ESP32', 'FastAPI', 'Vue 3', 'MQTT'],
    tagColor: 'bg-pastel-mint dark:bg-pastel-mint/20 text-neutral-900 dark:text-neutral-100',
  },
  {
    id: 2,
    category: 'web',
    categoryLabel: 'Cloud & Microservicios',
    title: 'Microservicio de Facturación Electrónica DIAN y Gestión de Inventarios',
    company: 'Distribuidora del Norte PYME',
    verified: true,
    description: 'Automatización de emisión de comprobantes fiscales electrónicos DIAN e integración con inventario multi-bodega en tiempo real.',
    semester: 'Semestres 8° a 10°',
    spots: '2 cupos estudiantes',
    duration: '16 semanas (1 Semestre)',
    stack: ['Django DRF', 'PostgreSQL', 'Docker', 'Nuxt 4'],
    tagColor: 'bg-pastel-coral dark:bg-pastel-coral/20 text-neutral-900 dark:text-neutral-100',
  },
  {
    id: 3,
    category: 'ai',
    categoryLabel: 'IA & Analítica',
    title: 'Motor de Recomendación y Detección de Fugas de Cartera con Machine Learning',
    company: 'Fintech Regional Oriente',
    verified: true,
    description: 'Algoritmo de predicción temprana de mora y scoring crediticio adaptado a comerciantes informales de Cúcuta.',
    semester: 'Semestres 8° a 10°',
    spots: '4 cupos estudiantes',
    duration: '16 semanas (1 Semestre)',
    stack: ['Python', 'Scikit-Learn', 'FastAPI', 'PostgreSQL'],
    tagColor: 'bg-pastel-blue dark:bg-pastel-blue/20 text-neutral-900 dark:text-neutral-100',
  },
]

const filteredChallenges = computed(() => {
  if (activeCategory.value === 'all') return challenges
  return challenges.filter(c => c.category === activeCategory.value)
})
</script>

<template>
  <section id="retos" class="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pb-32">
    <!-- Contenedor con Efecto de Tarjetas Físicas Apiladas (Meeko Style) -->
    <div class="relative pt-8">
      <!-- Capas de sombras apiladas decorativas -->
      <div
        class="absolute -top-2 inset-x-10 h-10 rounded-t-[40px] bg-neutral-200/90 dark:bg-neutral-800/60 border-2 border-neutral-900 dark:border-neutral-700 pointer-events-none"
      />
      <div
        class="absolute -top-5 inset-x-20 h-10 rounded-t-[40px] bg-neutral-300/70 dark:bg-neutral-800/30 border-2 border-neutral-900 dark:border-neutral-700 pointer-events-none"
      />

      <!-- Tarjeta Elevada Principal -->
      <div
        class="relative bg-surface rounded-[40px] border-2 border-neutral-900 dark:border-neutral-700 p-8 sm:p-12 md:p-14 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)]"
      >
        <!-- Encabezado de la Sección de Retos -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-8 border-b-2 border-border-subtle">
          <div>
            <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-institutional-500/10 text-institutional-600 dark:text-institutional-400 border border-institutional-500/20">
              <span class="w-2.5 h-2.5 rounded-full bg-institutional-500" />
              Banco de Problemáticas Reales
            </div>
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-text-main tracking-tight mt-3">
              Retos Activos de la Industria
            </h2>
            <p class="text-text-muted text-base sm:text-lg mt-2 max-w-xl">
              Problemáticas tecnológicas reales planteadas por PYMEs y empresas de la región para ser desarrolladas en cursos de carrera.
            </p>
          </div>

          <NuxtLink
            to="/retos"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-canvas border-2 border-neutral-900 dark:border-neutral-700 text-sm sm:text-base font-black text-text-main hover:bg-pastel-coral/30 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            <span>Ver Catálogo Completo</span>
            <span class="text-lg">→</span>
          </NuxtLink>
        </div>

        <!-- Filtros Interactivos en Pastillas Pastel (Con accesibilidad ARIA completa) -->
        <div
          role="tablist"
          aria-label="Filtrar retos por categoría tecnológica"
          class="flex flex-wrap items-center gap-3 pt-8 pb-4"
        >
          <button
            v-for="(cat, index) in categories"
            :id="'tab-' + cat.id"
            :key="cat.id"
            type="button"
            role="tab"
            :aria-selected="activeCategory === cat.id ? 'true' : 'false'"
            :aria-controls="'panel-retos'"
            :tabindex="activeCategory === cat.id ? 0 : -1"
            :class="[
              activeCategory === cat.id
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-surface hover:bg-canvas text-text-muted hover:text-text-main',
              'min-h-[44px] px-5 py-2.5 rounded-full border-2 border-neutral-900 dark:border-neutral-700 text-sm font-black transition-all cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
            ]"
            @click="selectCategory(cat.id)"
            @keydown="onKeydown($event, index)"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Panel de Contenido de Retos -->
        <div
          id="panel-retos"
          role="tabpanel"
          :aria-labelledby="'tab-' + activeCategory"
          class="focus-visible:outline-none"
        >
          <!-- Cuadrícula de Tarjetas de Retos -->
          <div
            v-if="filteredChallenges.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6"
          >
            <article
              v-for="item in filteredChallenges"
              :key="item.id"
              class="group rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 p-7 bg-canvas/40 hover:bg-canvas transition-all flex flex-col justify-between shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.12)] hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[7px_7px_0px_0px_rgba(255,255,255,0.18)]"
            >
              <div>
                <!-- Cabecera de la Tarjeta: Categoría y Verificación de Empresa -->
                <div class="flex items-center justify-between gap-2">
                  <span
                    :class="[item.tagColor, 'inline-block px-3.5 py-1 rounded-full text-xs font-black border-2 border-neutral-900/40 dark:border-neutral-600']"
                  >
                    {{ item.categoryLabel }}
                  </span>
                  <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <span>✓</span> {{ item.company }}
                  </span>
                </div>

                <!-- Título del Reto -->
                <h3 class="text-xl sm:text-2xl font-black text-text-main mt-4 leading-snug group-hover:text-institutional-600 dark:group-hover:text-institutional-400 transition-colors">
                  {{ item.title }}
                </h3>

                <!-- Descripción concisa de la problemática -->
                <p class="text-text-muted text-sm mt-3 leading-relaxed">
                  {{ item.description }}
                </p>

                <!-- Stack Tecnológico en Pastillas Mínimas -->
                <div class="flex flex-wrap gap-1.5 mt-4">
                  <span
                    v-for="tech in item.stack"
                    :key="tech"
                    class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-text-main"
                  >
                    {{ tech }}
                  </span>
                </div>
              </div>

              <!-- Metadatos de Semestre, Cupos y Duración -->
              <div class="pt-6 border-t-2 border-border-subtle mt-6 space-y-3">
                <div class="flex items-center justify-between text-xs font-bold text-text-muted">
                  <span class="flex items-center gap-1.5">
                    <span>🎓</span> {{ item.semester }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span>⏱</span> {{ item.duration }}
                  </span>
                </div>

                <div class="flex items-center justify-between pt-2">
                  <span class="text-xs font-black px-2.5 py-1 rounded-full bg-institutional-500/10 text-institutional-700 dark:text-institutional-300">
                    {{ item.spots }}
                  </span>

                  <NuxtLink
                    to="/retos"
                    class="text-xs sm:text-sm font-black text-text-main group-hover:text-institutional-600 dark:group-hover:text-institutional-400 flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
                  >
                    <span>Postularse</span>
                    <span class="group-hover:translate-x-1 transition-transform">→</span>
                  </NuxtLink>
                </div>
              </div>
            </article>
          </div>

          <!-- Estado Vacío Resiliente (Empty State) -->
          <div
            v-else
            class="text-center py-16 px-4 bg-canvas/30 rounded-3xl border-2 border-dashed border-border-subtle mt-6"
          >
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pastel-coral/30 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-2xl">
              🔍
            </div>
            <h4 class="text-xl font-black text-text-main">
              No hay retos activos en esta categoría por el momento
            </h4>
            <p class="text-text-muted text-sm max-w-md mx-auto mt-2">
              ¿Tu empresa o PYME tiene una problemática en esta área tecnológica? Plantea un reto para que los estudiantes de ingeniería lo desarrollen este semestre.
            </p>
            <NuxtLink
              to="/empresas"
              class="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-institutional-500 hover:bg-institutional-600 text-white text-sm font-black border-2 border-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2"
            >
              <span>Proponer Reto Empresarial</span>
              <span>→</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
