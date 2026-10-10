import type { Answers } from '@/domain'

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const yesWith = (detail?: string) => (detail ? { yes: true, detail } : undefined)

/**
 * Anamnese do formato v1 (campos fixos) → respostas do modelo `ANAMNESIS`.
 * O que não tem pergunta equivalente vai para "Observações", para nada se perder.
 */
export function migrateLegacyAnamnesis(legacy: Record<string, unknown> | undefined): Answers {
  const old = legacy ?? {}
  const answers: Answers = {}
  const set = (key: string, value: Answers[string] | undefined) => {
    if (value !== undefined) answers[key] = value
  }

  set('goals', text(old.goals))
  set('allergies', yesWith(text(old.allergies)))
  set('previousAesthetic', yesWith(text(old.previousProcedures)))
  set('otherDiseases', yesWith(text(old.healthConditions)))
  const medications = text(old.medications)
  if (medications) answers.medications = [{ name: medications }]
  if (typeof old.smoker === 'boolean') answers.smoking = { yes: old.smoker }

  const contraindications = [text(old.contraindications), old.pregnantOrLactating === true ? 'Gestante ou lactante (registro anterior)' : undefined]
  set('contraindications', contraindications.filter(Boolean).join('\n') || undefined)

  const notes = [
    text(old.observations),
    text(old.skinPhototype) && `Fototipo: ${text(old.skinPhototype)}`,
    text(old.skinType) && `Tipo de pele: ${text(old.skinType)}`,
    text(old.lifestyle) && `Atividade física e hidratação: ${text(old.lifestyle)}`,
    text(old.sleepAndStress) && `Sono e estresse: ${text(old.sleepAndStress)}`,
    text(old.diet) && `Alimentação: ${text(old.diet)}`,
  ].filter(Boolean)
  set('observations', notes.join('\n') || undefined)
  return answers
}
