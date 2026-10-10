import { z } from 'zod'
import type { Id, Photo } from '@/domain'
import { NotFoundError, ValidationError } from '@/domain'
import { isoDate, optionalId, optionalText, parse } from '../validation'
import { assertConsultationOf } from './assessments'
import type { ServiceDeps } from './deps'

const metaSchema = z.object({
  takenAt: isoDate,
  consultationId: optionalId,
  region: optionalText,
  caption: optionalText,
})

const addSchema = metaSchema.extend({
  patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
})

export type PhotoInput = z.input<typeof addSchema> & { file: Blob }
export type PhotoUpdateInput = z.input<typeof metaSchema>

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024

export function createPhotoService({ store, clock, newId, images }: ServiceDeps) {
  async function get(id: Id): Promise<Photo> {
    const photo = await store.photos.get(id)
    if (!photo) throw new NotFoundError('Foto')
    return photo
  }

  return {
    get,

    async listByPatient(patientId: Id): Promise<Photo[]> {
      return (await store.photos.where('patientId', patientId)).sort(
        (a, b) => b.takenAt.localeCompare(a.takenAt) || a.createdAt.localeCompare(b.createdAt),
      )
    },

    /** Prepara a imagem (fora da transação — o IndexedDB não espera processamento) e grava tudo de uma vez. */
    async add({ file, ...input }: PhotoInput): Promise<Photo> {
      const meta = parse(addSchema, input)
      if (!(file instanceof Blob)) throw new ValidationError(['Selecione uma imagem.'])
      if (file.size > MAX_UPLOAD_BYTES) throw new ValidationError(['A imagem é muito grande (máximo de 40 MB).'])
      const processed = await images.process(file)

      return store.transaction(async () => {
        if (!(await store.patients.get(meta.patientId))) throw new NotFoundError('Paciente')
        await assertConsultationOf(store, meta.patientId, meta.consultationId)
        const now = clock.now().toISOString()
        const photo: Photo = {
          id: newId(),
          ...meta,
          fileId: newId(),
          thumbnailId: newId(),
          mimeType: processed.image.type,
          width: processed.width,
          height: processed.height,
          size: processed.image.data.byteLength,
          createdAt: now,
          updatedAt: now,
        }
        await store.files.save({ id: photo.fileId, ...processed.image })
        await store.files.save({ id: photo.thumbnailId, ...processed.thumbnail })
        await store.photos.save(photo)
        return photo
      })
    },

    async update(id: Id, input: PhotoUpdateInput): Promise<Photo> {
      const meta = parse(metaSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        await assertConsultationOf(store, current.patientId, meta.consultationId)
        const updated: Photo = { ...current, ...meta, updatedAt: clock.now().toISOString() }
        await store.photos.save(updated)
        return updated
      })
    },

    async remove(id: Id): Promise<void> {
      await store.transaction(async () => {
        const photo = await get(id)
        await store.photos.remove(id)
        await store.files.remove(photo.fileId)
        await store.files.remove(photo.thumbnailId)
      })
    },

    /** Conteúdo da imagem ou da miniatura, pronto para exibir. */
    async file(fileId: Id): Promise<Blob | undefined> {
      const file = await store.files.get(fileId)
      return file && new Blob([file.data], { type: file.type })
    },

    async storageUsage(): Promise<{ count: number; bytes: number }> {
      const photos = await store.photos.list()
      return { count: photos.length, bytes: photos.reduce((sum, p) => sum + p.size, 0) }
    },
  }
}

export type PhotoService = ReturnType<typeof createPhotoService>
