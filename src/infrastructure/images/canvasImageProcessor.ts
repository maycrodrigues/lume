import type { EncodedImage, ImageProcessor } from '@/application/ports'
import { DomainError } from '@/domain'

const FULL_SIZE = 2048
const THUMB_SIZE = 480

async function encode(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<EncodedImage & { width: number; height: number }> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // PNG transparente vira fundo branco em JPEG
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  return { type: 'image/jpeg', data: await blob.arrayBuffer(), width, height }
}

/**
 * Adapter do navegador: respeita a orientação EXIF, limita a imagem a 2048 px (qualidade de
 * prontuário, sem ocupar o disco com fotos de 12 MP) e gera miniatura de 480 px para galerias.
 */
export function createCanvasImageProcessor(): ImageProcessor {
  return {
    async process(file) {
      if (!file.type.startsWith('image/')) {
        throw new DomainError('O arquivo selecionado não é uma imagem.', 'invalid_image')
      }
      let bitmap: ImageBitmap
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      } catch {
        throw new DomainError(
          'Não foi possível ler esta imagem. Use JPG, PNG ou WebP (fotos HEIC do iPhone: exporte como JPG).',
          'invalid_image',
        )
      }
      try {
        const image = await encode(bitmap, FULL_SIZE, 0.86)
        const thumbnail = await encode(bitmap, THUMB_SIZE, 0.8)
        return {
          image: { type: image.type, data: image.data },
          thumbnail: { type: thumbnail.type, data: thumbnail.data },
          width: image.width,
          height: image.height,
        }
      } finally {
        bitmap.close()
      }
    },
  }
}
