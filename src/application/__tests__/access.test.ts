import { describe, expect, it } from 'vitest'
import { seedBasics, setup } from './setup'

describe('PIN de acesso', () => {
  it('no primeiro acesso pede para criar um PIN de 4 números, confirmado', async () => {
    const { services } = setup()
    expect(await services.access.status()).toEqual({ state: 'setup' })

    await expect(services.access.createPin('123', '123')).rejects.toThrow('4 números')
    await expect(services.access.createPin('12a4', '12a4')).rejects.toThrow('4 números')
    await expect(services.access.createPin('1234', '4321')).rejects.toThrow('não são iguais')

    await services.access.createPin('2580', '2580')
    expect(await services.access.status()).toMatchObject({ state: 'unlocked' })
    await expect(services.access.createPin('1111', '1111')).rejects.toThrow('Já existe um PIN')
  })

  it('libera o acesso só com o PIN certo', async () => {
    const { services } = setup()
    await services.access.createPin('2580', '2580')
    await services.access.lock()

    await expect(services.access.unlock('0000')).rejects.toThrow('PIN incorreto')
    expect(await services.access.status()).toEqual({ state: 'locked', failedAttempts: 1 })

    await services.access.unlock('2580')
    expect(await services.access.status()).toMatchObject({ state: 'unlocked' })
  })

  it('o acesso liberado vale até a próxima segunda-feira, 00h', async () => {
    const { services, setNow } = setup('2026-10-10T09:00') // sábado
    await services.access.createPin('2580', '2580')
    expect(await services.access.status()).toEqual({ state: 'unlocked', until: new Date('2026-10-12T00:00').toISOString() })

    setNow('2026-10-11T23:59')
    expect(await services.access.status()).toMatchObject({ state: 'unlocked' })
    setNow('2026-10-12T00:00')
    expect(await services.access.status()).toEqual({ state: 'locked', failedAttempts: 0 })

    // Digitado na própria segunda, vale a semana toda.
    setNow('2026-10-12T08:30')
    expect(await services.access.unlock('2580')).toEqual({ until: new Date('2026-10-19T00:00').toISOString() })
    setNow('2026-10-18T22:00')
    expect(await services.access.status()).toMatchObject({ state: 'unlocked' })

    // Digitado no domingo à noite, vale só até a meia-noite.
    await services.access.lock()
    setNow('2026-10-18T23:30')
    expect(await services.access.unlock('2580')).toEqual({ until: new Date('2026-10-19T00:00').toISOString() })
  })

  it('bloquear o painel exige o PIN antes da segunda-feira', async () => {
    const { services } = setup('2026-10-13T10:00')
    await services.access.createPin('2580', '2580')
    await services.access.lock()
    expect(await services.access.status()).toEqual({ state: 'locked', failedAttempts: 0 })
  })

  it('a cada 5 erros seguidos pausa as tentativas, mesmo para o PIN certo', async () => {
    const { services, setNow } = setup('2026-10-10T09:00')
    await services.access.createPin('2580', '2580')
    await services.access.lock()

    for (let i = 1; i <= 4; i++) await expect(services.access.unlock('1111')).rejects.toThrow(`Mais ${5 - i}`)
    await expect(services.access.unlock('1111')).rejects.toThrow('Tente de novo em 30 segundos')
    expect(await services.access.status()).toEqual({ state: 'locked', failedAttempts: 5, pausedUntil: new Date('2026-10-10T09:00:30').toISOString() })
    await expect(services.access.unlock('2580')).rejects.toThrow('Tente de novo em 30 segundos')

    // A pausa dobra a cada nova série de erros.
    setNow('2026-10-10T09:00:31')
    for (let i = 1; i <= 4; i++) await expect(services.access.unlock('1111')).rejects.toThrow('PIN incorreto')
    await expect(services.access.unlock('1111')).rejects.toThrow('Tente de novo em 1 minuto')

    setNow('2026-10-10T09:02')
    await services.access.unlock('2580')
    expect(await services.access.status()).toMatchObject({ state: 'unlocked' })
  })

  it('troca o PIN conferindo o atual', async () => {
    const { services } = setup()
    await services.access.createPin('2580', '2580')

    await expect(services.access.changePin('0000', '1357', '1357')).rejects.toThrow('PIN incorreto')
    await expect(services.access.changePin('2580', '1357', '7531')).rejects.toThrow('não são iguais')
    await services.access.changePin('2580', '1357', '1357')
    expect(await services.access.status()).toMatchObject({ state: 'unlocked' })

    await services.access.lock()
    await expect(services.access.unlock('2580')).rejects.toThrow('PIN incorreto')
    await services.access.unlock('1357')
  })

  it('"Esqueci o PIN" apaga os dados da clínica e o PIN, mas preserva o registro de atividades', async () => {
    const { services } = setup()
    await seedBasics(services)
    await services.access.createPin('2580', '2580')

    await services.access.resetAll()

    expect(await services.access.status()).toEqual({ state: 'setup' })
    expect(await services.patients.list()).toEqual([])
    expect(await services.procedures.list()).toEqual([])
    const actions = (await services.activity.query({ category: 'access' })).map((e) => e.action)
    expect(actions).toContain('access.reset')
    expect(await services.activity.query({ entity: 'patient' })).not.toHaveLength(0)
  })

  it('registra os eventos de acesso sem nunca gravar o PIN', async () => {
    const { services, credentials } = setup()
    await services.access.createPin('2580', '2580')
    await services.access.lock()
    await services.access.unlock('1111').catch(() => undefined)
    await services.access.unlock('2580')
    await services.access.changePin('2580', '1357', '1357')

    const log = await services.activity.query({ category: 'access' })
    expect(log.map((e) => e.action).reverse()).toEqual(['access.pin_create', 'access.lock', 'access.denied', 'access.unlock', 'access.pin_change'])
    expect(JSON.stringify(await services.activity.query({}))).not.toMatch(/2580|1357|1111|fake:/)
    expect(JSON.stringify(credentials.peek())).not.toMatch(/2580|1357/)
  })
})
