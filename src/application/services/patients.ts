import { z } from 'zod'
import type { Answers, Id, ImageConsent, Patient } from '@/domain'
import { ANAMNESIS, cleanAnswers, NUTRITION, DomainError, isValidCpf, normalizeText, NotFoundError, onlyDigits } from '@/domain'
import { isoDate, optionalChoice, optionalIsoDate, optionalText, parse } from '../validation'
import { isCaseStudyPatient } from './caseStudies'
import type { ServiceDeps } from './deps'

const patientSchema = z.object({
  name: z.string({ error: 'Informe o nome.' }).trim().min(2, 'Informe o nome completo.'),
  birthDate: optionalIsoDate,
  cpf: optionalText
    .refine((v) => !v || isValidCpf(v), 'CPF inválido.')
    .transform((v) => (v ? onlyDigits(v) : undefined)),
  rg: optionalText,
  gender: z.enum(['female', 'male', 'other', 'unspecified']).default('unspecified'),
  maritalStatus: optionalChoice(['single', 'married', 'stable_union', 'divorced', 'widowed']),
  phone: optionalText,
  phoneAlt: optionalText,
  email: optionalText.refine((v) => !v || z.email().safeParse(v).success, 'E-mail inválido.'),
  address: optionalText,
  neighborhood: optionalText,
  city: optionalText,
  state: optionalText,
  zipCode: optionalText,
  occupation: optionalText,
  referralSource: optionalText,
  notes: optionalText,
})

const imageConsentSchema = z
  .object({
    scope: z.enum(['clinical', 'clinical_and_marketing', 'denied']),
    date: isoDate,
  })
  .optional()

export type PatientInput = z.input<typeof patientSchema>
/** Respostas brutas do formulário da Anamnese (ou da Nutricional), validadas contra o modelo correspondente. */
export type AnamnesisInput = Record<string, unknown>

/** Quantidade de registros ligados à paciente, por tipo. */
export interface PatientHistory {
  appointments: number
  consultations: number
  prescriptions: number
  assessments: number
  photos: number
  patientPackages: number
  issuedCoupons: number
  financialEntries: number
}

export interface PatientListOptions {
  search?: string
  includeInactive?: boolean
  /** Só as pacientes de teste dos estudos de caso. */
  caseStudiesOnly?: boolean
}

export function createPatientService({ store, clock, newId }: ServiceDeps) {
  async function get(id: Id): Promise<Patient> {
    const patient = await store.patients.get(id)
    if (!patient) throw new NotFoundError('Paciente')
    return patient
  }

  async function assertUniqueCpf(cpf: string | undefined, ignoreId?: Id) {
    if (!cpf) return
    const sameCpf = await store.patients.where('cpf', cpf)
    if (sameCpf.some((p) => p.id !== ignoreId)) {
      throw new DomainError('Já existe uma paciente com este CPF.', 'duplicate_cpf')
    }
  }

  /** Tudo que pertence à paciente. Lançamentos entram também pelo atendimento (cobranças sem `patientId`). */
  async function relatedRecords(id: Id) {
    const [appointments, consultations, prescriptions, assessments, photos, patientPackages, issuedCoupons, byPatient] = await Promise.all([
      store.appointments.where('patientId', id),
      store.consultations.where('patientId', id),
      store.prescriptions.where('patientId', id),
      store.assessments.where('patientId', id),
      store.photos.where('patientId', id),
      store.patientPackages.where('patientId', id),
      store.issuedCoupons.where('patientId', id),
      store.financialEntries.where('patientId', id),
    ])
    const consultationIds = new Set(consultations.map((c) => c.id))
    const byConsultation = consultationIds.size
      ? (await store.financialEntries.list()).filter((e) => e.consultationId && consultationIds.has(e.consultationId) && e.patientId !== id)
      : []
    const financialEntries = [...byPatient, ...byConsultation]
    return { appointments, consultations, prescriptions, assessments, photos, patientPackages, issuedCoupons, financialEntries }
  }

  async function history(id: Id): Promise<PatientHistory> {
    const r = await relatedRecords(id)
    return {
      appointments: r.appointments.length,
      consultations: r.consultations.length,
      prescriptions: r.prescriptions.length,
      assessments: r.assessments.length,
      photos: r.photos.length,
      patientPackages: r.patientPackages.length,
      issuedCoupons: r.issuedCoupons.length,
      financialEntries: r.financialEntries.length,
    }
  }

  return {
    get,

    async list({ search, includeInactive = false, caseStudiesOnly = false }: PatientListOptions = {}): Promise<Patient[]> {
      const term = search ? normalizeText(search) : ''
      const digits = search ? onlyDigits(search) : ''
      return (await store.patients.list())
        .filter((p) => includeInactive || p.active)
        .filter((p) => !caseStudiesOnly || isCaseStudyPatient(p))
        .filter(
          (p) =>
            !term ||
            normalizeText(`${p.name} ${p.email ?? ''}`).includes(term) ||
            (digits.length >= 3 && `${p.cpf ?? ''} ${onlyDigits(p.phone ?? '')}`.includes(digits)),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    },

    async create(input: PatientInput): Promise<Patient> {
      const data = parse(patientSchema, input)
      await assertUniqueCpf(data.cpf)
      const now = clock.now().toISOString()
      const patient: Patient = { id: newId(), ...data, active: true, anamnesis: {}, createdAt: now, updatedAt: now }
      await store.patients.save(patient)
      return patient
    },

    async update(id: Id, input: PatientInput): Promise<Patient> {
      const data = parse(patientSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        await assertUniqueCpf(data.cpf, id)
        const updated: Patient = { ...current, ...data, updatedAt: clock.now().toISOString() }
        await store.patients.save(updated)
        return updated
      })
    },

    async updateAnamnesis(id: Id, input: AnamnesisInput): Promise<Patient> {
      return store.transaction(async () => {
        const current = await get(id)
        const now = clock.now().toISOString()
        const anamnesis = cleanAnswers(ANAMNESIS, input as Answers, current.anamnesis)
        const updated: Patient = { ...current, anamnesis, anamnesisUpdatedAt: now, updatedAt: now }
        await store.patients.save(updated)
        return updated
      })
    },

    async updateNutrition(id: Id, input: AnamnesisInput): Promise<Patient> {
      return store.transaction(async () => {
        const current = await get(id)
        const now = clock.now().toISOString()
        const nutrition = cleanAnswers(NUTRITION, input as Answers, current.nutrition)
        const updated: Patient = { ...current, nutrition, nutritionUpdatedAt: now, updatedAt: now }
        await store.patients.save(updated)
        return updated
      })
    },

    async setImageConsent(id: Id, input: ImageConsent | undefined): Promise<void> {
      const imageConsent = parse(imageConsentSchema, input)
      await store.transaction(async () => {
        const current = await get(id)
        await store.patients.save({ ...current, imageConsent, updatedAt: clock.now().toISOString() })
      })
    },

    async setActive(id: Id, active: boolean): Promise<void> {
      await store.transaction(async () => {
        const current = await get(id)
        await store.patients.save({ ...current, active, updatedAt: clock.now().toISOString() })
      })
    },

    /** Quanto histórico clínico e financeiro a paciente tem, por tipo (o que a exclusão completa apagaria). */
    history,

    /**
     * Exclui o cadastro. Com histórico clínico ou financeiro, só exclui com `withHistory`: aí apaga, numa
     * única transação, agendamentos, atendimentos, prescrições, fichas, fotos (e arquivos), pacotes,
     * cupons e lançamentos da paciente. Cada exclusão fica com cópia completa em Registros.
     */
    async remove(id: Id, { withHistory = false }: { withHistory?: boolean } = {}): Promise<void> {
      await store.transaction(async () => {
        await get(id)
        const related = await relatedRecords(id)
        const { appointments, ...clinical } = related
        if (!withHistory && Object.values(clinical).some((rows) => rows.length > 0)) {
          throw new DomainError(
            'Esta paciente possui histórico clínico ou financeiro (atendimentos, fichas, fotos, prescrições, pacotes, cupons ou lançamentos). Arquive o cadastro ou exclua junto com todo o histórico.',
            'has_history',
          )
        }
        for (const row of related.financialEntries) await store.financialEntries.remove(row.id)
        for (const row of related.issuedCoupons) await store.issuedCoupons.remove(row.id)
        for (const row of related.patientPackages) await store.patientPackages.remove(row.id)
        for (const row of related.prescriptions) await store.prescriptions.remove(row.id)
        for (const row of related.assessments) await store.assessments.remove(row.id)
        for (const photo of related.photos) {
          await store.photos.remove(photo.id)
          await store.files.remove(photo.fileId)
          await store.files.remove(photo.thumbnailId)
        }
        for (const row of related.consultations) await store.consultations.remove(row.id)
        for (const row of appointments) await store.appointments.remove(row.id)
        await store.patients.remove(id)
      })
    },
  }
}

export type PatientService = ReturnType<typeof createPatientService>
