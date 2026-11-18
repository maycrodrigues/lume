import type { Answers, MultiAnswer, Question, Questionnaire } from './engine'
import { describeAnswer } from './engine'

export type Agreement = 'same' | 'partial' | 'different'

export interface AnswerComparison {
  section: string
  question: Question
  values: [string | undefined, string | undefined]
  agreement: Agreement
}

const multiValues = (answer: Answers[string] | undefined) => {
  const a = answer as MultiAnswer | undefined
  return [...(a?.values ?? []), ...(a?.other ? [a.other] : [])]
}

/** Mesmo modelo, só com as perguntas aceitas por `keep` (seções vazias somem). */
export function pickQuestions(questionnaire: Questionnaire, keep: (question: Question) => boolean): Questionnaire {
  return {
    ...questionnaire,
    sections: questionnaire.sections.map((s) => ({ ...s, questions: s.questions.filter(keep) })).filter((s) => s.questions.length),
  }
}

/**
 * Compara as respostas de duas pessoas ao mesmo modelo, pergunta a pergunta, ignorando o que
 * nenhuma das duas respondeu. Múltipla escolha com itens em comum conta como "em parte".
 */
export function compareAnswers(questionnaire: Questionnaire, a: Answers, b: Answers): AnswerComparison[] {
  return questionnaire.sections.flatMap((section) =>
    section.questions.flatMap((question): AnswerComparison[] => {
      const values: [string | undefined, string | undefined] = [describeAnswer(question, a[question.id], a), describeAnswer(question, b[question.id], b)]
      if (values[0] === undefined && values[1] === undefined) return []
      let agreement: Agreement = values[0] === values[1] ? 'same' : 'different'
      if (agreement === 'different' && question.type === 'multi') {
        const left = multiValues(a[question.id])
        if (multiValues(b[question.id]).some((v) => left.includes(v))) agreement = 'partial'
      }
      return [{ section: section.title, question, values, agreement }]
    }),
  )
}
