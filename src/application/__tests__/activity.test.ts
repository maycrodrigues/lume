import { describe, expect, it } from 'vitest'
import { setup } from './setup'

describe('Registro de atividades', () => {
  it('registra cadastro, alteração (com campos antes/depois) e exclusão de dados', async () => {
    const { services } = setup()
    const p = await services.procedures.create({ name: 'Peeling', category: 'Facial', price: 20000, durationMinutes: 40 })
    await services.procedures.update(p.id, { name: 'Peeling químico', category: 'Facial', price: 22000, durationMinutes: 40 })
    await services.procedures.remove(p.id)

    const entries = await services.activity.query({ entityId: p.id })
    expect(entries.map((e) => [e.action, e.message])).toEqual([
      ['delete', 'Exclusão de procedimento: Peeling químico'],
      ['update', 'Alteração de procedimento: Peeling químico'],
      ['create', 'Cadastro de procedimento: Peeling'],
    ])
    expect(entries[1].changes).toEqual([
      { field: 'name', from: 'Peeling', to: 'Peeling químico' },
      { field: 'price', from: 20000, to: 22000 },
    ])
    expect(entries[0].context?.snapshot).toMatchObject({ name: 'Peeling químico' })
  })

  it('não registra alteração quando nada mudou', async () => {
    const { services } = setup()
    const input = { name: 'Peeling', category: 'Facial', price: 20000, durationMinutes: 40 }
    const p = await services.procedures.create(input)
    await services.procedures.update(p.id, input)
    expect(await services.activity.query({ entityId: p.id })).toHaveLength(1)
  })

  it('identifica a paciente nas mensagens de registros ligados a ela', async () => {
    const { services } = setup()
    const maria = await services.patients.create({ name: 'Maria Souza' })
    await services.prescriptions.create({
      patientId: maria.id,
      date: '2026-10-10',
      items: [{ name: 'Protetor solar FPS 50', instructions: 'Reaplicar a cada 3 horas' }],
    })
    const [entry] = await services.activity.query({ entity: 'prescription' })
    expect(entry.message).toBe('Cadastro de prescrição: Maria Souza · 10/10/2026 · 1 item')
  })

  it('registra eventos de navegação e erros, filtráveis por categoria e texto', async () => {
    const { services } = setup()
    await services.activity.record({ category: 'navigation', action: 'view', message: 'Abriu Agenda' })
    await services.activity.recordError(new Error('Falha ao salvar'), { page: '/agenda' })

    const errors = await services.activity.query({ category: 'error' })
    expect(errors).toMatchObject([{ level: 'error', message: 'Falha ao salvar', context: { page: '/agenda' } }])
    expect(await services.activity.query({ search: 'agenda' })).toHaveLength(2)
  })
})
