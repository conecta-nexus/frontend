<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  MOTIVATION_MAX_LENGTH,
  MOTIVATION_MIN_LENGTH,
  type StudentApplicationResponse,
  formatApplicationError,
  getApplicationErrorStatus,
  normalizeMotivationLetter,
  useApplications,
} from '~/composables/useApplications'
import type { PublicChallengeDetail } from '~/types/challenge'

const props = defineProps<{
  open: boolean
  challenge: PublicChallengeDetail | null
  userId: string | null
  canSubmit: (userId: string, challengeId: string) => boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: [application: StudentApplicationResponse, userId: string]
  alreadyApplied: [challengeId: string, userId: string]
  unavailable: [challengeId: string, userId: string]
}>()

const { submitApplication, submitting, resetState } = useApplications()

const motivationLetter = ref('')
const attemptedSubmit = ref(false)
const submitError = ref<string | null>(null)
const terminal = ref(false)
const isClosingLocked = computed(() => submitting.value)

let submitEpoch = 0
let isUnmounted = false

const hasSubmitPermission = computed(() =>
  props.open && props.challenge?.status === 'OPEN' && !!props.userId
  && props.canSubmit(props.userId, props.challenge.id),
)
const submitFeedback = computed(() =>
  terminal.value || hasSubmitPermission.value
    ? submitError.value
    : 'Tu elegibilidad cambió. Cierra el formulario y revisa los requisitos antes de postularte.',
)

const trimmedLength = computed(() => Array.from(normalizeMotivationLetter(motivationLetter.value)).length)
const isLengthValid = computed(
  () =>
    trimmedLength.value >= MOTIVATION_MIN_LENGTH &&
    trimmedLength.value <= MOTIVATION_MAX_LENGTH,
)

const lengthStatusText = computed(() => {
  if (trimmedLength.value < MOTIVATION_MIN_LENGTH) {
    return `${trimmedLength.value}/${MOTIVATION_MIN_LENGTH} caracteres mínimos`
  }
  return `${trimmedLength.value}/${MOTIVATION_MAX_LENGTH} caracteres`
})

const validationHint = computed(() => {
  if (trimmedLength.value > MOTIVATION_MAX_LENGTH) {
    return `La carta de motivación no puede superar ${MOTIVATION_MAX_LENGTH} caracteres.`
  }
  if (attemptedSubmit.value && trimmedLength.value < MOTIVATION_MIN_LENGTH) {
    return `Escribe al menos ${MOTIVATION_MIN_LENGTH} caracteres explicando tu motivación y perfil técnico.`
  }
  return null
})

function resetForm() {
  motivationLetter.value = ''
  attemptedSubmit.value = false
  submitError.value = null
  terminal.value = false
  resetState()
}

function handleOpenUpdate(nextOpen: boolean) {
  if (isClosingLocked.value && !nextOpen) return
  emit('update:open', nextOpen)
}

async function handleSubmit() {
  if (terminal.value || submitting.value || !hasSubmitPermission.value) return

  attemptedSubmit.value = true
  const targetChallenge = props.challenge
  const expectedUserId = props.userId
  if (!targetChallenge || !expectedUserId || !isLengthValid.value) return
  submitError.value = null

  const expectedChallengeId = targetChallenge.id
  const capturedEpoch = submitEpoch

  try {
    const application = await submitApplication({
      challenge_id: expectedChallengeId,
      motivation_letter: motivationLetter.value,
    })

    if (
      isUnmounted ||
      capturedEpoch !== submitEpoch ||
      props.challenge?.id !== expectedChallengeId ||
      props.userId !== expectedUserId
    ) {
      return
    }

    emit('submitted', application, expectedUserId)
    emit('update:open', false)
    resetForm()
  } catch (err: unknown) {
    if (
      isUnmounted ||
      capturedEpoch !== submitEpoch ||
      props.challenge?.id !== expectedChallengeId ||
      props.userId !== expectedUserId
    ) {
      return
    }

    submitError.value = formatApplicationError(err)
    const status = getApplicationErrorStatus(err)
    if (status === 409) {
      terminal.value = true
      emit('alreadyApplied', expectedChallengeId, expectedUserId)
    } else if (status === 404 || status === 422) {
      terminal.value = true
      emit('unavailable', expectedChallengeId, expectedUserId)
    }
  }
}

watch(
  [() => props.userId, () => props.challenge?.id] as const,
  ([nextUser, nextChallengeId], [prevUser, prevChallengeId]) => {
    if (nextUser !== prevUser || nextChallengeId !== prevChallengeId) {
      submitEpoch += 1
      resetForm()
    }
  },
)

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) {
      resetForm()
    }
  },
)

onBeforeUnmount(() => {
  isUnmounted = true
  submitEpoch += 1
  resetForm()
})
</script>

<template>
  <UModal
    :open="open"
    title="Postularme a este reto"
    description="Envía tu carta de motivación para que la empresa evalúe tu perfil académico y técnico."
    :dismissible="!submitting"
    :close="!submitting"
    :ui="{
      content: 'max-w-xl rounded-3xl border-2 border-neutral-900 bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.12)]',
      header: 'border-b-2 border-border-subtle',
      footer: 'border-t-2 border-border-subtle',
    }"
    @update:open="handleOpenUpdate"
  >
    <template #body>
      <form
        id="challenge-application-form"
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <div class="rounded-2xl border-2 border-neutral-900/15 bg-canvas/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
          <p class="text-[11px] font-black uppercase tracking-wider text-text-muted">
            Reto seleccionado
          </p>
          <p class="mt-1 text-sm font-black text-text-main">
            {{ challenge?.title || 'Reto empresarial' }}
          </p>
          <p class="mt-1 text-xs font-medium text-text-muted">
            Tu contacto personal solo se compartirá si eres seleccionado conforme a la Ley 1581.
          </p>
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label
              for="application-motivation"
              class="text-xs font-black uppercase tracking-wider text-text-main"
            >
              Carta de motivación *
            </label>
            <span
              data-testid="application-char-counter"
              class="text-xs font-bold"
              :class="isLengthValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-text-muted'"
            >
              {{ lengthStatusText }}
            </span>
          </div>

          <textarea
            id="application-motivation"
            v-model="motivationLetter"
            data-testid="application-motivation-input"
            rows="6"
            :disabled="submitting || terminal || !hasSubmitPermission"
            required
            placeholder="Describe tu experiencia relevante, conocimientos técnicos y cómo aportarías a resolver esta problemática empresarial..."
            class="w-full rounded-2xl border-2 border-neutral-900 bg-canvas p-3.5 text-sm font-medium text-text-main placeholder:text-text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 disabled:opacity-60 dark:border-neutral-700"
          />

          <p
            v-if="validationHint"
            role="alert"
            class="text-xs font-bold text-institutional-600 dark:text-institutional-400"
          >
            {{ validationHint }}
          </p>
        </div>

        <div
          v-if="submitFeedback"
          role="alert"
          data-testid="application-submit-error"
          class="rounded-2xl border-2 border-rose-600 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900 dark:border-rose-500/70 dark:bg-rose-950/50 dark:text-rose-200"
        >
          {{ submitFeedback }}
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          :disabled="submitting"
          class="min-h-11 rounded-xl border-2 border-neutral-900 bg-surface px-4 py-2 text-xs font-black text-text-main hover:bg-canvas disabled:opacity-50 dark:border-neutral-600"
          @click="handleOpenUpdate(false)"
        >
          Cancelar
        </button>

        <button
          type="submit"
          form="challenge-application-form"
          data-testid="submit-application-btn"
          :disabled="!isLengthValid || submitting || terminal || !hasSubmitPermission"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-neutral-900 bg-institutional-600 px-5 py-2 text-xs font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-institutional-700 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none dark:border-institutional-400"
        >
          <span v-if="submitting">Enviando postulación...</span>
          <span v-else>Enviar postulación</span>
        </button>
      </div>
    </template>
  </UModal>
</template>
