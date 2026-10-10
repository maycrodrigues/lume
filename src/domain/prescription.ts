import type { Entity, Id, ISODate } from './shared'

export interface PrescriptionItem {
  name: string
  dosage?: string
  instructions: string
}

export interface Prescription extends Entity {
  patientId: Id
  consultationId?: Id
  date: ISODate
  items: PrescriptionItem[]
  notes?: string
}
