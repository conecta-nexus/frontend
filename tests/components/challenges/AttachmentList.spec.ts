import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AttachmentList from '~/components/challenges/AttachmentList.vue'
import type { ChallengeAttachment } from '~/types/challenge'

const mockGetDownloadUrl = vi.fn()
const mockDeleteAttachment = vi.fn()

vi.stubGlobal('useToast', () => ({
  add: vi.fn(),
}))

vi.stubGlobal('useChallenges', () => ({
  getAttachmentDownloadUrl: mockGetDownloadUrl,
  deleteAttachment: mockDeleteAttachment,
}))

vi.mock('~/composables/useChallenges', () => ({
  useChallenges: () => ({
    getAttachmentDownloadUrl: mockGetDownloadUrl,
    deleteAttachment: mockDeleteAttachment,
  }),
}))

describe('AttachmentList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty message when no attachments', () => {
    const wrapper = mount(AttachmentList, {
      props: {
        attachments: [],
      },
    })

    expect(wrapper.text()).toContain('No hay archivos técnicos adjuntos')
  })

  it('renders list of attachments with formatted size and type badge', () => {
    const attachments: ChallengeAttachment[] = [
      {
        id: 'att-1',
        challenge_id: 'ch-1',
        file_name: 'architecture.pdf',
        file_size_bytes: 2.5 * 1024 * 1024,
        mime_type: 'application/pdf',
        created_at: new Date().toISOString(),
      },
      {
        id: 'att-2',
        challenge_id: 'ch-1',
        file_name: 'diagram.png',
        file_size_bytes: 500 * 1024,
        mime_type: 'image/png',
        created_at: new Date().toISOString(),
      },
    ]

    const wrapper = mount(AttachmentList, {
      props: {
        attachments,
        challengeId: 'ch-1',
        canDelete: true,
      },
    })

    expect(wrapper.text()).toContain('architecture.pdf')
    expect(wrapper.text()).toContain('2.5 MB')
    expect(wrapper.text()).toContain('PDF')
    expect(wrapper.text()).toContain('diagram.png')
    expect(wrapper.text()).toContain('500 KB')
    expect(wrapper.text()).toContain('IMG')
  })

  it('calls getAttachmentDownloadUrl and opens window when download clicked', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockGetDownloadUrl.mockResolvedValueOnce({ download_url: 'https://storage.example.com/signed-url' })

    const attachments: ChallengeAttachment[] = [
      {
        id: 'att-1',
        challenge_id: 'ch-1',
        file_name: 'specs.pdf',
        file_size_bytes: 1024,
        mime_type: 'application/pdf',
        created_at: new Date().toISOString(),
      },
    ]

    const wrapper = mount(AttachmentList, {
      props: {
        attachments,
        challengeId: 'ch-1',
      },
    })

    const downloadBtn = wrapper.find('button[title="Descargar specs.pdf"]')
    await downloadBtn.trigger('click')

    expect(mockGetDownloadUrl).toHaveBeenCalledWith('ch-1', 'att-1')
    expect(windowOpenSpy).toHaveBeenCalledWith('https://storage.example.com/signed-url', '_blank', 'noopener,noreferrer')
    windowOpenSpy.mockRestore()
  })

  it('prompts delete confirmation and deletes attachment', async () => {
    mockDeleteAttachment.mockResolvedValueOnce(undefined)

    const attachments: ChallengeAttachment[] = [
      {
        id: 'att-1',
        challenge_id: 'ch-1',
        file_name: 'specs.pdf',
        file_size_bytes: 1024,
        mime_type: 'application/pdf',
        created_at: new Date().toISOString(),
      },
    ]

    const wrapper = mount(AttachmentList, {
      props: {
        attachments,
        challengeId: 'ch-1',
        canDelete: true,
      },
    })

    // Click delete trash icon
    const deleteBtn = wrapper.find('button[title="Eliminar archivo"]')
    await deleteBtn.trigger('click')

    // Confirm dialog appears
    expect(wrapper.text()).toContain('¿Eliminar documento adjunto?')

    // Click confirmation button
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('Confirmar eliminación'))
    expect(confirmBtn).toBeDefined()
    await confirmBtn!.trigger('click')

    expect(mockDeleteAttachment).toHaveBeenCalledWith('ch-1', 'att-1')
    await vi.waitFor(() => {
      expect(wrapper.emitted('deleted')).toBeTruthy()
      expect(wrapper.emitted('deleted')![0]).toEqual(['att-1'])
    })
  })
})
