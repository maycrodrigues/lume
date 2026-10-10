import { describe, expect, it } from 'vitest'
import { at, seedBasics, setup } from './setup'

describe('Fichas de avaliação', () => {
  it('cria fichas datadas e compara as medidas ao longo do tempo', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    await services.assessments.create({
      patientId: maria.id,
      template: 'body',
      date: '2026-08-01',
      answers: { body_weight: '72,4', body_height: '165', body_perimetry: { Cintura: { ref: '80' }, Quadril: { ref: '' } } },
    })
    await services.assessments.create({
      patientId: maria.id,
      template: 'body',
      date: '2026-10-01',
      answers: { body_weight: '70', body_perimetry: { Cintura: { ref: '77,5' } } },
    })

    const evolution = await services.assessments.measureEvolution(maria.id, 'body')
    expect(evolution.dates).toEqual(['2026-08-01', '2026-10-01'])
    expect(evolution.rows).toEqual([
      { key: 'body_weight', label: 'Peso', unit: 'kg', values: [72.4, 70] },
      { key: 'body_height', label: 'Altura', unit: 'cm', values: [165, undefined] },
      { key: 'body_perimetry:Cintura:ref', label: 'Perimetria · Cintura (Referência)', unit: 'cm', values: [80, 77.5] },
    ])
  })

  it('rejeita modelo inexistente e atendimento de outra paciente', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const ana = await services.patients.create({ name: 'Ana Lima' })
    const { consultation } = await services.consultations.register({ patientId: ana.id, date: at('2026-10-10T08:00'), procedures: [{ procedureId: limpeza.id, price: 100 }] })

    await expect(services.assessments.create({ patientId: maria.id, template: 'inexistente' as never, date: '2026-10-10', answers: {} })).rejects.toThrow('Modelo de ficha')
    await expect(
      services.assessments.create({ patientId: maria.id, template: 'facial', date: '2026-10-10', consultationId: consultation.id, answers: {} }),
    ).rejects.toThrow('não pertence')
  })

  it('registra a ficha no registro de atividades com o nome da paciente', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    const a = await services.assessments.create({ patientId: maria.id, template: 'facial', date: '2026-10-10', answers: { facial_biotype: 'Mista' } })
    await services.assessments.update(a.id, { date: '2026-10-10', answers: { facial_biotype: 'Lipídica' } })
    const [update] = await services.activity.query({ entity: 'assessment', limit: 1 })
    expect(update.message).toBe('Alteração de ficha (Avaliação facial): Maria Souza · 10/10/2026')
    expect(update.changes).toEqual([{ field: 'answers.facial_biotype', from: 'Mista', to: 'Lipídica' }])
  })
})
