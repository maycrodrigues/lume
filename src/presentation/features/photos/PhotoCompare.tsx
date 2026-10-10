import type { Photo } from '@/domain'
import { Modal } from '../../components/ui/Modal'
import { formatDate } from '../../lib/format'
import { usePhotoUrl } from './usePhotoUrl'

function Side({ photo }: { photo: Photo }) {
  const url = usePhotoUrl(photo.fileId)
  return (
    <figure className="min-w-0">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-noite">
        {url && <img src={url} alt={photo.region ?? 'Foto'} className="size-full object-contain" />}
      </div>
      <figcaption className="mt-2 text-sm">
        <span className="font-medium text-ink">{formatDate(photo.takenAt, "d 'de' MMM 'de' yyyy")}</span>
        <span className="text-ink-muted">{[photo.region, photo.caption].filter(Boolean).map((t) => ` · ${t}`).join('')}</span>
      </figcaption>
    </figure>
  )
}

/** Duas fotos lado a lado, da mais antiga para a mais recente. */
export function PhotoCompare({ photos, onClose }: { photos: [Photo, Photo] | undefined; onClose: () => void }) {
  const ordered = photos && [...photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  const days = ordered && Math.round((new Date(ordered[1].takenAt).getTime() - new Date(ordered[0].takenAt).getTime()) / 86_400_000)
  return (
    <Modal open={Boolean(photos)} onClose={onClose} size="xl" title="Comparar fotos" description={days !== undefined ? (days === 0 ? 'Mesmo dia' : `${days} dias de intervalo`) : undefined}>
      {ordered && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Side photo={ordered[0]} />
          <Side photo={ordered[1]} />
        </div>
      )}
    </Modal>
  )
}
