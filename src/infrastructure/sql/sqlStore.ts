import type { ActivityStore, Collection, DataStore, Repository, Snapshot, StoredFile } from '@/application/ports'
import { COLLECTIONS } from '@/application/ports'
import type { ActivityEntry, Id } from '@/domain'
import { createChangeFeed } from '../changeFeed'

export type SqlValue = string | number | bigint | null | ArrayBuffer | Uint8Array

/**
 * O mínimo de SQLite que o adapter precisa. No servidor é o SQLite do Durable Object
 * (`ctx.storage.sql` + `ctx.storage.transaction`); nos testes, o `node:sqlite`.
 */
export interface SqlDatabase {
  /** Executa a instrução e devolve todas as linhas já lidas. */
  run(query: string, ...params: SqlValue[]): Array<Record<string, SqlValue>>
  /** Executa `work` numa transação: se lançar erro, nenhuma escrita fica gravada. */
  transaction<T>(work: () => Promise<T>): Promise<T>
}

type EntityCollection = Exclude<Collection, 'activity' | 'files'>

const ENTITY_COLLECTIONS = COLLECTIONS.filter((c): c is EntityCollection => c !== 'activity' && c !== 'files')

const SCHEMA = [
  ...ENTITY_COLLECTIONS.map((c) => `CREATE TABLE IF NOT EXISTS "${c}" (id TEXT PRIMARY KEY, data TEXT NOT NULL)`),
  'CREATE TABLE IF NOT EXISTS "files" (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL)',
  `CREATE TABLE IF NOT EXISTS "activity" (
    id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, category TEXT NOT NULL,
    entity TEXT, entity_id TEXT, data TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS activity_timestamp ON "activity" (timestamp)',
  'CREATE INDEX IF NOT EXISTS activity_entity_id ON "activity" (entity_id)',
]

/** Valores do `where` como o SQLite os guarda no JSON (booleanos viram 1/0). */
const jsonValue = (value: unknown): SqlValue => (typeof value === 'boolean' ? (value ? 1 : 0) : (value as SqlValue))

const toArrayBuffer = (value: SqlValue): ArrayBuffer => {
  if (value instanceof ArrayBuffer) return value
  if (value instanceof Uint8Array) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer
  throw new Error('Conteúdo binário inválido no banco.')
}

/** Adapter SQLite do `DataStore`: uma tabela por coleção, entidade guardada como JSON. */
export function createSqlStore(db: SqlDatabase): DataStore {
  for (const statement of SCHEMA) db.run(statement)
  const feed = createChangeFeed()
  let depth = 0

  function repository<C extends EntityCollection>(collection: C): Repository<Snapshot[C][number]> {
    type T = Snapshot[C][number]
    const table = `"${collection}"`
    const parse = (rows: Array<Record<string, SqlValue>>) => rows.map((r) => JSON.parse(String(r.data)) as T)
    return {
      async get(id) {
        return parse(db.run(`SELECT data FROM ${table} WHERE id = ?`, id))[0]
      },
      async list() {
        return parse(db.run(`SELECT data FROM ${table}`))
      },
      async where(field, value) {
        return parse(db.run(`SELECT data FROM ${table} WHERE json_extract(data, '$.' || ?) = ?`, field, jsonValue(value)))
      },
      async count() {
        return Number(db.run(`SELECT COUNT(*) AS n FROM ${table}`)[0].n)
      },
      async save(entity) {
        db.run(`INSERT INTO ${table} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`, entity.id, JSON.stringify(entity))
        feed.touched(collection)
      },
      async remove(id) {
        const removed = db.run(`DELETE FROM ${table} WHERE id = ? RETURNING id`, id)
        if (removed.length > 0) feed.touched(collection)
      },
    }
  }

  const files: Repository<StoredFile> = {
    async get(id) {
      const [row] = db.run('SELECT id, type, data FROM "files" WHERE id = ?', id)
      return row && { id: String(row.id), type: String(row.type), data: toArrayBuffer(row.data) }
    },
    async list() {
      return db.run('SELECT id, type, data FROM "files"').map((row) => ({ id: String(row.id), type: String(row.type), data: toArrayBuffer(row.data) }))
    },
    async where() {
      throw new Error('Arquivos não suportam consulta por campo.')
    },
    async count() {
      return Number(db.run('SELECT COUNT(*) AS n FROM "files"')[0].n)
    },
    async save(file) {
      db.run(
        'INSERT INTO "files" (id, type, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET type = excluded.type, data = excluded.data',
        file.id,
        file.type,
        new Uint8Array(file.data),
      )
      feed.touched('files')
    },
    async remove(id) {
      if (db.run('DELETE FROM "files" WHERE id = ? RETURNING id', id).length > 0) feed.touched('files')
    },
  }

  const activity: ActivityStore = {
    async append(entry) {
      db.run(
        'INSERT OR IGNORE INTO "activity" (id, timestamp, category, entity, entity_id, data) VALUES (?, ?, ?, ?, ?, ?)',
        entry.id,
        entry.timestamp,
        entry.category,
        entry.entity ?? null,
        entry.entityId ?? null,
        JSON.stringify(entry),
      )
      feed.touched('activity')
    },
    async query(query) {
      const where: string[] = []
      const params: SqlValue[] = []
      const add = (clause: string, value: SqlValue | undefined) => {
        if (value === undefined) return
        where.push(clause)
        params.push(value)
      }
      add('category = ?', query.category)
      add('entity = ?', query.entity)
      add('entity_id = ?', query.entityId)
      add('timestamp >= ?', query.from)
      add('timestamp <= ?', query.to)
      const limit = query.limit ? ` LIMIT ${Math.max(1, Math.floor(query.limit))}` : ''
      const sql = `SELECT data FROM "activity"${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY timestamp DESC${limit}`
      return db.run(sql, ...params).map((r) => JSON.parse(String(r.data)) as ActivityEntry)
    },
    async count() {
      return Number(db.run('SELECT COUNT(*) AS n FROM "activity"')[0].n)
    },
  }

  const store: DataStore = {
    ...(Object.fromEntries(ENTITY_COLLECTIONS.map((c) => [c, repository(c)])) as { [C in EntityCollection]: Repository<Snapshot[C][number]> }),
    files,
    activity,
    transaction(work) {
      // Transações aninhadas fazem parte da transação de fora.
      return feed.inTransaction(async () => {
        if (depth > 0) return work()
        depth++
        try {
          return await db.transaction(work)
        } finally {
          depth--
        }
      })
    },
    subscribe: feed.subscribe,
    async dump() {
      const snapshot: Partial<Snapshot> = {}
      for (const c of ENTITY_COLLECTIONS) (snapshot as Record<string, unknown>)[c] = await store[c].list()
      snapshot.files = await files.list()
      snapshot.activity = await activity.query({})
      return snapshot as Snapshot
    },
    async load(snapshot, mode) {
      await store.transaction(async () => {
        for (const collection of COLLECTIONS) {
          if (mode === 'replace' && collection !== 'activity') {
            if (db.run(`DELETE FROM "${collection}" RETURNING id`).length > 0) feed.touched(collection)
          }
          const rows = (snapshot[collection] ?? []) as Array<{ id: Id }>
          for (const row of rows) {
            if (collection === 'activity') await activity.append(row as ActivityEntry)
            else if (collection === 'files') await files.save(row as StoredFile)
            else await store[collection].save(row as never)
          }
        }
      })
    },
  }
  return store
}
