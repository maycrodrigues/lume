import { describe, expect, it } from 'vitest'
import { ANAMNESIS, questionnaireAlerts } from '@/domain'
import { setup } from './setup'

describe('Anamnese', () => {
  it('guarda só respostas preenchidas e válidas, normalizando números e descartando detalhe de "Não"', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    const updated = await services.patients.updateAnamnesis(p.id, {
      complaint: '  Manchas no rosto  ',
      waterIntake: '6',
      sleepHours: '7,5',
      diet: 'Regular',
      bowel: 'opção inexistente',
      smoking: { yes: false, detail: 'ignorar' },
      allergies: { yes: true, detail: 'Dipirona' },
      medications: [{ name: 'Levotiroxina', dose: '50mcg em jejum' }, { name: '', dose: '' }],
      cosmetics: undefined,
      perguntaInexistente: 'x',
    })
    expect(updated.anamnesis).toEqual({
      complaint: 'Manchas no rosto',
      waterIntake: 6,
      sleepHours: 7.5,
      diet: 'Regular',
      smoking: { yes: false },
      allergies: { yes: true, detail: 'Dipirona' },
      medications: [{ name: 'Levotiroxina', dose: '50mcg em jejum' }],
    })
    expect(updated.anamnesisUpdatedAt).toBeDefined()
  })

  it('preserva respostas de perguntas que saíram do modelo', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.backup.importData({
      format: 'lume-backup',
      version: 2,
      exportedAt: '2026-10-10T10:00:00.000Z',
      data: { patients: [{ ...p, anamnesis: { perguntaAntiga: 'resposta histórica' } }] },
    })
    const updated = await services.patients.updateAnamnesis(p.id, { complaint: 'Flacidez' })
    expect(updated.anamnesis).toEqual({ perguntaAntiga: 'resposta histórica', complaint: 'Flacidez' })
  })

  it('perguntas marcadas como alerta viram "Atenção clínica"', () => {
    const alerts = questionnaireAlerts(ANAMNESIS, {
      allergies: { yes: true, detail: 'Dipirona' },
      pacemaker: { yes: true },
      diabetes: { yes: false },
      medications: [{ name: 'Levotiroxina' }, { name: 'Losartana' }],
      complaint: 'não é alerta',
    })
    expect(alerts).toEqual(['Medicamentos em uso: Levotiroxina, Losartana', 'Antecedentes alérgicos: Dipirona', 'Portador de marcapasso'])
  })

  it('registra a autorização de uso de imagem', async () => {
    const { services } = setup()
    const p = await services.patients.create({ name: 'Ana Lima' })
    await services.patients.setImageConsent(p.id, { scope: 'clinical', date: '2026-10-10' })
    expect((await services.patients.get(p.id)).imageConsent).toEqual({ scope: 'clinical', date: '2026-10-10' })
    await services.patients.setImageConsent(p.id, undefined)
    expect((await services.patients.get(p.id)).imageConsent).toBeUndefined()
  })
})
