import clsx from 'clsx'
import { format, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import type { AppointmentView, DayAvailability } from '@/application'
import { minutesOf } from '@/domain'
import { formatTime } from '../../lib/format'
import { APPOINTMENT_STATUS } from '../../lib/labels'
import { STATUS_BLOCK } from './statusStyles'

const FIRST_HOUR = 7
const LAST_HOUR = 21
const HOUR_HEIGHT = 60
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i)

const minutesOfDay = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

/** Distribui agendamentos sobrepostos em colunas lado a lado. */
function layoutDay(appointments: AppointmentView[]) {
  const sorted = [...appointments].sort((a, b) => a.start.localeCompare(b.start))
  const placed: Array<{ a: AppointmentView; lane: number; lanes: number }> = []
  let cluster: typeof placed = []
  let clusterEnd = ''
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1))
    cluster.forEach((p) => (p.lanes = lanes))
    cluster = []
  }
  for (const a of sorted) {
    if (cluster.length && a.start >= clusterEnd) flush()
    const used = new Set(cluster.filter((p) => p.a.end > a.start).map((p) => p.lane))
    let lane = 0
    while (used.has(lane)) lane++
    const item = { a, lane, lanes: 1 }
    cluster.push(item)
    placed.push(item)
    clusterEnd = a.end > clusterEnd ? a.end : clusterEnd
  }
  flush()
  return placed
}

interface Props {
  days: Date[]
  appointments: AppointmentView[]
  /** Horário de atendimento e bloqueios de cada dia exibido. */
  availability?: DayAvailability[]
  onSlotClick: (start: Date) => void
  onAppointmentClick: (a: AppointmentView) => void
  onBlockClick?: (blockId: string) => void
}

/** Faixas fechadas do dia (em minutos): antes/depois do expediente, dia sem atendimento e bloqueios. */
function closedRanges(day: DayAvailability | undefined) {
  const gridStart = FIRST_HOUR * 60
  const gridEnd = LAST_HOUR * 60
  if (!day) return { hours: [] as Array<{ start: number; end: number }>, blocks: [] as DayAvailability['blocks'] }
  const hours = !day.open
    ? [{ start: gridStart, end: gridEnd }]
    : [
        { start: gridStart, end: minutesOf(day.start!) },
        { start: minutesOf(day.end!), end: gridEnd },
      ].filter((r) => r.end > r.start)
  return { hours, blocks: day.blocks }
}

const isClosedAt = (day: DayAvailability | undefined, minute: number) => {
  if (!day) return false
  if (!day.open || minute < minutesOf(day.start!) || minute >= minutesOf(day.end!)) return true
  return day.blocks.some((b) => b.fullDay || (minute >= minutesOf(b.start) && minute < minutesOf(b.end)))
}

export function CalendarGrid({ days, appointments, availability, onSlotClick, onAppointmentClick, onBlockClick }: Props) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const nowTop = ((now.getHours() * 60 + now.getMinutes() - FIRST_HOUR * 60) / 60) * HOUR_HEIGHT

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? 840 : undefined }}>
        <div className="sticky top-0 z-10 grid border-b border-line bg-white" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="border-l border-line px-3 py-3 text-center">
              <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={clsx('mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-[15px]', isToday(day) ? 'bg-noite font-medium text-white' : 'text-ink')}>{format(day, 'd')}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div>
            {HOURS.map((h) => (
              <div key={h} className="relative pr-2 text-right text-[11px] text-ink-muted" style={{ height: HOUR_HEIGHT }}>
                <span className="num relative -top-2">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {days.map((day) => {
            const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.start), day))
            const dayAvailability = availability?.find((d) => d.date === format(day, 'yyyy-MM-dd'))
            const closed = closedRanges(dayAvailability)
            const toTop = (minute: number) => ((minute - FIRST_HOUR * 60) / 60) * HOUR_HEIGHT
            return (
              <div
                key={day.toISOString()}
                className={clsx('relative cursor-copy border-l border-line', isToday(day) && 'bg-perola-soft/40')}
                style={{ height: HOURS.length * HOUR_HEIGHT }}
                onClick={(e) => {
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                  const minutes = Math.floor(((y / HOUR_HEIGHT) * 60) / 15) * 15 + FIRST_HOUR * 60
                  if (isClosedAt(dayAvailability, minutes)) return
                  const start = new Date(day)
                  start.setHours(0, minutes, 0, 0)
                  onSlotClick(start)
                }}
              >
                {closed.hours.map((r) => (
                  <div
                    key={`h-${r.start}`}
                    className="closed-hatch absolute inset-x-0 z-[1] cursor-not-allowed"
                    style={{ top: toTop(r.start), height: toTop(r.end) - toTop(r.start) }}
                    title={dayAvailability?.open ? 'Fora do horário de atendimento' : 'Sem atendimento neste dia'}
                  >
                    {!dayAvailability?.open && r.start === FIRST_HOUR * 60 && (
                      <p className="sticky top-2 px-2 pt-2 text-center text-[11px] font-medium text-ink-muted">Fechado</p>
                    )}
                  </div>
                ))}
                {closed.blocks.map((b) => {
                  const start = Math.max(b.fullDay ? FIRST_HOUR * 60 : minutesOf(b.start), FIRST_HOUR * 60)
                  const end = Math.min(b.fullDay ? LAST_HOUR * 60 : minutesOf(b.end), LAST_HOUR * 60)
                  if (end <= start) return null
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBlockClick?.(b.id)
                      }}
                      className="closed-hatch absolute inset-x-0 z-[2] border-y border-cinza/70 px-2 py-1 text-left"
                      style={{ top: toTop(start), height: toTop(end) - toTop(start) }}
                      title="Agenda bloqueada — clique para desbloquear"
                    >
                      <span className="inline-block max-w-full truncate rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                        Bloqueado{b.reason ? ` · ${b.reason}` : ''}
                      </span>
                    </button>
                  )
                })}
                {HOURS.map((h) => (
                  <div key={h} className="border-b border-line/70" style={{ height: HOUR_HEIGHT }}>
                    <div className="h-1/2 border-b border-dashed border-line/40" />
                  </div>
                ))}
                {isToday(day) && nowTop >= 0 && nowTop <= HOURS.length * HOUR_HEIGHT && (
                  <div className="pointer-events-none absolute right-0 left-0 z-[5] flex items-center" style={{ top: nowTop }}>
                    <span className="-ml-1 size-2 rounded-full bg-accent" />
                    <span className="h-px flex-1 bg-accent" />
                  </div>
                )}
                {layoutDay(dayAppointments).map(({ a, lane, lanes }) => {
                  const top = ((minutesOfDay(a.start) - FIRST_HOUR * 60) / 60) * HOUR_HEIGHT
                  const height = Math.max(((new Date(a.end).getTime() - new Date(a.start).getTime()) / 3_600_000) * HOUR_HEIGHT, 24)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(a)
                      }}
                      title={`${formatTime(a.start)}–${formatTime(a.end)} · ${a.patientName} · ${APPOINTMENT_STATUS[a.status].label}`}
                      className={clsx('absolute z-[3] overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left shadow-sm transition-shadow hover:z-10 hover:shadow-md', STATUS_BLOCK[a.status])}
                      style={{ top: top + 1, height: height - 2, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                    >
                      {height < 44 ? (
                        <p className="truncate text-[11px] leading-tight">
                          <span className="num text-ink-soft">{formatTime(a.start)}</span> <span className="font-medium">{a.patientName}</span>
                        </p>
                      ) : (
                        <>
                          <p className="num truncate text-[11px] text-ink-soft">
                            {formatTime(a.start)} · {APPOINTMENT_STATUS[a.status].label}
                          </p>
                          <p className="truncate text-xs font-medium">{a.patientName}</p>
                          {height > 52 && <p className="truncate text-[11px] text-ink-soft">{a.items.map((i) => i.name).join(', ')}</p>}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
