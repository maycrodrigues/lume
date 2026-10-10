import { z } from 'zod'
import type { Answers, Id, ImageConsent, Patient } from '@/domain'
import { ANAMNESIS, cleanAnswers, DomainError, isValidCpf, normalizeText, NotFoundError, onlyDigits } from '@/domain'
import { isoDate, optionalChoice, optionalIsoDate, optionalText, parse } from '../validation'
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
/** Respostas brutas do formulário da Anamnese, validadas contra o modelo `ANAMNESIS`. */
export type AnamnesisInput = Record<string, unknown>

export interface PatientListOptions {
  search?: string
  includeInactive?: boolean
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

  return {
    get,

    async list({ search, includeInactive = false }: PatientListOptions = {}): Promise<Patient[]> {
      const term = search ? normalizeText(search) : ''
      const digits = search ? onlyDigits(search) : ''
      return (await store.patients.list())
        .filter((p) => includeInactive || p.active)
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

    /** Paciente com histórico clínico ou financeiro não pode ser excluída — apenas arquivada. */
    async remove(id: Id): Promise<void> {
      await store.transaction(async () => {
        await get(id)
        const history = await Promise.all([
          store.consultations.where('patientId', id),
          store.prescriptions.where('patientId', id),
          store.financialEntries.where('patientId', id),
          store.assessments.where('patientId', id),
          store.photos.where('patientId', id),
          store.patientPackages.where('patientId', id),
          store.issuedCoupons.where('patientId', id),
        ])
        if (history.some((rows) => rows.length > 0)) {
          throw new DomainError(
            'Esta paciente possui histórico clínico ou financeiro (atendimentos, fichas, fotos, prescrições, pacotes, cupons ou lançamentos) e não pode ser excluída. Arquive o cadastro.',
            'has_history',
          )
        }
        for (const appointment of await store.appointments.where('patientId', id)) {
          await store.appointments.remove(appointment.id)
        }
        await store.patients.remove(id)
      })
    },
  }
}

export type PatientService = ReturnType<typeof createPatientService>
