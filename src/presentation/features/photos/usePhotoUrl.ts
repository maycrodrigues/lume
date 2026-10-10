import { useEffect, useState } from 'react'
import type { Id } from '@/domain'
import { useServices } from '../../app/services'

/** Miniaturas ficam em cache durante a sessão; imagens completas são liberadas ao sair da tela. */
const thumbnailCache = new Map<Id, string>()

export function usePhotoUrl(fileId: Id | undefined, { cache = false } = {}): string | undefined {
  const services = useServices()
  const [url, setUrl] = useState<string | undefined>(() => (fileId && cache ? thumbnailCache.get(fileId) : undefined))

  useEffect(() => {
    if (!fileId) return
    const cached = cache ? thumbnailCache.get(fileId) : undefined
    if (cached) {
      setUrl(cached)
      return
    }
    let alive = true
    let created: string | undefined
    void services.photos.file(fileId).then((blob) => {
      if (!blob || !alive) return
      created = URL.createObjectURL(blob)
      if (cache) thumbnailCache.set(fileId, created)
      setUrl(created)
    })
    return () => {
      alive = false
      if (created && !cache) URL.revokeObjectURL(created)
    }
  }, [services, fileId, cache])

  return url
}
