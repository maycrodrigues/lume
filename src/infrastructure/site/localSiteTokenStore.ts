import type { SiteTokenStore } from '@/application/ports'

/** Token de publicação no localStorage deste navegador (fora dos dados e do backup; ver ADR 0006). */
export function createLocalSiteTokenStore(key = 'lume.site-token.v1', storage: Storage = localStorage): SiteTokenStore {
  return {
    get: async () => storage.getItem(key) ?? undefined,
    save: async (token) => storage.setItem(key, token),
    clear: async () => storage.removeItem(key),
  }
}
