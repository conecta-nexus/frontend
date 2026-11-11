<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useChallenges } from '~/composables/useChallenges'
import type { ChallengeCreatePayload } from '~/types/challenge'
import { extractApiErrorMessage } from '~/utils/errors'

definePageMeta({
  middleware: [
    'auth',
    () => {
      const { userRole } = useAuth()
      if (userRole.value !== 'COMPANY') {
        const toast = useToast()
        toast.add({
          title: 'Acceso restringido',
          description: 'La publicación de retos está reservada para empresas y organizaciones aliadas.',
          color: 'warning',
          icon: 'i-lucide-shield-alert',
        })
        return navigateTo('/challenges')
      }
    },
  ],
})

useSeoMeta({
  title: 'Publicar Nuevo Reto — Conecta Nexus',
  description: 'Formulario estructurado para la creación y publicación de retos empresariales orientados a estudiantes de Ingeniería de Sistemas de la UFPS.',
})

const { createChallenge, loading } = useChallenges()
const errorMessage = ref<string | null>(null)

async function handleFormSubmit(payload: ChallengeCreatePayload) {
  try {
    errorMessage.value = null
    await createChallenge(payload)

    const toast = useToast()
    const isDraft = payload.status === 'DRAFT'
    toast.add({
      title: isDraft ? 'Borrador guardado' : 'Reto publicado',
      description: isDraft
        ? 'El borrador del reto ha sido guardado exitosamente.'
        : 'El reto ha sido publicado y ahora está visible para la comunidad académica.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    await navigateTo('/challenges/manage')
  } catch (err: unknown) {
    errorMessage.value = extractApiErrorMessage(
      err,
      'No fue posible registrar el reto. Por favor verifica la información e intenta nuevamente.',
    )
    const toast = useToast()
    toast.add({
      title: 'Error al registrar el reto',
      description: errorMessage.value,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}
</script>

<template>
  <main class="min-h-screen bg-canvas text-text-main py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto space-y-8">
      <!-- MASTHEAD COMPACTO -->
      <header class="space-y-3">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-pastel-coral dark:bg-pastel-coral/25 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-900/30 dark:border-neutral-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)]">
          <span>🏢</span>
          <span>Portal Empresarial UFPS</span>
        </div>

        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-text-main tracking-tight uppercase">
          Publicar Nuevo Reto
        </h1>

        <p class="text-sm sm:text-base text-text-muted font-medium max-w-2xl leading-relaxed">
          Describe la problemática real de tu organización para conectar con el talento técnico y académico de Ingeniería de Sistemas de la Universidad Francisco de Paula Santander.
        </p>
      </header>

      <!-- ALERTA DE ERROR DE SERVIDOR / API -->
      <div
        v-if="errorMessage"
        role="alert"
        class="bg-institutional-50 dark:bg-institutional-950/40 border-2 border-institutional-600 dark:border-institutional-500 rounded-3xl p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(179,38,30,1)] flex items-start justify-between gap-4"
      >
        <div class="flex items-start gap-3.5">
          <span class="text-xl sm:text-2xl mt-0.5 select-none" aria-hidden="true">⚠️</span>
          <div class="space-y-1">
            <h2 class="text-sm sm:text-base font-black text-institutional-700 dark:text-institutional-300 uppercase tracking-wide">
              No se pudo completar la operación
            </h2>
            <p class="text-xs sm:text-sm font-bold text-institutional-600 dark:text-institutional-400">
              {{ errorMessage }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="text-institutional-700 dark:text-institutional-300 hover:opacity-75 text-sm font-black p-1"
          aria-label="Cerrar notificación de error"
          @click="errorMessage = null"
        >
          ✕
        </button>
      </div>

      <!-- FORMULARIO ESTRUCTURADO -->
      <ChallengeForm
        :loading="loading"
        @submit="handleFormSubmit"
      />
    </div>
  </main>
</template>
