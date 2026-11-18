import type { AnswerComparison, Assessment, AssessmentTemplateId, Id, Patient, Questionnaire } from '@/domain'
import { ANAMNESIS, ASSESSMENT_TEMPLATES, compareAnswers, DomainError, pickQuestions } from '@/domain'
import { toLocalISODate } from '../dates'
import type { AssessmentService } from './assessments'
import type { ServiceDeps } from './deps'
import type { PatientService } from './patients'

/** Marca no cadastro das pacientes de teste; a chave do caso evita criá-las de novo. */
export const CASE_STUDY_NOTE = 'Paciente de teste — estudo de caso'
export const caseStudyNote = (key: string) => `${CASE_STUDY_NOTE} (${key}).`
export const isCaseStudyPatient = (patient: Pick<Patient, 'notes'>) => Boolean(patient.notes?.startsWith(CASE_STUDY_NOTE))

const ANAMNESIS_BY_TEMPLATE: Partial<Record<AssessmentTemplateId, string[]>> = {
  facial: [
    'complaint', 'complaintDuration', 'cosmetics', 'sunExposure', 'sunscreen', 'physicalActivity', 'waterIntake', 'medications',
    'contraceptive', 'iud', 'pregnancies', 'previousAesthetic', 'allergies', 'bloodPressure', 'circulatory', 'hormonal',
  ],
  body: [
    'complaint', 'complaintDuration', 'diet', 'favoriteFoods', 'waterIntake', 'alcohol', 'smoking', 'physicalActivity', 'sleepHours', 'bowel',
    'medications', 'iud', 'pregnancies', 'previousAesthetic', 'plasticSurgery', 'prosthesis', 'pacemaker', 'bloodPressure', 'circulatory',
    'diabetes', 'hormonal', 'observations',
  ],
  hair: [
    'complaint', 'complaintDuration', 'cosmetics', 'diet', 'favoriteFoods', 'physicalActivity', 'sleepHours', 'sleepQuality', 'stress',
    'alcohol', 'smoking', 'medications', 'medicalTreatment', 'otherDiseases', 'previousAesthetic', 'hormonal', 'allergies', 'observations',
  ],
}

/**
 * Perguntas da Anamnese que entram no estudo, conforme a ficha: hábitos de sol e cosméticos na facial;
 * alimentação, atividade física e circulação na corporal; sono, estresse e dieta na capilar.
 */
export function caseStudyAnamnesis(template: AssessmentTemplateId): Questionnaire {
  const ids = ANAMNESIS_BY_TEMPLATE[template]
  return ids ? pickQuestions(ANAMNESIS, (q) => ids.includes(q.id)) : ANAMNESIS
}

/** Seção "Análise e plano de tratamento" fica fora da comparação: é a conclusão de cada caso. */
const findings = (questionnaire: Questionnaire): Questionnaire => ({ ...questionnaire, sections: questionnaire.sections.filter((s) => s.id !== 'plan') })

export interface CaseStudyCase {
  patient: Patient
  assessment: Assessment
}

export interface CaseStudyReport {
  title: string
  questionnaire: Questionnaire
  /** Recorte da Anamnese pertinente ao modelo da ficha. */
  anamnesis: Questionnaire
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
     * Cadastra as pacientes de teste dos estudos de caso que ainda não existem, com anamnese e Ficha de
     * avaliação preenchidas, sem tocar nas demais pacientes. Devolve os pares de fichas a comparar e
     * quantas pacientes foram criadas agora.
     */
    async createTestCases(): Promise<{ pairs: Array<[Id, Id]>; created: number }> {
      const { CASE_STUDIES } = await import('../caseStudyData')
      const today = toLocalISODate(clock.now())
      const existing = await patients.list({ includeInactive: true })
      const pairs: Array<[Id, Id]> = []
      let created = 0
      for (const study of CASE_STUDIES) {
        const ids: Id[] = []
        for (const definition of study.cases) {
          let patient = existing.find((p) => p.notes === caseStudyNote(definition.key))
          if (!patient) {
            patient = await patients.create({ ...definition.patient, notes: caseStudyNote(definition.key) })
            await patients.updateAnamnesis(patient.id, { ...definition.anamnesis, declarationDate: today })
            created++
          }
          const [latest] = (await assessments.listByPatient(patient.id)).filter((a) => a.template === study.template)
          const assessment = latest ?? (await assessments.create({ patientId: patient.id, template: study.template, date: today, answers: definition.assessment }))
          ids.push(assessment.id)
        }
        pairs.push([ids[0], ids[1]])
      }
      return { pairs, created }
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
          const anamnesis = caseStudyAnamnesis(a.assessment.template)
          return {
            title: studyTitle(cases, questionnaire.title),
            questionnaire,
            anamnesis,
            cases,
            comparison: compareAnswers(findings(questionnaire), a.assessment.answers, b.assessment.answers),
            anamnesisComparison: compareAnswers(anamnesis, a.patient.anamnesis, b.patient.anamnesis),
          }
        }),
      )
    },
  }
}

export type CaseStudyService = ReturnType<typeof createCaseStudyService>
