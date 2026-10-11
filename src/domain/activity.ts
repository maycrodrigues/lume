import type { Id, ISODateTime } from './shared'

export type ActivityLevel = 'info' | 'warning' | 'error'
export type ActivityCategory = 'data' | 'access' | 'navigation' | 'system' | 'error'
export type DataAction = 'create' | 'update' | 'delete'

export type EntityName =
  | 'patient'
  | 'procedure'
  | 'appointment'
  | 'consultation'
  | 'prescription'
  | 'financialEntry'
  | 'settings'
  | 'assessment'
  | 'photo'
  | 'package'
  | 'patientPackage'
  | 'coupon'
  | 'issuedCoupon'
  | 'scheduleBlock'

export interface FieldChange {
  field: string
  from: unknown
  to: unknown
}

/** Registro de atividade imutável. */
export interface ActivityEntry {
  id: Id
  timestamp: ISODateTime
  level: ActivityLevel
  category: ActivityCategory
  action: string
  message: string
  entity?: EntityName
  entityId?: Id
  changes?: FieldChange[]
  context?: Record<string, unknown>
}
