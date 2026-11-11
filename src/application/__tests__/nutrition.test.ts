import { describe, expect, it } from 'vitest'
import { allQuestions, ANAMNESIS, ASSESSMENT_TEMPLATES, findQuestion, NotFoundError, NUTRITION, questionnaireAlerts } from '@/domain'
import { setup } from './setup'

describe('Anamnese nutricional — modelo', () => {
  it('tem ids únicos e que não colidem com a Anamnese nem com as Fichas', () => {
    const ids = allQuestions(NUTRITION).map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    const others = new Set([ANAMNESIS, ...Object.values(ASSESSMENT_TEMPLATES)].flatMap((q) => allQuestions(q).map((x) => x.id)))
    expect(ids.filter((id) => others.has(id))).toEqual([])
    expect(ids.every((id) => id.startsWith('nutrition_'))).toBe(true)
  })

  it('perguntas da Nutricional são encontradas pelo id (registro de atividades)', () => {
    expect(findQuestion('nutrition_goals')?.label).toBe('Objetivos do acompanhamento nutricional')
    expect(findQuestion('nutrition_foodFrequency')?.type).toBe('grid')
  })

  it('não repete o que já é perguntado na Anamnese', () => {
    const labels = (q: typeof NUTRITION) => allQuestions(q).map((x) => x.label.toLowerCase())
    const nutrition = labels(NUTRITION)
    for (const topic of ['medicamentos', 'ingestão de água', 'horas de sono', 'tabagismo', 'bebida alcoólica', 'atividade física', 'funcionamento intestinal', 'alimentos de preferência']) {
      expect(labels(ANAMNESIS).some((l) => l.includes(topic))).toBe(true)
      expect(nutrition.some((l) => l.includes(topic))).toBe(false)
    }
    const frequency = allQuestions(NUTRITION).find((q) => q.id === 'nutrition_foodFrequency')
    expect(frequency?.type === 'grid' && frequency.rows).not.toContain('Bebidas alcoólicas')
  })

  it('o ciclo menstrual só aparece para pacientes do gênero feminino', () => {
    const menstrual = NUTRITION.sections.find((s) => s.questions.some((q) => q.id === 'nutrition_symptomsMenstrual'))
    expect(menstrual?.audience).toBe('female')
  })

  it('alergia, intolerância e doença celíaca viram "Atenção clínica"', () => {
    const alerts = questionnaireAlerts(NUTRITION, {
      nutrition_foodAllergy: { yes: true, detail: 'Camarão' },
      nutrition_foodIntolerance: { yes: true, detail: 'Lactose' },
      nutrition_celiac: { yes: false },
      nutrition_goals: 'não é alerta',
    })
    expect(alerts).toEqual(['Alergia alimentar: Camarão', 'Intolerância alimentar: Lactose'])
  })
})

describe('Anamnese nutricional — gravação', () => {
  it('paciente nova começa sem a ficha preenchida', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    expect(p.nutrition).toBeUndefined()
    expect(p.nutritionUpdatedAt).toBeUndefined()
  })

  it('é gravada à parte da Anamnese e guarda só respostas válidas para o modelo', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.patients.updateAnamnesis(p.id, { complaint: 'Flacidez', waterIntake: '2 litros' })
    const updated = await services.patients.updateNutrition(p.id, {
      nutrition_goals: '  Emagrecer com saúde  ',
      nutrition_commitment: '8',
      nutrition_qualityOfLife: '9',
      nutrition_selfCare: '1,5',
      nutrition_medicalReferral: { yes: false, detail: 'ignorar' },
      nutrition_foodAllergy: { yes: true, detail: 'Camarão' },
      nutrition_supplements: [{ name: 'Vitamina D', reason: 'Deficiência', prescriber: 'Dra. Paula' }, { name: '' }],
      nutrition_symptomsGastro: { Azia: { score: '3' }, Diarreia: { score: '7' }, 'Linha inexistente': { score: '2' } },
      nutrition_recall: { Almoço: { time: '12:30', place: 'Casa', foods: 'Arroz, feijão, frango' } },
      nutrition_foodFrequency: { Café: { frequency: 'Diário', notes: '3 xícaras' }, Pães: { frequency: 'Às vezes' } },
      nutrition_bristol: 'Tipo 4 — salsicha lisa e macia',
      nutrition_urineColor: 'Cor 9',
      complaint: 'pergunta da outra ficha',
    })
    expect(updated.anamnesis).toEqual({ complaint: 'Flacidez', waterIntake: '2 litros' })
    expect(updated.nutrition).toEqual({
      nutrition_goals: 'Emagrecer com saúde',
      nutrition_commitment: '8',
      nutrition_selfCare: 1.5,
      nutrition_medicalReferral: { yes: false },
      nutrition_foodAllergy: { yes: true, detail: 'Camarão' },
      nutrition_supplements: [{ name: 'Vitamina D', reason: 'Deficiência', prescriber: 'Dra. Paula' }],
      nutrition_symptomsGastro: { Azia: { score: '3' } },
      nutrition_recall: { Almoço: { time: '12:30', place: 'Casa', foods: 'Arroz, feijão, frango' } },
      nutrition_foodFrequency: { Café: { frequency: 'Diário', notes: '3 xícaras' } },
      nutrition_bristol: 'Tipo 4 — salsicha lisa e macia',
    })
    expect(updated.nutritionUpdatedAt).toBeDefined()
    expect(updated.anamnesisUpdatedAt).toBeDefined()
    expect((await services.patients.get(p.id)).nutrition).toEqual(updated.nutrition)
  })

  it('salvar de novo substitui as respostas e permite apagar uma resposta', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.patients.updateNutrition(p.id, { nutrition_goals: 'Emagrecer', nutrition_fats: 'Azeite' })
    const updated = await services.patients.updateNutrition(p.id, { nutrition_goals: 'Ganhar massa' })
    expect(updated.nutrition).toEqual({ nutrition_goals: 'Ganhar massa' })
  })

  it('preserva respostas de perguntas que saíram do modelo', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.backup.importData({
      format: 'lume-backup',
      version: 2,
      exportedAt: '2026-10-10T10:00:00.000Z',
      data: { patients: [{ ...p, nutrition: { perguntaAntiga: 'resposta histórica' } }] },
    })
    const updated = await services.patients.updateNutrition(p.id, { nutrition_goals: 'Emagrecer' })
    expect(updated.nutrition).toEqual({ perguntaAntiga: 'resposta histórica', nutrition_goals: 'Emagrecer' })
  })

  it('não altera os dados de cadastro da paciente', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima', phone: '11999990000', gender: 'female' })
    const updated = await services.patients.updateNutrition(p.id, { nutrition_goals: 'Emagrecer' })
    expect(updated).toMatchObject({ name: 'Ana Lima', phone: '11999990000', gender: 'female', anamnesis: {} })
  })

  it('recusa paciente inexistente', async () => {
    const { services } = setup()
    await expect(services.patients.updateNutrition('nao-existe', { nutrition_goals: 'Emagrecer' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('fica no Registro de atividades com o campo e os valores antes/depois', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.patients.updateNutrition(p.id, { nutrition_goals: 'Emagrecer' })
    await services.patients.updateNutrition(p.id, { nutrition_goals: 'Ganhar massa' })
    const [last] = await services.activity.query({ entityId: p.id })
    expect(last.action).toBe('update')
    expect(last.changes).toContainEqual({ field: 'nutrition.nutrition_goals', from: 'Emagrecer', to: 'Ganhar massa' })
  })

  it('entra no backup e é restaurada', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.patients.updateNutrition(p.id, { nutrition_goals: 'Emagrecer' })
    const backup = await services.backup.exportData()

    const other = setup()
    await other.services.backup.importData(backup)
    expect((await other.services.patients.get(p.id)).nutrition).toEqual({ nutrition_goals: 'Emagrecer' })
  })
})
