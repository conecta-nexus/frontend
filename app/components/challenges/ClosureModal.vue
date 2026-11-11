<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Challenge } from '~/types/challenge'
import { useChallenges } from '~/composables/useChallenges'

interface Props {
  modelValue: boolean
  challenge: Challenge | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'closed', challenge: Challenge): void
}>()

const { closeChallenge } = useChallenges()

const justification = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const MIN_REASON_CHARS = 10
const MAX_REASON_CHARS = 1000

const remainingChars = computed(() => {
  return MAX_REASON_CHARS - justification.value.length
})

const isValid = computed(() => {
  const trimmed = justification.value.trim()
  return trimmed.length >= MIN_REASON_CHARS && trimmed.length <= MAX_REASON_CHARS
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      justification.value = ''
      errorMessage.value = null
      isSubmitting.value = false
    }
  },
)

function showNotification(title: string, description: string, color: 'success' | 'error' | 'warning') {
  try {
    const toast = useToast()
    toast.add({
      title,
      description,
      color,
      icon: color === 'success' ? 'i-lucide-check-circle' : 'i-lucide-alert-circle',
    })
  } catch {
    // Testing mock fallback
  }
}

function handleClose() {
  if (isSubmitting.value) return
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!props.challenge || !isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = null

  try {
    const updated = await closeChallenge(props.challenge.id, justification.value.trim())
    showNotification(
      'Desafío cerrado exitosamente',
      `El reto "${props.challenge.title}" pasó al estado CERRADO.`,
      'success',
    )
    emit('closed', updated)
    emit('update:modelValue', false)
  } catch (err: unknown) {
    const fetchErr = err as { data?: { detail?: string }; message?: string }
    const msg = fetchErr?.data?.detail || fetchErr?.message || 'Error al cerrar el desafío.'
    errorMessage.value = msg
    showNotification('Error al cerrar desafío', msg, 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="closure-modal-title"
  >
    <div
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] space-y-6"
    >
      <!-- Cabecera del Modal -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-pastel-coral dark:bg-pastel-coral/25 text-neutral-900 dark:text-neutral-100 border border-neutral-900 mb-2">
            <span>⚠️</span>
            <span>Cierre Voluntario (HU-08)</span>
          </div>
          <h2 id="closure-modal-title" class="text-xl sm:text-2xl font-black text-text-main">
            Cerrar Convocatoria del Reto
          </h2>
        </div>

        <button
          type="button"
          class="p-2 rounded-xl border border-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          :disabled="isSubmitting"
          aria-label="Cerrar modal"
          @click="handleClose"
        >
          <svg class="w-5 h-5 text-text-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Advertencia de Regla de Negocio (RB-06) -->
      <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-600 shadow-[2px_2px_0px_0px_rgba(217,119,6,1)] space-y-1">
        <p class="text-xs font-black text-amber-900 dark:text-amber-200">
          ⚠️ Acción de Cierre Irreversible:
        </p>
        <p class="text-xs font-medium text-amber-800 dark:text-amber-300">
          El reto <strong>"{{ challenge?.title }}"</strong> dejará de estar abierto para postulaciones estudiantiles. La justificación de cierre es obligatoria con fines de auditoría.
        </p>
      </div>

      <!-- Formulario de Justificación -->
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label for="closure-justification" class="block text-xs font-black uppercase tracking-wider text-text-main mb-1.5">
            Motivo / Justificación de Cierre <span class="text-red-600">*</span>
          </label>
          <textarea
            id="closure-justification"
            v-model="justification"
            rows="4"
            maxlength="1000"
            placeholder="Describe las razones del cierre (p. ej. 'Objetivo alcanzado internamente', 'Modificación de prioridades organizacionales', 'Asignación completada')..."
            class="w-full rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 bg-canvas p-3.5 text-sm text-text-main font-medium focus:outline-none focus:border-red-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] resize-none"
            :disabled="isSubmitting"
          />
          <div class="flex items-center justify-between text-xs mt-1.5 font-bold">
            <span
              :class="justification.trim().length < MIN_REASON_CHARS ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ justification.trim().length }}/{{ MIN_REASON_CHARS }} caracteres mínimos
            </span>
            <span class="text-text-muted">
              {{ remainingChars }} disponibles
            </span>
          </div>
        </div>

        <!-- Banner de error si la mutación falla -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-100 dark:bg-red-950/60 border border-red-600 rounded-xl text-xs font-bold text-red-800 dark:text-red-300"
        >
          {{ errorMessage }}
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 font-bold text-xs bg-canvas text-text-main hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            :disabled="isSubmitting"
            @click="handleClose"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-5 py-2.5 rounded-xl border-2 border-neutral-900 font-black text-xs bg-red-600 hover:bg-red-700 text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="!isValid || isSubmitting"
          >
            <svg v-if="isSubmitting" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>{{ isSubmitting ? 'Cerrando reto...' : 'Confirmar Cierre' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
