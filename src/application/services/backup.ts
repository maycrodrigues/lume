import { DomainError, ValidationError } from '@/domain'
import type { ActivityService } from '../activityLog'
import { fromBase64, toBase64 } from '../binary'
import type { Collection, Snapshot, StoredFile } from '../ports'
import { COLLECTIONS } from '../ports'
import type { ServiceDeps } from './deps'

/** Arquivo de backup. Binários (`files`) vão em base64 para caber em JSON. */
export interface BackupFile {
  format: 'lume-backup'
  version: 1 | 2
  exportedAt: string
  data: Omit<Snapshot, 'files'> & { files: Array<Omit<StoredFile, 'data'> & { data: string }> }
}

const SUPPORTED_VERSIONS = [1, 2]

const countRows = (data: Partial<Record<Collection, unknown[]>>) =>
  COLLECTIONS.reduce((sum, c) => sum + (c === 'activity' || c === 'files' ? 0 : (data[c]?.length ?? 0)), 0)

function assertBackupFile(file: unknown): asserts file is BackupFile {
  const candidate = file as Partial<BackupFile> | null
  if (!candidate || candidate.format !== 'lume-backup' || !SUPPORTED_VERSIONS.includes(candidate.version ?? 0) || typeof candidate.data !== 'object') {
    throw new ValidationError(['Arquivo de backup inválido ou de outra aplicação.'])
  }
  for (const collection of COLLECTIONS) {
    const rows = (candidate.data as unknown as Record<string, unknown>)[collection]
    if (rows === undefined) continue
    if (!Array.isArray(rows) || rows.some((r) => typeof r !== 'object' || r === null || typeof (r as { id?: unknown }).id !== 'string')) {
      throw new ValidationError([`Backup corrompido: coleção "${collection}" inválida.`])
    }
  }
}

export function createBackupService({ store, clock, newId }: ServiceDeps, activity: ActivityService) {
  return {
    async exportData(): Promise<BackupFile> {
      const snapshot = await store.dump()
      const data = { ...snapshot, files: snapshot.files.map((f) => ({ ...f, data: toBase64(f.data) })) }
      await activity.record({
        category: 'system',
        action: 'backup.export',
        message: `Backup exportado (${countRows(snapshot)} registros, ${snapshot.photos.length} fotos)`,
      })
      return { format: 'lume-backup', version: 2, exportedAt: clock.now().toISOString(), data }
    },

    /** Substitui todos os dados pelos do backup. Registros de atividade são mesclados, nunca apagados. */
    async importData(file: unknown): Promise<{ records: number }> {
      assertBackupFile(file)
      const files = (file.data.files ?? []).map((f) => ({ ...f, data: fromBase64(f.data) }))
      await store.load({ ...file.data, files }, 'replace')
      const records = countRows(file.data)
      await activity.record({
        category: 'system',
        level: 'warning',
        action: 'backup.import',
        message: `Backup de ${new Date(file.exportedAt).toLocaleString('pt-BR')} restaurado (${records} registros)`,
      })
      return { records }
    },

    async loadDemoData(): Promise<void> {
      if ((await store.patients.list()).length > 0) {
        throw new DomainError('Os dados de demonstração só podem ser carregados com o painel vazio.', 'not_empty')
      }
      // Import dinâmico: o gerador (e o Faker) só é baixado quando a demonstração é pedida.
      const { buildDemoSnapshot } = await import('../demoData')
      const snapshot = buildDemoSnapshot(clock.now(), newId)
      await store.load(snapshot, 'merge')
      await activity.record({
        category: 'system',
        action: 'demo.load',
        message: `Dados de demonstração carregados (${countRows(snapshot)} registros)`,
      })
    },

    async clearAll(): Promise<void> {
      await store.load({}, 'replace')
      await activity.record({
        category: 'system',
        level: 'warning',
        action: 'data.clear',
        message: 'Todos os dados foram apagados (registros de atividade preservados)',
      })
    },

    async stats(): Promise<Record<Collection, number>> {
      const counts = await Promise.all(COLLECTIONS.map(async (c) => [c, await store[c].count()] as const))
      return Object.fromEntries(counts) as Record<Collection, number>
    },
  }
}

export type BackupService = ReturnType<typeof createBackupService>
