<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ModerationTargetType } from '~/types/moderation'

const MINIMUM_JUSTIFICATION_LENGTH = 15
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    targetType: ModerationTargetType
    initialTargetId?: string
    submitting?: boolean
    serverError?: string | null
  }>(),
  {
    initialTargetId: '',
    submitting: false,
    serverError: null,
  },
)

const emit = defineEmits<{
  'update:isOpen': [isOpen: boolean]
  'submit': [payload: { targetType: ModerationTargetType; targetId: string; justification: string }]
}>()

const targetIdInput = ref(props.initialTargetId)
const justificationInput = ref('')
const attemptedSubmit = ref(false)

const normalizedTargetId = computed(() => targetIdInput.value.trim())
const normalizedJustification = computed(() => justificationInput.value.trim())
const isTargetIdValid = computed(() => UUID_PATTERN.test(normalizedTargetId.value))
const isJustificationValid = computed(
  () => normalizedJustification.value.length >= MINIMUM_JUSTIFICATION_LENGTH,
)
const canSubmit = computed(
  () => isTargetIdValid.value && isJustificationValid.value && !props.submitting,
)

const modalTitle = computed(() =>
  props.targetType === 'CHALLENGE' ? 'Suspender reto empresarial' : 'Suspender cuenta de usuario',
)

const modalDescription = computed(() =>
  props.targetType === 'CHALLENGE'
    ? 'El reto pasará a estado CANCELLED inmediatamente y quedará registrado en el historial de auditoría.'
    : 'La cuenta quedará desactivada en autenticación y la acción quedará registrada de forma inmutable.',
)

function resetForm() {
  targetIdInput.value = props.initialTargetId || ''
  justificationInput.value = ''
  attemptedSubmit.value = false
}

function requestClose() {
  if (props.submitting) return
  emit('update:isOpen', false)
}

function handleSubmit() {
  attemptedSubmit.value = true
  if (!canSubmit.value) return
  emit('submit', {
    targetType: props.targetType,
    targetId: normalizedTargetId.value,
    justification: normalizedJustification.value,
  })
}

watch(
  () => [props.isOpen, props.targetType, props.initialTargetId] as const,
  ([isOpen, , initialId], [wasOpen]) => {
    if (isOpen && !wasOpen) {
      resetForm()
      targetIdInput.value = initialId || ''
    }
  },
)
</script>

<template>
  <UModal
    :open="isOpen"
    :title="modalTitle"
    :description="modalDescription"
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
        id="moderation-suspension-form"
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <div>
          <label
            for="moderation-target-id"
            class="mb-1.5 block text-xs font-black uppercase tracking-wider text-text-main"
          >
            {{ targetType === 'CHALLENGE' ? 'ID del reto (UUID)' : 'ID del usuario (UUID)' }}
          </label>
          <input
            id="moderation-target-id"
            v-model="targetIdInput"
            type="text"
            placeholder="00000000-0000-0000-0000-000000000000"
            :disabled="submitting"
            class="w-full rounded-xl border-2 border-neutral-900 bg-neutral-50 px-3.5 py-2.5 font-mono text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
          <p
            v-if="attemptedSubmit && !isTargetIdValid"
            class="mt-1 text-xs font-semibold text-institutional-500"
          >
            Ingresa un identificador UUID válido.
          </p>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <label
              for="moderation-justification"
              class="block text-xs font-black uppercase tracking-wider text-text-main"
            >
              Justificación obligatoria (mín. 15 caracteres)
            </label>
            <span class="font-mono text-xs font-bold tabular-nums text-text-muted">
              {{ normalizedJustification.length }} / {{ MINIMUM_JUSTIFICATION_LENGTH }}
            </span>
          </div>
          <textarea
            id="moderation-justification"
            v-model="justificationInput"
            rows="4"
            :disabled="submitting"
            placeholder="Describe el incumplimiento normativo o motivo institucional de esta suspensión..."
            class="w-full rounded-xl border-2 border-neutral-900 bg-neutral-50 px-3.5 py-2.5 text-sm font-medium text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <p
            v-if="attemptedSubmit && !isJustificationValid"
            class="mt-1 text-xs font-semibold text-institutional-500"
          >
            La justificación debe tener al menos {{ MINIMUM_JUSTIFICATION_LENGTH }} caracteres efectivos.
          </p>
        </div>

        <p
          v-if="serverError"
          role="alert"
          class="rounded-xl border-2 border-institutional-500 bg-pastel-coral/50 px-3.5 py-2.5 text-xs font-bold text-neutral-900 dark:bg-rose-950/60 dark:text-rose-100"
        >
          {{ serverError }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-3">
        <button
          type="button"
          :disabled="submitting"
          class="rounded-xl border-2 border-neutral-900 bg-white px-4 py-2 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          @click="requestClose"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="moderation-suspension-form"
          :disabled="submitting || !isTargetIdValid || !isJustificationValid"
          class="rounded-xl border-2 border-neutral-900 bg-institutional-500 px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Ejecutando suspensión...' : 'Confirmar suspensión' }}
        </button>
      </div>
    </template>
  </UModal>
</template>
