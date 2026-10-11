import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKING_HOURS } from '@/domain'
import { setup } from './setup'

type Services = ReturnType<typeof setup>['services']

const fillClinic = (services: Services) =>
  services.settings.save({
    clinicName: 'LUME · Estética & Cuidado Integrado',
    professionalName: 'Ana Lima',
    professionalRegistry: 'CRBM 12345',
    phone: '(11) 91234-5678',
    email: 'contato@lume.com.br',
    instagram: '@lume.estetica',
    address: 'Rua das Flores, 100 · São Paulo/SP',
  })

describe('Site da clínica', () => {
  it('monta os dados públicos a partir das Configurações e do horário de atendimento', async () => {
    const { services } = setup()
    await fillClinic(services)

    expect(await services.site.profile()).toEqual({
      clinicName: 'LUME · Estética & Cuidado Integrado',
      professionalName: 'Ana Lima',
      professionalRegistry: 'CRBM 12345',
      whatsapp: '5511912345678',
      phone: '(11) 91234-5678',
      email: 'contato@lume.com.br',
      instagram: 'lume.estetica',
      address: 'Rua das Flores, 100 · São Paulo/SP',
      hours: [
        { days: 'Segunda a sexta', time: '10h às 17h' },
        { days: 'Sábado', time: '12h às 16h' },
      ],
    })
  })

  it('o horário publicado acompanha o horário de atendimento configurado', async () => {
    const { services } = setup()
    const days = DEFAULT_WORKING_HOURS.days.map((d, weekday) =>
      weekday >= 1 && weekday <= 4 ? { open: true, start: '09:00', end: '18:30' } : weekday === 5 ? { open: true, start: '09:00', end: '17:00' } : { ...d, open: false },
    )
    await services.settings.saveWorkingHours({ days, intervalMinutes: 15 })

    expect((await services.site.profile()).hours).toEqual([
      { days: 'Segunda a quinta', time: '9h às 18h30' },
      { days: 'Sexta', time: '9h às 17h' },
    ])
  })

  it('só publica conectado ao site e com o nome da profissional preenchido', async () => {
    const { services } = setup()
    await expect(services.site.publish()).rejects.toThrow('Conecte')

    await expect(services.site.connect('errado')).rejects.toThrow('Token inválido')
    expect(await services.site.status()).toEqual({ connected: false })

    await services.site.connect('  token-valido  ')
    await expect(services.site.publish()).rejects.toThrow('nome da profissional')
  })

  it('publica os dados e registra quando, sem nunca gravar o token', async () => {
    const { services, sitePublisher } = setup('2026-10-11T10:00')
    await fillClinic(services)
    await services.site.connect('token-valido')

    await services.site.publish()

    expect(sitePublisher.published).toHaveLength(1)
    expect(sitePublisher.published[0].profile).toMatchObject({
      professionalName: 'Ana Lima',
      whatsapp: '5511912345678',
      publishedAt: new Date('2026-10-11T10:00').toISOString(),
    })
    expect(await services.site.status()).toEqual({ connected: true, lastPublishedAt: new Date('2026-10-11T10:00').toISOString() })
    expect(JSON.stringify(await services.activity.query({}))).not.toContain('token-valido')
  })

  it('desconectar e "Esqueci o PIN" removem o token de publicação', async () => {
    const { services } = setup()
    await services.site.connect('token-valido')
    await services.site.disconnect()
    expect(await services.site.status()).toEqual({ connected: false })

    await services.site.connect('token-valido')
    await services.access.createPin('2580', '2580')
    await services.access.resetAll()
    expect(await services.site.status()).toEqual({ connected: false })
  })
})
