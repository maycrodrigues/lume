import type { ActivityQuery, ActivityStore, Collection, DataStore, Repository, Snapshot } from '@/application/ports'
import { COLLECTIONS } from '@/application/ports'
import type { Id } from '@/domain'
import { createChangeFeed } from '../changeFeed'
import { matchesActivityQuery } from '../activityQuery'

type Tables = { [K in Collection]: Map<Id, Snapshot[K][number]> }

/** Adapter em memória: usado nos testes e útil para um modo de demonstração sem persistência. */
export function createMemoryStore(): DataStore {
  const tables = Object.fromEntries(COLLECTIONS.map((c) => [c, new Map()])) as Tables
  const feed = createChangeFeed()

  function repository<C extends Exclude<Collection, 'activity'>>(collection: C): Repository<Snapshot[C][number]> {
    type T = Snapshot[C][number]
    const table = tables[collection] as Map<Id, T>
    return {
      async get(id) {
        const found = table.get(id)
        return found && structuredClone(found)
      },
      async list() {
        return [...table.values()].map((e) => structuredClone(e))
      },
      async count() {
        return table.size
      },
      async where(field, value) {
        return [...table.values()].filter((e) => e[field] === value).map((e) => structuredClone(e))
      },
      async save(entity) {
        table.set(entity.id, structuredClone(entity))
        feed.touched(collection)
      },
      async remove(id) {
        if (table.delete(id)) feed.touched(collection)
      },
    }
  }

  const activity: ActivityStore = {
    async append(entry) {
      tables.activity.set(entry.id, structuredClone(entry))
      feed.touched('activity')
    },
    async query(query: ActivityQuery) {
      const sorted = [...tables.activity.values()]
        .filter((e) => matchesActivityQuery(e, query))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      return (query.limit ? sorted.slice(0, query.limit) : sorted).map((e) => structuredClone(e))
    },
    async count() {
      return tables.activity.size
    },
  }

  let snapshotDepth = 0

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
      return feed.inTransaction(async () => {
        const backup = snapshotDepth === 0 ? cloneTables(tables) : undefined
        snapshotDepth++
        try {
          return await work()
        } catch (error) {
          if (backup) restoreTables(tables, backup)
          throw error
        } finally {
          snapshotDepth--
        }
      })
    },
    subscribe: feed.subscribe,
    async dump() {
      return Object.fromEntries(
        COLLECTIONS.map((c) => [c, [...tables[c].values()].map((e) => structuredClone(e))]),
      ) as unknown as Snapshot
    },
    async load(snapshot, mode) {
      await store.transaction(async () => {
        for (const collection of COLLECTIONS) {
          const table = tables[collection] as Map<Id, { id: Id }>
          if (mode === 'replace' && collection !== 'activity' && table.size > 0) {
            table.clear()
            feed.touched(collection)
          }
          const rows = (snapshot[collection] ?? []) as Array<{ id: Id }>
          rows.forEach((row) => table.set(row.id, structuredClone(row)))
          if (rows.length > 0) feed.touched(collection)
        }
      })
    },
  }
  return store
}

function cloneTables(tables: Tables): Tables {
  return Object.fromEntries(
    COLLECTIONS.map((name) => [name, new Map(structuredClone([...(tables[name] as Map<Id, unknown>)]))]),
  ) as unknown as Tables
}

function restoreTables(tables: Tables, backup: Tables) {
  for (const collection of COLLECTIONS) {
    const table = tables[collection] as Map<Id, unknown>
    table.clear()
    ;(backup[collection] as Map<Id, unknown>).forEach((value, key) => table.set(key, value))
  }
}

