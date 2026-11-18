import type { AnswerComparison, Assessment, Id, Patient, Questionnaire } from '@/domain'
import { ANAMNESIS, ASSESSMENT_TEMPLATES, compareAnswers, DomainError, pickQuestions } from '@/domain'
import { toLocalISODate } from '../dates'
import type { AssessmentService } from './assessments'
import type { ServiceDeps } from './deps'
import type { PatientService } from './patients'

/** Marca no cadastro das pacientes de teste; a chave do caso evita criá-las de novo. */
export const CASE_STUDY_NOTE = 'Paciente de teste — estudo de caso'
const noteFor = (key: string) => `${CASE_STUDY_NOTE} (${key}).`

/** Perguntas da Anamnese que entram no estudo: hábitos de sol, cosméticos, procedimentos e condições que contraindicam. */
export const CASE_STUDY_ANAMNESIS = pickQuestions(ANAMNESIS, (q) =>
  [
    'complaint', 'complaintDuration', 'cosmetics', 'sunExposure', 'sunscreen', 'physicalActivity', 'waterIntake', 'medications',
    'contraceptive', 'iud', 'pregnancies', 'previousAesthetic', 'allergies', 'bloodPressure', 'circulatory', 'hormonal',
  ].includes(q.id),
)

/** Seção "Análise e plano de tratamento" fica fora da comparação: é a conclusão de cada caso. */
const findings = (questionnaire: Questionnaire): Questionnaire => ({ ...questionnaire, sections: questionnaire.sections.filter((s) => s.id !== 'plan') })

export interface CaseStudyCase {
  patient: Patient
  assessment: Assessment
}

export interface CaseStudyReport {
  title: string
  questionnaire: Questionnaire
  cases: [CaseStudyCase, CaseStudyCase]
  /** Achados da Ficha de avaliação, lado a lado. */
  comparison: AnswerComparison[]
  /** Hábitos e histórico da Anamnese, lado a lado. */
  anamnesisComparison: AnswerComparison[]
}

/** Parte comum do nome da disfunção ("Lipodistrofia localizada — gordura compacta…" → "Lipodistrofia localizada"). */
function studyTitle(cases: CaseStudyCase[], fallback: string) {
  const [a, b] = cases.map((c) => String(c.assessment.answers[`${c.assessment.template}_dysfunction`] ?? '').split(' — ')[0].trim())
  return a && a === b ? a : fallback
}

export function createCaseStudyService({ clock }: ServiceDeps, { patients, assessments }: { patients: PatientService; assessments: AssessmentService }) {
  return {
    /**
     * Cria (ou reaproveita) as pacientes de teste dos estudos de caso, com anamnese e Ficha de avaliação
     * preenchidas, e devolve os pares de fichas a comparar.
     */
    async createTestCases(): Promise<Array<[Id, Id]>> {
      const { CASE_STUDIES } = await import('../caseStudyData')
      const today = toLocalISODate(clock.now())
      const existing = await patients.list({ includeInactive: true })
      const pairs: Array<[Id, Id]> = []
      for (const study of CASE_STUDIES) {
        const ids: Id[] = []
        for (const definition of study.cases) {
          let patient = existing.find((p) => p.notes === noteFor(definition.key))
          if (!patient) {
            patient = await patients.create({ ...definition.patient, notes: noteFor(definition.key) })
            await patients.updateAnamnesis(patient.id, { ...definition.anamnesis, declarationDate: today })
          }
          const [latest] = (await assessments.listByPatient(patient.id)).filter((a) => a.template === study.template)
          const assessment = latest ?? (await assessments.create({ patientId: patient.id, template: study.template, date: today, answers: definition.assessment }))
          ids.push(assessment.id)
        }
        pairs.push([ids[0], ids[1]])
      }
      return pairs
    },

    /** Relatório comparativo de pares de Fichas de avaliação do mesmo modelo, de pacientes diferentes. */
    async report(pairs: Array<[Id, Id]>): Promise<CaseStudyReport[]> {
      return Promise.all(
        pairs.map(async (pair) => {
          const cases = (await Promise.all(
            pair.map(async (id) => {
              const assessment = await assessments.get(id)
              return { assessment, patient: await patients.get(assessment.patientId) }
            }),
          )) as [CaseStudyCase, CaseStudyCase]
          const [a, b] = cases
          if (a.assessment.template !== b.assessment.template) {
            throw new DomainError('Só é possível comparar fichas do mesmo modelo.', 'different_templates')
          }
          if (a.patient.id === b.patient.id) throw new DomainError('Escolha fichas de duas pacientes diferentes.', 'same_patient')
          const questionnaire = ASSESSMENT_TEMPLATES[a.assessment.template]
          return {
            title: studyTitle(cases, questionnaire.title),
            questionnaire,
            cases,
            comparison: compareAnswers(findings(questionnaire), a.assessment.answers, b.assessment.answers),
            anamnesisComparison: compareAnswers(CASE_STUDY_ANAMNESIS, a.patient.anamnesis, b.patient.anamnesis),
          }
        }),
      )
    },
  }
}

export type CaseStudyService = ReturnType<typeof createCaseStudyService>
