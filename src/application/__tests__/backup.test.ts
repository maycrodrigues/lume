import { describe, expect, it } from 'vitest'
import { setup } from './setup'

describe('Backup e dados de demonstração', () => {
  it('exporta e restaura um backup, preservando o registro de atividades', async () => {
    const { services } = setup()
    await services.patients.create({ name: 'Maria Souza' })
    const file = await services.backup.exportData()

    await services.backup.clearAll()
    expect(await services.patients.list()).toEqual([])

    await services.backup.importData(JSON.parse(JSON.stringify(file)))
    expect((await services.patients.list()).map((p) => p.name)).toEqual(['Maria Souza'])
    const system = await services.activity.query({ category: 'system' })
    expect(system.map((e) => e.action)).toEqual(['backup.import', 'data.clear', 'backup.export'])
  })

  it('recusa arquivo que não é backup do LUME', async () => {
    const { services } = setup()
    await expect(services.backup.importData({ foo: 1 })).rejects.toThrow('Arquivo de backup inválido')
  })
})
