import { z } from 'zod'
import type { Cents, Coupon, CouponLine, Id, IssuedCoupon, IssuedCouponStatus } from '@/domain'
import { assertCouponUsable, COUPON_PREFIX, couponDiscount, DomainError, issuedCouponStatus, normalizeCouponCode, NotFoundError } from '@/domain'
import { addDaysISO, formatDateBR, toLocalISODate } from '../dates'
import type { DataStore, IdGenerator } from '../ports'
import { optionalIsoDate, optionalText, parse, requiredText } from '../validation'
import type { ServiceDeps } from './deps'

const couponSchema = z.object({
  name: requiredText('Informe o nome do cupom.'),
  description: optionalText,
  discountPercent: z
    .number({ error: 'Informe o desconto.' })
    .gt(0, 'O desconto deve ficar entre 1% e 100%.')
    .max(100, 'O desconto deve ficar entre 1% e 100%.'),
  validityDays: z.number().int('Prazo inválido.').min(1, 'O prazo mínimo é 1 dia.').max(365, 'O prazo máximo é 365 dias.').default(30),
  issuableUntil: optionalIsoDate,
  procedureIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
})

const issueSchema = z.object({
  couponId: z.string().min(1, 'Selecione o cupom.'),
  patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
  channel: z.enum(['whatsapp', 'email', 'in_person']),
})

export type CouponInput = z.input<typeof couponSchema>
export type IssueCouponInput = z.input<typeof issueSchema>

export interface CouponView extends Coupon {
  issuedCount: number
  redeemedCount: number
}

export interface IssuedCouponView extends IssuedCoupon {
  status: IssuedCouponStatus
  patientName: string
}

export interface CouponCheck {
  coupon: IssuedCouponView
  eligibleTotal: Cents
  discount: Cents
}

/** Sem caracteres ambíguos (0/O, 1/I), para ditar ou digitar sem erro. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codeFrom(seed: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 0x01000193) >>> 0
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[hash % ALPHABET.length]
    hash = Math.imul(hash ^ (i + 0x9e37), 0x01000193) >>> 0
  }
  return `${COUPON_PREFIX}${code}`
}

async function uniqueCode(store: DataStore, newId: IdGenerator): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = codeFrom(`${newId()}:${attempt}`)
    if ((await store.issuedCoupons.where('code', code)).length === 0) return code
  }
  throw new DomainError('Não foi possível gerar um código de cupom. Tente novamente.', 'coupon_code')
}

export async function findIssuedCoupon(store: DataStore, code: string): Promise<IssuedCoupon> {
  const [coupon] = await store.issuedCoupons.where('code', normalizeCouponCode(code))
  if (!coupon) throw new DomainError('Cupom não encontrado. Confira o código.', 'coupon_not_found')
  return coupon
}

/** Regra única de uso do cupom — usada na validação presencial e no registro do Atendimento. */
export async function checkCoupon(store: DataStore, input: { code: string; patientId: Id; procedures: CouponLine[]; today: string }) {
  const coupon = await findIssuedCoupon(store, input.code)
  assertCouponUsable(coupon, input.patientId, input.today)
  const result = couponDiscount(coupon, input.procedures)
  if (result.eligibleTotal === 0) {
    throw new DomainError('O cupom não vale para os procedimentos deste atendimento (cupons não valem para sessões de pacote).', 'coupon_not_applicable')
  }
  return { coupon, ...result }
}

export function createCouponService({ store, clock, newId }: ServiceDeps) {
  const today = () => toLocalISODate(clock.now())

  async function get(id: Id): Promise<Coupon> {
    const coupon = await store.coupons.get(id)
    if (!coupon) throw new NotFoundError('Cupom')
    return coupon
  }

  async function toViews(issued: IssuedCoupon[]): Promise<IssuedCouponView[]> {
    const names = new Map((await store.patients.list()).map((p) => [p.id, p.name]))
    const now = today()
    return issued
      .map((c) => ({ ...c, status: issuedCouponStatus(c, now), patientName: names.get(c.patientId) ?? 'Paciente removida' }))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || b.createdAt.localeCompare(a.createdAt))
  }

  return {
    get,

    async list(): Promise<CouponView[]> {
      const [coupons, issued] = await Promise.all([store.coupons.list(), store.issuedCoupons.list()])
      return coupons
        .map((c) => ({
          ...c,
          issuedCount: issued.filter((i) => i.couponId === c.id).length,
          redeemedCount: issued.filter((i) => i.couponId === c.id && i.redeemedAt).length,
        }))
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR'))
    },

    async create(input: CouponInput): Promise<Coupon> {
      const data = parse(couponSchema, input)
      const now = clock.now().toISOString()
      const coupon: Coupon = { id: newId(), ...data, createdAt: now, updatedAt: now }
      await store.coupons.save(coupon)
      return coupon
    },

    /** Alterações valem para os próximos envios; cupons já emitidos mantêm o que foi prometido. */
    async update(id: Id, input: CouponInput): Promise<Coupon> {
      const data = parse(couponSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        const updated: Coupon = { ...current, ...data, updatedAt: clock.now().toISOString() }
        await store.coupons.save(updated)
        return updated
      })
    },

    async remove(id: Id): Promise<void> {
      await store.transaction(async () => {
        if ((await store.issuedCoupons.where('couponId', id)).length > 0) {
          throw new DomainError('Este cupom já foi enviado a pacientes e não pode ser excluído — desative-o.', 'coupon_issued')
        }
        await store.coupons.remove(id)
      })
    },

    /** Envia o cupom a uma paciente: gera um código único que vale por `validityDays` a partir de hoje. */
    async issue(input: IssueCouponInput): Promise<IssuedCoupon> {
      const data = parse(issueSchema, input)
      return store.transaction(async () => {
        const coupon = await get(data.couponId)
        if (!coupon.active) throw new DomainError('Este cupom está inativo.', 'coupon_inactive')
        const issuedAt = today()
        if (coupon.issuableUntil && issuedAt > coupon.issuableUntil) {
          throw new DomainError(`A campanha deste cupom encerrou em ${formatDateBR(coupon.issuableUntil)}.`, 'coupon_campaign_ended')
        }
        if (!(await store.patients.get(data.patientId))) throw new NotFoundError('Paciente')
        const stamp = clock.now().toISOString()
        const issued: IssuedCoupon = {
          id: newId(),
          couponId: coupon.id,
          patientId: data.patientId,
          code: await uniqueCode(store, newId),
          name: coupon.name,
          discountPercent: coupon.discountPercent,
          procedureIds: coupon.procedureIds,
          issuedAt,
          expiresAt: addDaysISO(issuedAt, coupon.validityDays),
          channel: data.channel,
          createdAt: stamp,
          updatedAt: stamp,
        }
        await store.issuedCoupons.save(issued)
        return issued
      })
    },

    async issued({ patientId, status }: { patientId?: Id; status?: IssuedCouponStatus } = {}): Promise<IssuedCouponView[]> {
      const rows = patientId ? await store.issuedCoupons.where('patientId', patientId) : await store.issuedCoupons.list()
      return (await toViews(rows)).filter((c) => !status || c.status === status)
    },

    /** Consulta presencial do código: quem é a paciente, quanto vale e se ainda está válido. */
    async lookup(code: string): Promise<IssuedCouponView> {
      const [view] = await toViews([await findIssuedCoupon(store, code)])
      return view
    },

    /** Simula o uso no atendimento, sem marcar o cupom como utilizado. */
    async validate(input: { code: string; patientId: Id; procedures: CouponLine[] }): Promise<CouponCheck> {
      const result = await checkCoupon(store, { ...input, today: today() })
      const [coupon] = await toViews([result.coupon])
      return { coupon, eligibleTotal: result.eligibleTotal, discount: result.discount }
    },

    async cancelIssued(id: Id): Promise<void> {
      await store.transaction(async () => {
        const issued = await store.issuedCoupons.get(id)
        if (!issued) throw new NotFoundError('Cupom emitido')
        if (issued.redeemedAt) throw new DomainError('Cupom já utilizado não pode ser cancelado.', 'coupon_redeemed')
        await store.issuedCoupons.save({ ...issued, cancelledAt: clock.now().toISOString(), updatedAt: clock.now().toISOString() })
      })
    },
  }
}

export type CouponService = ReturnType<typeof createCouponService>
