import type { Appointment, Assessment, Cents, Consultation, FinancialEntry, Id, ISODateTime, Patient, PerformedProcedure, Photo, Prescription } from '@/domain'
import { isEditableAppointment, NotFoundError, sumCents } from '@/domain'
import type { ServiceDeps } from './deps'

export interface PerformedProcedureRecord extends PerformedProcedure {
  consultationId: Id
  date: ISODateTime
}

/** Visão consolidada do Prontuário de uma Paciente. Listas do mais recente para o mais antigo. */
export interface MedicalRecord {
  patient: Patient
  consultations: Consultation[]
  prescriptions: Prescription[]
  performedProcedures: PerformedProcedureRecord[]
  appointments: Appointment[]
  financialEntries: FinancialEntry[]
  assessments: Assessment[]
  photos: Photo[]
  summary: {
    consultationCount: number
    lastConsultationAt?: ISODateTime
    nextAppointment?: Appointment
    totalPaid: Cents
    totalPending: Cents
  }
}

const newestFirst = <T>(key: (item: T) => string) => (a: T, b: T) => key(b).localeCompare(key(a))

export function createMedicalRecordService({ store, clock }: ServiceDeps) {
  return {
    async get(patientId: Id): Promise<MedicalRecord> {
      const patient = await store.patients.get(patientId)
      if (!patient) throw new NotFoundError('Paciente')
      const [consultations, prescriptions, appointments, financialEntries, assessments, photos] = await Promise.all([
        store.consultations.where('patientId', patientId),
        store.prescriptions.where('patientId', patientId),
        store.appointments.where('patientId', patientId),
        store.financialEntries.where('patientId', patientId),
        store.assessments.where('patientId', patientId),
        store.photos.where('patientId', patientId),
      ])
      assessments.sort(newestFirst((a) => `${a.date}${a.createdAt}`))
      photos.sort((a, b) => b.takenAt.localeCompare(a.takenAt) || a.createdAt.localeCompare(b.createdAt))
      consultations.sort(newestFirst((c) => c.date))
      prescriptions.sort(newestFirst((p) => `${p.date}${p.createdAt}`))
      appointments.sort(newestFirst((a) => a.start))
      financialEntries.sort(newestFirst((f) => f.dueDate))

      const now = clock.now().toISOString()
      const nextAppointment = appointments
        .filter((a) => a.start >= now && isEditableAppointment(a))
        .sort((a, b) => a.start.localeCompare(b.start))[0]
      const income = financialEntries.filter((f) => f.type === 'income')

      return {
        patient,
        consultations,
        prescriptions,
        appointments,
        financialEntries,
        assessments,
        photos,
        performedProcedures: consultations.flatMap((c) =>
          c.procedures.map((p) => ({ ...p, consultationId: c.id, date: c.date })),
        ),
        summary: {
          consultationCount: consultations.length,
          lastConsultationAt: consultations[0]?.date,
          nextAppointment,
          totalPaid: sumCents(income.filter((f) => f.status === 'paid').map((f) => f.amount)),
          totalPending: sumCents(income.filter((f) => f.status === 'pending').map((f) => f.amount)),
        },
      }
    },
  }
}

export type MedicalRecordService = ReturnType<typeof createMedicalRecordService>
