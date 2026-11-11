<script setup lang="ts">
import { ref } from 'vue'
import type { ChallengeAttachment } from '~/types/challenge'
import { useChallenges } from '~/composables/useChallenges'

interface Props {
  attachments: ChallengeAttachment[]
  challengeId?: string
  canDelete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  challengeId: '',
  canDelete: false,
})

const emit = defineEmits<{
  (e: 'deleted', attachmentId: string): void
}>()

const { getAttachmentDownloadUrl, deleteAttachment } = useChallenges()

const downloadingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

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
    // Fallback in testing
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function isPdf(mime?: string, name?: string): boolean {
  return mime?.includes('pdf') || name?.toLowerCase().endsWith('.pdf') || false
}

async function handleDownload(attachment: ChallengeAttachment) {
  if (!props.challengeId) {
    if (attachment.download_url) {
      window.open(attachment.download_url, '_blank', 'noopener,noreferrer')
      return
    }
    showNotification('Descarga no disponible', 'Falta el identificador del reto.', 'warning')
    return
  }

  downloadingId.value = attachment.id
  try {
    const res = await getAttachmentDownloadUrl(props.challengeId, attachment.id)
    if (res?.download_url) {
      window.open(res.download_url, '_blank', 'noopener,noreferrer')
    } else {
      throw new Error('No se recibió la URL de descarga segura.')
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { detail?: string }; message?: string }
    const errorMsg = fetchErr?.data?.detail || fetchErr?.message || 'Error al generar enlace seguro.'
    showNotification('Error al descargar', errorMsg, 'error')
  } finally {
    downloadingId.value = null
  }
}

function promptDelete(id: string) {
  confirmDeleteId.value = id
}

function cancelDelete() {
  confirmDeleteId.value = null
}

async function executeDelete(attachmentId: string) {
  if (!props.challengeId) return

  deletingId.value = attachmentId
  try {
    await deleteAttachment(props.challengeId, attachmentId)
    confirmDeleteId.value = null
    showNotification('Archivo eliminado', 'El documento de soporte fue retirado.', 'success')
    emit('deleted', attachmentId)
  } catch (err: unknown) {
    const fetchErr = err as { data?: { detail?: string }; message?: string }
    const errorMsg = fetchErr?.data?.detail || fetchErr?.message || 'No fue posible eliminar el archivo.'
    showNotification('Error al eliminar', errorMsg, 'error')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="w-full space-y-3">
    <!-- Lista vacía -->
    <div
      v-if="!attachments || attachments.length === 0"
      class="p-6 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30"
    >
      <p class="text-xs sm:text-sm font-bold text-text-muted">
        No hay archivos técnicos adjuntos en este reto.
      </p>
    </div>

    <!-- Lista de tarjetas de archivos -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <div
        v-for="att in attachments"
        :key="att.id"
        class="border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl p-4 bg-surface flex items-center justify-between shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
      >
        <!-- Icono y Metadatos -->
        <div class="flex items-center gap-3 min-w-0 pr-2">
          <!-- Icono PDF vs Imagen -->
          <div
            class="w-10 h-10 rounded-xl border border-neutral-900 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            :class="isPdf(att.mime_type, att.file_name) ? 'bg-red-100 text-red-700 dark:bg-red-950/60' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'"
          >
            <!-- PDF SVG -->
            <svg v-if="isPdf(att.mime_type, att.file_name)" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <!-- Imagen SVG -->
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div class="min-w-0">
            <p
              class="text-xs sm:text-sm font-black text-text-main truncate"
              :title="att.file_name"
            >
              {{ att.file_name }}
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[11px] font-bold text-text-muted">
                {{ formatBytes(att.file_size_bytes) }}
              </span>
              <span class="text-[10px] uppercase font-black px-1.5 py-0.2 rounded border border-neutral-900/20 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {{ isPdf(att.mime_type, att.file_name) ? 'PDF' : 'IMG' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Acciones: Descargar y/o Eliminar -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Botón de Descarga Segura -->
          <button
            type="button"
            class="p-2 rounded-xl border border-neutral-900 bg-pastel-mint dark:bg-pastel-mint/30 hover:bg-pastel-mint/60 text-neutral-900 dark:text-neutral-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            :disabled="downloadingId === att.id"
            :title="'Descargar ' + att.file_name"
            @click="handleDownload(att)"
          >
            <svg v-if="downloadingId === att.id" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          <!-- Botón de Eliminar (Solo propietarios) -->
          <button
            v-if="canDelete"
            type="button"
            class="p-2 rounded-xl border border-neutral-900 bg-red-100 hover:bg-red-200 text-red-700 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            :disabled="deletingId === att.id"
            title="Eliminar archivo"
            @click="promptDelete(att.id)"
          >
            <svg v-if="deletingId === att.id" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Diálogo de Confirmación de Eliminación -->
    <div
      v-if="confirmDeleteId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="bg-surface border-2 border-neutral-900 rounded-3xl p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="text-base font-black text-text-main mb-2">
          ¿Eliminar documento adjunto?
        </h3>
        <p class="text-xs text-text-muted mb-4 font-medium">
          Esta acción removerá el archivo del almacenamiento y no estará disponible para los estudiantes.
        </p>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl border border-neutral-900 font-bold text-xs bg-neutral-100 dark:bg-neutral-800"
            @click="cancelDelete"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl border border-neutral-900 font-black text-xs bg-red-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            @click="executeDelete(confirmDeleteId)"
          >
            Confirmar eliminación
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
