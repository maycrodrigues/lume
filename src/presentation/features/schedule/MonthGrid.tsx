import clsx from 'clsx'
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AppointmentView, DayAvailability } from '@/application'
import { formatTime } from '../../lib/format'
import { APPOINTMENT_STATUS } from '../../lib/labels'
import { STATUS_DOT } from './statusStyles'

const VISIBLE_PER_DAY = 3

/** Primeiro e último dia exibidos na grade do mês (semanas completas, começando na segunda). */
export function monthGridRange(month: Date) {
  return {
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }
}

interface Props {
  month: Date
  appointments: AppointmentView[]
  availability?: DayAvailability[]
  onDayClick: (day: Date) => void
  onCreate: (start: Date) => void
  onAppointmentClick: (a: AppointmentView) => void
}

export function MonthGrid({ month, appointments, availability, onDayClick, onCreate, onAppointmentClick }: Props) {
  const { start, end } = monthGridRange(month)
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line bg-white">
        {days.slice(0, 7).map((d) => (
          <p key={d.toISOString()} className="px-2 py-2.5 text-center text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">
            {format(d, 'EEEEEE', { locale: ptBR })}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, month)
          const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.start), day))
          const hidden = dayAppointments.length - VISIBLE_PER_DAY
          const info = availability?.find((d) => d.date === format(day, 'yyyy-MM-dd'))
          const fullBlock = info?.blocks.find((b) => b.fullDay)
          const closed = Boolean(info && (!info.open || fullBlock))
          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                if (closed || !info?.start) return
                const [h, m] = info.start.split(':').map(Number)
                const start = new Date(day)
                start.setHours(h, m, 0, 0)
                onCreate(start)
              }}
              title={closed ? (fullBlock ? `Agenda bloqueada${fullBlock.reason ? ` · ${fullBlock.reason}` : ''}` : 'Sem atendimento neste dia') : undefined}
              className={clsx(
                'min-h-24 border-b border-line p-1 sm:min-h-32 sm:p-1.5',
                i % 7 !== 6 && 'border-r',
                closed ? 'closed-hatch cursor-not-allowed' : 'cursor-copy',
                !closed && !inMonth && 'bg-offwhite/60',
                !closed && isToday(day) && 'bg-perola-soft/40',
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDayClick(day)
                  }}
                  aria-label={`Ver ${format(day, "d 'de' MMMM", { locale: ptBR })}`}
                  className={clsx(
                    'num flex size-7 items-center justify-center rounded-full text-[13px] transition-colors',
                    isToday(day) ? 'bg-noite font-medium text-white' : inMonth ? 'text-ink hover:bg-perola' : 'text-ink-muted/60 hover:bg-perola-soft',
                  )}
                >
                  {format(day, 'd')}
                </button>
                {dayAppointments.length > 0 && (
                  <span className="num pr-1 text-[10px] text-ink-muted sm:hidden">{dayAppointments.length}</span>
                )}
              </div>

              {closed && inMonth && (
                <p className="mt-1 hidden truncate px-1 text-[11px] font-medium text-ink-muted sm:block">
                  {fullBlock ? `Bloqueado${fullBlock.reason ? ` · ${fullBlock.reason}` : ''}` : 'Fechado'}
                </p>
              )}
              {!closed && info?.blocks.length ? (
                <p className="mt-1 hidden truncate px-1 text-[10px] text-ink-muted sm:block">
                  Bloqueio {info.blocks[0].start}–{info.blocks[0].end}
                </p>
              ) : null}

              {/* Celular: só pontos coloridos; a lista completa fica na visão Dia. */}
              <div className="mt-1 flex flex-wrap gap-0.5 px-1 sm:hidden">
                {dayAppointments.slice(0, 6).map((a) => (
                  <span key={a.id} className={clsx('size-1.5 rounded-full', STATUS_DOT[a.status])} />
                ))}
              </div>

              <ul className={clsx('mt-1 hidden space-y-0.5 sm:block', !inMonth && 'opacity-60')}>
                {dayAppointments.slice(0, VISIBLE_PER_DAY).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(a)
                      }}
                      title={`${formatTime(a.start)}–${formatTime(a.end)} · ${a.patientName} · ${APPOINTMENT_STATUS[a.status].label}`}
                      className={clsx(
                        'flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] transition-colors hover:bg-perola',
                        a.status === 'cancelled' && 'text-ink-muted line-through decoration-ink-muted/40',
                      )}
                    >
                      <span className={clsx('size-1.5 shrink-0 rounded-full', STATUS_DOT[a.status])} />
                      <span className="num shrink-0 text-ink-muted">{formatTime(a.start)}</span>
                      <span className="truncate text-ink">{a.patientName}</span>
                    </button>
                  </li>
                ))}
                {hidden > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDayClick(day)
                      }}
                      className="px-1.5 text-[11px] font-medium text-accent hover:text-noite"
                    >
                      +{hidden} {hidden === 1 ? 'outro' : 'outros'}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
