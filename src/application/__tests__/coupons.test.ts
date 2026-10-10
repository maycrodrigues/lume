import { describe, expect, it } from 'vitest'
import { at, seedBasics, setup } from './setup'

async function seedCoupon(services: ReturnType<typeof setup>['services']) {
  const basics = await seedBasics(services)
  const coupon = await services.coupons.create({ name: 'Primeira visita', discountPercent: 10 })
  return { ...basics, coupon }
}

describe('Cupons', () => {
  it('emite cupom com código único e validade de 30 dias a partir do envio', async () => {
    const { services } = setup('2026-10-10T10:00')
    const { maria, coupon } = await seedCoupon(services)
    const a = await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'whatsapp' })
    const b = await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'email' })
    expect(a.code).toMatch(/^LUME-[A-HJ-NP-Z2-9]{6}$/)
    expect(a.code).not.toBe(b.code)
    expect(a).toMatchObject({ issuedAt: '2026-10-10', expiresAt: '2026-11-09', discountPercent: 10 })
    const [view] = await services.coupons.issued({ patientId: maria.id })
    expect(view).toMatchObject({ status: 'available', patientName: 'Maria Souza' })
  })

  it('não emite cupom inativo nem fora da campanha', async () => {
    const { services } = setup('2026-10-10T10:00')
    const { maria } = await seedBasics(services)
    const ended = await services.coupons.create({ name: 'Setembro', discountPercent: 15, issuableUntil: '2026-09-30' })
    const inactive = await services.coupons.create({ name: 'Inativo', discountPercent: 5, active: false })
    await expect(services.coupons.issue({ couponId: ended.id, patientId: maria.id, channel: 'whatsapp' })).rejects.toThrow('encerrou em 30/09/2026')
    await expect(services.coupons.issue({ couponId: inactive.id, patientId: maria.id, channel: 'whatsapp' })).rejects.toThrow('inativo')
  })

  it('valida pelo código digitado de qualquer jeito e calcula o desconto só nos procedimentos avulsos', async () => {
    const { services } = setup()
    const { maria, limpeza, drenagem, coupon } = await seedCoupon(services)
    const issued = await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'in_person' })
    const typed = issued.code.replace('LUME-', 'lume ').toLowerCase()

    const result = await services.coupons.validate({
      code: typed,
      patientId: maria.id,
      procedures: [
        { procedureId: limpeza.id, price: 18000 },
        { procedureId: drenagem.id, price: 0, patientPackageId: 'pacote-1' },
      ],
    })
    expect(result).toMatchObject({ eligibleTotal: 18000, discount: 1800 })
    await expect(
      services.coupons.validate({ code: issued.code, patientId: maria.id, procedures: [{ procedureId: drenagem.id, price: 0, patientPackageId: 'pacote-1' }] }),
    ).rejects.toThrow('não vale para os procedimentos')
  })

  it('recusa código inexistente, de outra paciente ou vencido', async () => {
    const { services, setNow } = setup('2026-10-10T10:00')
    const { maria, limpeza, coupon } = await seedCoupon(services)
    const ana = await services.patients.create({ name: 'Ana Lima' })
    const issued = await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'whatsapp' })
    const lines = [{ procedureId: limpeza.id, price: 18000 }]

    await expect(services.coupons.validate({ code: 'LUME-ZZZZZZ', patientId: maria.id, procedures: lines })).rejects.toThrow('não encontrado')
    await expect(services.coupons.validate({ code: issued.code, patientId: ana.id, procedures: lines })).rejects.toThrow('outra paciente')
    setNow('2026-11-09T20:00')
    await expect(services.coupons.validate({ code: issued.code, patientId: maria.id, procedures: lines })).resolves.toBeDefined()
    setNow('2026-11-10T08:00')
    await expect(services.coupons.validate({ code: issued.code, patientId: maria.id, procedures: lines })).rejects.toThrow('expirou em 09/11/2026')
    expect((await services.coupons.lookup(issued.code)).status).toBe('expired')
  })

  it('usar no atendimento desconta da cobrança e marca o cupom como utilizado; excluir o atendimento libera o cupom', async () => {
    const { services } = setup('2026-10-10T10:00')
    const { maria, limpeza, coupon } = await seedCoupon(services)
    const issued = await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'whatsapp' })

    const { consultation, financialEntry } = await services.consultations.register({
      patientId: maria.id,
      date: at('2026-10-10T11:00'),
      procedures: [{ procedureId: limpeza.id, price: 18000 }],
      couponCode: issued.code,
      charge: { status: 'paid', method: 'pix' },
    })
    expect(consultation).toMatchObject({ discount: 1800, coupon: { code: issued.code, discountPercent: 10 } })
    expect(financialEntry?.amount).toBe(16200)
    expect((await services.coupons.lookup(issued.code)).status).toBe('redeemed')
    await expect(
      services.consultations.register({ patientId: maria.id, date: at('2026-10-11T11:00'), procedures: [{ procedureId: limpeza.id, price: 18000 }], couponCode: issued.code }),
    ).rejects.toThrow('já foi utilizado')

    await services.consultations.remove(consultation.id)
    expect((await services.coupons.lookup(issued.code)).status).toBe('available')
  })

  it('cupom restrito vale só nos procedimentos escolhidos', async () => {
    const { services } = setup()
    const { maria, limpeza, drenagem } = await seedBasics(services)
    const coupon = await services.coupons.create({ name: 'Drenagem', discountPercent: 20, procedureIds: [drenagem.id] })
    const issued = await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'whatsapp' })
    const result = await services.coupons.validate({
      code: issued.code,
      patientId: maria.id,
      procedures: [{ procedureId: limpeza.id, price: 18000 }, { procedureId: drenagem.id, price: 15000 }],
    })
    expect(result.discount).toBe(3000)
  })

  it('cupom já enviado não pode ser excluído, só desativado', async () => {
    const { services } = setup()
    const { maria, coupon } = await seedCoupon(services)
    await services.coupons.issue({ couponId: coupon.id, patientId: maria.id, channel: 'whatsapp' })
    await expect(services.coupons.remove(coupon.id)).rejects.toThrow('desative')
  })
})
