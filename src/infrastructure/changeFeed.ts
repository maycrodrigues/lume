import type { ChangeListener, Collection } from '@/application/ports'

/**
 * Agrupa notificações de escrita: fora de transação notifica na hora;
 * dentro, acumula e notifica uma vez após o commit (ou descarta no rollback).
 */
export function createChangeFeed() {
  const listeners = new Set<ChangeListener>()
  const pending = new Set<Collection>()
  let depth = 0

  const flush = () => {
    if (pending.size === 0) return
    const changed = new Set(pending)
    pending.clear()
    listeners.forEach((listener) => listener(changed))
  }

  return {
    touched(collection: Collection) {
      pending.add(collection)
      if (depth === 0) flush()
    },
    async inTransaction<T>(run: () => Promise<T>): Promise<T> {
      depth++
      let failed = false
      try {
        return await run()
      } catch (error) {
        failed = true
        throw error
      } finally {
        depth--
        if (depth === 0) {
          if (failed) pending.clear()
          else flush()
        }
      }
    },
    subscribe(listener: ChangeListener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
