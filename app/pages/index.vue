<script setup lang="ts">
import LandingHero from '~/components/landing/LandingHero.vue'
import LandingCardStack from '~/components/landing/LandingCardStack.vue'

useHead({
  title: 'Conecta Nexus | Impulsando el Talento Universitario y Retos Reales',
  meta: [
    {
      name: 'description',
      content: 'Plataforma colaborativa que une el talento de ingeniería de sistemas UFPS con problemáticas de la industria y PYMEs.',
    },
  ],
})
</script>

<template>
  <div class="space-y-6">
    <LandingHero />
    <LandingCardStack />
  </div>
</template>
