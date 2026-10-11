import type { CredentialStore, PinCredential } from '@/application/ports'

/**
 * Credencial no localStorage deste navegador. Fica fora do IndexedDB da clínica de propósito:
 * não entra em backup nem é apagada por "Apagar tudo" (ver ADR 0005).
 */
export function createLocalCredentialStore(key = 'lume.access.v1', storage: Storage = localStorage): CredentialStore {
  return {
    async get() {
      const raw = storage.getItem(key)
      if (!raw) return undefined
      try {
        return JSON.parse(raw) as PinCredential
      } catch {
        return undefined
      }
    },
    async save(credential) {
      storage.setItem(key, JSON.stringify(credential))
    },
    async clear() {
      storage.removeItem(key)
    },
  }
}
