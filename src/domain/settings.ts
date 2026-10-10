import type { WorkingHours } from './schedule'
import type { ISODateTime } from './shared'

export const CLINIC_SETTINGS_ID = 'clinic'

export interface ClinicSettings {
  id: typeof CLINIC_SETTINGS_ID
  clinicName: string
  professionalName: string
  professionalRegistry?: string
  phone?: string
  email?: string
  address?: string
  instagram?: string
  /** Sem valor = horário padrão (`DEFAULT_WORKING_HOURS`). */
  workingHours?: WorkingHours
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
