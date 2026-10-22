<script setup lang="ts">
import { onMounted } from 'vue'

if (import.meta.client) {
  // Desactivar la restauración automática del scroll del navegador al recargar
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
}

onMounted(() => {
  // Asegurar que al recargar la página siempre inicie en la parte superior
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
})
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>
