<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChallengeAttachment } from '~/types/challenge'
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '~/types/challenge'

const props = withDefaults(
  defineProps<{
    challengeId: string
    readonly?: boolean
  }>(),
  {
    readonly: false,
  },
)

const emit = defineEmits<{
  uploaded: [attachment: ChallengeAttachment]
}>()

const { uploadAttachment } = useChallenges()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)

const acceptedFileTypes = '.pdf,.png,.jpg,.jpeg,.webp'
const allowedMimeTypes = new Set<string>(ALLOWED_ATTACHMENT_MIME_TYPES)

const formattedSelectedSize = computed(() => {
  if (!selectedFile.value) return ''
  return formatFileSize(selectedFile.value.size)
})

function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  if (file.size === 0) {
    return 'El archivo está vacío.'
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return 'El archivo supera el límite máximo de 10 MB.'
  }
  if (!allowedMimeTypes.has(file.type)) {
    return 'Formato no permitido. Usa PDF, PNG, JPG, JPEG o WEBP.'
  }
  return null
}

function openFilePicker() {
  if (!props.readonly && !isUploading.value) {
    fileInput.value?.click()
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    void processFile(file)
  }
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (props.readonly || isUploading.value) return

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    void processFile(file)
  }
}

function startProgressAnimation(fileSize: number): ReturnType<typeof setInterval> {
  uploadProgress.value = 5
  const simulatedChunks = Math.max(1, Math.ceil(fileSize / (512 * 1024)))
  const increment = Math.max(2, Math.floor(80 / simulatedChunks))

  return setInterval(() => {
    uploadProgress.value = Math.min(90, uploadProgress.value + increment)
  }, 180)
}

async function processFile(file: File) {
  const validationError = validateFile(file)
  if (validationError) {
    toast.add({
      title: 'Archivo no válido',
      description: validationError,
      color: 'error',
    })
    return
  }

  selectedFile.value = file
  isUploading.value = true
  const progressTimer = startProgressAnimation(file.size)

  try {
    const attachment = await uploadAttachment(props.challengeId, file)
    uploadProgress.value = 100
    emit('uploaded', attachment)
    toast.add({
      title: 'Archivo cargado',
      description: `${file.name} se cargó correctamente.`,
      color: 'success',
    })
  } catch (error: unknown) {
    const uploadError = error as { data?: { detail?: string }, message?: string }
    toast.add({
      title: 'No fue posible cargar el archivo',
      description:
        uploadError.data?.detail
        || uploadError.message
        || 'Intenta nuevamente en unos segundos.',
      color: 'error',
    })
  } finally {
    clearInterval(progressTimer)
    await new Promise(resolve => setTimeout(resolve, 350))
    isUploading.value = false
    uploadProgress.value = 0
    selectedFile.value = null
  }
}
</script>

<template>
  <section
    class="w-full"
    aria-labelledby="attachment-uploader-title"
  >
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      :accept="acceptedFileTypes"
      :disabled="readonly || isUploading"
      @change="onFileInput"
    >

    <div
      class="relative flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all"
      :class="[
        isDragging
          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
          : 'border-neutral-400 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900',
        readonly || isUploading
          ? 'cursor-not-allowed opacity-70'
          : 'cursor-pointer hover:border-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/10',
      ]"
      role="button"
      :tabindex="readonly || isUploading ? -1 : 0"
      :aria-disabled="readonly || isUploading"
      @click="openFilePicker"
      @keydown.enter.prevent="openFilePicker"
      @keydown.space.prevent="openFilePicker"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.self.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <div
        class="mb-4 flex size-14 items-center justify-center rounded-xl border-2 border-neutral-900 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:bg-neutral-800 dark:shadow-none"
        aria-hidden="true"
      >
        <svg
          class="size-7 text-red-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 16V4m0 0L7 9m5-5 5 5" />
          <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </svg>
      </div>

      <h2
        id="attachment-uploader-title"
        class="text-lg font-black text-neutral-900 dark:text-white"
      >
        {{ readonly ? 'Archivos de soporte' : 'Carga un archivo de soporte' }}
      </h2>

      <p class="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-300">
        <template v-if="readonly">
          La carga de archivos está deshabilitada para este desafío.
        </template>
        <template v-else>
          Arrastra el archivo aquí o
          <span class="font-bold text-red-600">selecciónalo desde tu equipo</span>.
        </template>
      </p>

      <p class="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        PDF, PNG, JPG, JPEG o WEBP · Máximo 10 MB
      </p>

      <div
        v-if="isUploading && selectedFile"
        class="mt-6 w-full max-w-md"
        aria-live="polite"
      >
        <div class="mb-2 flex items-center justify-between gap-4 text-sm">
          <span class="min-w-0 truncate font-bold text-neutral-900 dark:text-white">
            {{ selectedFile.name }}
          </span>
          <span class="shrink-0 text-neutral-600 dark:text-neutral-300">
            {{ formattedSelectedSize }} · {{ uploadProgress }}%
          </span>
        </div>

        <div
          class="h-3 overflow-hidden rounded-full border border-neutral-900 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800"
          role="progressbar"
          aria-label="Progreso de carga"
          :aria-valuenow="uploadProgress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full bg-red-600 transition-[width] duration-200 ease-out"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>
    </div>
  </section>
</template>
