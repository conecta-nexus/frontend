<template>
  <section class="relative pt-16 pb-24 md:pt-24 md:pb-36 overflow-hidden">
    <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative">
      <!-- ======================================================================
           STICKERS FLOTANTES ESTILO MEEKO - ALINEADOS A UFPS, EMPRESAS Y TECNOLOGÍA
           Conservan el estilo pastel fresco, relajado y lúdico, pero con símbolos del dominio
           ====================================================================== -->

      <!-- Sticker 1 (Superior Izquierdo): Pastilla Tecnológica / Ingeniería -->
      <div
        class="hidden xl:flex items-center gap-3 absolute top-6 left-6 z-10 select-none animate-float-gentle group cursor-pointer"
      >
        <span class="text-institutional-500 font-black text-2xl animate-twinkle inline-block transition-transform duration-300 group-hover:scale-125">✦</span>
        <div
          class="bg-pastel-blue border-2 border-neutral-900 dark:border-neutral-700 px-6 py-2.5 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] text-base font-black text-neutral-900 flex items-center gap-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)]"
        >
          <span class="text-lg transition-transform duration-300 group-hover:rotate-12">💻</span>
          <span>Ingeniería de Sistemas</span>
        </div>
      </div>

      <!-- Sticker 2 (Superior Derecho): Doodle Tecnológico / Servidor & Código en Menta -->
      <div
        class="hidden xl:flex flex-col items-center absolute top-4 right-12 z-10 select-none animate-float-reverse group cursor-pointer"
      >
        <div class="relative transition-all duration-300 group-hover:scale-110 group-hover:rotate-2">
          <!-- Terminal / Servidor Doodle -->
          <svg
            class="w-20 h-20 text-neutral-900 dark:text-neutral-200 stroke-current fill-pastel-mint drop-shadow-[2px_2px_0px_rgba(0,0,0,0.7)]"
            viewBox="0 0 64 64"
            fill="none"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- Ventana de Terminal / Servidor -->
            <rect x="10" y="14" width="44" height="38" rx="8" />
            <path d="M10 24 L54 24" />
            <!-- Botones ventana -->
            <circle cx="18" cy="19" r="1.5" fill="currentColor" />
            <circle cx="24" cy="19" r="1.5" fill="currentColor" />
            <!-- Símbolo Prompt de código >_ -->
            <path d="M20 33 L26 38 L20 43" />
            <!-- Cursor parpadeante -->
            <path d="M30 43 L38 43" class="animate-terminal-cursor stroke-institutional-500" stroke-width="3" />
          </svg>
          <span class="absolute -bottom-2 -right-3 text-xs font-black px-2.5 py-0.5 rounded-md bg-pastel-mint border-2 border-neutral-900 text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 group-hover:scale-105">
            Cloud & IoT
          </span>
        </div>
      </div>

      <!-- Sticker 3 (Inferior Izquierdo): Doodle Empresa / Crecimiento PYME en Coral -->
      <div
        class="hidden xl:flex items-center absolute bottom-12 left-10 z-10 select-none animate-float-slow group cursor-pointer"
      >
        <div class="relative transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3">
          <svg
            class="w-20 h-20 text-neutral-900 dark:text-neutral-200 stroke-current fill-pastel-coral drop-shadow-[2px_2px_0px_rgba(0,0,0,0.7)]"
            viewBox="0 0 64 64"
            fill="none"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- Edificio / PYME -->
            <rect x="14" y="18" width="36" height="36" rx="4" />
            <path d="M14 26 L50 26" />
            <!-- Ventanas -->
            <rect x="20" y="32" width="6" height="6" rx="1" fill="currentColor" />
            <rect x="38" y="32" width="6" height="6" rx="1" fill="currentColor" />
            <!-- Puerta -->
            <rect x="28" y="42" width="8" height="12" rx="1" />
            <!-- Flecha de crecimiento con realce -->
            <path d="M34 10 L48 10 L48 24" stroke-width="3" class="transition-colors duration-200 group-hover:stroke-institutional-500" />
            <path d="M28 22 L48 10" stroke-width="3" class="transition-colors duration-200 group-hover:stroke-institutional-500" />
          </svg>
          <span class="absolute -bottom-2 -left-2 text-xs font-black px-2.5 py-0.5 rounded-md bg-pastel-coral border-2 border-neutral-900 text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 group-hover:scale-105">
            PYMEs Región
          </span>
        </div>
      </div>

      <!-- Sticker 4 (Inferior Derecho): Pastilla Estudiantes & Semestres en Melocotón -->
      <div
        class="hidden xl:flex items-center gap-3 absolute bottom-14 right-8 z-10 select-none animate-float-reverse group cursor-pointer"
      >
        <div
          class="bg-pastel-peach border-2 border-neutral-900 dark:border-neutral-700 px-6 py-2.5 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] text-base font-black text-neutral-900 flex items-center gap-2 transition-all duration-300 group-hover:scale-105 group-hover:rotate-2 group-hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)]"
        >
          <span class="text-lg transition-transform duration-300 group-hover:scale-125">🎓</span>
          <span>Semestres 6° en adelante</span>
        </div>
      </div>

      <!-- ======================================================================
           TITULAR & SUBTÍTULO INSTITUCIONAL FRESCO (No burocrático, gran escala)
           ====================================================================== -->
      <div class="text-center max-w-5xl mx-auto pt-4 md:pt-6">
        <!-- Badge Superior Desenfadado e Institucional -->
        <div class="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border-2 border-neutral-900 dark:border-neutral-700 bg-surface shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] mb-6 transition-transform hover:scale-105">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-institutional-500 animate-ping motion-reduce:animate-none" />
          <span class="text-xs sm:text-sm font-black tracking-wide uppercase text-text-main">
            UFPS Cúcuta • Conecta Nexus
          </span>
        </div>

        <!-- Titular Principal de Gran Impacto -->
        <h1
          class="text-5xl sm:text-6xl md:text-7xl lg:text-[96px] xl:text-[112px] font-black tracking-tight text-text-main leading-[1.04]"
        >
          <span>El talento UFPS</span>
          <br>
          <span class="relative inline-block mt-1 group cursor-default">
            <span class="relative z-10 text-institutional-500 dark:text-institutional-400">resolviendo retos</span>
            <!-- Trazo pastel decorativo bajo el texto clave -->
            <span class="absolute bottom-2 inset-x-0 h-4 sm:h-6 bg-pastel-coral/60 -rotate-1 -z-0 rounded-md transition-all duration-300 group-hover:h-7 group-hover:bg-pastel-coral/80" />
          </span>
          <br>
          <span class="text-text-main">de la industria real.</span>
        </h1>

        <!-- Subtítulo Claro, Amigable y Profesional -->
        <p
          class="mt-8 md:mt-10 max-w-3xl mx-auto text-xl sm:text-2xl md:text-[26px] text-text-muted font-normal leading-relaxed"
        >
          Conectamos a estudiantes de <strong class="text-text-main font-bold">Ingeniería de Sistemas</strong> con <strong class="text-text-main font-bold">empresas y PYMEs</strong> para desarrollar proyectos de software aplicados, bajo mentoría docente universitaria.
        </p>

        <!-- Botones de Acción Principales -->
        <div class="mt-10 md:mt-12 flex flex-wrap items-center justify-center gap-5 sm:gap-6">
          <!-- Acción Primaria: Explorar Retos -->
          <NuxtLink
            to="/#retos"
            class="group inline-flex items-center gap-3 px-9 sm:px-11 py-4 sm:py-5 rounded-full bg-institutional-500 hover:bg-institutional-600 active:scale-95 text-white font-black text-lg sm:text-xl border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-institutional-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            <span>Ver Retos Disponibles</span>
            <svg class="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </NuxtLink>

          <!-- Acción Secundaria: Publicar Reto Empresa -->
          <NuxtLink
            to="/auth/register"
            class="group inline-flex items-center gap-3 px-9 sm:px-11 py-4 sm:py-5 rounded-full bg-surface hover:bg-pastel-coral/20 active:scale-95 text-text-main font-black text-lg sm:text-xl border-2 border-neutral-900 dark:border-neutral-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-institutional-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            <span>Publicar Problemática PYME</span>
          </NuxtLink>
        </div>

        <!-- Micro-Garantías de Confianza (Sin burocracia pesada, en pastillas suaves) -->
        <div class="mt-12 md:mt-14 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold text-text-muted">
          <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border-subtle">
            <span class="text-institutional-500">✓</span>
            <span>Supervisión Docente UFPS</span>
          </div>
          <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border-subtle">
            <span class="text-institutional-500">✓</span>
            <span>Créditos en Cursos Académicos</span>
          </div>
          <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border-subtle">
            <span class="text-institutional-500">✓</span>
            <span>Tratamiento de Datos Ley 1581</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
