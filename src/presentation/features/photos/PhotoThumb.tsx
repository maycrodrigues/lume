import { Check } from 'lucide-react'
import type { Photo } from '@/domain'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { usePhotoUrl } from './usePhotoUrl'

export function PhotoThumb({ photo, onClick, selected, size = 'md', className }: { photo: Photo; onClick?: () => void; selected?: boolean; size?: 'sm' | 'md'; className?: string }) {
  const url = usePhotoUrl(photo.thumbnailId, { cache: true })
  const label = [photo.region, photo.caption, formatDate(photo.takenAt)].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={`Foto: ${label}`}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-perola-soft ring-offset-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilas',
        size === 'sm' ? 'size-14' : 'aspect-square w-full',
        selected && 'ring-2 ring-noite',
        className,
      )}
    >
      {url && <img src={url} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
      {size === 'md' && photo.region && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-noite/70 to-transparent px-2.5 pt-6 pb-2 text-left text-[11px] text-white">{photo.region}</span>
      )}
      {selected && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-noite text-white">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
      )}
    </button>
  )
}
