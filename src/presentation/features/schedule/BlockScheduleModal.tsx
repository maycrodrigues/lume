import { useState } from 'react'
import type { AppointmentView } from '@/application'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Switch } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { formatDateTime, toDateInput } from '../../lib/format'

interface Props {
  open: boolean
  onClose: () => void
  initialDate?: Date
}

export function BlockScheduleModal(props: Props) {
  return props.open ? <BlockScheduleDialog {...props} /> : null
}

function BlockScheduleDialog({ onClose, initialDate }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const first = toDateInput(initialDate ?? new Date())
  const [startDate, setStartDate] = useState(first)
  const [endDate, setEndDate] = useState(first)
  const [fullDay, setFullDay] = useState(true)
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime] = useState('14:00')
  const [reason, setReason] = useState('')
  const [affected, setAffected] = useState<AppointmentView[]>()

  const onSubmit = async () => {
    const result = await submit(
      'schedule.block',
      () => services.schedule.createBlock({ startDate, endDate, startTime: fullDay ? '' : startTime, endTime: fullDay ? '' : endTime, reason }),
      { success: 'Agenda bloqueada.' },
    )
    if (!result.ok) return
    if (result.value.affected.length) setAffected(result.value.affected)
    else onClose()
  }

  if (affected) {
    return (
      <Modal open onClose={onClose} size="md" title="Agenda bloqueada" footer={<Button onClick={onClose}>Entendi</Button>}>
        <Alert tone="warning" title={`${affected.length} ${affected.length === 1 ? 'agendamento já estava marcado' : 'agendamentos já estavam marcados'} no período`}>
          <ul className="mt-1 space-y-0.5">
            {affected.map((a) => <li key={a.id}>{formatDateTime(a.start)} · {a.patientName}</li>)}
          </ul>
          <p className="mt-2">Eles não foram alterados. Remarque ou cancele pela agenda.</p>
        </Alert>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Bloquear agenda"
      description="Feriados, férias, cursos ou compromissos: nenhum agendamento pode ser marcado no período."
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Bloquear</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="De" required>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value > endDate) setEndDate(e.target.value)
                }}
              />
            )}
          </Field>
          <Field label="Até" required>
            {(id) => <Input id={id} type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
          </Field>
        </div>
        <Switch checked={fullDay} onChange={setFullDay} label="Dia inteiro" description="Desligue para bloquear só uma faixa de horário nesses dias." />
        {!fullDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Das" required>
              {(id) => <Input id={id} type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
            </Field>
            <Field label="Às" required>
              {(id) => <Input id={id} type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
            </Field>
          </div>
        )}
        <Field label="Motivo">
          {(id) => <Input id={id} data-autofocus placeholder="Ex.: Feriado, férias, curso" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  )
}
