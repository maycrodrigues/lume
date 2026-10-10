import { z } from 'zod'
import type { Answers, Assessment, AssessmentTemplateId, Id, ISODate } from '@/domain'
import { ASSESSMENT_TEMPLATES, cleanAnswers, DomainError, isAssessmentTemplate, NotFoundError, numericMeasures } from '@/domain'
import type { DataStore } from '../ports'
import { isoDate, optionalId, parse } from '../validation'
import type { ServiceDeps } from './deps'

const answersSchema = z.record(z.string(), z.unknown()).default({})

const createSchema = z.object({
  patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
  template: z.string().refine(isAssessmentTemplate, 'Modelo de ficha inválido.'),
  date: isoDate,
  consultationId: optionalId,
  answers: answersSchema,
})

const updateSchema = z.object({ date: isoDate, consultationId: optionalId, answers: answersSchema })

export type AssessmentInput = z.input<typeof createSchema> & { template: AssessmentTemplateId }
export type AssessmentUpdateInput = z.input<typeof updateSchema>

export interface MeasureEvolution {
  dates: ISODate[]
  rows: Array<{ key: string; label: string; unit?: string; values: Array<number | undefined> }>
}

export async function assertConsultationOf(store: DataStore, patientId: Id, consultationId?: Id) {
  if (!consultationId) return
  const consultation = await store.consultations.get(consultationId)
  if (!consultation) throw new NotFoundError('Atendimento')
  if (consultation.patientId !== patientId) {
    throw new DomainError('O atendimento selecionado não pertence a esta paciente.', 'wrong_patient')
  }
}

export function createAssessmentService({ store, clock, newId }: ServiceDeps) {
  async function get(id: Id): Promise<Assessment> {
    const assessment = await store.assessments.get(id)
    if (!assessment) throw new NotFoundError('Ficha')
    return assessment
  }

  const listByPatient = async (patientId: Id) =>
    (await store.assessments.where('patientId', patientId)).sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )

  return {
    get,
    listByPatient,

    async create(input: AssessmentInput): Promise<Assessment> {
      const data = parse(createSchema, input)
      const template = data.template as AssessmentTemplateId
      return store.transaction(async () => {
        if (!(await store.patients.get(data.patientId))) throw new NotFoundError('Paciente')
        await assertConsultationOf(store, data.patientId, data.consultationId)
        const now = clock.now().toISOString()
        const assessment: Assessment = {
          id: newId(),
          patientId: data.patientId,
          template,
          date: data.date,
          consultationId: data.consultationId,
          answers: cleanAnswers(ASSESSMENT_TEMPLATES[template], data.answers as Answers),
          createdAt: now,
          updatedAt: now,
        }
        await store.assessments.save(assessment)
        return assessment
      })
    },

    async update(id: Id, input: AssessmentUpdateInput): Promise<Assessment> {
      const data = parse(updateSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        await assertConsultationOf(store, current.patientId, data.consultationId)
        const updated: Assessment = {
          ...current,
          date: data.date,
          consultationId: data.consultationId,
          answers: cleanAnswers(ASSESSMENT_TEMPLATES[current.template], data.answers as Answers, current.answers),
          updatedAt: clock.now().toISOString(),
        }
        await store.assessments.save(updated)
        return updated
      })
    },

    async remove(id: Id): Promise<void> {
      await store.assessments.remove(id)
    },

    /** Medidas numéricas de um modelo ao longo das fichas da paciente, da mais antiga à mais recente. */
    async measureEvolution(patientId: Id, template: AssessmentTemplateId): Promise<MeasureEvolution> {
      const assessments = (await listByPatient(patientId)).filter((a) => a.template === template).reverse()
      const rows = new Map<string, MeasureEvolution['rows'][number]>()
      assessments.forEach((assessment, index) => {
        for (const m of numericMeasures(ASSESSMENT_TEMPLATES[template], assessment.answers)) {
          const row = rows.get(m.key) ?? { key: m.key, label: m.label, unit: m.unit, values: Array(assessments.length).fill(undefined) }
          row.values[index] = m.value
          rows.set(m.key, row)
        }
      })
      return { dates: assessments.map((a) => a.date), rows: [...rows.values()] }
    },
  }
}

export type AssessmentService = ReturnType<typeof createAssessmentService>
