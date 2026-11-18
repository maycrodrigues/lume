import { describe, expect, it } from 'vitest'
import { CASE_STUDIES } from '../caseStudyData'
import { isCaseStudyPatient } from '../services/caseStudies'
import { setup } from './setup'

describe('Estudo de caso', () => {
  it('cria duas pacientes de teste por disfunção, com anamnese e ficha completas', async () => {
    const { services } = setup('2026-11-18T10:00')
    const { pairs, created } = await services.caseStudies.createTestCases()
    expect(created).toBe(6)

    expect(pairs).toHaveLength(CASE_STUDIES.length)
    const patients = await services.patients.list()
    expect(patients.filter(isCaseStudyPatient)).toHaveLength(6)

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

    expect(created).toBe(6)
    const after = await services.patients.list({ includeInactive: true })
    expect(after.filter(isCaseStudyPatient)).toHaveLength(6)
    expect(after.filter((p) => !isCaseStudyPatient(p))).toEqual(existing)
  })

  it('lista só as pacientes de estudo de caso quando filtrado', async () => {
    const { services } = setup('2026-11-18T10:00')
    await services.patients.create({ name: 'Paciente Comum' })
    await services.caseStudies.createTestCases()
    expect(await services.patients.list()).toHaveLength(7)
    const onlyCases = await services.patients.list({ caseStudiesOnly: true })
    expect(onlyCases.map((p) => p.name)).not.toContain('Paciente Comum')
    expect(onlyCases).toHaveLength(6)
    expect(await services.patients.list({ caseStudiesOnly: true, search: 'lucas' })).toHaveLength(1)
  })

  it('reaproveita as pacientes de teste em vez de duplicá-las', async () => {
    const { services } = setup('2026-11-18T10:00')
    const first = await services.caseStudies.createTestCases()
    const second = await services.caseStudies.createTestCases()
    expect(second).toEqual({ pairs: first.pairs, created: 0 })
    expect(await services.patients.list()).toHaveLength(6)
  })

  it('compara os achados das duas pacientes e aponta semelhanças e diferenças', async () => {
    const { services } = setup('2026-11-18T10:00')
    const [melasma, lipo, hair] = await services.caseStudies.report((await services.caseStudies.createTestCases()).pairs)

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
    const {
      pairs: [[facialA, facialB], [bodyA]],
    } = await services.caseStudies.createTestCases()
    await expect(services.caseStudies.report([[facialA, bodyA]])).rejects.toThrow('mesmo modelo')
    const facialA2 = await services.assessments.create({ patientId: (await services.assessments.get(facialA)).patientId, template: 'facial', date: '2026-11-18', answers: {} })
    await expect(services.caseStudies.report([[facialA, facialA2.id]])).rejects.toThrow('duas pacientes')
    await expect(services.caseStudies.report([[facialA, facialB]])).resolves.toHaveLength(1)
  })
})
