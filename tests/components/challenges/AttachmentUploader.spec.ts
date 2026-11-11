import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AttachmentUploader from '~/components/challenges/AttachmentUploader.vue'

const mockUploadAttachment = vi.fn()

vi.stubGlobal('useToast', () => ({
  add: vi.fn(),
}))

vi.stubGlobal('useChallenges', () => ({
  uploadAttachment: mockUploadAttachment,
}))

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({
    uploadAttachment: mockUploadAttachment,
  }),
}))

describe('AttachmentUploader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropzone with guidance text', () => {
    const wrapper = mount(AttachmentUploader, {
      props: {
        challengeId: 'test-challenge-123',
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Arrastra y suelta tu archivo aquí')
    expect(wrapper.text()).toContain('10 MB')
  })

  it('rejects files larger than 10MB', async () => {
    const wrapper = mount(AttachmentUploader, {
      props: {
        challengeId: 'test-challenge-123',
      },
    })

    // 11 MB file
    const oversizedFile = new File(['x'.repeat(100)], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [oversizedFile],
    })

    await input.trigger('change')

    expect(mockUploadAttachment).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('excede el tamaño máximo')
  })

  it('rejects disallowed file MIME types', async () => {
    const wrapper = mount(AttachmentUploader, {
      props: {
        challengeId: 'test-challenge-123',
      },
    })

    const invalidFile = new File(['content'], 'script.exe', { type: 'application/x-msdownload' })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [invalidFile],
    })

    await input.trigger('change')

    expect(mockUploadAttachment).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Formato no permitido')
  })

  it('uploads valid PDF and emits uploaded event', async () => {
    const mockAttachment = {
      id: 'att-1',
      challenge_id: 'test-challenge-123',
      file_name: 'specs.pdf',
      file_size_bytes: 1024,
      mime_type: 'application/pdf',
      created_at: new Date().toISOString(),
    }
    mockUploadAttachment.mockResolvedValueOnce(mockAttachment)

    const wrapper = mount(AttachmentUploader, {
      props: {
        challengeId: 'test-challenge-123',
      },
    })

    const validFile = new File(['dummy content'], 'specs.pdf', { type: 'application/pdf' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [validFile],
    })

    await input.trigger('change')

    expect(mockUploadAttachment).toHaveBeenCalledWith('test-challenge-123', validFile)
    await vi.waitFor(() => {
      expect(wrapper.emitted('uploaded')).toBeTruthy()
      expect(wrapper.emitted('uploaded')![0]).toEqual([mockAttachment])
    })
  })
})
