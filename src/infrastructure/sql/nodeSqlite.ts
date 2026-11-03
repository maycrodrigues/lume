import { DatabaseSync } from 'node:sqlite'
import type { SqlDatabase, SqlValue } from './sqlStore'

/**
 * SQLite do Node (node:sqlite) com a mesma interface usada no Durable Object.
 * Só para testes e scripts locais — não é importado pelo app nem pelo Worker.
 */
export function createNodeSqlite(path = ':memory:'): SqlDatabase {
  const db = new DatabaseSync(path)
  return {
    run(query, ...params) {
      return db.prepare(query).all(...(params as never[])) as Array<Record<string, SqlValue>>
    },
    async transaction(work) {
      db.exec('BEGIN')
      try {
        const result = await work()
        db.exec('COMMIT')
        return result
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
}
