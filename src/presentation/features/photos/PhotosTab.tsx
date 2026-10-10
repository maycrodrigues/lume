import { Camera, Columns2, ImagePlus, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MedicalRecord } from '@/application'
import type { ImageConsent, Photo } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Select } from '../../components/ui/Field'
import { useAction } from '../../hooks/useAction'
import { cn } from '../../lib/cn'
import { formatDate, toDateInput } from '../../lib/format'
import { IMAGE_CONSENT } from '../../lib/labels'
import { PhotoCompare } from './PhotoCompare'
import { PhotoThumb } from './PhotoThumb'

function ImageConsentCard({ record }: { record: MedicalRecord }) {
  const services = useServices()
  const action = useAction()
  const current = record.patient.imageConsent
  const [scope, setScope] = useState<ImageConsent['scope'] | ''>(current?.scope ?? '')
  const [date, setDate] = useState(current?.date ?? toDateInput(new Date()))
  const changed = scope !== (current?.scope ?? '') || (scope !== '' && date !== current?.date)

  return (
    <Card className="flex flex-wrap items-end gap-4 p-4">
      <div className="flex min-w-56 flex-1 items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-perola-soft text-accent">
          <ShieldCheck className="size-4" strokeWidth={1.5} />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Autorização de uso de imagem</p>
          <p className="text-xs text-ink-muted">
            {current ? `${IMAGE_CONSENT[current.scope].label} · registrada em ${formatDate(current.date)}` : 'Ainda não registrada. Fotos são dados sensíveis de saúde (LGPD).'}
          </p>
        </div>
      </div>
      <Select className="h-9 w-56 text-xs" value={scope} onChange={(e) => setScope(e.target.value as ImageConsent['scope'] | '')} aria-label="Autorização de uso de imagem">
        <option value="">Não registrada</option>
        {Object.entries(IMAGE_CONSENT).map(([v, c]) => <option key={v} value={v}>{c.label} — {c.description}</option>)}
      </Select>
      {scope && <Input type="date" className="h-9 w-40 text-xs" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data da autorização" />}
      <Button
        size="sm"
        disabled={!changed}
        onClick={() => action('patient.imageConsent', () => services.patients.setImageConsent(record.patient.id, scope ? { scope, date } : undefined), { success: 'Autorização registrada.' })}
      >
        Salvar
      </Button>
    </Card>
  )
}

export function PhotosTab({ record, onAdd, onOpen }: { record: MedicalRecord; onAdd: () => void; onOpen: (photos: Photo[], index: number) => void }) {
  const [region, setRegion] = useState<string>()
  const [comparing, setComparing] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [compare, setCompare] = useState<[Photo, Photo]>()

  const regions = useMemo(() => [...new Set(record.photos.map((p) => p.region).filter(Boolean) as string[])].sort(), [record.photos])
  const visible = record.photos.filter((p) => !region || p.region === region)
  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>()
    visible.forEach((p) => map.set(p.takenAt, [...(map.get(p.takenAt) ?? []), p]))
    return [...map.entries()]
  }, [visible])

  const toggle = (photo: Photo) => {
    if (!comparing) return onOpen(visible, visible.indexOf(photo))
    setSelected((all) => (all.includes(photo.id) ? all.filter((id) => id !== photo.id) : [...all.slice(-1), photo.id]))
  }

  return (
    <div className="space-y-4">
      <ImageConsentCard key={record.patient.updatedAt} record={record} />

      {record.photos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Camera className="size-5" strokeWidth={1.5} />}
            title="Nenhuma foto ainda"
            description="Registre fotos ao longo do tratamento para acompanhar a evolução. Elas podem ser ligadas a um atendimento ou avulsas."
            action={<Button icon={<ImagePlus className="size-4" strokeWidth={1.5} />} onClick={onAdd}>Adicionar fotos</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[undefined, ...regions].map((r) => (
                <button
                  key={r ?? 'all'}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={cn('h-8 rounded-full px-3.5 text-xs font-medium transition-colors', region === r ? 'bg-noite text-white' : 'bg-white text-ink-soft ring-1 ring-line hover:ring-cinza')}
                >
                  {r ?? `Todas (${record.photos.length})`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {comparing ? (
                <>
                  <span className="self-center text-xs text-ink-muted">Selecione 2 fotos</span>
                  <Button
                    size="sm"
                    disabled={selected.length !== 2}
                    onClick={() => setCompare(selected.map((id) => record.photos.find((p) => p.id === id)!) as [Photo, Photo])}
                  >
                    Comparar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setComparing(false); setSelected([]) }}>Cancelar</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="secondary" icon={<Columns2 className="size-3.5" strokeWidth={1.5} />} disabled={record.photos.length < 2} onClick={() => setComparing(true)}>
                    Comparar
                  </Button>
                  <Button size="sm" icon={<ImagePlus className="size-3.5" strokeWidth={1.5} />} onClick={onAdd}>Adicionar fotos</Button>
                </>
              )}
            </div>
          </div>

          <ol className="space-y-6">
            {groups.map(([date, photos]) => {
              const consultationIds = [...new Set(photos.map((p) => p.consultationId).filter(Boolean))]
              const consultation = consultationIds.length === 1 ? record.consultations.find((c) => c.id === consultationIds[0]) : undefined
              return (
                <li key={date}>
                  <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-sm font-medium text-ink first-letter:uppercase">{formatDate(date, "EEEE, d 'de' MMMM 'de' yyyy")}</h3>
                    {consultation ? (
                      <Badge tone="lilac" dot={false}>Atendimento · {consultation.procedures.map((p) => p.name).join(', ') || 'registro clínico'}</Badge>
                    ) : (
                      <Badge tone="neutral" dot={false}>Acompanhamento</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {photos.map((p) => <PhotoThumb key={p.id} photo={p} selected={comparing && selected.includes(p.id)} onClick={() => toggle(p)} />)}
                  </div>
                  {photos.some((p) => p.caption) && (
                    <p className="mt-2 text-xs text-ink-muted">{[...new Set(photos.map((p) => p.caption).filter(Boolean))].join(' · ')}</p>
                  )}
                </li>
              )
            })}
          </ol>
        </>
      )}

      <PhotoCompare
        photos={compare}
        onClose={() => {
          setCompare(undefined)
          setComparing(false)
          setSelected([])
        }}
      />
    </div>
  )
}
