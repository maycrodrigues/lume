import type { Services } from '@/application'
import type { Id, ISODate } from '@/domain'
import { errorMessage } from '../../hooks/useAction'
import type { PendingPhoto } from './PhotoDropzone'

export interface UploadResult {
  saved: number
  failed: Array<{ name: string; message: string }>
}

/** Envia as fotos uma a uma; uma falha não impede as demais. */
export async function uploadPhotos(
  services: Services,
  items: PendingPhoto[],
  base: { patientId: Id; consultationId?: Id; takenAt: ISODate; caption?: string },
  onProgress?: (done: number) => void,
): Promise<UploadResult> {
  const result: UploadResult = { saved: 0, failed: [] }
  for (const [index, item] of items.entries()) {
    try {
      await services.photos.add({ ...base, region: item.region, file: item.file })
      result.saved++
    } catch (error) {
      void services.activity.recordError(error, { action: 'photo.add', file: item.file.name })
      result.failed.push({ name: item.file.name, message: errorMessage(error) })
    }
    onProgress?.(index + 1)
  }
  return result
}
