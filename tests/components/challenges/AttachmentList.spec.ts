import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AttachmentList from '~/components/challenges/AttachmentList.vue'
import type { ChallengeAttachment } from '~/types/challenge'

const challengeMocks = vi.hoisted(() => ({
  getAttachmentDownloadUrl: vi.fn(),
  deleteAttachment: vi.fn(),
}))

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => challengeMocks,
}))

const addToast = vi.fn()

const attachments: ChallengeAttachment[] = [
  {
    id: 'attachment-pdf',
    challenge_id: 'challenge-1',
    file_name: 'technical-specification.pdf',
    file_size_bytes: Math.round(2.4 * 1024 * 1024),
    mime_type: 'application/pdf',
    created_at: '2026-11-12T12:00:00Z',
  },
  {
    id: 'attachment-image',
    challenge_id: 'challenge-1',
    file_name: 'architecture.png',
    file_size_bytes: 640 * 1024,
    mime_type: 'image/png',
    created_at: '2026-11-12T12:05:00Z',
  },
]

function createWrapper(
  componentAttachments: ChallengeAttachment[] = attachments,
  canDelete = true,
) {
  return mount(AttachmentList, {
    props: {
      attachments: componentAttachments,
      canDelete,
    },
  })
}

describe('AttachmentList', () => {
  beforeEach(() => {
    challengeMocks.getAttachmentDownloadUrl.mockReset()
    challengeMocks.deleteAttachment.mockReset()
    challengeMocks.getAttachmentDownloadUrl.mockResolvedValue({
      download_url: 'https://storage.example.com/signed/attachment-pdf',
      expires_in_seconds: 900,
    })
    challengeMocks.deleteAttachment.mockResolvedValue(undefined)
    addToast.mockReset()
    vi.stubGlobal('useToast', () => ({ add: addToast }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders file names, MIME badges, icons, and human-readable sizes', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('technical-specification.pdf')
    expect(wrapper.text()).toContain('architecture.png')
    expect(wrapper.text()).toContain('2.4 MB')
    expect(wrapper.text()).toContain('640.0 KB')
    expect(wrapper.text()).toContain('PDF')
    expect(wrapper.text()).toContain('PNG')
    expect(wrapper.find('[data-file-kind="pdf"]').exists()).toBe(true)
    expect(wrapper.find('[data-file-kind="image"]').exists()).toBe(true)
  })

  it('opens the ephemeral signed download URL in a new tab', async () => {
    const previewWindow = {
      opener: {},
      location: { href: 'about:blank' },
      close: vi.fn(),
    }
    const openWindow = vi
      .spyOn(window, 'open')
      .mockReturnValue(previewWindow as unknown as Window)
    const wrapper = createWrapper()

    await wrapper
      .get('[aria-label="Descargar technical-specification.pdf"]')
      .trigger('click')
    await flushPromises()

    expect(openWindow).toHaveBeenCalledWith('about:blank', '_blank')
    expect(previewWindow.opener).toBeNull()
    expect(challengeMocks.getAttachmentDownloadUrl).toHaveBeenCalledWith(
      'challenge-1',
      'attachment-pdf',
    )
    expect(previewWindow.location.href).toBe(
      'https://storage.example.com/signed/attachment-pdf',
    )
  })

  it('uses the signed URL included in a public catalog attachment', async () => {
    const previewWindow = {
      opener: {},
      location: { href: 'about:blank' },
      close: vi.fn(),
    }
    vi.spyOn(window, 'open').mockReturnValue(previewWindow as unknown as Window)
    const publicAttachment: ChallengeAttachment = {
      ...attachments[0]!,
      download_url: 'https://storage.example.com/signed/public-catalog-file',
    }
    const wrapper = createWrapper([publicAttachment], false)

    await wrapper
      .get('[aria-label="Descargar technical-specification.pdf"]')
      .trigger('click')
    await flushPromises()

    expect(challengeMocks.getAttachmentDownloadUrl).not.toHaveBeenCalled()
    expect(previewWindow.opener).toBeNull()
    expect(previewWindow.location.href).toBe(
      'https://storage.example.com/signed/public-catalog-file',
    )
  })

  it('closes the preview tab and shows feedback when download fails', async () => {
    challengeMocks.getAttachmentDownloadUrl.mockRejectedValueOnce(
      new Error('Signed URL service unavailable'),
    )
    const previewWindow = {
      opener: {},
      location: { href: 'about:blank' },
      close: vi.fn(),
    }
    vi.spyOn(window, 'open').mockReturnValue(previewWindow as unknown as Window)
    const wrapper = createWrapper()

    await wrapper
      .get('[aria-label="Descargar technical-specification.pdf"]')
      .trigger('click')
    await flushPromises()

    expect(previewWindow.close).toHaveBeenCalledOnce()
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No fue posible descargar el archivo',
      description: 'Signed URL service unavailable',
      color: 'error',
    }))
  })

  it('hides delete actions when the user cannot delete attachments', () => {
    const wrapper = createWrapper(attachments, false)

    expect(wrapper.find('[aria-label^="Eliminar "]').exists()).toBe(false)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('requires confirmation before deleting an attachment', async () => {
    const wrapper = createWrapper()

    await wrapper
      .get('[aria-label="Eliminar technical-specification.pdf"]')
      .trigger('click')

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('¿Eliminar este archivo?')
    expect(dialog.text()).toContain('technical-specification.pdf')
    expect(challengeMocks.deleteAttachment).not.toHaveBeenCalled()

    await dialog.get('button').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('deletes the attachment, updates the list, and emits deleted', async () => {
    const wrapper = createWrapper()

    await wrapper
      .get('[aria-label="Eliminar technical-specification.pdf"]')
      .trigger('click')
    await wrapper
      .get('[role="dialog"] button:last-child')
      .trigger('click')
    await flushPromises()

    expect(challengeMocks.deleteAttachment).toHaveBeenCalledWith(
      'challenge-1',
      'attachment-pdf',
    )
    expect(wrapper.text()).not.toContain('technical-specification.pdf')
    expect(wrapper.text()).toContain('architecture.png')
    expect(wrapper.emitted('deleted')).toEqual([['attachment-pdf']])
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Archivo eliminado',
      color: 'success',
    }))
  })

  it('keeps the attachment visible when deletion fails', async () => {
    challengeMocks.deleteAttachment.mockRejectedValueOnce(
      new Error('Delete request failed'),
    )
    const wrapper = createWrapper()

    await wrapper
      .get('[aria-label="Eliminar technical-specification.pdf"]')
      .trigger('click')
    await wrapper
      .get('[role="dialog"] button:last-child')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('technical-specification.pdf')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No fue posible eliminar el archivo',
      description: 'Delete request failed',
      color: 'error',
    }))
  })

  it('renders an empty state when there are no attachments', () => {
    const wrapper = createWrapper([])

    expect(wrapper.get('[role="status"]').text()).toContain(
      'No hay archivos adjuntos',
    )
    expect(wrapper.text()).toContain('0 archivos')
  })
})
