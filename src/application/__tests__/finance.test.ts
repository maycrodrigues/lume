import { describe, expect, it } from 'vitest'
import { setup } from './setup'

describe('Financeiro', () => {
  it('resume o mês: recebido, a receber, pago, a pagar e saldo', async () => {
    const { services } = setup('2026-10-20T10:00')
    const entry = (type: 'income' | 'expense', amount: number, dueDate: string, status: 'paid' | 'pending' | 'cancelled') =>
      services.finance.create({ type, description: 'x', category: 'Outros', amount, dueDate, status })

    await entry('income', 50000, '2026-10-05', 'paid')
    await entry('income', 20000, '2026-10-25', 'pending')
    await entry('income', 99900, '2026-10-06', 'cancelled')
    await entry('expense', 30000, '2026-10-10', 'paid')
    await entry('expense', 5000, '2026-10-30', 'pending')
    await entry('income', 70000, '2026-09-15', 'paid')

    expect(await services.finance.summary('2026-10')).toEqual({
      incomePaid: 50000,
      incomePending: 20000,
      expensePaid: 30000,
      expensePending: 5000,
      balance: 20000,
    })
    expect(await services.finance.series('2026-10', 2)).toEqual([
      { month: '2026-09', income: 70000, expense: 0 },
      { month: '2026-10', income: 50000, expense: 30000 },
    ])
  })

  it('marcar como pago registra a data e a forma de pagamento', async () => {
    const { services } = setup('2026-10-20T10:00')
    const e = await services.finance.create({
      type: 'income', description: 'Pacote', category: 'Pacotes', amount: 100000, dueDate: '2026-10-25', status: 'pending',
    })
    await services.finance.markPaid(e.id, { method: 'credit_card' })
    const [listed] = await services.finance.list({ month: '2026-10' })
    expect(listed).toMatchObject({ status: 'paid', paidAt: '2026-10-20', method: 'credit_card' })
  })

  it('confirma o pagamento com a data informada e não paga duas vezes', async () => {
    const { services } = setup('2026-10-20T10:00')
    const e = await services.finance.create({
      type: 'expense', description: 'Insumos', category: 'Insumos', amount: 50000, dueDate: '2026-10-15', status: 'pending',
    })
    await expect(services.finance.markPaid(e.id, { paidAt: '15/10/2026' })).rejects.toThrow('Data inválida')
    await services.finance.markPaid(e.id, { method: 'pix', paidAt: '2026-10-16' })
    const [listed] = await services.finance.list({ month: '2026-10' })
    expect(listed).toMatchObject({ status: 'paid', paidAt: '2026-10-16', method: 'pix' })
    await expect(services.finance.markPaid(e.id)).rejects.toThrow('já está pago')
  })

  it('rejeita valor zerado', async () => {
    const { services } = setup()
    await expect(
      services.finance.create({ type: 'expense', description: 'Luz', category: 'Contas', amount: 0, dueDate: '2026-10-10', status: 'pending' }),
    ).rejects.toThrow('maior que zero')
  })
})
