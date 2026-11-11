<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Challenge } from '~/types/challenge'
import { useApi } from '~/composables/useApi'

interface Props {
  modelValue: boolean
  challenge: Challenge | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'applied', application: Record<string, unknown>): void
}>()

const { apiFetch } = useApi()

const motivationLetter = ref('')
const acceptedHabeasData = ref(false)
const isSubmitting = ref(false)
const submitSuccess = ref<Record<string, unknown> | null>(null)
const submitError = ref<string | null>(null)

const MIN_MOTIVATION_CHARS = 30
const MAX_MOTIVATION_CHARS = 2000

const remainingChars = computed(() => MAX_MOTIVATION_CHARS - motivationLetter.value.length)

const isValid = computed(() => {
  return (
    motivationLetter.value.trim().length >= MIN_MOTIVATION_CHARS &&
    motivationLetter.value.trim().length <= MAX_MOTIVATION_CHARS &&
    acceptedHabeasData.value
  )
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      motivationLetter.value = ''
      acceptedHabeasData.value = false
      submitSuccess.value = null
      submitError.value = null
      isSubmitting.value = false
    }
  },
)

function handleClose() {
  if (isSubmitting.value) return
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!props.challenge || !isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  submitError.value = null
  submitSuccess.value = null

  try {
    // Llamada síncrona al orquestador del microservicio de postulaciones
    const response = await apiFetch<Record<string, unknown>>('/applications/', {
      method: 'POST',
      body: {
        challenge_id: props.challenge.id,
        motivation_letter: motivationLetter.value.trim(),
      },
    })

    submitSuccess.value = response
    emit('applied', response)
  } catch (err: unknown) {
    const fetchErr = err as {
      status?: number
      data?: {
        detail?: string
        error?: string
        code?: string
        message?: string
        non_field_errors?: string[]
      }
      message?: string
    }

    const detailMsg =
      fetchErr?.data?.detail ||
      fetchErr?.data?.message ||
      fetchErr?.data?.error ||
      (fetchErr?.data?.non_field_errors ? fetchErr.data.non_field_errors.join(' ') : null) ||
      fetchErr?.message ||
      'Error al procesar la postulación.'

    submitError.value = detailMsg
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="modelValue && challenge"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] space-y-6 max-h-[90vh] overflow-y-auto"
    >
      <!-- Cabecera -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-pastel-blue dark:bg-pastel-blue/30 border border-neutral-900 mb-2">
            🚀 Comunicación Síncrona Microservicios
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-text-main line-clamp-1">
            Postulación al Desafío
          </h2>
          <p class="text-xs text-text-muted mt-1 font-medium">
            Aplica a <strong>"{{ challenge.title }}"</strong> enviando tu carta de motivación académica.
          </p>
        </div>

        <button
          type="button"
          class="p-2 rounded-xl border border-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          :disabled="isSubmitting"
          @click="handleClose"
        >
          <svg class="w-5 h-5 text-text-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Estado Exitoso de Postulación -->
      <div
        v-if="submitSuccess"
        class="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 space-y-4 shadow-[4px_4px_0px_0px_rgba(5,150,105,1)] text-center"
      >
        <div class="w-12 h-12 mx-auto rounded-full bg-emerald-200 dark:bg-emerald-900 flex items-center justify-center text-emerald-800 dark:text-emerald-200 text-2xl font-black">
          ✓
        </div>
        <div>
          <h3 class="text-base font-black text-emerald-900 dark:text-emerald-100">
            ¡Postulación Registrada Exitosamente!
          </h3>
          <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-1 font-medium">
            La verificación síncrona de elegibilidad académica y estado del reto se completó en tiempo real.
          </p>
        </div>

        <div class="bg-surface/80 p-3 rounded-xl border border-emerald-600/40 text-left text-xs space-y-1">
          <p><strong>ID Postulación:</strong> <span class="font-mono text-[11px]">{{ submitSuccess.id || 'Generado' }}</span></p>
          <p><strong>Estado:</strong> <span class="font-bold text-amber-700">PENDIENTE</span></p>
          <p><strong>Microservicio Orquestador:</strong> <span class="font-mono text-[11px]">POST /api/v1/applications/</span></p>
          <p class="text-[10px] text-text-muted mt-2">
            ✔ Elegibilidad UFPS verificada síncronamente con <code>profile</code> (Semestre 6.º - 10.º y Habeas Data).
          </p>
          <p class="text-[10px] text-text-muted">
            ✔ Disponibilidad del reto verificada síncronamente con <code>challenge</code> (Status: OPEN).
          </p>
        </div>

        <button
          type="button"
          class="w-full py-2.5 rounded-xl border-2 border-neutral-900 font-black text-xs bg-emerald-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @click="handleClose"
        >
          Cerrar
        </button>
      </div>

      <!-- Formulario de Postulación -->
      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Requisitos Académicos Informativos -->
        <div class="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs space-y-1">
          <p class="font-bold text-text-main">
            📋 Verificaciones automáticas del orquestador:
          </p>
          <ul class="list-disc pl-4 text-text-muted text-[11px] space-y-0.5 font-medium">
            <li>Semestre mínimo requerido por el reto: <strong>{{ challenge.min_semester }}° semestre</strong>.</li>
            <li>Consentimiento activo de tratamiento de datos personales (Habeas Data).</li>
            <li>Validación síncrona inter-microservicio en vivo.</li>
          </ul>
        </div>

        <!-- Carta de Motivación -->
        <div>
          <label for="motivation-letter" class="block text-xs font-black uppercase tracking-wider text-text-main mb-1.5">
            Carta de Motivación / Enfoque Técnico <span class="text-red-600">*</span>
          </label>
          <textarea
            id="motivation-letter"
            v-model="motivationLetter"
            rows="5"
            maxlength="2000"
            placeholder="Explica brevemente tu experiencia, habilidades aplicables a este reto y tu motivación académica..."
            class="w-full rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 bg-canvas p-3.5 text-sm text-text-main font-medium focus:outline-none focus:border-red-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] resize-none"
            :disabled="isSubmitting"
          />
          <div class="flex items-center justify-between text-xs mt-1.5 font-bold">
            <span
              :class="motivationLetter.trim().length < MIN_MOTIVATION_CHARS ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ motivationLetter.trim().length }}/{{ MIN_MOTIVATION_CHARS }} caracteres mínimos
            </span>
            <span class="text-text-muted">
              {{ remainingChars }} disponibles
            </span>
          </div>
        </div>

        <!-- Consentimiento Habeas Data -->
        <label class="flex items-start gap-2.5 text-xs text-text-muted font-medium cursor-pointer pt-1">
          <input
            v-model="acceptedHabeasData"
            type="checkbox"
            class="mt-0.5 rounded border-2 border-neutral-900 text-red-600 focus:ring-0"
            :disabled="isSubmitting"
          >
          <span>
            Autorizo a la Universidad y a la empresa aliada a validar mi estado académico y perfil profesional para los fines de esta convocatoria (Ley 1581/2012).
          </span>
        </label>

        <!-- Banner de Error si la postulación es rechazada por el backend síncrono -->
        <div
          v-if="submitError"
          class="p-4 rounded-xl bg-red-100 dark:bg-red-950/60 border-2 border-red-600 text-xs font-bold text-red-900 dark:text-red-200 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
        >
          <p class="font-black text-red-800 dark:text-red-300 mb-1">
            ⚠️ No fue posible completar la postulación síncrona:
          </p>
          <p>{{ submitError }}</p>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 font-bold text-xs bg-canvas text-text-main hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
            <span>{{ isSubmitting ? 'Verificando con microservicios...' : 'Confirmar y Enviar' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
