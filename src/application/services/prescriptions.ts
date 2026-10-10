import { z } from 'zod'
import type { ClinicSettings, Id, Patient, Prescription } from '@/domain'
import { NotFoundError } from '@/domain'
import { isoDate, optionalId, optionalText, parse } from '../validation'
import type { ServiceDeps } from './deps'
import { createSettingsService } from './settings'

/** Itens com nome em branco são descartados (linhas vazias do formulário). */
export const prescriptionItemsSchema = z
  .array(
    z.object({
      name: z.string().trim(),
      dosage: optionalText,
      instructions: z.string().trim().default(''),
    }),
  )
  .default([])
  .transform((items) => items.filter((i) => i.name))
  .refine((items) => items.every((i) => i.instructions), 'Informe a orientação de uso de cada item da prescrição.')

const prescriptionSchema = z.object({
  patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
  consultationId: optionalId,
  date: isoDate,
  items: prescriptionItemsSchema.refine((items) => items.length > 0, 'Adicione ao menos um item à prescrição.'),
  notes: optionalText,
})

export type PrescriptionInput = z.input<typeof prescriptionSchema>

export interface PrintablePrescription {
  prescription: Prescription
  patient: Patient
  clinic: ClinicSettings
}

export function createPrescriptionService(deps: ServiceDeps) {
  const { store, clock, newId } = deps
  const settings = createSettingsService(deps)

  async function get(id: Id): Promise<Prescription> {
    const prescription = await store.prescriptions.get(id)
    if (!prescription) throw new NotFoundError('Prescrição')
    return prescription
  }

  return {
    get,

    async printable(id: Id): Promise<PrintablePrescription> {
      const prescription = await get(id)
      const patient = await store.patients.get(prescription.patientId)
      if (!patient) throw new NotFoundError('Paciente')
      return { prescription, patient, clinic: await settings.get() }
    },

    async create(input: PrescriptionInput): Promise<Prescription> {
      const data = parse(prescriptionSchema, input)
      return store.transaction(async () => {
        if (!(await store.patients.get(data.patientId))) throw new NotFoundError('Paciente')
        const now = clock.now().toISOString()
        const prescription: Prescription = { id: newId(), ...data, createdAt: now, updatedAt: now }
        await store.prescriptions.save(prescription)
        return prescription
      })
    },

    async update(id: Id, input: PrescriptionInput): Promise<Prescription> {
      const data = parse(prescriptionSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        const updated: Prescription = { ...current, ...data, updatedAt: clock.now().toISOString() }
        await store.prescriptions.save(updated)
        return updated
      })
    },

    async remove(id: Id): Promise<void> {
      await store.prescriptions.remove(id)
    },
  }
}

export type PrescriptionService = ReturnType<typeof createPrescriptionService>
