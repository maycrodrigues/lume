import { describe, expect, it } from 'vitest'
import { fieldLabel, formatChangeValue } from './formatChange'

describe('Registro de atividades — campos de questionário', () => {
  it('identifica de qual ficha veio a pergunta alterada', () => {
    expect(fieldLabel('anamnesis.complaint')).toBe('Anamnese · Queixa principal')
    expect(fieldLabel('nutrition.nutrition_goals')).toBe('Nutricional · Objetivos do acompanhamento nutricional')
    expect(fieldLabel('answers.body_weight')).toBe('Ficha · Peso')
    expect(fieldLabel('nutritionUpdatedAt')).toBe('Anamnese nutricional atualizada em')
  })

  it('descreve respostas da Nutricional em linguagem natural', () => {
    expect(formatChangeValue('nutrition.nutrition_foodAllergy', { yes: true, detail: 'Camarão' })).toBe('Sim — Camarão')
    expect(formatChangeValue('nutrition.nutrition_selfCare', 1.5)).toBe('1,5 h/dia')
    expect(formatChangeValue('anamnesis.waterIntake', '2 litros')).toBe('2 litros')
  })
})
