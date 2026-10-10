import Dexie, { type Table } from 'dexie'
import type { ActivityStore, Collection, DataStore, Repository, Snapshot } from '@/application/ports'
import { COLLECTIONS } from '@/application/ports'
import type { Id } from '@/domain'
import { matchesActivityQuery } from '../activityQuery'
import { createChangeFeed } from '../changeFeed'
import { migrateLegacyAnamnesis } from './migrations'

type Tables = { [K in Collection]: Table<Snapshot[K][number], Id> }

/**
 * Esquema do IndexedDB. Para evoluir, adicione um novo `version(n)` — nunca altere um existente.
 * Booleanos não podem ser indexados no IndexedDB; `where` cai para varredura nesses campos.
 */
export const SCHEMA_V1: Record<string, string> = {
  patients: 'id, name, cpf',
  procedures: 'id, name, category',
  appointments: 'id, patientId, start, status, consultationId',
  consultations: 'id, patientId, appointmentId, date',
  prescriptions: 'id, patientId, consultationId, date',
  financialEntries: 'id, type, status, dueDate, patientId, consultationId',
  settings: 'id',
  activity: 'id, timestamp, category, entity, entityId',
}

/** v2: Fichas de avaliação, fotos e arquivos; anamnese passa a ser respostas de questionário. */
const SCHEMA_V2: Record<string, string> = {
  ...SCHEMA_V1,
  assessments: 'id, patientId, template, date, consultationId',
  photos: 'id, patientId, consultationId, takenAt',
  files: 'id',
}

/** v3: pacotes (catálogo e contratados) e cupons (cadastrados e emitidos). */
const SCHEMA_V3: Record<string, string> = {
  ...SCHEMA_V2,
  packages: 'id, name',
  patientPackages: 'id, patientId, packageId',
  coupons: 'id, name',
  issuedCoupons: 'id, &code, patientId, couponId, consultationId',
}

/** v4: bloqueios de agenda. */
const SCHEMA_V4: Record<Collection, string> = {
  ...(SCHEMA_V3 as Record<Exclude<Collection, 'scheduleBlocks'>, string>),
  scheduleBlocks: 'id, startDate, endDate',
}

export function createDexieStore(databaseName = 'lume'): DataStore {
  const db = new Dexie(databaseName)
  db.version(1).stores(SCHEMA_V1)
  db.version(2)
    .stores(SCHEMA_V2)
    .upgrade(async (tx) => {
      await tx
        .table('patients')
        .toCollection()
        .modify((patient: Record<string, unknown>) => {
          patient.anamnesis = migrateLegacyAnamnesis(patient.anamnesis as Record<string, unknown>)
        })
      await tx
        .table('consultations')
        .toCollection()
        .modify((consultation: Record<string, unknown>) => {
          if ('assessment' in consultation) {
            if (consultation.assessment) consultation.examination = consultation.assessment
            delete consultation.assessment
          }
        })
      await tx.table('activity').add({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'system',
        action: 'db.migrate',
        message: 'Dados atualizados para a versão 2 (anamnese completa, fichas de avaliação e fotos)',
        context: { patients: await tx.table('patients').count() },
      })
    })
  db.version(3).stores(SCHEMA_V3)
  db.version(4).stores(SCHEMA_V4)
  const tables = Object.fromEntries(COLLECTIONS.map((c) => [c, db.table(c)])) as Tables
  const feed = createChangeFeed()

  function repository<C extends Exclude<Collection, 'activity'>>(collection: C): Repository<Snapshot[C][number]> {
    type T = Snapshot[C][number]
    const table = tables[collection] as unknown as Table<T, Id>
    const indexed = new Set(table.schema.indexes.map((i) => i.name))
    return {
      get: (id) => table.get(id),
      list: () => table.toArray(),
      count: () => table.count(),
      where(field, value) {
        const isKey = typeof value === 'string' || typeof value === 'number'
        if (isKey && indexed.has(field)) return table.where(field).equals(value as string | number).toArray()
        return table.filter((row) => row[field] === value).toArray()
      },
      async save(entity) {
        await table.put(entity)
        feed.touched(collection)
      },
      async remove(id) {
        await table.delete(id)
        feed.touched(collection)
      },
    }
  }

  const activity: ActivityStore = {
    async append(entry) {
      await tables.activity.add(entry)
      feed.touched('activity')
    },
    async query(query) {
      let rows =
        query.from || query.to
          ? tables.activity.where('timestamp').between(query.from ?? '', query.to ?? '￿', true, true)
          : tables.activity.orderBy('timestamp')
      rows = rows.reverse().filter((entry) => matchesActivityQuery(entry, query))
      if (query.limit) rows = rows.limit(query.limit)
      return rows.toArray()
    },
    count: () => tables.activity.count(),
  }

  const store: DataStore = {
    patients: repository('patients'),
    procedures: repository('procedures'),
    appointments: repository('appointments'),
    consultations: repository('consultations'),
    prescriptions: repository('prescriptions'),
    financialEntries: repository('financialEntries'),
    settings: repository('settings'),
    assessments: repository('assessments'),
    photos: repository('photos'),
    files: repository('files'),
    packages: repository('packages'),
    patientPackages: repository('patientPackages'),
    coupons: repository('coupons'),
    issuedCoupons: repository('issuedCoupons'),
    scheduleBlocks: repository('scheduleBlocks'),
    activity,
    transaction(work) {
      return feed.inTransaction(() => db.transaction('rw', db.tables, work))
    },
    subscribe: feed.subscribe,
    async dump() {
      const entries = await Promise.all(COLLECTIONS.map(async (c) => [c, await tables[c].toArray()] as const))
      return Object.fromEntries(entries) as unknown as Snapshot
    },
    async load(snapshot, mode) {
      await store.transaction(async () => {
        for (const collection of COLLECTIONS) {
          const table = tables[collection] as Table<{ id: Id }, Id>
          if (mode === 'replace' && collection !== 'activity') {
            await table.clear()
            feed.touched(collection)
          }
          const rows = (snapshot[collection] ?? []) as Array<{ id: Id }>
          if (rows.length > 0) {
            await table.bulkPut(rows)
            feed.touched(collection)
          }
        }
      })
    },
  }
  return store
}
