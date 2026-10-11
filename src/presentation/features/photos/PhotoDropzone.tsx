import { ImagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PHOTO_REGIONS } from '@/domain'
import { cn } from '../../lib/cn'
import { IconButton } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'

export interface PendingPhoto {
  key: string
  file: File
  region: string
}

export const toPending = (files: File[], region = ''): PendingPhoto[] =>
  files.filter((f) => f.type.startsWith('image/') || f.name.match(/\.(heic|heif)$/i)).map((file) => ({ key: crypto.randomUUID(), file, region }))

/** Área de arrastar/soltar ou escolher fotos. */
export function PhotoDropzone({ onFiles, compact }: { onFiles: (files: File[]) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles([...e.dataTransfer.files])
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors',
        compact ? 'px-4 py-5' : 'px-6 py-9',
        over ? 'border-lilas bg-perola-soft' : 'border-line-strong bg-offwhite/50',
      )}
    >
      <ImagePlus className="mb-2 size-6 text-accent" strokeWidth={1.5} />
      <p className="text-sm text-ink-soft">
        Arraste as fotos aqui ou{' '}
        <button type="button" onClick={() => input.current?.click()} className="font-medium text-accent underline-offset-2 hover:underline">
          escolha no computador
        </button>
      </p>
      <p className="mt-1 text-xs text-ink-muted">JPG, PNG ou WebP · reduzidas automaticamente para economizar espaço</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </div>
  )
}

function PendingPreview({ item, onRegion, onRemove }: { item: PendingPhoto; onRegion: (r: string) => void; onRemove: () => void }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(item.file)
    // oxlint-disable-next-line react/set-state-in-effect -- sincroniza com recurso externo (object URL revogado na limpeza)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [item.file])
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line p-2">
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-perola-soft">{url && <img src={url} alt="" className="size-full object-cover" />}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-ink-muted">{item.file.name}</p>
        <Input className="mt-1 h-8 text-xs" list="photo-regions" placeholder="Área (ex.: Face — frontal)" value={item.region} onChange={(e) => onRegion(e.target.value)} aria-label="Área da foto" />
      </div>
      <IconButton label="Remover foto" onClick={onRemove}>
        <X className="size-4" strokeWidth={1.5} />
      </IconButton>
    </li>
  )
}

/** Fotos escolhidas que ainda não foram salvas, com a área de cada uma. */
export function PendingPhotos({ items, onChange }: { items: PendingPhoto[]; onChange: (items: PendingPhoto[]) => void }) {
  if (items.length === 0) return null
  return (
    <>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <PendingPreview
            key={item.key}
            item={item}
            onRegion={(region) => onChange(items.map((i) => (i.key === item.key ? { ...i, region } : i)))}
            onRemove={() => onChange(items.filter((i) => i.key !== item.key))}
          />
        ))}
      </ul>
      <RegionOptions />
    </>
  )
}

export function RegionOptions() {
  return (
    <datalist id="photo-regions">
      {PHOTO_REGIONS.map((r) => <option key={r} value={r} />)}
    </datalist>
  )
}
