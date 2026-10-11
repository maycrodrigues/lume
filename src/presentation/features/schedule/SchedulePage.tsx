import { addDays, addMonths, addWeeks, endOfWeek, format, isSameMonth, startOfDay, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarOff, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react'
import { useState } from 'react'
import type { AppointmentView } from '@/application'
import type { AppointmentStatus } from '@/domain'
import { isActiveAppointment, sumCents } from '@/domain'
import { useServices } from '../../app/services'
import { Button, ButtonLink, IconButton } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/Confirm'
import { Card } from '../../components/ui/Card'
import { Segmented } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatMoney } from '../../lib/format'
import { APPOINTMENT_STATUS } from '../../lib/labels'
import { ConsultationFormModal } from '../medical-record/ConsultationFormModal'
import { AppointmentDetailsModal } from './AppointmentDetailsModal'
import { BlockScheduleModal } from './BlockScheduleModal'
import { AppointmentFormModal } from './AppointmentFormModal'
import { CalendarGrid } from './CalendarGrid'
import { MonthGrid, monthGridRange } from './MonthGrid'
import { STATUS_DOT } from './statusStyles'

type View = 'day' | 'week' | 'month'

export function SchedulePage() {
  const services = useServices()
  const [view, setView] = useState<View>(() => (window.innerWidth < 768 ? 'day' : 'week'))
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [creating, setCreating] = useState<{ start?: Date } | undefined>()
  const [rescheduling, setRescheduling] = useState<AppointmentView>()
  const [selectedId, setSelectedId] = useState<string>()
  const [registering, setRegistering] = useState<AppointmentView>()

  const monthRange = monthGridRange(anchor)
  const rangeStart = view === 'month' ? monthRange.start : view === 'week' ? startOfWeek(anchor, { weekStartsOn: 1 }) : anchor
  const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)) : [anchor]
  const rangeEnd = view === 'month' ? addDays(monthRange.end, 1) : addDays(days[days.length - 1], 1)

  const { data: appointments = [] } = useLiveQuery(
    () => services.appointments.listRange(rangeStart.toISOString(), rangeEnd.toISOString()),
    [rangeStart.getTime(), rangeEnd.getTime()],
  )
  const { data: availability } = useLiveQuery(
    () => services.schedule.availability(format(rangeStart, 'yyyy-MM-dd'), format(addDays(rangeEnd, -1), 'yyyy-MM-dd')),
    [rangeStart.getTime(), rangeEnd.getTime()],
  )
  const [blocking, setBlocking] = useState(false)
  const confirm = useConfirm()
  const action = useAction()
  const unblock = async (blockId: string) => {
    const ok = await confirm({ title: 'Desbloquear agenda', message: 'O período volta a ficar disponível para agendamentos.', confirmLabel: 'Desbloquear', tone: 'primary' })
    if (ok) await action('schedule.unblock', () => services.schedule.removeBlock(blockId), { success: 'Agenda desbloqueada.' })
  }

  // No mês, a grade mostra dias das semanas vizinhas; o resumo conta só o mês em foco.
  const active = appointments.filter((a) => isActiveAppointment(a) && (view !== 'month' || isSameMonth(new Date(a.start), anchor)))
  const move = (step: number) =>
    setAnchor((d) => (view === 'month' ? addMonths(d, step) : view === 'week' ? addWeeks(d, step) : addDays(d, step)))
  const title =
    view === 'month'
      ? format(anchor, "MMMM 'de' yyyy", { locale: ptBR })
      : view === 'week'
        ? `${format(rangeStart, "d 'de' MMM", { locale: ptBR })} – ${format(endOfWeek(anchor, { weekStartsOn: 1 }), "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
        : format(anchor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title="Agendamentos"
        description="Clique em um horário livre para agendar. Áreas hachuradas estão fora do horário de atendimento ou bloqueadas."
        actions={
          <>
            <ButtonLink to="/admin/configuracoes" variant="ghost" icon={<Clock className="size-4" strokeWidth={1.5} />}>Horário de atendimento</ButtonLink>
            <Button variant="secondary" icon={<CalendarOff className="size-4" strokeWidth={1.5} />} onClick={() => setBlocking(true)}>Bloquear agenda</Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setCreating({})}>Novo agendamento</Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>Hoje</Button>
            <IconButton label="Anterior" onClick={() => move(-1)}>
              <ChevronLeft className="size-4" strokeWidth={1.5} />
            </IconButton>
            <IconButton label="Próximo" onClick={() => move(1)}>
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </IconButton>
            <h2 className="ml-1 text-[15px] font-medium text-ink first-letter:uppercase">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p className="num text-xs text-ink-muted">
              {active.length} {active.length === 1 ? 'agendamento' : 'agendamentos'} · previsto {formatMoney(sumCents(active.map((a) => a.total)))}
            </p>
            <Segmented<View>
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: 'day', label: 'Dia' },
                { value: 'week', label: 'Semana' },
                { value: 'month', label: 'Mês' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line bg-offwhite/50 px-5 py-2">
          {(Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]).map((status) => (
            <span key={status} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
              {APPOINTMENT_STATUS[status].label}
            </span>
          ))}
        </div>

        {view === 'month' ? (
          <MonthGrid
            month={anchor}
            appointments={appointments}
            availability={availability}
            onDayClick={(day) => {
              setAnchor(startOfDay(day))
              setView('day')
            }}
            onCreate={(start) => setCreating({ start })}
            onAppointmentClick={(a) => setSelectedId(a.id)}
          />
        ) : (
          <div className="max-h-[calc(100dvh-300px)] min-h-[480px] overflow-y-auto">
            <CalendarGrid
              days={days}
              appointments={appointments}
              availability={availability}
              onSlotClick={(start) => setCreating({ start })}
              onAppointmentClick={(a) => setSelectedId(a.id)}
              onBlockClick={unblock}
            />
          </div>
        )}
      </Card>

      <AppointmentFormModal open={creating !== undefined} initialStart={creating?.start} onClose={() => setCreating(undefined)} />
      <AppointmentFormModal open={rescheduling !== undefined} appointment={rescheduling} onClose={() => setRescheduling(undefined)} />
      <AppointmentDetailsModal
        appointmentId={selectedId}
        onClose={() => setSelectedId(undefined)}
        onReschedule={(a) => {
          setSelectedId(undefined)
          setRescheduling(a)
        }}
        onRegister={(a) => {
          setSelectedId(undefined)
          setRegistering(a)
        }}
      />
      <ConsultationFormModal open={registering !== undefined} appointment={registering} onClose={() => setRegistering(undefined)} />
      <BlockScheduleModal open={blocking} initialDate={anchor} onClose={() => setBlocking(false)} />
    </>
  )
}
