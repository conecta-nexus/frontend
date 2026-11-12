import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AttachmentUploader from '~/components/challenges/AttachmentUploader.vue'
import type { ChallengeAttachment } from '~/types/challenge'
import { MAX_ATTACHMENT_SIZE_BYTES } from '~/types/challenge'

const uploadAttachment = vi.fn()
const addToast = vi.fn()

const uploadedAttachment: ChallengeAttachment = {
  id: 'attachment-1',
  challenge_id: 'challenge-1',
  file_name: 'evidence.pdf',
  file_size_bytes: 1024,
  mime_type: 'application/pdf',
  created_at: '2026-11-12T12:00:00Z',
}

function createWrapper(readonly = false) {
  return mount(AttachmentUploader, {
    props: {
      challengeId: 'challenge-1',
      readonly,
    },
  })
}

async function selectFile(
  wrapper: ReturnType<typeof createWrapper>,
  file: File,
) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [file],
  })
  await input.trigger('change')
}

describe('AttachmentUploader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.stubGlobal('useChallenges', () => ({ uploadAttachment }))
    vi.stubGlobal('useToast', () => ({ add: addToast }))
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('advertises the accepted extensions and maximum file size', () => {
    const wrapper = createWrapper()
    const input = wrapper.get('input[type="file"]')

    expect(input.attributes('accept')).toBe('.pdf,.png,.jpg,.jpeg,.webp')
    expect(wrapper.text()).toContain('PDF, PNG, JPG, JPEG o WEBP')
    expect(wrapper.text()).toContain('Máximo 10 MB')
  })

  it('rejects files larger than 10 MB before uploading', async () => {
    const wrapper = createWrapper()
    const oversizedFile = new File(
      [new Uint8Array(MAX_ATTACHMENT_SIZE_BYTES + 1)],
      'oversized.pdf',
      { type: 'application/pdf' },
    )

    await selectFile(wrapper, oversizedFile)

    expect(uploadAttachment).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Archivo no válido',
      description: 'El archivo supera el límite máximo de 10 MB.',
      color: 'error',
    }))
  })

  it('rejects unsupported MIME types before uploading', async () => {
    const wrapper = createWrapper()
    const unsupportedFile = new File(['plain text'], 'notes.txt', {
      type: 'text/plain',
    })

    await selectFile(wrapper, unsupportedFile)

    expect(uploadAttachment).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Archivo no válido',
      description: 'Formato no permitido. Usa PDF, PNG, JPG, JPEG o WEBP.',
      color: 'error',
    }))
  })

  it('shows progress and emits the uploaded attachment for a valid file', async () => {
    let resolveUpload!: (attachment: ChallengeAttachment) => void
    uploadAttachment.mockReturnValueOnce(new Promise((resolve) => {
      resolveUpload = resolve
    }))
    const wrapper = createWrapper()
    const validFile = new File(['pdf content'], 'evidence.pdf', {
      type: 'application/pdf',
    })

    await selectFile(wrapper, validFile)
    await vi.advanceTimersByTimeAsync(180)

    const progressBar = wrapper.get('[role="progressbar"]')
    expect(Number(progressBar.attributes('aria-valuenow'))).toBeGreaterThan(0)
    expect(uploadAttachment).toHaveBeenCalledWith('challenge-1', validFile)

    resolveUpload(uploadedAttachment)
    await flushPromises()

    expect(wrapper.emitted('uploaded')).toEqual([[uploadedAttachment]])
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Archivo cargado',
      color: 'success',
    }))

    await vi.advanceTimersByTimeAsync(350)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('shows an error toast when the upload request fails', async () => {
    uploadAttachment.mockRejectedValueOnce(new Error('Network unavailable'))
    const wrapper = createWrapper()
    const validFile = new File(['image content'], 'evidence.png', {
      type: 'image/png',
    })

    await selectFile(wrapper, validFile)
    await flushPromises()

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No fue posible cargar el archivo',
      description: 'Network unavailable',
      color: 'error',
    }))
    expect(wrapper.emitted('uploaded')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(350)
  })

  it('disables file selection and drop interaction in readonly mode', async () => {
    const wrapper = createWrapper(true)
    const input = wrapper.get('input[type="file"]')
    const dropZone = wrapper.get('[role="button"]')
    const validFile = new File(['pdf content'], 'evidence.pdf', {
      type: 'application/pdf',
    })

    expect(input.attributes()).toHaveProperty('disabled')
    expect(dropZone.attributes('aria-disabled')).toBe('true')
    expect(dropZone.attributes('tabindex')).toBe('-1')

    await dropZone.trigger('drop', {
      dataTransfer: { files: [validFile] },
    })

    expect(uploadAttachment).not.toHaveBeenCalled()
  })
})
