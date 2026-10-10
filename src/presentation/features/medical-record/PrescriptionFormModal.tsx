import { useState } from 'react'
import type { Id, Prescription } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { toDateInput } from '../../lib/format'
import { fromDrafts, PrescriptionItemsEditor, toDrafts } from './PrescriptionItemsEditor'

interface Props {
  open: boolean
  onClose: () => void
  patientId: Id
  prescription?: Prescription
}

export function PrescriptionFormModal(props: Props) {
  return props.open ? <PrescriptionFormDialog {...props} /> : null
}

function PrescriptionFormDialog({ onClose, patientId, prescription }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const [date, setDate] = useState(prescription?.date ?? toDateInput(new Date()))
  const [items, setItems] = useState(toDrafts(prescription?.items ?? []))
  const [notes, setNotes] = useState(prescription?.notes ?? '')

  const onSubmit = async () => {
    const input = { patientId, consultationId: prescription?.consultationId, date, items: fromDrafts(items), notes }
    const result = await submit(prescription ? 'prescription.update' : 'prescription.create', () =>
      prescription ? services.prescriptions.update(prescription.id, input) : services.prescriptions.create(input),
      { success: prescription ? 'Prescrição atualizada.' : 'Prescrição criada.' },
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={prescription ? 'Editar prescrição' : 'Nova prescrição'}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Salvar prescrição</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Data" required className="w-48">
          {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <PrescriptionItemsEditor items={items} onChange={setItems} />
        <Field label="Observações gerais">
          {(id) => <Textarea id={id} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  )
}
