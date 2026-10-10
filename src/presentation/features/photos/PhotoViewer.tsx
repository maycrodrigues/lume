import { ChevronLeft, ChevronRight, Download, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Consultation, Photo } from '@/domain'
import { useServices } from '../../app/services'
import { Button, IconButton } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/Confirm'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { formatDate } from '../../lib/format'
import { consultationLabel } from './AddPhotosModal'
import { RegionOptions } from './PhotoDropzone'
import { usePhotoUrl } from './usePhotoUrl'

interface Props {
  photos: Photo[]
  index: number | undefined
  onIndexChange: (index: number | undefined) => void
  consultations: Consultation[]
}

/** Visualização ampliada com navegação, edição dos dados da foto, download e exclusão. */
export function PhotoViewer({ photos, index, onIndexChange, consultations }: Props) {
  const photo = index !== undefined ? photos[index] : undefined
  const open = photo !== undefined
  const close = () => onIndexChange(undefined)
  const go = (step: number) => index !== undefined && onIndexChange((index + step + photos.length) % photos.length)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Modal open={open} onClose={close} size="xl" title={photo ? [photo.region ?? 'Foto', formatDate(photo.takenAt)].join(' · ') : ''} description={index !== undefined ? `${index + 1} de ${photos.length}` : undefined}>
      {photo && <ViewerBody key={photo.id} photo={photo} consultations={consultations} onPrev={photos.length > 1 ? () => go(-1) : undefined} onNext={photos.length > 1 ? () => go(1) : undefined} onDeleted={close} />}
    </Modal>
  )
}

function ViewerBody({ photo, consultations, onPrev, onNext, onDeleted }: { photo: Photo; consultations: Consultation[]; onPrev?: () => void; onNext?: () => void; onDeleted: () => void }) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const url = usePhotoUrl(photo.fileId)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ takenAt: photo.takenAt, region: photo.region ?? '', caption: photo.caption ?? '', consultationId: photo.consultationId ?? '' })
  const consultation = consultations.find((c) => c.id === photo.consultationId)

  const save = async () => {
    const result = await action('photo.update', () => services.photos.update(photo.id, form), { success: 'Foto atualizada.' })
    if (result.ok) setEditing(false)
  }

  const remove = async () => {
    const ok = await confirm({ title: 'Excluir foto', message: 'A foto será removida do prontuário. Os dados dela ficam em Registros, mas a imagem não poderá ser recuperada sem um backup.', confirmLabel: 'Excluir foto' })
    if (ok && (await action('photo.remove', () => services.photos.remove(photo.id), { success: 'Foto excluída.' })).ok) onDeleted()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden rounded-xl bg-noite">
        {url ? <img src={url} alt={photo.caption ?? photo.region ?? 'Foto de acompanhamento'} className="max-h-[68vh] w-auto object-contain" /> : <span className="text-sm text-cinza">Carregando…</span>}
        {onPrev && (
          <button type="button" onClick={onPrev} aria-label="Foto anterior" className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <ChevronLeft className="size-5" />
          </button>
        )}
        {onNext && (
          <button type="button" onClick={onNext} aria-label="Próxima foto" className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      <aside className="space-y-4 text-sm">
        {editing ? (
          <div className="space-y-3">
            <Field label="Data">{(id) => <Input id={id} type="date" value={form.takenAt} onChange={(e) => setForm({ ...form, takenAt: e.target.value })} />}</Field>
            <Field label="Área">{(id) => <Input id={id} list="photo-regions" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />}</Field>
            <Field label="Legenda">{(id) => <Input id={id} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />}</Field>
            <Field label="Atendimento">
              {(id) => (
                <Select id={id} value={form.consultationId} onChange={(e) => setForm({ ...form, consultationId: e.target.value })}>
                  <option value="">Sem vínculo</option>
                  {consultations.map((c) => <option key={c.id} value={c.id}>{consultationLabel(c)}</option>)}
                </Select>
              )}
            </Field>
            <RegionOptions />
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3">
            <div>
              <dt className="text-[11px] text-ink-muted">Data</dt>
              <dd className="text-ink">{formatDate(photo.takenAt, "d 'de' MMMM 'de' yyyy")}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-muted">Área</dt>
              <dd className="text-ink">{photo.region ?? '—'}</dd>
            </div>
            {photo.caption && (
              <div>
                <dt className="text-[11px] text-ink-muted">Legenda</dt>
                <dd className="text-ink">{photo.caption}</dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] text-ink-muted">Atendimento</dt>
              <dd className="text-ink">{consultation ? consultationLabel(consultation) : 'Sem vínculo'}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-muted">Arquivo</dt>
              <dd className="num text-ink-soft">
                {photo.width} × {photo.height} px · {(photo.size / 1024).toFixed(0)} KB
              </dd>
            </div>
          </dl>
        )}
        {!editing && (
          <div className="flex flex-wrap gap-1 border-t border-line pt-3">
            <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" strokeWidth={1.5} />} onClick={() => setEditing(true)}>Editar</Button>
            {url && (
              <a href={url} download={`lume-${photo.takenAt}-${photo.id.slice(0, 6)}.jpg`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-soft hover:bg-perola-soft hover:text-ink">
                <Download className="size-3.5" strokeWidth={1.5} />
                Baixar
              </a>
            )}
            <IconButton label="Excluir foto" onClick={remove} className="ml-auto hover:!bg-danger-soft hover:!text-danger">
              <Trash2 className="size-4" strokeWidth={1.5} />
            </IconButton>
          </div>
        )}
      </aside>
    </div>
  )
}
