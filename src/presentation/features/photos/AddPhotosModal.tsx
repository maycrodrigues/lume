import { useState } from 'react'
import type { Consultation, Id, Patient } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { formatDateTime, toDateInput } from '../../lib/format'
import { PendingPhotos, PhotoDropzone, toPending, type PendingPhoto } from './PhotoDropzone'
import { uploadPhotos } from './uploadPhotos'

interface Props {
  open: boolean
  onClose: () => void
  patient: Patient
  consultations: Consultation[]
  consultationId?: Id
}

export const consultationLabel = (c: Consultation) =>
  `${formatDateTime(c.date)}${c.procedures.length ? ` · ${c.procedures.map((p) => p.name).join(', ')}` : ''}`

export function AddPhotosModal(props: Props) {
  return props.open ? <AddPhotosDialog {...props} /> : null
}

function AddPhotosDialog({ onClose, patient, consultations, consultationId: initialConsultation }: Props) {
  const services = useServices()
  const toast = useToast()
  const [items, setItems] = useState<PendingPhoto[]>([])
  const [takenAt, setTakenAt] = useState(toDateInput(new Date()))
  const [consultationId, setConsultationId] = useState<Id | ''>(initialConsultation ?? '')
  const [region, setRegion] = useState('')
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState<number>()
  const [failures, setFailures] = useState<string[]>([])

  const onSubmit = async () => {
    if (items.length === 0) return
    setFailures([])
    setProgress(0)
    const result = await uploadPhotos(
      services,
      items.map((i) => ({ ...i, region: i.region || region })),
      { patientId: patient.id, consultationId: consultationId || undefined, takenAt, caption },
      setProgress,
    )
    setProgress(undefined)
    if (result.saved) toast.success(result.saved === 1 ? 'Foto adicionada.' : `${result.saved} fotos adicionadas.`)
    if (result.failed.length) {
      setFailures(result.failed.map((f) => `${f.name}: ${f.message}`))
      setItems((all) => all.filter((i) => result.failed.some((f) => f.name === i.file.name)))
    } else onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Adicionar fotos"
      description="Fotos de acompanhamento ficam no prontuário, em ordem cronológica."
      onSubmit={onSubmit}
      footer={
        <>
          {progress !== undefined && <span className="num mr-auto text-xs text-ink-muted">Salvando {progress} de {items.length}…</span>}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={progress !== undefined} disabled={items.length === 0}>
            {items.length > 1 ? `Salvar ${items.length} fotos` : 'Salvar foto'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {patient.imageConsent?.scope === 'denied' && (
          <Alert tone="warning" title="Uso de imagem recusado">A paciente recusou a autorização de uso de imagem. Registre fotos apenas com o consentimento dela.</Alert>
        )}
        {!patient.imageConsent && <Alert tone="info">A autorização de uso de imagem ainda não foi registrada para esta paciente (aba Fotos).</Alert>}
        {failures.length > 0 && (
          <Alert title="Algumas fotos não foram salvas">
            <ul>{failures.map((f) => <li key={f}>{f}</li>)}</ul>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data das fotos" required>
            {(id) => <Input id={id} type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />}
          </Field>
          <Field label="Atendimento (opcional)">
            {(id) => (
              <Select id={id} value={consultationId} onChange={(e) => setConsultationId(e.target.value)}>
                <option value="">Sem vínculo — acompanhamento</option>
                {consultations.map((c) => <option key={c.id} value={c.id}>{consultationLabel(c)}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Área (para todas)" hint="Pode ser ajustada foto a foto abaixo">
            {(id) => <Input id={id} list="photo-regions" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ex.: Face — frontal" />}
          </Field>
          <Field label="Legenda (opcional)">
            {(id) => <Input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex.: 15 dias após a 2ª sessão" />}
          </Field>
        </div>
        <PhotoDropzone onFiles={(files) => setItems((all) => [...all, ...toPending(files)])} />
        <PendingPhotos items={items} onChange={setItems} />
      </div>
    </Modal>
  )
}
