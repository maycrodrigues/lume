import type { Answers, AssessmentTemplateId } from './questionnaire'
import type { Entity, Id, ISODate } from './shared'

/** Ficha de avaliação datada (facial, corporal, capilar, harmonização), preenchida a partir de um modelo. */
export interface Assessment extends Entity {
  patientId: Id
  template: AssessmentTemplateId
  date: ISODate
  consultationId?: Id
  answers: Answers
}
