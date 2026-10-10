import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, Clock, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDaysISO } from '@/application/dates'
import type { Appointment, Id } from '@/domain'
import { normalizeText, ScheduleConflictError } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PatientPicker } from '../../components/ui/PatientPicker'
import { useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatDuration, formatMoney, formatTime, fromDateTimeInputs, toDateInput, toTimeInput } from '../../lib/format'

interface Props {
  open: boolean
  onClose: () => void
  appointment?: Appointment
  initialStart?: Date
  initialPatientId?: Id
}

const PERIODS = [
  { label: 'Manhã', until: '12:00' },
  { label: 'Tarde', until: '18:00' },
  { label: 'Noite', until: '24:00' },
]

/** Quantos dias à frente procurar o próximo dia com horário disponível. */
const SEARCH_AHEAD_DAYS = 60

export function AppointmentFormModal(props: Props) {
  return props.open ? <AppointmentFormDialog {...props} /> : null
}

function AppointmentFormDialog({ onClose, appointment, initialStart, initialPatientId }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: patients = [] } = useLiveQuery(() => services.patients.list(), [])
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list({ includeInactive: false }), [])

  const start = appointment ? new Date(appointment.start) : initialStart
  const today = toDateInput(new Date())
  const [patientId, setPatientId] = useState<Id | undefined>(appointment?.patientId ?? initialPatientId)
  const [date, setDate] = useState(start ? toDateInput(start) : today)
  /** Só recebe valores escolhidos entre os horários disponíveis (ou o horário clicado na agenda, se continuar disponível). */
  const [time, setTime] = useState(start ? toTimeInput(start) : '')
  const [selected, setSelected] = useState<Id[]>(appointment?.items.map((i) => i.procedureId) ?? [])
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [search, setSearch] = useState('')
  const [conflicts, setConflicts] = useState<Appointment[]>()
  const [searching, setSearching] = useState(false)

  const chosen = selected.map((id) => procedures.find((p) => p.id === id) ?? appointment?.items.find((i) => i.procedureId === id)).filter(Boolean) as Array<{ name: string; price: number; durationMinutes: number }>
  const duration = chosen.reduce((s, p) => s + p.durationMinutes, 0)
  const total = chosen.reduce((s, p) => s + p.price, 0)

  const visible = useMemo(() => {
    const term = normalizeText(search)
    return procedures.filter((p) => !term || normalizeText(`${p.name} ${p.category}`).includes(term))
  }, [procedures, search])

  const toggle = (id: Id) => {
    setConflicts(undefined)
    setSelected((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]))
  }

  const changeDate = (next: string) => {
    if (!next) return
    setDate(next)
    setTime('')
    setConflicts(undefined)
  }

  const { data: day } = useLiveQuery(async () => (date ? (await services.schedule.availability(date, date))[0] : undefined), [date])
  const { data: freeSlots, loading: slotsLoading } = useLiveQuery(
    () => (date && duration > 0 ? services.schedule.freeSlots({ date, durationMinutes: duration, patientId, ignoreAppointmentId: appointment?.id }) : Promise.resolve(undefined)),
    [date, duration, patientId, appointment?.id],
  )

  // O horário escolhido sai da seleção se deixar de estar disponível (outra duração, outra data).
  useEffect(() => {
    if (!slotsLoading && freeSlots && time && !freeSlots.includes(time)) setTime('')
  }, [freeSlots, slotsLoading, time])

  const grouped = PERIODS.map((period, i) => ({
    label: period.label,
    slots: (freeSlots ?? []).filter((s) => s < period.until && (i === 0 || s >= PERIODS[i - 1].until)),
  })).filter((g) => g.slots.length > 0)

  const findNextDay = async () => {
    setSearching(true)
    try {
      for (let i = 1; i <= SEARCH_AHEAD_DAYS; i++) {
        const candidate = addDaysISO(date, i)
        const slots = await services.schedule.freeSlots({ date: candidate, durationMinutes: duration, patientId, ignoreAppointmentId: appointment?.id })
        if (slots.length > 0) return changeDate(candidate)
      }
    } finally {
      setSearching(false)
    }
  }

  const end = date && time ? new Date(new Date(`${date}T${time}`).getTime() + duration * 60_000) : undefined
  const ready = Boolean(patientId && duration > 0 && time)

  const save = async () => {
    const input = { patientId: patientId ?? '', start: fromDateTimeInputs(date, time), procedureIds: selected, notes }
    const result = await submit(appointment ? 'appointment.reschedule' : 'appointment.schedule', () =>
      appointment ? services.appointments.reschedule(appointment.id, input) : services.appointments.schedule(input),
      {
        success: appointment ? 'Agendamento atualizado.' : 'Agendamento criado.',
        onError: (e) => {
          if (e instanceof ScheduleConflictError) {
            setConflicts(e.conflicts)
            setTime('')
            return true
          }
          return false
        },
      },
    )
    if (result.ok) onClose()
  }

  const nameOf = (id: Id) => patients.find((p) => p.id === id)?.name ?? 'Paciente'

  let slotsContent: ReactNode
  if (duration === 0) {
    slotsContent = <p className="rounded-xl bg-offwhite px-4 py-3 text-sm text-ink-muted">Selecione os procedimentos para ver os horários disponíveis — eles dependem da duração do atendimento.</p>
  } else if (!day || (slotsLoading && !freeSlots)) {
    slotsContent = <p className="px-1 py-3 text-sm text-ink-muted">Buscando horários…</p>
  } else if (!freeSlots || freeSlots.length === 0) {
    const reason = date < today
      ? 'Esta data já passou.'
      : !day.open
        ? 'A clínica não atende neste dia.'
        : day.blocks.some((b) => b.fullDay)
          ? `Agenda bloqueada neste dia${day.blocks[0].reason ? ` (${day.blocks[0].reason})` : ''}.`
          : `Não há horário disponível neste dia para ${formatDuration(duration)}.`
    slotsContent = (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-offwhite px-4 py-3">
        <p className="text-sm text-ink-muted">{reason}</p>
        <Button size="sm" variant="secondary" loading={searching} onClick={findNextDay}>Próximo dia com horário</Button>
      </div>
    )
  } else {
    slotsContent = (
      <div className="space-y-3" role="radiogroup" aria-label="Horários disponíveis">
        {grouped.map((group) => (
          <div key={group.label} className="flex gap-2">
            <span className="w-14 shrink-0 pt-2 text-[11px] font-medium tracking-wide text-ink-muted uppercase">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
            {group.slots.map((slot) => (
              <button
                key={slot}
                type="button"
                role="radio"
                aria-checked={slot === time}
                onClick={() => {
                  setTime(slot)
                  setConflicts(undefined)
                }}
                className={clsx(
                  'num h-8 rounded-full px-3 text-xs transition-colors',
                  slot === time ? 'bg-noite text-white' : 'border border-line-strong bg-white text-ink-soft hover:border-cinza hover:text-ink',
                )}
              >
                {slot}
              </button>
            ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={appointment ? 'Remarcar agendamento' : 'Novo agendamento'}
      onSubmit={() => ready && save()}
      footer={
        <>
          <div className="num mr-auto text-xs text-ink-muted">
            {duration === 0
              ? 'Selecione os procedimentos'
              : !time
                ? `${formatDuration(duration)} · escolha um horário disponível`
                : (
                    <>
                      {formatDate(date, 'dd/MM')} · {time}–{end ? formatTime(end.toISOString()) : ''} · {formatDuration(duration)} · <strong className="font-medium text-ink">{formatMoney(total)}</strong>
                    </>
                  )}
          </div>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending} disabled={!ready}>{appointment ? 'Salvar' : 'Agendar'}</Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <Alert>{error}</Alert>}
        {conflicts && (
          <Alert title="Este horário acabou de ser ocupado">
            Conflita com {conflicts.length === 1 ? 'o agendamento' : 'os agendamentos'}:
            <ul className="mt-1 space-y-0.5">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {formatTime(c.start)}–{formatTime(c.end)} · {nameOf(c.patientId)}
                </li>
              ))}
            </ul>
            <p className="mt-1">Escolha outro horário disponível.</p>
          </Alert>
        )}

        <Field label="Paciente" required>
          {(id) => <PatientPicker id={id} patients={patients} value={patientId} onChange={(v) => { setPatientId(v); setConflicts(undefined) }} />}
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-ink-soft">
              Procedimentos <span className="text-danger">*</span>
            </p>
            <div className="relative w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
              <Input className="h-8 pl-8 text-xs" placeholder="Filtrar" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Filtrar procedimentos" />
            </div>
          </div>
          {procedures.length === 0 ? (
            <Alert tone="info">Cadastre procedimentos no catálogo para poder agendar.</Alert>
          ) : (
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {visible.map((p) => {
                const on = selected.includes(p.id)
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => toggle(p.id)} aria-pressed={on} className={clsx('flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors', on ? 'bg-perola-soft' : 'hover:bg-offwhite')}>
                      <span className={clsx('flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors', on ? 'border-noite bg-noite text-white' : 'border-line-strong bg-white')}>
                        {on && <Check className="size-3.5" strokeWidth={2.5} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{p.name}</span>
                        <span className="text-[11px] text-ink-muted">{p.category}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        <Clock className="size-3" strokeWidth={1.5} />
                        {formatDuration(p.durationMinutes)}
                      </span>
                      <span className="num w-24 text-right text-sm text-ink">{formatMoney(p.price)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <IconButton label="Dia anterior" onClick={() => changeDate(addDaysISO(date, -1))}>
                <ChevronLeft className="size-4" strokeWidth={1.5} />
              </IconButton>
              <Input type="date" className="h-9 w-40" value={date} onChange={(e) => changeDate(e.target.value)} aria-label="Data do agendamento" />
              <IconButton label="Próximo dia" onClick={() => changeDate(addDaysISO(date, 1))}>
                <ChevronRight className="size-4" strokeWidth={1.5} />
              </IconButton>
              <span className="ml-2 text-sm text-ink first-letter:uppercase">{formatDate(date, "EEEE, d 'de' MMMM")}</span>
            </div>
            {day?.open && <p className="text-[11px] text-ink-muted">Atendimento das {day.start} às {day.end}</p>}
          </div>
          <p className="mb-2 text-xs font-medium text-ink-soft">
            Horários disponíveis <span className="text-danger">*</span>
          </p>
          {slotsContent}
        </div>

        <Field label="Observações">
          {(id) => <Textarea id={id} rows={2} placeholder="Ex.: chegar 10 minutos antes, trazer exames…" value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  )
}
