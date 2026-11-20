import { describe, expect, it } from 'vitest'
import type { Answers, Gender, Questionnaire } from '@/domain'
import { ageAt, ANAMNESIS, NUTRITION } from '@/domain'
import { CASE_STUDIES } from '../caseStudyData'
import { CASE_STUDY_TYPES, caseStudyType, isCaseStudyPatient } from '../services/caseStudies'
import { setup } from './setup'

const TOTAL = CASE_STUDIES.length * 2

/** Perguntas sem resposta, considerando só as seções que valem para o gênero da paciente. */
const unanswered = (questionnaire: Questionnaire, answers: Answers | undefined, gender: Gender) =>
  questionnaire.sections
    .filter((s) => s.audience !== 'female' || gender === 'female')
    .flatMap((s) => s.questions)
    .filter((q) => q.type !== 'computed' && answers?.[q.id] === undefined)
    .map((q) => q.id)

describe('Estudo de caso', () => {
  it('cria duas pacientes de teste por disfunção, com anamnese e ficha completas', async () => {
    const { services } = setup('2026-11-18T10:00')
    const { pairs, created } = await services.caseStudies.createTestCases()
    expect(created).toBe(TOTAL)

    expect(pairs).toHaveLength(CASE_STUDIES.length)
    const patients = await services.patients.list()
    expect(patients.filter(isCaseStudyPatient)).toHaveLength(TOTAL)

    for (const [study, pair] of CASE_STUDIES.map((s, i) => [s, pairs[i]] as const)) {
      for (const [definition, id] of study.cases.map((c, i) => [c, pair[i]] as const)) {
        const assessment = await services.assessments.get(id)
        const patient = await services.patients.get(assessment.patientId)
        expect(assessment.template).toBe(study.template)
        expect(assessment.date).toBe('2026-11-18')
        // Nenhuma resposta do caso é descartada pela validação do modelo.
        expect(assessment.answers).toEqual(definition.assessment)
        expect(patient.anamnesis).toEqual({ ...definition.anamnesis, declarationDate: '2026-11-18' })
      }
    }
  })

  it('cria os casos por cima do banco existente, sem apagar nem alterar as outras pacientes', async () => {
    const { services } = setup('2026-11-18T10:00')
    await services.backup.loadDemoData()
    const existing = (await services.patients.list({ includeInactive: true })).filter((p) => !isCaseStudyPatient(p))
    // A demonstração já traz os casos: apagá-los simula um banco que ainda não tem nenhum.
    for (const p of (await services.patients.list({ includeInactive: true })).filter(isCaseStudyPatient)) {
      for (const a of await services.assessments.listByPatient(p.id)) await services.assessments.remove(a.id)
      await services.patients.remove(p.id)
    }

    const { created } = await services.caseStudies.createTestCases()

    expect(created).toBe(TOTAL)
    const after = await services.patients.list({ includeInactive: true })
    expect(after.filter(isCaseStudyPatient)).toHaveLength(TOTAL)
    expect(after.filter((p) => !isCaseStudyPatient(p))).toEqual(existing)
  })

  it('lista só as pacientes de estudo de caso quando filtrado', async () => {
    const { services } = setup('2026-11-18T10:00')
    await services.patients.create({ name: 'Paciente Comum' })
    await services.caseStudies.createTestCases()
    expect(await services.patients.list()).toHaveLength(TOTAL + 1)
    const onlyCases = await services.patients.list({ caseStudy: 'all' })
    expect(onlyCases.map((p) => p.name)).not.toContain('Paciente Comum')
    expect(onlyCases).toHaveLength(TOTAL)
    expect(await services.patients.list({ caseStudy: 'all', search: 'lucas' })).toHaveLength(1)
    const acne = await services.patients.list({ caseStudy: 'acne' })
    expect(acne.map((p) => p.name).sort()).toEqual(['Beatriz Nogueira Prado', 'Juliana Martins Teixeira'])
    expect(await services.patients.list({ caseStudy: 'flacidez-facial', search: 'roberto' })).toHaveLength(1)
  })

  it('cada estudo tem seu tipo, que vira a tag da paciente', async () => {
    expect(CASE_STUDIES.map((s) => s.id).sort()).toEqual(CASE_STUDY_TYPES.map((t) => t.id).sort())
    const { services } = setup('2026-11-18T10:00')
    await services.caseStudies.createTestCases()
    for (const study of CASE_STUDIES) {
      for (const definition of study.cases) {
        const [patient] = await services.patients.list({ search: definition.patient.name })
        expect(caseStudyType(patient)).toBe(study.id)
      }
    }
    expect(caseStudyType({ notes: 'Paciente comum' })).toBeUndefined()
  })

  it('cria só os casos do tipo escolhido', async () => {
    const { services } = setup('2026-11-18T10:00')
    const { pairs, created } = await services.caseStudies.createTestCases('acne')
    expect(created).toBe(2)
    expect(pairs).toHaveLength(1)
    const patients = await services.patients.list()
    expect(patients.map(caseStudyType)).toEqual(['acne', 'acne'])

    const flaccidity = await services.caseStudies.createTestCases('flacidez-facial')
    expect(flaccidity.created).toBe(2)
    expect(await services.patients.list()).toHaveLength(4)
  })

  it('os casos de acne e de flacidez seguem o perfil pedido para o estudo', async () => {
    const { services } = setup('2026-11-18T10:00')
    const ages = async (type: 'acne' | 'flacidez-facial') =>
      (await services.patients.list({ caseStudy: type })).map((p) => ({ gender: p.gender, age: ageAt(p.birthDate, new Date('2026-11-18T10:00')) ?? 0 }))
    await services.caseStudies.createTestCases()
    for (const { gender, age } of await ages('acne')) {
      expect(gender).toBe('female')
      expect(age).toBeGreaterThanOrEqual(18)
    }
    for (const { age } of await ages('flacidez-facial')) expect(age).toBeGreaterThan(35)
    const flaccidity = CASE_STUDIES.find((s) => s.id === 'flacidez-facial')!
    expect(flaccidity.cases.every((c) => /emagre|perdeu/i.test(String(c.anamnesis.observations)))).toBe(true)
  })

  it('as fichas de Anamnese e Nutricional das pacientes de teste ficam completas', async () => {
    const { services } = setup('2026-11-18T10:00')
    await services.caseStudies.createTestCases()
    const patients = (await services.patients.list()).filter(isCaseStudyPatient)
    expect(patients).toHaveLength(TOTAL)
    for (const patient of patients) {
      const definition = CASE_STUDIES.flatMap((s) => s.cases).find((c) => c.patient.name === patient.name)!
      expect(unanswered(ANAMNESIS, patient.anamnesis, patient.gender)).toEqual([])
      expect(unanswered(NUTRITION, patient.nutrition, patient.gender)).toEqual([])
      expect(patient.nutrition).toEqual(definition.nutrition)
    }
  })

  it('completa as fichas de pacientes de teste já criadas sem perder o que foi editado', async () => {
    const { services } = setup('2026-11-18T10:00')
    await services.caseStudies.createTestCases()
    const [camila] = (await services.patients.list({ search: 'Camila Duarte' }))
    await services.patients.updateNutrition(camila.id, {})
    await services.patients.updateAnamnesis(camila.id, { complaint: 'Queixa editada pela profissional' })

    const { created, completed } = await services.caseStudies.createTestCases()

    expect({ created, completed }).toEqual({ created: 0, completed: 1 })
    const after = await services.patients.get(camila.id)
    expect(after.anamnesis.complaint).toBe('Queixa editada pela profissional')
    expect(unanswered(ANAMNESIS, after.anamnesis, after.gender)).toEqual([])
    expect(unanswered(NUTRITION, after.nutrition, after.gender)).toEqual([])
  })

  it('reaproveita as pacientes de teste em vez de duplicá-las', async () => {
    const { services } = setup('2026-11-18T10:00')
    const first = await services.caseStudies.createTestCases()
    const second = await services.caseStudies.createTestCases()
    expect(second).toEqual({ pairs: first.pairs, created: 0, completed: 0 })
    expect(await services.patients.list()).toHaveLength(TOTAL)
  })

  it('compara os achados das duas pacientes e aponta semelhanças e diferenças', async () => {
    const { services } = setup('2026-11-18T10:00')
    const [melasma, lipo, hair, acne, flaccidity] = await services.caseStudies.report((await services.caseStudies.createTestCases()).pairs)

    expect(melasma.title).toBe('Hiperpigmentação facial')
    const row = (label: string) => melasma.comparison.find((c) => c.question.label === label)
    expect(row('Manchas pigmentares (melanina)')?.agreement).toBe('same')
    expect(row('Fototipo cutâneo (Fitzpatrick)')).toMatchObject({ values: ['IV', 'III'], agreement: 'different' })
    expect(row('Localização')?.agreement).toBe('partial')
    expect(melasma.comparison.some((c) => c.question.id === 'facial_protocol')).toBe(false)
    expect(melasma.anamnesisComparison.find((c) => c.question.id === 'sunExposure')?.agreement).toBe('different')

    expect(lipo.title).toBe('Lipodistrofia localizada')
    expect(lipo.comparison.find((c) => c.question.id === 'body_fatDistribution')?.agreement).toBe('same')
    expect(lipo.comparison.find((c) => c.question.id === 'body_fat')).toMatchObject({ values: ['Compacta', 'Flácida'] })
    expect(lipo.comparison.some((c) => c.question.id === 'body_palpation')).toBe(true)
    expect(lipo.anamnesis.sections.flatMap((s) => s.questions).some((q) => q.id === 'diet')).toBe(true)

    expect(hair.title).toBe('Queda capilar masculina')
    expect(hair.cases.every((c) => c.patient.gender === 'male')).toBe(true)
    expect(hair.comparison.find((c) => c.question.id === 'hair_pattern')).toMatchObject({ values: ['Norwood III vértex', 'Norwood I'], agreement: 'different' })

    expect(acne.title).toBe('Acne vulgar')
    expect(acne.comparison.find((c) => c.question.id === 'facial_acne')).toMatchObject({ values: ['Grau II', 'Grau I'], agreement: 'different' })
    expect(acne.comparison.find((c) => c.question.id === 'facial_fitzpatrick')?.agreement).toBe('same')
    expect(acne.comparison.find((c) => c.question.id === 'facial_scar')?.agreement).toBe('partial')

    expect(flaccidity.title).toBe('Flacidez facial pós-emagrecimento')
    expect(flaccidity.comparison.find((c) => c.question.id === 'facial_glogau')).toMatchObject({ values: ['III', 'IV'], agreement: 'different' })
    expect(flaccidity.comparison.some((c) => c.question.id === 'facial_flaccidity')).toBe(true)
  })

  it('recusa comparar fichas de modelos diferentes ou da mesma paciente', async () => {
    const { services } = setup('2026-11-18T10:00')
    const {
      pairs: [[facialA, facialB], [bodyA]],
    } = await services.caseStudies.createTestCases()
    await expect(services.caseStudies.report([[facialA, bodyA]])).rejects.toThrow('mesmo modelo')
    const facialA2 = await services.assessments.create({ patientId: (await services.assessments.get(facialA)).patientId, template: 'facial', date: '2026-11-18', answers: {} })
    await expect(services.caseStudies.report([[facialA, facialA2.id]])).rejects.toThrow('duas pacientes')
    await expect(services.caseStudies.report([[facialA, facialB]])).resolves.toHaveLength(1)
  })
})
