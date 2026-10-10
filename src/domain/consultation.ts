import type { Cents, Entity, Id, ISODateTime } from './shared'
import { sumCents } from './shared'

/** Procedimento aplicado no Atendimento, com nome e valor cobrados naquele dia. */
export interface PerformedProcedure {
  procedureId: Id
  name: string
  /** Valor cobrado na linha; zero quando é sessão de um Pacote contratado (já pago). */
  price: Cents
  notes?: string
  patientPackageId?: Id
}

/** Cupom usado no Atendimento (cópia dos dados no momento do uso). */
export interface AppliedCoupon {
  issuedCouponId: Id
  code: string
  discountPercent: number
}

/** Registro de uma sessão em que a Paciente foi atendida. */
export interface Consultation extends Entity {
  patientId: Id
  appointmentId?: Id
  date: ISODateTime
  sessionNumber?: number
  chiefComplaint?: string
  examination?: string
  previousEvolution?: string
  evolution?: string
  equipment?: string
  activeIngredients?: string
  intercurrences?: string
  recommendations?: string
  procedures: PerformedProcedure[]
  coupon?: AppliedCoupon
  /** Desconto do cupom, em centavos. */
  discount?: Cents
  financialEntryId?: Id
}

/** Valor do Atendimento: procedimentos cobrados menos o desconto do cupom. */
export const consultationTotal = (c: Pick<Consultation, 'procedures' | 'discount'>): Cents =>
  sumCents(c.procedures.map((p) => p.price)) - (c.discount ?? 0)
