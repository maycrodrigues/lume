import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import type { Collection, DataStore } from '@/application/ports'
import type { Patient } from '@/domain'
import { createDexieStore, SCHEMA_V1 } from './dexie/dexieStore'
import { createMemoryStore } from './memory/memoryStore'

let dbCounter = 0
const adapters: Array<[string, () => DataStore]> = [
  ['memória', () => createMemoryStore()],
  ['IndexedDB', () => createDexieStore(`lume-test-${++dbCounter}`)],
]

const patient = (id: string, name: string): Patient => ({
  id,
  name,
  gender: 'female',
  active: true,
  anamnesis: {},
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
})

describe.each(adapters)('DataStore (%s)', (_name, create) => {
  it('salva, lê, filtra e remove entidades', async () => {
    const store = create()
    await store.patients.save(patient('a', 'Ana'))
    await store.patients.save(patient('b', 'Bia'))
    await store.patients.save({ ...patient('b', 'Beatriz'), active: false })

    expect(await store.patients.get('b')).toMatchObject({ name: 'Beatriz', active: false })
    expect((await store.patients.list()).map((p) => p.id).sort()).toEqual(['a', 'b'])
    expect((await store.patients.where('name', 'Ana')).map((p) => p.id)).toEqual(['a'])

    await store.patients.remove('a')
    await store.patients.remove('nao-existe')
    expect(await store.patients.get('a')).toBeUndefined()
    expect(await store.patients.count()).toBe(1)
  })

  it('guarda e devolve conteúdo binário intacto', async () => {
    const store = create()
    const bytes = new Uint8Array([255, 216, 255, 0, 1, 2, 3])
    await store.files.save({ id: 'f1', type: 'image/jpeg', data: bytes.buffer })
    const file = await store.files.get('f1')
    expect(file?.type).toBe('image/jpeg')
    expect([...new Uint8Array(file!.data)]).toEqual([...bytes])
  })

  it('desfaz todas as escritas quando a transação falha', async () => {
    const store = create()
    await store.patients.save(patient('a', 'Ana'))

    await expect(
      store.transaction(async () => {
        await store.patients.save(patient('b', 'Bia'))
        await store.patients.remove('a')
        throw new Error('falhou')
      }),
    ).rejects.toThrow('falhou')

    expect((await store.patients.list()).map((p) => p.id)).toEqual(['a'])
  })

  it('notifica mudanças uma única vez, após o commit da transação', async () => {
    const store = create()
    const notifications: Collection[][] = []
    store.subscribe((changed) => notifications.push([...changed].sort()))

    await store.transaction(async () => {
      await store.patients.save(patient('a', 'Ana'))
      await store.activity.append({
        id: 'log-1',
        timestamp: '2026-01-01T10:00:00.000Z',
        level: 'info',
        category: 'system',
        action: 'test',
        message: 'teste',
      })
      expect(notifications).toEqual([])
    })

    expect(notifications).toEqual([['activity', 'patients']])
  })

  it('consulta registros de atividade do mais recente para o mais antigo, com filtros', async () => {
    const store = create()
    const at = (minute: number) => `2026-01-01T10:${String(minute).padStart(2, '0')}:00.000Z`
    await store.activity.append({ id: '1', timestamp: at(1), level: 'info', category: 'data', action: 'create', message: '', entity: 'patient', entityId: 'a' })
    await store.activity.append({ id: '2', timestamp: at(2), level: 'info', category: 'navigation', action: 'view', message: '' })
    await store.activity.append({ id: '3', timestamp: at(3), level: 'info', category: 'data', action: 'update', message: '', entity: 'patient', entityId: 'a' })

    expect((await store.activity.query({})).map((e) => e.id)).toEqual(['3', '2', '1'])
    expect((await store.activity.query({ category: 'data' })).map((e) => e.id)).toEqual(['3', '1'])
    expect((await store.activity.query({ entityId: 'a', limit: 1 })).map((e) => e.id)).toEqual(['3'])
    expect((await store.activity.query({ from: at(2), to: at(2) })).map((e) => e.id)).toEqual(['2'])
  })

  it('exporta e recarrega um snapshot, preservando registros de atividade no modo replace', async () => {
    const store = create()
    await store.patients.save(patient('a', 'Ana'))
    await store.activity.append({ id: 'log', timestamp: '2026-01-01T10:00:00.000Z', level: 'info', category: 'system', action: 'x', message: '' })
    const snapshot = await store.dump()
    expect(snapshot.patients).toHaveLength(1)

    await store.load({ patients: [patient('z', 'Zoe')] }, 'replace')
    expect((await store.patients.list()).map((p) => p.id)).toEqual(['z'])
    expect(await store.activity.query({})).toHaveLength(1)

    await store.load({ patients: snapshot.patients }, 'merge')
    expect((await store.patients.list()).map((p) => p.id).sort()).toEqual(['a', 'z'])
  })
})

describe('Migração do IndexedDB (v1 → v2)', () => {
  it('converte a anamnese antiga para respostas do novo modelo e renomeia o exame do atendimento', async () => {
    const name = `lume-migration-${++dbCounter}`
    const v1 = new Dexie(name)
    v1.version(1).stores(SCHEMA_V1)
    await v1.table('patients').put({
      ...patient('a', 'Ana'),
      anamnesis: { goals: 'Uniformizar a pele', allergies: 'Dipirona', medications: 'Levotiroxina', smoker: true, skinPhototype: 'III', pregnantOrLactating: true },
    })
    await v1.table('consultations').put({ id: 'c1', patientId: 'a', date: '2026-01-01T10:00:00.000Z', assessment: 'Pele oleosa', procedures: [] })
    v1.close()

    const store = createDexieStore(name)
    const migrated = await store.patients.get('a')
    expect(migrated?.anamnesis).toMatchObject({
      goals: 'Uniformizar a pele',
      allergies: { yes: true, detail: 'Dipirona' },
      medications: [{ name: 'Levotiroxina' }],
      smoking: { yes: true },
    })
    expect(migrated?.anamnesis.observations).toContain('Fototipo: III')
    expect(migrated?.anamnesis.contraindications).toContain('Gestante ou lactante')
    expect(await store.consultations.get('c1')).toMatchObject({ examination: 'Pele oleosa' })
    expect(await store.consultations.get('c1')).not.toHaveProperty('assessment')
  })
})
