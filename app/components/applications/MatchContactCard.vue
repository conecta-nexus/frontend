<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

export interface MatchContactDetails {
  name?: string | null
  business_name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  contact_person?: string | null
}

const props = withDefaults(
  defineProps<{
    contact?: MatchContactDetails | null
    contactName?: string | null
    contactEmail?: string | null
    contactPhone?: string | null
    counterpartType?: 'COMPANY' | 'STUDENT'
    challengeTitle?: string | null
  }>(),
  {
    contact: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    counterpartType: 'COMPANY',
    challengeTitle: null,
  },
)

type CopyTarget = 'email' | 'phone'

const copiedField = ref<CopyTarget | null>(null)
const copyError = ref<string | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | null = null

const displayName = computed(() => {
  const candidates = [
    props.contactName,
    props.contact?.business_name,
    props.contact?.full_name,
    props.contact?.name,
  ]
  const found = candidates.find(v => typeof v === 'string' && v.trim().length > 0)
  if (found) return found.trim()
  return props.counterpartType === 'COMPANY' ? 'Empresa aliada' : 'Estudiante seleccionado'
})

const contactPerson = computed(() => {
  const value = props.contact?.contact_person
  return typeof value === 'string' && value.trim() ? value.trim() : null
})

const resolvedEmail = computed(() => {
  const value = props.contactEmail ?? props.contact?.email
  return typeof value === 'string' && value.trim() ? value.trim() : null
})

const resolvedPhone = computed(() => {
  const value = props.contactPhone ?? props.contact?.phone
  return typeof value === 'string' && value.trim() ? value.trim() : null
})

const sanitizedTelHref = computed(() => {
  if (!resolvedPhone.value) return ''
  return `tel:${resolvedPhone.value.replace(/[^\d+]/g, '')}`
})

const counterpartBadgeLabel = computed(() =>
  props.counterpartType === 'COMPANY' ? 'Empresa aliada' : 'Estudiante UFPS',
)

function clearResetTimer() {
  if (resetTimer !== null) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
}

async function copyValue(field: CopyTarget, value: string | null) {
  if (!value) return
  copyError.value = null
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable')
    }
    await navigator.clipboard.writeText(value)
    copiedField.value = field
    clearResetTimer()
    resetTimer = setTimeout(() => {
      copiedField.value = null
    }, 2000)
  } catch {
    copyError.value = 'No se pudo copiar al portapapeles. Selecciona el texto manualmente.'
  }
}

onBeforeUnmount(clearResetTimer)
</script>

<template>
  <section
    aria-label="Información de contacto desbloqueada"
    class="w-full overflow-hidden rounded-2xl border-2 border-neutral-900 bg-surface shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.12)]"
  >
    <!-- Celebration Mint Banner (RB-05 Match Unlocked) -->
    <div class="border-b-2 border-neutral-900 bg-pastel-mint px-5 py-4 text-neutral-900 dark:border-neutral-600 dark:bg-emerald-950/75 dark:text-emerald-100">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-900 bg-white text-emerald-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:bg-emerald-900 dark:text-emerald-200">
            <svg
              aria-hidden="true"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-black leading-snug tracking-tight sm:text-lg">
              Vinculación exitosa: contacto habilitado
            </h3>
            <p class="mt-0.5 text-xs font-medium text-neutral-800 dark:text-emerald-200 sm:text-sm">
              <template v-if="challengeTitle">
                Canales directos desbloqueados para el reto «{{ challengeTitle }}».
              </template>
              <template v-else>
                Ya pueden coordinar directamente los detalles académicos y técnicos del proyecto.
              </template>
            </p>
          </div>
        </div>

        <span class="inline-flex items-center rounded-full border-2 border-neutral-900 bg-white px-3 py-1 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:bg-neutral-900 dark:text-emerald-200">
          {{ counterpartBadgeLabel }}
        </span>
      </div>
    </div>

    <!-- Counterpart Identity & Direct Channels -->
    <div class="space-y-4 p-5">
      <div class="flex flex-col gap-0.5">
        <p class="text-base font-black text-text-main sm:text-lg">
          {{ displayName }}
        </p>
        <p
          v-if="contactPerson"
          class="text-xs font-semibold text-text-muted sm:text-sm"
        >
          Responsable: {{ contactPerson }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <!-- Email Channel -->
        <div class="flex flex-col justify-between gap-2 rounded-xl border-2 border-neutral-900 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-900/70">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-black uppercase tracking-wider text-text-muted">
              Correo electrónico
            </span>
            <button
              v-if="resolvedEmail"
              type="button"
              :aria-label="`Copiar correo ${resolvedEmail}`"
              class="inline-flex items-center gap-1.5 rounded-lg border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              @click="copyValue('email', resolvedEmail)"
            >
              <svg
                aria-hidden="true"
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="copiedField === 'email'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M5 13l4 4L19 7"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>{{ copiedField === 'email' ? '¡Copiado!' : 'Copiar' }}</span>
            </button>
          </div>

          <a
            v-if="resolvedEmail"
            :href="`mailto:${resolvedEmail}`"
            class="inline-flex items-center gap-2 break-all text-sm font-bold text-text-main underline decoration-neutral-400 underline-offset-4 hover:text-institutional-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4 shrink-0 text-institutional-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{{ resolvedEmail }}</span>
          </a>
          <p
            v-else
            class="text-sm font-medium text-text-muted"
          >
            Correo electrónico no disponible
          </p>
        </div>

        <!-- Phone Channel -->
        <div class="flex flex-col justify-between gap-2 rounded-xl border-2 border-neutral-900 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-900/70">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-black uppercase tracking-wider text-text-muted">
              Teléfono / WhatsApp
            </span>
            <button
              v-if="resolvedPhone"
              type="button"
              :aria-label="`Copiar teléfono ${resolvedPhone}`"
              class="inline-flex items-center gap-1.5 rounded-lg border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              @click="copyValue('phone', resolvedPhone)"
            >
              <svg
                aria-hidden="true"
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="copiedField === 'phone'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M5 13l4 4L19 7"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>{{ copiedField === 'phone' ? '¡Copiado!' : 'Copiar' }}</span>
            </button>
          </div>

          <a
            v-if="resolvedPhone"
            :href="sanitizedTelHref"
            class="inline-flex items-center gap-2 text-sm font-bold tabular-nums text-text-main underline decoration-neutral-400 underline-offset-4 hover:text-institutional-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 rounded"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4 shrink-0 text-institutional-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{{ resolvedPhone }}</span>
          </a>
          <p
            v-else
            class="text-sm font-medium text-text-muted"
          >
            Teléfono no registrado
          </p>
        </div>
      </div>

      <p
        v-if="copyError"
        role="alert"
        class="text-xs font-semibold text-institutional-500"
      >
        {{ copyError }}
      </p>

      <!-- Live status announcement for assistive technologies -->
      <span
        role="status"
        aria-live="polite"
        class="sr-only"
      >
        <template v-if="copiedField === 'email'">Correo electrónico copiado al portapapeles.</template>
        <template v-else-if="copiedField === 'phone'">Teléfono copiado al portapapeles.</template>
      </span>
    </div>

    <!-- Ley 1581 de 2012 Privacy Compliance Footer -->
    <footer class="border-t-2 border-neutral-200 bg-pastel-blue/50 px-5 py-3 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
      <div class="flex items-start gap-2">
        <svg
          aria-hidden="true"
          class="mt-0.5 h-4 w-4 shrink-0 text-neutral-900 dark:text-blue-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <p>
          <strong>Protección de Datos (Ley 1581 de 2012):</strong> estos datos de contacto se revelan de forma recíproca tras la aceptación mutua de la postulación y deben usarse exclusivamente para coordinar el reto académico.
        </p>
      </div>
    </footer>
  </section>
</template>
