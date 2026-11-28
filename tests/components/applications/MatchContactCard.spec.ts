import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import MatchContactCard from '~/components/applications/MatchContactCard.vue'

describe('MatchContactCard', () => {
  let wrapper: VueWrapper | null = null
  const writeTextMock = vi.fn<(_text: string) => Promise<void>>()

  beforeEach(() => {
    vi.useFakeTimers()
    writeTextMock.mockReset()
    writeTextMock.mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.useRealTimers()
  })

  it('renders company contact channels, mailto/tel links, and Ley 1581 privacy notice', () => {
    wrapper = mount(MatchContactCard, {
      props: {
        counterpartType: 'COMPANY',
        challengeTitle: 'Sistema de Trazabilidad',
        contact: {
          business_name: 'Industrias del Norte SAS',
          contact_person: 'Laura Méndez',
          email: 'talento@industriasnorte.co',
          phone: '+57 310 555 0199',
        },
      },
    })

    expect(wrapper.text()).toContain('Vinculación exitosa: contacto habilitado')
    expect(wrapper.text()).toContain('Industrias del Norte SAS')
    expect(wrapper.text()).toContain('Responsable: Laura Méndez')
    expect(wrapper.text()).toContain('Sistema de Trazabilidad')
    expect(wrapper.text()).toContain('Empresa aliada')
    expect(wrapper.text()).toContain('Ley 1581 de 2012')

    const mailLink = wrapper.find('a[href="mailto:talento@industriasnorte.co"]')
    const telLink = wrapper.find('a[href="tel:+573105550199"]')
    expect(mailLink.exists()).toBe(true)
    expect(telLink.exists()).toBe(true)
  })

  it('copies email and phone to clipboard and shows temporary ¡Copiado! confirmation', async () => {
    wrapper = mount(MatchContactCard, {
      props: {
        counterpartType: 'STUDENT',
        contactName: 'Carlos Ramírez',
        contactEmail: 'carlos@ufps.edu.co',
        contactPhone: '+573001112233',
      },
    })

    expect(wrapper.text()).toContain('Estudiante UFPS')

    const copyEmailBtn = wrapper.find('button[aria-label="Copiar correo carlos@ufps.edu.co"]')
    await copyEmailBtn.trigger('click')
    await vi.waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('carlos@ufps.edu.co'))
    expect(copyEmailBtn.text()).toContain('¡Copiado!')

    await vi.advanceTimersByTimeAsync(2000)
    expect(copyEmailBtn.text()).toContain('Copiar')

    const copyPhoneBtn = wrapper.find('button[aria-label="Copiar teléfono +573001112233"]')
    await copyPhoneBtn.trigger('click')
    await vi.waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('+573001112233'))
    expect(copyPhoneBtn.text()).toContain('¡Copiado!')
  })

  it('handles missing email/phone gracefully without copy buttons', () => {
    wrapper = mount(MatchContactCard, {
      props: {
        counterpartType: 'COMPANY',
        contact: {
          business_name: 'Sin Teléfono SAS',
        },
      },
    })

    expect(wrapper.text()).toContain('Correo electrónico no disponible')
    expect(wrapper.text()).toContain('Teléfono no registrado')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})
