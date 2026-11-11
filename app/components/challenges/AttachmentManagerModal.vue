<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Challenge, ChallengeAttachment } from '~/types/challenge'
import AttachmentUploader from '~/components/challenges/AttachmentUploader.vue'
import AttachmentList from '~/components/challenges/AttachmentList.vue'

interface Props {
  modelValue: boolean
  challenge: Challenge | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated', challenge: Challenge): void
}>()

const localAttachments = ref<ChallengeAttachment[]>([])

watch(
  () => props.challenge,
  (c) => {
    localAttachments.value = c?.attachments ? [...c.attachments] : []
  },
  { immediate: true },
)

function handleAttachmentUploaded(newAtt: ChallengeAttachment) {
  localAttachments.value.push(newAtt)
  if (props.challenge) {
    emit('updated', {
      ...props.challenge,
      attachments: [...localAttachments.value],
    })
  }
}

function handleAttachmentDeleted(deletedId: string) {
  localAttachments.value = localAttachments.value.filter(a => a.id !== deletedId)
  if (props.challenge) {
    emit('updated', {
      ...props.challenge,
      attachments: [...localAttachments.value],
    })
  }
}

function handleClose() {
  emit('update:modelValue', false)
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
      class="bg-surface border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] space-y-6 max-h-[90vh] overflow-y-auto"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-pastel-mint dark:bg-pastel-mint/30 border border-neutral-900 mb-2">
            📎 Gestión de Archivos Técnicos (HU-07)
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-text-main line-clamp-1">
            {{ challenge.title }}
          </h2>
          <p class="text-xs text-text-muted mt-1 font-medium">
            Adjunta especificaciones técnicas, diagramas de arquitectura o requerimientos detallados.
          </p>
        </div>

        <button
          type="button"
          class="p-2 rounded-xl border border-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          @click="handleClose"
        >
          <svg class="w-5 h-5 text-text-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Componente Drag & Drop Uploader -->
      <section>
        <h3 class="text-xs font-black uppercase tracking-wider text-text-main mb-2">
          Cargar nuevo documento
        </h3>
        <AttachmentUploader
          :challenge-id="challenge.id"
          :readonly="challenge.status === 'CLOSED' || challenge.status === 'CANCELLED'"
          @uploaded="handleAttachmentUploaded"
        />
      </section>

      <!-- Lista de Adjuntos Existentes con Descarga / Eliminación -->
      <section class="border-t-2 border-border-subtle pt-4">
        <h3 class="text-xs font-black uppercase tracking-wider text-text-main mb-3">
          Documentos adjuntos ({{ localAttachments.length }})
        </h3>
        <AttachmentList
          :attachments="localAttachments"
          :challenge-id="challenge.id"
          :can-delete="challenge.status !== 'CLOSED' && challenge.status !== 'CANCELLED'"
          @deleted="handleAttachmentDeleted"
        />
      </section>

      <div class="flex justify-end pt-2">
        <button
          type="button"
          class="px-5 py-2 rounded-xl border-2 border-neutral-900 font-black text-xs bg-canvas text-text-main hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          @click="handleClose"
        >
          Listo
        </button>
      </div>
    </div>
  </div>
</template>
