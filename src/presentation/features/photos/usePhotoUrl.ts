import { useEffect, useState } from 'react'
import type { Id } from '@/domain'
import { useServices } from '../../app/services'

/** Miniaturas ficam em cache durante a sessão; imagens completas são liberadas ao sair da tela. */
const thumbnailCache = new Map<Id, string>()

export function usePhotoUrl(fileId: Id | undefined, { cache = false } = {}): string | undefined {
  const services = useServices()
  const [loaded, setLoaded] = useState<{ fileId: Id; url: string }>()
  const cached = fileId && cache ? thumbnailCache.get(fileId) : undefined

  useEffect(() => {
    if (!fileId || (cache && thumbnailCache.has(fileId))) return
    let alive = true
    let created: string | undefined
    void services.photos.file(fileId).then((blob) => {
      if (!blob || !alive) return
      created = URL.createObjectURL(blob)
      if (cache) thumbnailCache.set(fileId, created)
      setLoaded({ fileId, url: created })
    })
    return () => {
      alive = false
      if (created && !cache) URL.revokeObjectURL(created)
    }
  }, [services, fileId, cache])

  return cached ?? (loaded && loaded.fileId === fileId ? loaded.url : undefined)
}
