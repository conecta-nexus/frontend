<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useChallenges } from '~/composables/useChallenges'
import type { ChallengeAttachment } from '~/types/challenge'
import { extractApiErrorMessage } from '~/utils/errors'

const props = defineProps<{
  attachments: ChallengeAttachment[]
  canDelete: boolean
}>()

const emit = defineEmits<{
  deleted: [attachmentId: string]
}>()

const { getAttachmentDownloadUrl, deleteAttachment } = useChallenges()
const toast = useToast()

const visibleAttachments = ref<ChallengeAttachment[]>([...props.attachments])
const downloadingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const pendingDeletion = ref<ChallengeAttachment | null>(null)
const confirmButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.attachments,
  attachments => {
    visibleAttachments.value = [...attachments]
  },
  { deep: true },
)

const hasAttachments = computed(() => visibleAttachments.value.length > 0)

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileKind(mimeType: string): 'pdf' | 'image' | 'file' {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  return 'file'
}

function fileTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'image/png') return 'PNG'
  if (mimeType === 'image/jpeg') return 'JPG'
  if (mimeType === 'image/webp') return 'WEBP'
  return 'ARCHIVO'
}

async function handleDownload(attachment: ChallengeAttachment) {
  if (downloadingId.value) return

  const previewWindow = window.open('about:blank', '_blank')
  if (previewWindow) {
    previewWindow.opener = null
  }

  downloadingId.value = attachment.id
  try {
    const response = await getAttachmentDownloadUrl(
      attachment.challenge_id,
      attachment.id,
    )
    if (!response.download_url) {
      throw new Error('El servicio no devolvió un enlace de descarga válido.')
    }
    if (!previewWindow) {
      throw new Error('El navegador bloqueó la nueva pestaña de descarga.')
    }
    previewWindow.location.href = response.download_url
  } catch (error: unknown) {
    previewWindow?.close()
    toast.add({
      title: 'No fue posible descargar el archivo',
      description: extractApiErrorMessage(
        error,
        'Intenta generar el enlace de descarga nuevamente.',
      ),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    downloadingId.value = null
  }
}

async function requestDeletion(attachment: ChallengeAttachment) {
  pendingDeletion.value = attachment
  await nextTick()
  confirmButton.value?.focus()
}

function cancelDeletion() {
  if (!deletingId.value) {
    pendingDeletion.value = null
  }
}

async function confirmDeletion() {
  const attachment = pendingDeletion.value
  if (!attachment || deletingId.value) return

  deletingId.value = attachment.id
  try {
    await deleteAttachment(attachment.challenge_id, attachment.id)
    visibleAttachments.value = visibleAttachments.value.filter(
      item => item.id !== attachment.id,
    )
    pendingDeletion.value = null
    emit('deleted', attachment.id)
    toast.add({
      title: 'Archivo eliminado',
      description: `${attachment.file_name} fue eliminado correctamente.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch (error: unknown) {
    toast.add({
      title: 'No fue posible eliminar el archivo',
      description: extractApiErrorMessage(
        error,
        'Intenta eliminar el archivo nuevamente.',
      ),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <section
    class="w-full"
    aria-labelledby="attachment-list-title"
  >
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
          Recursos técnicos
        </p>
        <h2
          id="attachment-list-title"
          class="mt-1 text-2xl font-black tracking-tight text-text-main"
        >
          Archivos adjuntos
        </h2>
      </div>
      <span
        class="rounded-full border-2 border-neutral-900/30 bg-pastel-blue px-3 py-1 text-xs font-black text-neutral-900 dark:border-neutral-600 dark:bg-pastel-blue/20 dark:text-neutral-100"
      >
        {{ visibleAttachments.length }}
        {{ visibleAttachments.length === 1 ? 'archivo' : 'archivos' }}
      </span>
    </div>

    <ul
      v-if="hasAttachments"
      class="space-y-3"
      aria-live="polite"
    >
      <li
        v-for="attachment in visibleAttachments"
        :key="attachment.id"
        class="flex flex-col gap-4 rounded-2xl border-2 border-neutral-900 bg-surface p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)]"
      >
        <div class="flex min-w-0 items-center gap-4">
          <div
            :class="[
              fileKind(attachment.mime_type) === 'pdf'
                ? 'bg-pastel-coral dark:bg-pastel-coral/25'
                : fileKind(attachment.mime_type) === 'image'
                  ? 'bg-pastel-blue dark:bg-pastel-blue/20'
                  : 'bg-neutral-100 dark:bg-neutral-800',
              'flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-900/70 text-neutral-900 dark:border-neutral-600 dark:text-neutral-100',
            ]"
            :data-file-kind="fileKind(attachment.mime_type)"
            aria-hidden="true"
          >
            <svg
              v-if="fileKind(attachment.mime_type) === 'pdf'"
              class="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M8 13h8M8 17h5" />
            </svg>
            <svg
              v-else-if="fileKind(attachment.mime_type) === 'image'"
              class="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <svg
              v-else
              class="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>

          <div class="min-w-0">
            <p
              class="truncate text-sm font-black text-text-main sm:text-base"
              :title="attachment.file_name"
            >
              {{ attachment.file_name }}
            </p>
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
              <span class="rounded-md border border-neutral-900/20 bg-canvas px-2 py-0.5 text-[11px] font-black text-text-main dark:border-neutral-700">
                {{ fileTypeLabel(attachment.mime_type) }}
              </span>
              <span class="text-xs font-bold text-text-muted">
                {{ formatFileSize(attachment.file_size_bytes) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:justify-end">
          <button
            type="button"
            class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-neutral-900 bg-white px-4 py-2 text-xs font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 sm:flex-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:shadow-none"
            :disabled="downloadingId === attachment.id"
            :aria-label="`Descargar ${attachment.file_name}`"
            @click="handleDownload(attachment)"
          >
            <span aria-hidden="true">↓</span>
            {{ downloadingId === attachment.id ? 'Generando…' : 'Descargar' }}
          </button>

          <button
            v-if="canDelete"
            type="button"
            class="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-institutional-700 bg-institutional-50 px-3 py-2 text-xs font-black text-institutional-700 transition-colors hover:bg-institutional-100 disabled:cursor-wait disabled:opacity-60 dark:border-institutional-500 dark:bg-institutional-950/40 dark:text-institutional-300"
            :disabled="deletingId === attachment.id"
            :aria-label="`Eliminar ${attachment.file_name}`"
            @click="requestDeletion(attachment)"
          >
            Eliminar
          </button>
        </div>
      </li>
    </ul>

    <div
      v-else
      class="rounded-2xl border-2 border-dashed border-neutral-400 bg-neutral-50 px-6 py-10 text-center dark:border-neutral-700 dark:bg-neutral-900"
      role="status"
    >
      <p class="font-black text-text-main">
        No hay archivos adjuntos
      </p>
      <p class="mt-1 text-sm text-text-muted">
        Los recursos técnicos del reto aparecerán aquí.
      </p>
    </div>

    <div
      v-if="pendingDeletion"
      class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/65 p-4"
      role="presentation"
      @click.self="cancelDeletion"
      @keydown.esc="cancelDeletion"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-attachment-title"
        aria-describedby="delete-attachment-description"
        class="w-full max-w-md rounded-3xl border-2 border-neutral-900 bg-surface p-6 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:shadow-[7px_7px_0px_0px_rgba(255,255,255,0.14)]"
      >
        <p class="text-xs font-black uppercase tracking-[0.18em] text-institutional-600 dark:text-institutional-400">
          Confirmación requerida
        </p>
        <h3
          id="delete-attachment-title"
          class="mt-2 text-xl font-black text-text-main"
        >
          ¿Eliminar este archivo?
        </h3>
        <p
          id="delete-attachment-description"
          class="mt-3 text-sm leading-relaxed text-text-muted"
        >
          <strong class="text-text-main">{{ pendingDeletion.file_name }}</strong>
          se eliminará permanentemente del reto. Esta acción no se puede deshacer.
        </p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="min-h-11 rounded-xl border-2 border-neutral-900 bg-white px-5 py-2 text-sm font-black text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            :disabled="Boolean(deletingId)"
            @click="cancelDeletion"
          >
            Cancelar
          </button>
          <button
            ref="confirmButton"
            type="button"
            class="min-h-11 rounded-xl border-2 border-institutional-800 bg-institutional-600 px-5 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-wait disabled:opacity-60 dark:border-institutional-400 dark:shadow-none"
            :disabled="Boolean(deletingId)"
            @click="confirmDeletion"
          >
            {{ deletingId ? 'Eliminando…' : 'Confirmar eliminación' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
