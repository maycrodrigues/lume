import type { ActivityQuery } from '@/application/ports'
import type { ActivityEntry } from '@/domain'

export const matchesActivityQuery = (entry: ActivityEntry, query: ActivityQuery): boolean =>
  (!query.category || entry.category === query.category) &&
  (!query.entity || entry.entity === query.entity) &&
  (!query.entityId || entry.entityId === query.entityId) &&
  (!query.from || entry.timestamp >= query.from) &&
  (!query.to || entry.timestamp <= query.to)
