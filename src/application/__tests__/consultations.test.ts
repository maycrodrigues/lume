import { describe, expect, it } from 'vitest'
import { at, seedBasics, setup } from './setup'

describe('Atendimentos e Prontuário', () => {
  it('registrar atendimento de um agendamento: conclui o agendamento, cria prescrição e cobrança', async () => {
    const { services } = setup('2026-10-12T15:00')
    const { maria, limpeza, drenagem } = await seedBasics(services)
    const appointment = await services.appointments.schedule({
      patientId: maria.id,
      start: at('2026-10-12T14:00'),
      procedureIds: [limpeza.id],
    })

    const result = await services.consultations.register({
      patientId: maria.id,
      appointmentId: appointment.id,
      date: at('2026-10-12T14:00'),
      evolution: 'Pele com boa resposta.',
      procedures: [
        { procedureId: limpeza.id, price: 18000, notes: 'Extração em zona T' },
        { procedureId: drenagem.id, price: 12000 },
      ],
      prescription: {
        items: [
          { name: 'Protetor solar FPS 50', instructions: 'Reaplicar a cada 3 horas' },
          { name: '', instructions: '' },
        ],
      },
      charge: { status: 'paid', method: 'pix' },
    })

    const record = await services.medicalRecords.get(maria.id)
    expect(record.appointments[0]).toMatchObject({ status: 'completed', consultationId: result.consultation.id })
    expect(record.performedProcedures.map((p) => [p.name, p.price])).toEqual([
      ['Limpeza de pele', 18000],
      ['Drenagem linfática', 12000],
    ])
    expect(record.prescriptions).toHaveLength(1)
    expect(record.prescriptions[0].items).toHaveLength(1)
    expect(record.financialEntries).toMatchObject([
      { type: 'income', amount: 30000, status: 'paid', method: 'pix', paidAt: '2026-10-12', dueDate: '2026-10-12' },
    ])
    expect(record.summary).toMatchObject({ consultationCount: 1, totalPaid: 30000, totalPending: 0 })
  })

  it('o histórico guarda o nome e valor cobrados, mesmo se o catálogo mudar', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await services.consultations.register({
      patientId: maria.id,
      date: at('2026-10-10T08:00'),
      procedures: [{ procedureId: limpeza.id, price: 18000 }],
    })
    await services.procedures.update(limpeza.id, { name: 'Limpeza profunda', category: 'Facial', price: 25000, durationMinutes: 60 })

    const record = await services.medicalRecords.get(maria.id)
    expect(record.performedProcedures[0]).toMatchObject({ name: 'Limpeza de pele', price: 18000 })
  })

  it('exige ao menos um procedimento ou a evolução', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    await expect(
      services.consultations.register({ patientId: maria.id, date: at('2026-10-10T08:00'), procedures: [] }),
    ).rejects.toThrow('ao menos um procedimento ou a evolução')
  })

  it('falha no meio do registro não deixa dados parciais', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await expect(
      services.consultations.register({
        patientId: maria.id,
        appointmentId: 'nao-existe',
        date: at('2026-10-10T08:00'),
        procedures: [{ procedureId: limpeza.id, price: 18000 }],
        charge: { status: 'pending' },
      }),
    ).rejects.toThrow('Agendamento não encontrado')
    const record = await services.medicalRecords.get(maria.id)
    expect(record.consultations).toEqual([])
    expect(record.financialEntries).toEqual([])
  })

  it('editar o atendimento atualiza a cobrança pendente', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const { consultation } = await services.consultations.register({
      patientId: maria.id,
      date: at('2026-10-10T08:00'),
      procedures: [{ procedureId: limpeza.id, price: 18000 }],
      charge: { status: 'pending' },
    })
    await services.consultations.update(consultation.id, {
      date: consultation.date,
      evolution: 'Ajuste de valor',
      procedures: [{ procedureId: limpeza.id, price: 16000 }],
    })
    const record = await services.medicalRecords.get(maria.id)
    expect(record.financialEntries[0]).toMatchObject({ amount: 16000, status: 'pending' })
  })

  it('excluir o atendimento reabre o agendamento, remove a cobrança pendente e mantém a prescrição', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const appointment = await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })
    const { consultation } = await services.consultations.register({
      patientId: maria.id,
      appointmentId: appointment.id,
      date: at('2026-10-12T14:00'),
      procedures: [{ procedureId: limpeza.id, price: 18000 }],
      prescription: { items: [{ name: 'Hidratante', instructions: 'Aplicar à noite' }] },
      charge: { status: 'pending' },
    })

    await services.consultations.remove(consultation.id)

    const record = await services.medicalRecords.get(maria.id)
    expect(record.consultations).toEqual([])
    expect(record.appointments[0]).toMatchObject({ status: 'scheduled' })
    expect(record.appointments[0].consultationId).toBeUndefined()
    expect(record.financialEntries).toEqual([])
    expect(record.prescriptions).toHaveLength(1)
    expect(record.prescriptions[0].consultationId).toBeUndefined()
  })
})
