import type { Cents, Entity, Id, ISODate, ISODateTime } from './shared'
import { DomainError } from './shared'

/** Cupom cadastrado: a regra de desconto que pode ser enviada às pacientes. */
export interface Coupon extends Entity {
  name: string
  description?: string
  discountPercent: number
  /** Dias para usar, contados do envio à paciente. */
  validityDays: number
  /** Último dia em que o cupom pode ser enviado (campanha). */
  issuableUntil?: ISODate
  /** Procedimentos em que vale; vazio = todos os procedimentos avulsos. */
  procedureIds: Id[]
  active: boolean
}

export type CouponChannel = 'whatsapp' | 'email' | 'in_person'

/** Cupom emitido para uma Paciente: código único, de uso único, com validade. */
export interface IssuedCoupon extends Entity {
  couponId: Id
  patientId: Id
  code: string
  name: string
  discountPercent: number
  procedureIds: Id[]
  issuedAt: ISODate
  expiresAt: ISODate
  channel: CouponChannel
  redeemedAt?: ISODateTime
  consultationId?: Id
  cancelledAt?: ISODateTime
}

export type IssuedCouponStatus = 'available' | 'redeemed' | 'expired' | 'cancelled'

export const COUPON_PREFIX = 'LUME-'

/** O cupom vale até o fim do dia de `expiresAt`. */
export function issuedCouponStatus(coupon: IssuedCoupon, today: ISODate): IssuedCouponStatus {
  if (coupon.cancelledAt) return 'cancelled'
  if (coupon.redeemedAt) return 'redeemed'
  if (coupon.expiresAt < today) return 'expired'
  return 'available'
}

/** Aceita o código como a paciente digitar: "lume-7k3p9q", "LUME 7K3P9Q" ou só "7K3P9Q". */
export function normalizeCouponCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const body = raw.startsWith('LUME') ? raw.slice(4) : raw
  return `${COUPON_PREFIX}${body}`
}

export interface CouponLine {
  procedureId: Id
  price: Cents
  patientPackageId?: Id
}

/** Cupom vale só para procedimentos avulsos — nunca para sessões de pacote. */
export const isCouponEligible = (procedureIds: Id[], line: CouponLine) =>
  !line.patientPackageId && (procedureIds.length === 0 || procedureIds.includes(line.procedureId))

export function couponDiscount(coupon: Pick<IssuedCoupon, 'discountPercent' | 'procedureIds'>, lines: CouponLine[]) {
  const eligibleTotal = lines.filter((l) => isCouponEligible(coupon.procedureIds, l)).reduce((sum, l) => sum + l.price, 0)
  return { eligibleTotal, discount: Math.round((eligibleTotal * coupon.discountPercent) / 100) }
}

const br = (date: string) => date.slice(0, 10).split('-').reverse().join('/')

/** Lança o motivo, em linguagem da Profissional, quando o cupom não pode ser usado agora por esta paciente. */
export function assertCouponUsable(coupon: IssuedCoupon, patientId: Id, today: ISODate): void {
  if (coupon.patientId !== patientId) throw new DomainError('Este cupom foi emitido para outra paciente.', 'coupon_other_patient')
  switch (issuedCouponStatus(coupon, today)) {
    case 'cancelled':
      throw new DomainError('Este cupom foi cancelado.', 'coupon_cancelled')
    case 'redeemed':
      throw new DomainError(`Este cupom já foi utilizado em ${br(coupon.redeemedAt!)}.`, 'coupon_redeemed')
    case 'expired':
      throw new DomainError(`Este cupom expirou em ${br(coupon.expiresAt)}.`, 'coupon_expired')
  }
}
