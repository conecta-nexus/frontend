<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChallenges } from '~/composables/useChallenges'
import type { Challenge } from '~/types/challenge'
import { extractApiErrorMessage } from '~/utils/errors'

const MINIMUM_REASON_LENGTH = 15

const props = defineProps<{
  challenge: Challenge | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [isOpen: boolean]
  closed: [challenge: Challenge]
}>()

const { closeChallenge } = useChallenges()
const reason = ref('')
const submitting = ref(false)
const submissionError = ref<string | null>(null)
const hasAttemptedSubmit = ref(false)

const normalizedReason = computed(() => reason.value.trim())
const characterCount = computed(() => normalizedReason.value.length)
const isReasonValid = computed(
  () => characterCount.value >= MINIMUM_REASON_LENGTH,
)

function resetForm() {
  reason.value = ''
  submissionError.value = null
  hasAttemptedSubmit.value = false
}

function requestClose() {
  if (submitting.value) return
  emit('update:isOpen', false)
}

async function confirmClosure() {
  hasAttemptedSubmit.value = true
  submissionError.value = null

  if (!props.challenge || !isReasonValid.value || submitting.value) return

  submitting.value = true
  try {
    const updatedChallenge = await closeChallenge(props.challenge.id, {
      reason: normalizedReason.value,
    })
    emit('closed', updatedChallenge)
    emit('update:isOpen', false)
    resetForm()
  } catch (error: unknown) {
    submissionError.value = extractApiErrorMessage(
      error,
      'No fue posible cerrar el reto. Intenta nuevamente.',
    )
  } finally {
    submitting.value = false
  }
}

watch(
  () => [props.isOpen, props.challenge?.id] as const,
  ([isOpen, challengeId], [wasOpen, previousChallengeId]) => {
    if (isOpen && (!wasOpen || challengeId !== previousChallengeId)) resetForm()
    if (!isOpen && wasOpen && !submitting.value) resetForm()
  },
)
</script>

<template>
  <UModal
    :open="isOpen"
    title="Cerrar reto empresarial"
    description="Esta acción retirará el reto del catálogo y quedará registrada en su historial."
    :dismissible="!submitting"
    :close="!submitting"
    :ui="{
      content: 'max-w-xl rounded-3xl border-2 border-neutral-900 bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)]',
      header: 'border-b-2 border-border-subtle',
      footer: 'border-t-2 border-border-subtle',
    }"
    @update:open="requestClose"
  >
    <template #body>
      <form
        id="challenge-closure-form"
        class="space-y-5"
        @submit.prevent="confirmClosure"
      >
        <div class="rounded-2xl border-2 border-neutral-900/20 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p class="text-xs font-black uppercase tracking-wider text-text-muted">
            Reto seleccionado
          </p>
          <p class="mt-1 text-sm font-black text-text-main">
            {{ challenge?.title || 'Reto no disponible' }}
          </p>
        </div>

        <div>
          <label
            for="closure-reason"
            class="mb-2 block text-sm font-black text-text-main"
          >
            Justificación del cierre
          </label>
          <UTextarea
            id="closure-reason"
            v-model="reason"
            name="closure_reason"
            :rows="5"
            :maxlength="500"
            autoresize
            required
            :disabled="submitting"
            :aria-invalid="hasAttemptedSubmit && !isReasonValid"
            aria-describedby="closure-reason-help closure-reason-count closure-reason-error"
            placeholder="Explica por qué se cerrará este reto empresarial."
            class="w-full"
          />
          <div class="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p id="closure-reason-help" class="font-semibold text-text-muted">
              Escribe una razón clara de al menos 15 caracteres.
            </p>
            <p
              id="closure-reason-count"
              class="font-black"
              :class="isReasonValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-text-muted'"
              aria-live="polite"
            >
              {{ characterCount }}/{{ MINIMUM_REASON_LENGTH }} caracteres mínimos
            </p>
          </div>
          <p
            v-if="hasAttemptedSubmit && !isReasonValid"
            id="closure-reason-error"
            class="mt-2 text-xs font-bold text-institutional-700 dark:text-institutional-300"
            role="alert"
          >
            La justificación debe contener al menos 15 caracteres sin contar espacios externos.
          </p>
        </div>

        <div
          v-if="submissionError"
          role="alert"
          class="rounded-2xl border-2 border-institutional-600 bg-institutional-50 p-3 text-sm font-bold text-institutional-700 dark:bg-institutional-950/40 dark:text-institutional-300"
        >
          {{ submissionError }}
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="min-h-11 rounded-xl border-2 border-neutral-900 bg-surface px-5 py-2.5 text-sm font-black text-text-main disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600"
          :disabled="submitting"
          @click="requestClose"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="challenge-closure-form"
          class="min-h-11 rounded-xl border-2 border-neutral-900 bg-institutional-600 px-5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-institutional-400 dark:shadow-none"
          :disabled="!challenge || !isReasonValid || submitting"
        >
          {{ submitting ? 'Cerrando reto…' : 'Confirmar cierre' }}
        </button>
      </div>
    </template>
  </UModal>
</template>
