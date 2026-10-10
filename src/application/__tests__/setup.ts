import { createMemoryStore } from '@/infrastructure/memory/memoryStore'
import { DomainError } from '@/domain'
import { createServices } from '../index'
import type { ImageProcessor } from '../ports'

/** Processador de imagem falso: aceita só `image/*` e devolve os próprios bytes. */
export const fakeImages: ImageProcessor = {
  async process(file) {
    if (!file.type.startsWith('image/')) throw new DomainError('O arquivo selecionado não é uma imagem.', 'invalid_image')
    const data = await file.arrayBuffer()
    return { image: { type: 'image/jpeg', data }, thumbnail: { type: 'image/jpeg', data: data.slice(0, 2) }, width: 800, height: 600 }
  },
}

export const imageFile = (bytes = [1, 2, 3, 4]) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })

/** Serviços sobre o adapter em memória, com relógio controlável e ids sequenciais. */
export function setup(now = '2026-10-10T09:00') {
  let current = new Date(now)
  let sequence = 0
  const store = createMemoryStore()
  const services = createServices({
    store,
    clock: { now: () => new Date(current) },
    newId: () => `id-${++sequence}`,
    images: fakeImages,
  })
  return {
    services,
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
