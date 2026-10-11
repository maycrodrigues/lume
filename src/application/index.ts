import { createActivityService, monotonicClock, withActivityLog } from './activityLog'
import type { Clock, CredentialStore, DataStore, IdGenerator, ImageProcessor, PinHasher, SitePublisher, SiteTokenStore } from './ports'
import { createAccessService } from './services/access'
import { createAppointmentService } from './services/appointments'
import { createAssessmentService } from './services/assessments'
import { createBackupService } from './services/backup'
import { createConsultationService } from './services/consultations'
import { createCouponService } from './services/coupons'
import { createDashboardService } from './services/dashboard'
import { createFinanceService } from './services/finance'
import { createMedicalRecordService } from './services/medicalRecords'
import { createPackageService } from './services/packages'
import { createPatientService } from './services/patients'
import { createPhotoService } from './services/photos'
import { createPrescriptionService } from './services/prescriptions'
import { createProcedureService } from './services/procedures'
import { createScheduleService } from './services/schedule'
import { createSettingsService } from './services/settings'
import { createSiteService } from './services/site'

/**
 * Interface única da aplicação para a camada de apresentação.
 * Toda escrita de dados passa pelo registro de atividades automaticamente.
 */
export function createServices({ credentials, pinHasher, sitePublisher, siteToken, ...deps }: {
  store: DataStore
  clock: Clock
  newId: IdGenerator
  images: ImageProcessor
  credentials: CredentialStore
  pinHasher: PinHasher
  sitePublisher: SitePublisher
  siteToken: SiteTokenStore
}) {
  const activityClock = monotonicClock(deps.clock)
  const store = withActivityLog(deps.store, { clock: activityClock, newId: deps.newId })
  const d = { ...deps, store }
  const activity = createActivityService({ ...d, clock: activityClock })
  const appointments = createAppointmentService(d)
  const finance = createFinanceService(d)
  const settings = createSettingsService(d)
  return {
    access: createAccessService(d, { credentials, pinHasher, siteToken }, activity),
    patients: createPatientService(d),
    procedures: createProcedureService(d),
    appointments,
    consultations: createConsultationService(d),
    prescriptions: createPrescriptionService(d),
    medicalRecords: createMedicalRecordService(d),
    assessments: createAssessmentService(d),
    photos: createPhotoService(d),
    packages: createPackageService(d),
    coupons: createCouponService(d),
    schedule: createScheduleService(d),
    finance,
    dashboard: createDashboardService(d, { appointments, finance }),
    settings,
    site: createSiteService(d, settings, activity, { sitePublisher, siteToken }),
    backup: createBackupService(d, activity),
    activity,
    /** Assina mudanças de dados (para a UI recarregar consultas). */
    subscribe: store.subscribe,
  }
}

export type Services = ReturnType<typeof createServices>

export type { AccessStatus } from './services/access'
export type { AppointmentView, ScheduleInput } from './services/appointments'
export type { AssessmentInput, MeasureEvolution } from './services/assessments'
export type { PhotoInput, PhotoUpdateInput } from './services/photos'
export type { BackupFile } from './services/backup'
export type { CouponCheck, CouponInput, CouponView, IssueCouponInput, IssuedCouponView } from './services/coupons'
export type { AvailableSession, ContractView, PackageInput, PackageView, SellPackageInput } from './services/packages'
export type { RegisterConsultationInput, UpdateConsultationInput } from './services/consultations'
export type { DashboardOverview } from './services/dashboard'
export type { EntryInput, FinancialEntryView, MonthPoint, MonthSummary } from './services/finance'
export type { MedicalRecord, PerformedProcedureRecord } from './services/medicalRecords'
export type { AnamnesisInput, PatientInput } from './services/patients'
export type { PrescriptionInput, PrintablePrescription } from './services/prescriptions'
export type { ProcedureInput } from './services/procedures'
export type { BlockInput, DayAvailability } from './services/schedule'
export type { SettingsInput, WorkingHoursInput } from './services/settings'
export type { SiteStatus } from './services/site'
export type { ActivitySearch } from './activityLog'
export type { Collection } from './ports'
