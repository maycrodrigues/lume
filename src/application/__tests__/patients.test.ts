import { describe, expect, it } from 'vitest'
import { at, imageFile, seedBasics, setup } from './setup'

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

  it('exclui a paciente junto com todo o histórico, sem tocar no das outras', async () => {
    const { services } = setup('2026-10-10T11:00')
    await services.backup.loadDemoData()
    // A paciente com mais registros ligados a ela (atendimentos, pacote, cupons, lançamentos).
    const candidates = await Promise.all(
      (await services.patients.list()).map(async (p) => ({ patient: p, history: await services.patients.history(p.id) })),
    )
    const total = (h: (typeof candidates)[number]['history']) => Object.values(h).reduce((a, b) => a + b, 0)
    const { patient } = candidates.sort((a, b) => total(b.history) - total(a.history))[0]
    await services.photos.add({ patientId: patient.id, takenAt: '2026-10-10', file: imageFile() })
    const history = await services.patients.history(patient.id)
    expect(history.consultations).toBeGreaterThan(0)
    expect(history.financialEntries).toBeGreaterThan(0)
    expect(history.photos).toBe(1)
    const before = await services.backup.stats()

    await services.patients.remove(patient.id, { withHistory: true })

    const after = await services.backup.stats()
    expect(before.patients - after.patients).toBe(1)
    expect(before.appointments - after.appointments).toBe(history.appointments)
    expect(before.consultations - after.consultations).toBe(history.consultations)
    expect(before.prescriptions - after.prescriptions).toBe(history.prescriptions)
    expect(before.assessments - after.assessments).toBe(history.assessments)
    expect(before.photos - after.photos).toBe(1)
    expect(before.files - after.files).toBe(2)
    expect(before.patientPackages - after.patientPackages).toBe(history.patientPackages)
    expect(before.issuedCoupons - after.issuedCoupons).toBe(history.issuedCoupons)
    expect(before.financialEntries - after.financialEntries).toBe(history.financialEntries)
    await expect(services.patients.get(patient.id)).rejects.toThrow('Paciente')
    const activity = await services.activity.query({ limit: 500 })
    expect(activity.some((a) => a.action === 'delete' && a.entityId === patient.id)).toBe(true)
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
