import { createMemoryCredentialStore } from '@/infrastructure/memory/memoryCredentialStore'
import { createMemoryStore } from '@/infrastructure/memory/memoryStore'
import { DomainError } from '@/domain'
import { createServices } from '../index'
import type { ImageProcessor, PinHasher, SitePublisher, SiteTokenStore } from '../ports'
import type { SiteProfile } from '@/domain'

/** Processador de imagem falso: aceita só `image/*` e devolve os próprios bytes. */
export const fakeImages: ImageProcessor = {
  async process(file) {
    if (!file.type.startsWith('image/')) throw new DomainError('O arquivo selecionado não é uma imagem.', 'invalid_image')
    const data = await file.arrayBuffer()
    return { image: { type: 'image/jpeg', data }, thumbnail: { type: 'image/jpeg', data: data.slice(0, 2) }, width: 800, height: 600 }
  },
}

/** Hasher falso e instantâneo (o PBKDF2 real tem teste próprio na infraestrutura). */
export const fakePinHasher: PinHasher = {
  hash: async (pin) => ({ hash: `fake:${[...pin].reverse().join('')}`, salt: 'salt', iterations: 1 }),
  verify: async (pin, digest) => digest.hash === `fake:${[...pin].reverse().join('')}`,
}

/** Publicador falso: guarda o que foi publicado; aceita só o token "token-valido". */
export function fakeSitePublisher(): SitePublisher & { published: Array<{ profile: SiteProfile; token: string }> } {
  const published: Array<{ profile: SiteProfile; token: string }> = []
  const check = (token: string) => {
    if (token !== 'token-valido') throw new DomainError('Token inválido ou expirado.', 'invalid_token')
  }
  return {
    published,
    verify: async (token) => check(token),
    publish: async (profile, token) => {
      check(token)
      published.push({ profile, token })
    },
  }
}

export function memoryTokenStore(): SiteTokenStore {
  let token: string | undefined
  return {
    get: async () => token,
    save: async (value) => {
      token = value
    },
    clear: async () => {
      token = undefined
    },
  }
}

export const imageFile = (bytes = [1, 2, 3, 4]) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })

/** Serviços sobre o adapter em memória, com relógio controlável e ids sequenciais. */
export function setup(now = '2026-10-10T09:00') {
  let current = new Date(now)
  let sequence = 0
  const store = createMemoryStore()
  const credentials = createMemoryCredentialStore()
  const sitePublisher = fakeSitePublisher()
  const services = createServices({
    store,
    clock: { now: () => new Date(current) },
    newId: () => `id-${++sequence}`,
    images: fakeImages,
    credentials,
    pinHasher: fakePinHasher,
    sitePublisher,
    siteToken: memoryTokenStore(),
  })
  return {
    services,
    credentials,
    sitePublisher,
    setNow: (value: string) => {
      current = new Date(value)
    },
  }
}

/** Data/hora local → ISO (como a UI envia). */
export const at = (local: string) => new Date(local).toISOString()

export async function seedBasics(services: ReturnType<typeof setup>['services']) {
  const maria = await services.patients.create({ name: 'Maria Souza', gender: 'female', phone: '11999990000' })
  const limpeza = await services.procedures.create({ name: 'Limpeza de pele', category: 'Facial', price: 18000, durationMinutes: 60 })
  const drenagem = await services.procedures.create({ name: 'Drenagem linfática', category: 'Corporal', price: 15000, durationMinutes: 50 })
  return { maria, limpeza, drenagem }
}
