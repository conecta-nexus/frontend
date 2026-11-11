<script setup lang="ts">
import { ref } from 'vue'
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  type AllowedMimeType,
  type ChallengeAttachment,
} from '~/types/challenge'
import { useChallenges } from '~/composables/useChallenges'

interface Props {
  challengeId: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  (e: 'uploaded', attachment: ChallengeAttachment): void
}>()

const { uploadAttachment } = useChallenges()

const isDragging = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref<string | null>(null)
const currentFileName = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

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
    // Fallback if useToast is unavailable in mock/testing environments
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function validateFile(file: File): boolean {
  uploadError.value = null

  // 1. Validar límite de tamaño (<= 10MB)
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const msg = `El archivo excede el tamaño máximo permitido de 10 MB (${formatBytes(file.size)}).`
    uploadError.value = msg
    showNotification('Archivo demasiado grande', msg, 'error')
    return false
  }

  // 2. Validar tipos MIME permitidos (PDF o Imágenes)
  const isAllowedType = ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as AllowedMimeType)
  const isAllowedExt = /\.(pdf|png|jpe?g|webp)$/i.test(file.name)
  if (!isAllowedType && !isAllowedExt) {
    const msg = 'Formato no permitido. Solo se aceptan documentos PDF o imágenes (PNG, JPG, WEBP).'
    uploadError.value = msg
    showNotification('Formato no soportado', msg, 'error')
    return false
  }

  return true
}

async function processUpload(file: File) {
  if (props.readonly || isUploading.value) return
  if (!validateFile(file)) return

  isUploading.value = true
  uploadProgress.value = 25
  currentFileName.value = file.name
  uploadError.value = null

  try {
    uploadProgress.value = 60
    const attachment = await uploadAttachment(props.challengeId, file)
    uploadProgress.value = 100

    showNotification(
      'Archivo adjuntado',
      `"${file.name}" se subió exitosamente.`,
      'success',
    )
    emit('uploaded', attachment)
  } catch (err: unknown) {
    const fetchErr = err as { data?: { detail?: string }; message?: string }
    const errorMsg = fetchErr?.data?.detail || fetchErr?.message || 'Error al subir el archivo.'
    uploadError.value = errorMsg
    showNotification('Error de subida', errorMsg, 'error')
  } finally {
    setTimeout(() => {
      isUploading.value = false
      uploadProgress.value = 0
      currentFileName.value = null
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }, 600)
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (file) {
      processUpload(file)
    }
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (props.readonly) return
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file) {
      processUpload(file)
    }
  }
}

function triggerFilePicker() {
  if (props.readonly || isUploading.value) return
  fileInputRef.value?.click()
}
</script>

<template>
  <div class="w-full">
    <!-- Input oculto accesible -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
      class="hidden"
      :disabled="readonly || isUploading"
      @change="handleFileSelect"
    >

    <!-- Zona de Dropzone Neo-brutalista -->
    <div
      class="relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer"
      :class="[
        readonly ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800 border-neutral-300' : '',
        isDragging
          ? 'border-red-600 bg-red-50 dark:bg-red-950/30 scale-[1.01] shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]'
          : 'border-neutral-900 dark:border-neutral-700 bg-surface hover:bg-neutral-50 dark:hover:bg-neutral-800/60 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFilePicker"
    >
      <!-- Estado Cargando / Progreso -->
      <div v-if="isUploading" class="space-y-3 py-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-400">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-300" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Subiendo archivo a almacenamiento seguro...</span>
        </div>
        <p class="text-sm font-black text-text-main truncate max-w-xs mx-auto">
          {{ currentFileName }}
        </p>
        <div class="w-full max-w-xs mx-auto bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5 overflow-hidden border border-neutral-900">
          <div
            class="bg-red-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>

      <!-- Estado Normal / Espera -->
      <div v-else class="space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-pastel-coral dark:bg-pastel-coral/20 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <svg class="w-7 h-7 text-neutral-900 dark:text-neutral-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div>
          <p class="text-sm sm:text-base font-black text-text-main">
            Arrastra y suelta tu archivo aquí, o <span class="text-red-600 underline">haz clic para explorar</span>
          </p>
          <p class="text-xs text-text-muted mt-1 font-semibold">
            Formatos admitidos: PDF, PNG, JPG, WEBP • Tamaño máximo: 10 MB
          </p>
        </div>
      </div>
    </div>

    <!-- Mensaje de Error en línea -->
    <div
      v-if="uploadError"
      class="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5"
    >
      <span>⚠️</span>
      <span>{{ uploadError }}</span>
    </div>
  </div>
</template>
