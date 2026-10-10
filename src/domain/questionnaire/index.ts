import { ANAMNESIS } from './anamnesis'
import { BODY_ASSESSMENT, BODY_HARMONIZATION, FACIAL_ASSESSMENT, FACIAL_HARMONIZATION, HAIR_ASSESSMENT } from './assessments'
import type { Question, Questionnaire } from './engine'
import { allQuestions } from './engine'

export * from './engine'
export { ANAMNESIS }

/** Modelos de Ficha de avaliação, na ordem em que aparecem para a Profissional. */
export const ASSESSMENT_TEMPLATES = {
  facial: FACIAL_ASSESSMENT,
  body: BODY_ASSESSMENT,
  hair: HAIR_ASSESSMENT,
  facial_harmonization: FACIAL_HARMONIZATION,
  body_harmonization: BODY_HARMONIZATION,
} as const satisfies Record<string, Questionnaire>

export type AssessmentTemplateId = keyof typeof ASSESSMENT_TEMPLATES

export const isAssessmentTemplate = (id: string): id is AssessmentTemplateId => id in ASSESSMENT_TEMPLATES

const QUESTION_INDEX = new Map<string, Question>(
  [ANAMNESIS, ...Object.values(ASSESSMENT_TEMPLATES)].flatMap((q) => allQuestions(q).map((question) => [question.id, question] as const)),
)

/** Pergunta de qualquer modelo pelo id (ids são únicos entre modelos). */
export const findQuestion = (id: string): Question | undefined => QUESTION_INDEX.get(id)
