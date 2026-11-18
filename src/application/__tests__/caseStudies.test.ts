import { describe, expect, it } from 'vitest'
import { CASE_STUDIES, CASE_STUDY_NOTE } from '../caseStudyData'
import { setup } from './setup'

describe('Estudo de caso', () => {
  it('cria duas pacientes de teste por disfunção, com anamnese e ficha completas', async () => {
    const { services } = setup('2026-11-18T10:00')
    const pairs = await services.caseStudies.createTestCases()

    expect(pairs).toHaveLength(CASE_STUDIES.length)
    const patients = await services.patients.list()
    expect(patients.filter((p) => p.notes?.startsWith(CASE_STUDY_NOTE))).toHaveLength(6)

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

  it('reaproveita as pacientes de teste em vez de duplicá-las', async () => {
    const { services } = setup('2026-11-18T10:00')
    const first = await services.caseStudies.createTestCases()
    const second = await services.caseStudies.createTestCases()
    expect(second).toEqual(first)
    expect(await services.patients.list()).toHaveLength(6)
  })

  it('compara os achados das duas pacientes e aponta semelhanças e diferenças', async () => {
    const { services } = setup('2026-11-18T10:00')
    const [melasma, lipo, hair] = await services.caseStudies.report(await services.caseStudies.createTestCases())

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
  })

  it('recusa comparar fichas de modelos diferentes ou da mesma paciente', async () => {
    const { services } = setup('2026-11-18T10:00')
    const [[facialA, facialB], [bodyA]] = await services.caseStudies.createTestCases()
    await expect(services.caseStudies.report([[facialA, bodyA]])).rejects.toThrow('mesmo modelo')
    const facialA2 = await services.assessments.create({ patientId: (await services.assessments.get(facialA)).patientId, template: 'facial', date: '2026-11-18', answers: {} })
    await expect(services.caseStudies.report([[facialA, facialA2.id]])).rejects.toThrow('duas pacientes')
    await expect(services.caseStudies.report([[facialA, facialB]])).resolves.toHaveLength(1)
  })
})
