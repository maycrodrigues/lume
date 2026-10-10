import type { Consultation } from './consultation'
import type { Cents, Entity, Id, ISODate, ISODateTime } from './shared'

export interface PackageItem {
  procedureId: Id
  quantity: number
}

/** Pacote do catálogo: N procedimentos com um desconto ofertado. O preço acompanha o catálogo até ser contratado. */
export interface Package extends Entity {
  name: string
  description?: string
  items: PackageItem[]
  discountPercent: number
  /** Prazo, em dias após a contratação, para usar as sessões. */
  validityDays?: number
  active: boolean
}

/** Degraus de desconto exibidos no simulador. */
export const DISCOUNT_STEPS = [0, 5, 10, 15, 20, 25, 30]

export interface PackagePricing {
  fullPrice: Cents
  discount: Cents
  finalPrice: Cents
  sessions: number
  perSession: Cents
}

export function packagePricing(lines: Array<{ unitPrice: Cents; quantity: number }>, discountPercent: number): PackagePricing {
  const fullPrice = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  const sessions = lines.reduce((sum, l) => sum + l.quantity, 0)
  const discount = Math.round((fullPrice * discountPercent) / 100)
  const finalPrice = fullPrice - discount
  return { fullPrice, discount, finalPrice, sessions, perSession: sessions ? Math.round(finalPrice / sessions) : 0 }
}

/** Procedimento do Pacote contratado, com nome e valor unitário do dia da contratação. */
export interface ContractedItem {
  procedureId: Id
  name: string
  unitPrice: Cents
  quantity: number
}

/** Pacote contratado por uma Paciente. O saldo de sessões é calculado a partir dos Atendimentos. */
export interface PatientPackage extends Entity {
  patientId: Id
  packageId?: Id
  name: string
  items: ContractedItem[]
  fullPrice: Cents
  discountPercent: number
  price: Cents
  purchasedAt: ISODate
  expiresAt?: ISODate
  cancelledAt?: ISODateTime
  financialEntryId?: Id
  notes?: string
}

export type ContractStatus = 'active' | 'completed' | 'expired' | 'cancelled'

export interface ContractUsage {
  procedureId: Id
  name: string
  quantity: number
  used: number
  remaining: number
  sessions: Array<{ consultationId: Id; date: ISODateTime }>
}

/** Sessões usadas de cada procedimento do pacote, contadas nos Atendimentos (fonte única da verdade). */
export function contractUsage(contract: PatientPackage, consultations: Consultation[]): ContractUsage[] {
  return contract.items.map((item) => {
    const sessions = consultations
      .flatMap((c) =>
        c.procedures
          .filter((p) => p.patientPackageId === contract.id && p.procedureId === item.procedureId)
          .map(() => ({ consultationId: c.id, date: c.date })),
      )
      .sort((a, b) => a.date.localeCompare(b.date))
    return { procedureId: item.procedureId, name: item.name, quantity: item.quantity, used: sessions.length, remaining: item.quantity - sessions.length, sessions }
  })
}

export function contractStatus(contract: PatientPackage, usage: ContractUsage[], today: ISODate): ContractStatus {
  if (contract.cancelledAt) return 'cancelled'
  if (usage.every((u) => u.remaining <= 0)) return 'completed'
  if (contract.expiresAt && contract.expiresAt < today) return 'expired'
  return 'active'
}
