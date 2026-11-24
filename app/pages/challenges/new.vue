<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ChallengeForm from '~/components/challenges/ChallengeForm.vue'
import { useAuth } from '~/composables/useAuth'
import { useChallenges } from '~/composables/useChallenges'
import type { Challenge, ChallengeCreatePayload, InitialChallengeStatus } from '~/types/challenge'
import { challengeWriteMessage, isDefinitiveCreateRejection } from '~/utils/challengeSubmission'

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

const { createChallenge, getChallenge, publishChallenge } = useChallenges()
const { user } = useAuth()
const toast = useToast()
const confirmationId = 'challenge-creation-confirmation'
const errorMessage = ref<string | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const pendingDraft = ref<Challenge | null>(null)
const busyAction = ref<InitialChallengeStatus | null>(null)
const checkingDraft = ref(false)
const submitting = computed(() => !!busyAction.value || checkingDraft.value)
const uncertainCreate = ref(false)
const formVersion = ref(0)
const recoveryKey = computed(() => user.value?.id ? `challenge-create-pending:${user.value.id}` : null)

watch(errorMessage, (message) => {
  if (message) errorSummary.value?.focus()
}, { flush: 'post' })

function updateRecoveryMarker(pending: boolean, key = recoveryKey.value) {
  uncertainCreate.value = pending
  if (!key) return

  try {
    if (pending) sessionStorage.setItem(key, '1')
    else sessionStorage.removeItem(key)
  } catch {
    // The current form remains protected if browser storage is disabled.
  }
}

function preventUnload(event: BeforeUnloadEvent) {
  if (!submitting.value) return
  event.preventDefault()
  event.returnValue = true
}

onMounted(() => {
  try {
    uncertainCreate.value = !!recoveryKey.value && sessionStorage.getItem(recoveryKey.value) === '1'
  } catch {
    // Browser storage is optional for the current form.
  }
  window.addEventListener('beforeunload', preventUnload)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventUnload))
onBeforeRouteLeave(() => !submitting.value)

function startAnotherChallenge() {
  updateRecoveryMarker(false)
  errorMessage.value = null
  formVersion.value++
}

async function completeSubmission(isDraft: boolean) {
  await navigateTo('/challenges/manage')
  toast.add({
    id: confirmationId,
    title: isDraft ? 'Borrador guardado' : 'Reto publicado',
    description: isDraft
      ? 'Puedes encontrar el borrador en la gestión de retos.'
      : 'El reto ya está disponible en el catálogo.',
    color: 'success',
    icon: 'i-lucide-check-circle',
  })
}

async function publishDraft(draft: Challenge) {
  try {
    const published = await publishChallenge(draft.id)
    if (published.id !== draft.id || published.status !== 'OPEN') {
      throw new Error()
    }
    return true
  } catch (error: unknown) {
    // A lost response might hide a successful transition. Check the saved challenge before retrying.
    const persisted = await getChallenge(draft.id).catch(() => null)
    if (persisted?.id === draft.id) {
      pendingDraft.value = persisted
      if (persisted.status === 'OPEN') return true
    }
    errorMessage.value = challengeWriteMessage(error, 'publish')
    return false
  }
}

async function handleFormSubmit(payload: ChallengeCreatePayload) {
  if (submitting.value || pendingDraft.value || uncertainCreate.value) return

  const action = payload.status ?? 'DRAFT'
  busyAction.value = action
  toast.remove(confirmationId)
  errorMessage.value = null
  const isDraft = action === 'DRAFT'
  const marker = recoveryKey.value
  updateRecoveryMarker(true, marker)
  let draft: Challenge
  try {
    draft = await createChallenge({ ...payload, status: 'DRAFT' })
  } catch (error: unknown) {
    if (isDefinitiveCreateRejection(error)) updateRecoveryMarker(false, marker)
    errorMessage.value = challengeWriteMessage(error, 'create')
    busyAction.value = null
    return
  }

  if (draft?.status !== 'DRAFT' || !draft.id) {
    errorMessage.value = 'No pudimos confirmar si se guardó el borrador. Revisa tus retos antes de iniciar otro.'
    busyAction.value = null
    return
  }

  updateRecoveryMarker(false, marker)
  if (!isDraft) pendingDraft.value = draft
  const confirmed = isDraft || await publishDraft(draft)
  busyAction.value = null
  if (confirmed) await completeSubmission(isDraft)
}

async function retryPublish() {
  if (pendingDraft.value?.status !== 'DRAFT' || submitting.value) return

  const id = pendingDraft.value.id
  checkingDraft.value = true
  toast.remove(confirmationId)
  errorMessage.value = null
  let confirmed = false
  try {
    const saved = await getChallenge(id)
    if (saved?.id !== id) throw new Error()
    pendingDraft.value = saved
    if (saved.status === 'OPEN') {
      confirmed = true
    } else if (saved.status === 'DRAFT') {
      busyAction.value = 'OPEN'
      checkingDraft.value = false
      confirmed = await publishDraft(saved)
    } else {
      errorMessage.value = 'El reto ya no está como borrador. Revisa su estado en la gestión de retos.'
    }
  } catch (error: unknown) {
    errorMessage.value = challengeWriteMessage(error, 'publish')
  } finally {
    checkingDraft.value = false
    busyAction.value = null
  }
  if (confirmed) await completeSubmission(false)
}
</script>

<template>
  <main class="min-h-screen bg-canvas text-text-main py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-[1320px] mx-auto space-y-8">
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
        ref="errorSummary"
        role="alert"
        tabindex="-1"
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
      <section
        v-if="uncertainCreate && !submitting && !pendingDraft"
        class="max-w-2xl space-y-4 rounded-3xl border-2 border-border-subtle bg-surface p-6"
        aria-labelledby="uncertain-create-title"
      >
        <h2 id="uncertain-create-title" class="text-xl font-black">
          Guardado sin confirmar
        </h2>
        <p>
          El borrador podría estar guardado. Revisa tus retos en gestión antes de iniciar otro.
          El servicio no devuelve un identificador para buscar esta solicitud cuando se pierde la respuesta.
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <NuxtLink to="/challenges/manage" class="font-bold underline underline-offset-4">
            Revisar los borradores guardados
          </NuxtLink>
          <button type="button" class="min-h-11 font-bold underline underline-offset-4" @click="startAnotherChallenge">
            Iniciar otro reto con un formulario vacío
          </button>
        </div>
      </section>
      <section
        v-if="pendingDraft"
        class="max-w-2xl space-y-4 rounded-3xl border-2 border-border-subtle bg-surface p-6"
        aria-labelledby="pending-title"
      >
        <h2 id="pending-title" class="text-xl font-black">
          {{ pendingDraft.title }}
        </h2>
        <p role="status" class="flex items-center gap-2">
          <span v-if="submitting" class="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
          {{ checkingDraft ? 'Verificando el estado del reto…' : submitting ? 'Publicando el reto…' : 'Revisa los datos guardados y verifica el estado del reto antes de continuar.' }}
        </p>
        <details v-if="!submitting" class="rounded-xl border border-border-subtle p-4">
          <summary class="cursor-pointer font-bold">
            Revisar los datos guardados
          </summary>
          <dl class="mt-4 grid gap-2 text-sm sm:grid-cols-[max-content_1fr]">
            <dt class="font-bold">Identificador</dt><dd class="break-all">{{ pendingDraft.id }}</dd>
            <dt class="font-bold">Proceso de negocio</dt><dd>{{ pendingDraft.business_process }}</dd>
            <dt class="font-bold">Sector económico</dt><dd>{{ pendingDraft.economic_sector }}</dd>
            <dt class="font-bold">Modalidad</dt><dd>{{ { REMOTE: 'Remoto', HYBRID: 'Híbrido', ON_SITE: 'Presencial' }[pendingDraft.modality] }}</dd>
            <dt class="font-bold">Dificultad</dt><dd>{{ { BEGINNER: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' }[pendingDraft.difficulty_level] }}</dd>
            <dt class="font-bold">Semestre mínimo</dt><dd>{{ pendingDraft.min_semester }}</dd>
            <dt class="font-bold">Habilidades</dt><dd>{{ pendingDraft.required_skills.join(', ') || 'Sin etiquetas' }}</dd>
            <dt class="font-bold">Áreas de conocimiento</dt><dd>{{ pendingDraft.knowledge_areas.join(', ') || 'Sin etiquetas' }}</dd>
            <dt class="font-bold">Descripción</dt><dd class="whitespace-pre-wrap break-words">{{ pendingDraft.description }}</dd>
          </dl>
        </details>
        <div v-if="!submitting" class="flex flex-wrap items-center gap-4">
          <button
            v-if="pendingDraft.status === 'DRAFT'"
            type="button"
            class="min-h-11 rounded-xl bg-institutional-600 px-5 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institutional-500"
            @click="retryPublish"
          >
            Verificar y reintentar publicación
          </button>
          <NuxtLink to="/challenges/manage" class="font-bold underline underline-offset-4">
            Volver a la gestión de retos
          </NuxtLink>
        </div>
      </section>
      <ChallengeForm
        v-show="!pendingDraft"
        :key="formVersion"
        :busy-action="busyAction"
        :locked="uncertainCreate || !!pendingDraft"
        @submit="handleFormSubmit"
      />
    </div>
  </main>
</template>
