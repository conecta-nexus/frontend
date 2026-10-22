<script setup lang="ts">
import LandingNavbar from '~/components/landing/LandingNavbar.vue'
</script>

<template>
  <div class="min-h-screen bg-canvas text-text-main flex flex-col font-sans transition-colors duration-200">
    <!-- Barra Horizontal Flotante -->
    <LandingNavbar />

    <!-- Contenido Principal -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Pie de Página -->
    <footer class="border-t border-border-subtle bg-surface/80 py-8 px-4 sm:px-6 mt-auto">
      <div class="max-w-[1480px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-text-muted">
        <div class="flex items-center gap-2">
          <span class="font-bold text-text-main">Conecta Nexus</span>
          <span>•</span>
          <span>Universidad Francisco de Paula Santander (UFPS Cúcuta)</span>
        </div>
        <div class="flex items-center gap-4">
          <span>© 2026 Conecta Nexus. Todos los derechos reservados.</span>
        </div>
      </div>
    </footer>
  </div>
</template>
