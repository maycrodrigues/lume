import type { Appointment } from './appointment'
import type { Entity, ISODate } from './shared'
import { DomainError } from './shared'

/** Horário de um dia da semana, em `HH:mm`. */
export interface DayHours {
  open: boolean
  start: string
  end: string
}

/** Horário de atendimento da clínica. `days[0]` é domingo, `days[6]` é sábado. */
export interface WorkingHours {
  days: DayHours[]
  /** Intervalo obrigatório entre pacientes diferentes, em minutos. */
  intervalMinutes: number
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  days: [
    { open: false, start: '10:00', end: '17:00' },
    { open: true, start: '10:00', end: '17:00' },
    { open: true, start: '10:00', end: '17:00' },
    { open: true, start: '10:00', end: '17:00' },
    { open: true, start: '10:00', end: '17:00' },
    { open: true, start: '10:00', end: '17:00' },
    { open: true, start: '12:00', end: '16:00' },
  ],
  intervalMinutes: 15,
}

export const WEEKDAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

/** Passo dos horários oferecidos para agendar. */
export const SLOT_STEP_MINUTES = 15

/** Bloqueio de agenda: dias (ou uma faixa de horário nesses dias) em que não se agenda. */
export interface ScheduleBlock extends Entity {
  startDate: ISODate
  endDate: ISODate
  /** Sem horário = dia inteiro. */
  startTime?: string
  endTime?: string
  reason?: string
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const toHHMM = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes()
const ON_WEEKDAYS = ['aos domingos', 'às segundas-feiras', 'às terças-feiras', 'às quartas-feiras', 'às quintas-feiras', 'às sextas-feiras', 'aos sábados']

/** Faixa bloqueada no dia, em minutos, ou `undefined` se o bloqueio não alcança a data. */
export function blockRange(block: ScheduleBlock, date: ISODate): { start: number; end: number } | undefined {
  if (date < block.startDate || date > block.endDate) return undefined
  if (!block.startTime || !block.endTime) return { start: 0, end: 24 * 60 }
  return { start: minutesOf(block.startTime), end: minutesOf(block.endTime) }
}

/** O agendamento começa e termina dentro do horário de atendimento do dia. */
export function assertWithinWorkingHours(hours: WorkingHours, start: Date, end: Date): void {
  const day = hours.days[start.getDay()]
  if (!day?.open) throw new DomainError(`A clínica não atende ${ON_WEEKDAYS[start.getDay()]}.`, 'closed_day')
  const sameDay = start.toDateString() === end.toDateString()
  if (!sameDay || minuteOfDay(start) < minutesOf(day.start) || minuteOfDay(end) > minutesOf(day.end)) {
    throw new DomainError(
      `Fora do horário de atendimento (${WEEKDAY_NAMES[start.getDay()]}: ${day.start}–${day.end}). Este agendamento iria das ${toHHMM(minuteOfDay(start))} às ${toHHMM(minuteOfDay(end))}.`,
      'outside_hours',
    )
  }
}

/**
 * Dois agendamentos colidem quando se sobrepõem ou, sendo de pacientes diferentes,
 * não respeitam o intervalo entre eles.
 */
export function collides(
  a: Pick<Appointment, 'start' | 'end' | 'patientId'>,
  b: Pick<Appointment, 'start' | 'end' | 'patientId'>,
  intervalMinutes: number,
): boolean {
  const gap = a.patientId === b.patientId ? 0 : intervalMinutes * 60_000
  const aStart = new Date(a.start).getTime()
  const bStart = new Date(b.start).getTime()
  return aStart < new Date(b.end).getTime() + gap && bStart < new Date(a.end).getTime() + gap
}

