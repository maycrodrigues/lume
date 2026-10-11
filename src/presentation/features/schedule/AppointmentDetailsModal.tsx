import { CalendarClock, CheckCircle2, ClipboardPen, ExternalLink, RotateCcw, Trash2, UserX, XCircle } from 'lucide-react'
import { Link } from 'react-router'
import type { AppointmentView } from '@/application'
import type { AppointmentStatus } from '@/domain'
import { allowedManualTransitions, isEditableAppointment } from '@/domain'
import { useServices } from '../../app/services'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/Confirm'
import { Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDateTime, formatDuration, formatMoney, formatTime } from '../../lib/format'
import { APPOINTMENT_STATUS } from '../../lib/labels'

interface Props {
  appointmentId?: string
  onClose: () => void
  onReschedule: (a: AppointmentView) => void
  onRegister: (a: AppointmentView) => void
}

const STATUS_ACTIONS: Partial<Record<AppointmentStatus, { label: string; icon: typeof CheckCircle2; success: string }>> = {
  confirmed: { label: 'Confirmar', icon: CheckCircle2, success: 'Agendamento confirmado.' },
  no_show: { label: 'Faltou', icon: UserX, success: 'Falta registrada.' },
  cancelled: { label: 'Cancelar', icon: XCircle, success: 'Agendamento cancelado.' },
  scheduled: { label: 'Reabrir', icon: RotateCcw, success: 'Agendamento reaberto.' },
}

export function AppointmentDetailsModal({ appointmentId, onClose, onReschedule, onRegister }: Props) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const { data: a } = useLiveQuery(() => (appointmentId ? services.appointments.getView(appointmentId) : Promise.resolve(undefined)), [appointmentId])
  const view = a && a.id === appointmentId ? a : undefined

  const setStatus = async (status: AppointmentStatus) => {
    if (!view) return
    const meta = STATUS_ACTIONS[status]!
    if (status === 'cancelled') {
      const ok = await confirm({ title: 'Cancelar agendamento', message: `Cancelar o horário de ${view.patientName} às ${formatTime(view.start)}? O horário fica livre na agenda.`, confirmLabel: 'Cancelar agendamento' })
      if (!ok) return
    }
    await action('appointment.status', () => services.appointments.setStatus(view.id, status), { success: meta.success })
  }

  const remove = async () => {
    if (!view) return
    const ok = await confirm({ title: 'Excluir agendamento', message: 'O agendamento será removido da agenda. Para manter o histórico, prefira cancelar.', confirmLabel: 'Excluir' })
    if (ok && (await action('appointment.remove', () => services.appointments.remove(view.id), { success: 'Agendamento excluído.' })).ok) onClose()
  }

  const open = Boolean(appointmentId)
  const transitions = view ? allowedManualTransitions(view.status).filter((s) => !(view.status === 'confirmed' && s === 'scheduled')) : []
  const editable = view ? isEditableAppointment(view) : false

  return (
    <Modal open={open} onClose={onClose} title="Agendamento" size="md">
      {view && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={view.patientName} />
            <div className="min-w-0 flex-1">
              <Link to={`/admin/pacientes/${view.patientId}`} className="inline-flex items-center gap-1 font-medium text-ink hover:text-accent">
                {view.patientName}
                <ExternalLink className="size-3.5" strokeWidth={1.5} />
              </Link>
              <p className="text-sm text-ink-muted">
                {formatDateTime(view.start)} – {formatTime(view.end)}
              </p>
            </div>
            <Badge tone={APPOINTMENT_STATUS[view.status].tone}>{APPOINTMENT_STATUS[view.status].label}</Badge>
          </div>

          <ul className="divide-y divide-line rounded-xl border border-line">
            {view.items.map((item) => (
              <li key={item.procedureId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-ink">{item.name}</span>
                <span className="num flex items-center gap-4 text-ink-muted">
                  {formatDuration(item.durationMinutes)}
                  <span className="w-24 text-right text-ink">{formatMoney(item.price)}</span>
                </span>
              </li>
            ))}
            <li className="flex justify-between bg-offwhite/60 px-4 py-2.5 text-sm font-medium">
              <span>Total</span>
              <span className="num">{formatMoney(view.total)}</span>
            </li>
          </ul>

          {view.notes && <p className="rounded-xl bg-perola-soft px-4 py-3 text-sm text-ink-soft">{view.notes}</p>}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {editable && (
              <Button icon={<ClipboardPen className="size-4" strokeWidth={1.75} />} onClick={() => onRegister(view)}>
                Registrar atendimento
              </Button>
            )}
            {view.status === 'completed' && (
              <Link to={`/admin/pacientes/${view.patientId}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-noite px-4 text-sm font-medium text-white">
                Ver no prontuário
              </Link>
            )}
            {editable && (
              <Button variant="secondary" icon={<CalendarClock className="size-4" strokeWidth={1.5} />} onClick={() => onReschedule(view)}>
                Remarcar
              </Button>
            )}
            {transitions.map((status) => {
              const meta = STATUS_ACTIONS[status]!
              const Icon = meta.icon
              return (
                <Button key={status} variant="secondary" icon={<Icon className="size-4" strokeWidth={1.5} />} onClick={() => setStatus(status)}>
                  {meta.label}
                </Button>
              )
            })}
            {view.status !== 'completed' && (
              <Button variant="ghost" className="ml-auto text-danger hover:!bg-danger-soft hover:!text-danger" icon={<Trash2 className="size-4" strokeWidth={1.5} />} onClick={remove}>
                Excluir
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
