import { describe, expect, it } from 'vitest'
import { at, seedBasics, setup } from './setup'

async function seedPackage(services: ReturnType<typeof setup>['services']) {
  const basics = await seedBasics(services)
  // 5 × drenagem (R$ 150) + 1 × limpeza (R$ 180) = R$ 930
  const pkg = await services.packages.create({
    name: 'Detox corporal',
    items: [
      { procedureId: basics.drenagem.id, quantity: 5 },
      { procedureId: basics.limpeza.id, quantity: 1 },
    ],
    discountPercent: 10,
    validityDays: 90,
  })
  return { ...basics, pkg }
}

describe('Pacotes', () => {
  it('calcula o preço a partir do catálogo, com o desconto ofertado', async () => {
    const { services } = setup()
    await seedPackage(services)
    const [view] = await services.packages.list()
    expect(view.lines.map((l) => [l.name, l.quantity, l.unitPrice])).toEqual([
      ['Drenagem linfática', 5, 15000],
      ['Limpeza de pele', 1, 18000],
    ])
    expect(view.pricing).toEqual({ fullPrice: 93000, discount: 9300, finalPrice: 83700, sessions: 6, perSession: 13950 })
  })

  it('soma itens repetidos e rejeita pacote vazio ou desconto fora de 0–100%', async () => {
    const { services } = setup()
    const { drenagem } = await seedBasics(services)
    const pkg = await services.packages.create({
      name: 'Drenagem 10',
      items: [{ procedureId: drenagem.id, quantity: 4 }, { procedureId: drenagem.id, quantity: 6 }],
      discountPercent: 15,
    })
    expect(pkg.items).toEqual([{ procedureId: drenagem.id, quantity: 10 }])
    await expect(services.packages.create({ name: 'Vazio', items: [], discountPercent: 0 })).rejects.toThrow('ao menos um procedimento')
    await expect(services.packages.create({ name: 'X', items: [{ procedureId: drenagem.id, quantity: 1 }], discountPercent: 120 })).rejects.toThrow('entre 0% e 100%')
  })

  it('contratar congela os valores, gera a cobrança e define a validade', async () => {
    const { services } = setup('2026-10-10T10:00')
    const { maria, drenagem, pkg } = await seedPackage(services)
    const contract = await services.packages.sell({ packageId: pkg.id, patientId: maria.id, discountPercent: 15, charge: { status: 'paid', method: 'pix' } })

    expect(contract).toMatchObject({ name: 'Detox corporal', fullPrice: 93000, discountPercent: 15, price: 79050, purchasedAt: '2026-10-10', expiresAt: '2027-01-08' })
    await services.procedures.update(drenagem.id, { name: 'Drenagem', category: 'Corporal', price: 99900, durationMinutes: 50 })
    const [view] = await services.packages.contracts(maria.id)
    expect(view.items[0].unitPrice).toBe(15000)
    const [entry] = await services.finance.list({ month: '2026-10' })
    expect(entry).toMatchObject({ type: 'income', category: 'Pacotes', amount: 79050, status: 'paid', patientId: maria.id })
  })

  it('cada atendimento usa uma sessão, sem cobrar de novo; sem saldo, recusa', async () => {
    const { services } = setup('2026-10-10T10:00')
    const { maria, drenagem, limpeza, pkg } = await seedPackage(services)
    const contract = await services.packages.sell({ packageId: pkg.id, patientId: maria.id })

    const { consultation, financialEntry } = await services.consultations.register({
      patientId: maria.id,
      date: at('2026-10-10T11:00'),
      procedures: [{ procedureId: limpeza.id, price: 18000, patientPackageId: contract.id }],
      charge: { status: 'paid' },
    })
    expect(consultation.procedures[0].price).toBe(0)
    expect(financialEntry).toBeUndefined()

    const [view] = await services.packages.contracts(maria.id)
    expect(view.usage.map((u) => [u.name, u.used, u.remaining])).toEqual([
      ['Drenagem linfática', 0, 5],
      ['Limpeza de pele', 1, 0],
    ])
    await expect(
      services.consultations.register({ patientId: maria.id, date: at('2026-10-11T11:00'), procedures: [{ procedureId: limpeza.id, price: 0, patientPackageId: contract.id }] }),
    ).rejects.toThrow('não tem mais sessões de Limpeza de pele')
    await expect(
      services.consultations.register({ patientId: maria.id, date: at('2026-10-11T11:00'), procedures: [{ procedureId: drenagem.id, price: 0, patientPackageId: 'outro' }] }),
    ).rejects.toThrow('Pacote contratado não encontrado')
  })

  it('pacote vencido ou cancelado não libera sessões; excluir o atendimento devolve a sessão', async () => {
    const { services, setNow } = setup('2026-10-10T10:00')
    const { maria, drenagem, pkg } = await seedPackage(services)
    const contract = await services.packages.sell({ packageId: pkg.id, patientId: maria.id })
    const { consultation } = await services.consultations.register({
      patientId: maria.id,
      date: at('2026-10-10T11:00'),
      procedures: [{ procedureId: drenagem.id, price: 0, patientPackageId: contract.id }],
    })
    await services.consultations.remove(consultation.id)
    expect((await services.packages.contracts(maria.id))[0].usage[0].remaining).toBe(5)

    setNow('2027-01-09T10:00')
    expect((await services.packages.contracts(maria.id))[0].status).toBe('expired')
    await expect(
      services.consultations.register({ patientId: maria.id, date: at('2027-01-09T11:00'), procedures: [{ procedureId: drenagem.id, price: 0, patientPackageId: contract.id }] }),
    ).rejects.toThrow('venceu em 08/01/2027')
  })

  it('lista as sessões disponíveis da paciente para o atendimento', async () => {
    const { services } = setup()
    const { maria, pkg } = await seedPackage(services)
    const contract = await services.packages.sell({ packageId: pkg.id, patientId: maria.id })
    const sessions = await services.packages.availableSessions(maria.id)
    expect(sessions.map((s) => [s.patientPackageId, s.procedureName, s.remaining])).toEqual([
      [contract.id, 'Drenagem linfática', 5],
      [contract.id, 'Limpeza de pele', 1],
    ])
    await services.packages.cancelContract(contract.id)
    expect(await services.packages.availableSessions(maria.id)).toEqual([])
  })
})
