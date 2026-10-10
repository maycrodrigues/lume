import { z } from 'zod'
import type { AppliedCoupon, Consultation, FinancialEntry, Id, IssuedCoupon, PerformedProcedure, Prescription } from '@/domain'
import { CONSULTATION_CHARGE_CATEGORY, consultationTotal, couponDiscount, DomainError, isEditableAppointment, NotFoundError } from '@/domain'
import { toLocalISODate } from '../dates'
import { cents, isoDateTime, optionalId, optionalIsoDate, optionalPaymentMethod, optionalPositiveInt, optionalText, parse } from '../validation'
import type { ServiceDeps } from './deps'
import { checkCoupon } from './coupons'
import { assertPackageSessions } from './packages'
import { prescriptionItemsSchema } from './prescriptions'

const performedSchema = z.object({
  procedureId: z.string().min(1, 'Selecione o procedimento.'),
  price: cents,
  notes: optionalText,
  patientPackageId: optionalId,
})

const clinicalFields = {
  date: isoDateTime,
  sessionNumber: optionalPositiveInt,
  chiefComplaint: optionalText,
  examination: optionalText,
  previousEvolution: optionalText,
  evolution: optionalText,
  equipment: optionalText,
  activeIngredients: optionalText,
  intercurrences: optionalText,
  recommendations: optionalText,
  procedures: z.array(performedSchema).default([]),
}

const requireContent = <T extends { procedures: unknown[]; evolution?: string }>(v: T) =>
  v.procedures.length > 0 || Boolean(v.evolution)
const contentMessage = 'Registre ao menos um procedimento ou a evolução do atendimento.'

const registerSchema = z
  .object({
    patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
    appointmentId: optionalId,
    ...clinicalFields,
    prescription: z.object({ items: prescriptionItemsSchema, notes: optionalText }).optional(),
    couponCode: optionalText,
    charge: z
      .object({
        status: z.enum(['pending', 'paid']),
        method: optionalPaymentMethod,
        dueDate: optionalIsoDate,
      })
      .optional(),
  })
  .refine(requireContent, contentMessage)

const updateSchema = z.object(clinicalFields).refine(requireContent, contentMessage)

export type RegisterConsultationInput = z.input<typeof registerSchema>
export type UpdateConsultationInput = z.input<typeof updateSchema>

export interface RegisteredConsultation {
  consultation: Consultation
  prescription?: Prescription
  financialEntry?: FinancialEntry
}

export function createConsultationService({ store, clock, newId }: ServiceDeps) {
  async function get(id: Id): Promise<Consultation> {
    const consultation = await store.consultations.get(id)
    if (!consultation) throw new NotFoundError('Atendimento')
    return consultation
  }

  async function snapshotProcedures(lines: z.output<typeof performedSchema>[]): Promise<PerformedProcedure[]> {
    const performed: PerformedProcedure[] = []
    for (const line of lines) {
      const procedure = await store.procedures.get(line.procedureId)
      if (!procedure) throw new NotFoundError('Procedimento')
      // Sessão de pacote já foi paga na contratação.
      performed.push({
        procedureId: line.procedureId,
        name: procedure.name,
        price: line.patientPackageId ? 0 : line.price,
        notes: line.notes,
        patientPackageId: line.patientPackageId,
      })
    }
    return performed
  }

  return {
    get,

    /**
     * Registra o Atendimento e, na mesma transação: a Prescrição (se houver itens),
     * a Cobrança de Atendimento (se pedida e com valor) e conclui o Agendamento de origem.
     */
    async register(input: RegisterConsultationInput): Promise<RegisteredConsultation> {
      const data = parse(registerSchema, input)
      return store.transaction(async () => {
        const patient = await store.patients.get(data.patientId)
        if (!patient) throw new NotFoundError('Paciente')
        const appointment = data.appointmentId ? await store.appointments.get(data.appointmentId) : undefined
        if (data.appointmentId && !appointment) throw new NotFoundError('Agendamento')
        if (appointment && !isEditableAppointment(appointment)) {
          throw new DomainError('Este agendamento não está aberto para registrar atendimento.', 'not_editable')
        }

        const now = clock.now()
        const stamp = now.toISOString()
        const consultationId = newId()
        const today = toLocalISODate(now)
        const consultationDay = toLocalISODate(new Date(data.date))
        await assertPackageSessions(store, patient.id, data.procedures, consultationDay)
        const procedures = await snapshotProcedures(data.procedures)

        let issuedCoupon: IssuedCoupon | undefined
        let coupon: AppliedCoupon | undefined
        let discount: number | undefined
        if (data.couponCode) {
          const check = await checkCoupon(store, { code: data.couponCode, patientId: patient.id, procedures, today: consultationDay })
          issuedCoupon = check.coupon
          coupon = { issuedCouponId: check.coupon.id, code: check.coupon.code, discountPercent: check.coupon.discountPercent }
          discount = check.discount
        }
        const total = consultationTotal({ procedures, discount })

        let financialEntry: FinancialEntry | undefined
        if (data.charge && total > 0) {
          const paid = data.charge.status === 'paid'
          financialEntry = {
            id: newId(),
            type: 'income',
            description: `Atendimento · ${patient.name}${coupon ? ` · cupom ${coupon.code}` : ''}`,
            category: CONSULTATION_CHARGE_CATEGORY,
            amount: total,
            dueDate: data.charge.dueDate ?? consultationDay,
            status: data.charge.status,
            paidAt: paid ? today : undefined,
            method: data.charge.method,
            patientId: patient.id,
            consultationId,
            createdAt: stamp,
            updatedAt: stamp,
          }
        }

        const consultation: Consultation = {
          id: consultationId,
          patientId: patient.id,
          appointmentId: appointment?.id,
          date: new Date(data.date).toISOString(),
          sessionNumber: data.sessionNumber,
          chiefComplaint: data.chiefComplaint,
          examination: data.examination,
          previousEvolution: data.previousEvolution,
          evolution: data.evolution,
          equipment: data.equipment,
          activeIngredients: data.activeIngredients,
          intercurrences: data.intercurrences,
          recommendations: data.recommendations,
          procedures,
          coupon,
          discount,
          financialEntryId: financialEntry?.id,
          createdAt: stamp,
          updatedAt: stamp,
        }
        await store.consultations.save(consultation)
        if (issuedCoupon) {
          await store.issuedCoupons.save({ ...issuedCoupon, redeemedAt: stamp, consultationId, updatedAt: stamp })
        }

        let prescription: Prescription | undefined
        if (data.prescription && data.prescription.items.length > 0) {
          prescription = {
            id: newId(),
            patientId: patient.id,
            consultationId,
            date: consultationDay,
            items: data.prescription.items,
            notes: data.prescription.notes,
            createdAt: stamp,
            updatedAt: stamp,
          }
          await store.prescriptions.save(prescription)
        }

        if (financialEntry) await store.financialEntries.save(financialEntry)

        if (appointment) {
          await store.appointments.save({ ...appointment, status: 'completed', consultationId, updatedAt: stamp })
        }
        return { consultation, prescription, financialEntry }
      })
    },

    /** Atualiza o registro clínico; a cobrança acompanha o novo total enquanto estiver pendente. */
    async update(id: Id, input: UpdateConsultationInput): Promise<Consultation> {
      const data = parse(updateSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        const stamp = clock.now().toISOString()
        await assertPackageSessions(store, current.patientId, data.procedures, toLocalISODate(new Date(data.date)), id)
        const procedures = await snapshotProcedures(data.procedures)
        // O cupom já usado continua valendo; o desconto acompanha os procedimentos editados.
        const issued = current.coupon ? await store.issuedCoupons.get(current.coupon.issuedCouponId) : undefined
        const discount = current.coupon
          ? couponDiscount({ discountPercent: current.coupon.discountPercent, procedureIds: issued?.procedureIds ?? [] }, procedures).discount
          : undefined
        const updated: Consultation = {
          ...current,
          ...data,
          date: new Date(data.date).toISOString(),
          procedures,
          discount,
          updatedAt: stamp,
        }
        await store.consultations.save(updated)
        const entry = current.financialEntryId ? await store.financialEntries.get(current.financialEntryId) : undefined
        if (entry && entry.status === 'pending') {
          await store.financialEntries.save({ ...entry, amount: consultationTotal(updated), updatedAt: stamp })
        }
        return updated
      })
    },

    /** Sugestão de número da sessão: quantas vezes o procedimento já foi realizado na paciente, mais um. */
    async nextSessionNumber(patientId: Id, procedureId: Id): Promise<number> {
      const previous = (await store.consultations.where('patientId', patientId)).filter((c) =>
        c.procedures.some((p) => p.procedureId === procedureId),
      )
      return previous.length + 1
    },

    /**
     * Exclui o Atendimento: o Agendamento de origem volta a "Agendado", a cobrança pendente é removida
     * (a paga é mantida, pois o dinheiro entrou), sessões de pacote e cupom voltam a ficar disponíveis.
     * Prescrições, fichas e fotos permanecem no Prontuário.
     */
    async remove(id: Id): Promise<void> {
      await store.transaction(async () => {
        const current = await get(id)
        const stamp = clock.now().toISOString()
        if (current.appointmentId) {
          const appointment = await store.appointments.get(current.appointmentId)
          if (appointment) {
            await store.appointments.save({ ...appointment, status: 'scheduled', consultationId: undefined, updatedAt: stamp })
          }
        }
        for (const prescription of await store.prescriptions.where('consultationId', id)) {
          await store.prescriptions.save({ ...prescription, consultationId: undefined, updatedAt: stamp })
        }
        if (current.coupon) {
          const issued = await store.issuedCoupons.get(current.coupon.issuedCouponId)
          if (issued) await store.issuedCoupons.save({ ...issued, redeemedAt: undefined, consultationId: undefined, updatedAt: stamp })
        }
        for (const assessment of await store.assessments.where('consultationId', id)) {
          await store.assessments.save({ ...assessment, consultationId: undefined, updatedAt: stamp })
        }
        for (const photo of await store.photos.where('consultationId', id)) {
          await store.photos.save({ ...photo, consultationId: undefined, updatedAt: stamp })
        }
        const entry = current.financialEntryId ? await store.financialEntries.get(current.financialEntryId) : undefined
        if (entry?.status === 'pending' || entry?.status === 'cancelled') {
          await store.financialEntries.remove(entry.id)
        } else if (entry) {
          await store.financialEntries.save({ ...entry, consultationId: undefined, updatedAt: stamp })
        }
        await store.consultations.remove(id)
      })
    },
  }
}

export type ConsultationService = ReturnType<typeof createConsultationService>
