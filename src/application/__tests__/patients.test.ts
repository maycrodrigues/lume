import { describe, expect, it } from 'vitest'
import { at, seedBasics, setup } from './setup'

describe('Pacientes', () => {
  it('cadastra, busca sem acento e ignora arquivadas por padrão', async () => {
    const { services } = setup()
    await services.patients.create({ name: 'Júlia Andrade', gender: 'female', email: 'julia@email.com' })
    const bia = await services.patients.create({ name: 'Beatriz Lima', gender: 'female' })
    await services.patients.setActive(bia.id, false)

    expect((await services.patients.list({ search: 'julia' })).map((p) => p.name)).toEqual(['Júlia Andrade'])
    expect((await services.patients.list()).map((p) => p.name)).toEqual(['Júlia Andrade'])
    expect(await services.patients.list({ includeInactive: true })).toHaveLength(2)
  })

  it('rejeita CPF inválido e CPF já cadastrado', async () => {
    const { services } = setup()
    await expect(services.patients.create({ name: 'Ana Paula', cpf: '111.111.111-11' })).rejects.toThrow('CPF inválido')
    await services.patients.create({ name: 'Ana Paula', cpf: '529.982.247-25' })
    await expect(services.patients.create({ name: 'Outra Pessoa', cpf: '52998224725' })).rejects.toThrow(
      'Já existe uma paciente com este CPF',
    )
  })

  it('não exclui paciente com histórico clínico — deve ser arquivada', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await services.consultations.register({
      patientId: maria.id,
      date: at('2026-10-10T10:00'),
      procedures: [{ procedureId: limpeza.id, price: 18000 }],
    })
    await expect(services.patients.remove(maria.id)).rejects.toThrow('histórico clínico')
  })

  it('exclui paciente sem histórico junto com seus agendamentos', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })

    await services.patients.remove(maria.id)

    expect(await services.patients.list({ includeInactive: true })).toEqual([])
    expect(await services.appointments.listRange(at('2026-10-01T00:00'), at('2026-10-31T00:00'))).toEqual([])
  })
})
