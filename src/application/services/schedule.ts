import { z } from 'zod'
import type { Appointment, Id, ISODate, ScheduleBlock, WorkingHours } from '@/domain'
import {
  assertWithinWorkingHours,
  blockRange,
  CLINIC_SETTINGS_ID,
  collides,
  DEFAULT_WORKING_HOURS,
  DomainError,
  isActiveAppointment,
  minutesOf,
  NotFoundError,
  ScheduleConflictError,
  SLOT_STEP_MINUTES,
  toHHMM,
} from '@/domain'
import { addDaysISO, formatDateBR, toLocalISODate } from '../dates'
import type { DataStore } from '../ports'
import { isoDate, optionalText, parse } from '../validation'
import type { AppointmentView } from './appointments'
import type { ServiceDeps } from './deps'

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.')
const optionalTime = z
  .union([time, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

const blockSchema = z
  .object({ startDate: isoDate, endDate: isoDate, startTime: optionalTime, endTime: optionalTime, reason: optionalText })
  .refine((b) => b.endDate >= b.startDate, 'A data final deve ser igual ou posterior à data inicial.')
  .refine((b) => Boolean(b.startTime) === Boolean(b.endTime), 'Informe o horário inicial e o final, ou deixe os dois vazios para bloquear o dia inteiro.')
  .refine((b) => !b.startTime || !b.endTime || b.startTime < b.endTime, 'O horário inicial deve ser antes do final.')

export type BlockInput = z.input<typeof blockSchema>

export interface DayAvailability {
  date: ISODate
  open: boolean
  start?: string
  end?: string
  blocks: Array<{ id: Id; start: string; end: string; reason?: string; fullDay: boolean }>
}

export async function loadWorkingHours(store: DataStore): Promise<WorkingHours> {
  return (await store.settings.get(CLINIC_SETTINGS_ID))?.workingHours ?? DEFAULT_WORKING_HOURS
}

/**
 * Regra única de disponibilidade: horário de atendimento do dia, bloqueios de agenda e
 * colisão com outros agendamentos (sobreposição ou intervalo entre pacientes).
 */
export async function assertBookable(
  store: DataStore,
  slot: { start: string; end: string; patientId: Id },
  ignoreAppointmentId?: Id,
): Promise<void> {
  const hours = await loadWorkingHours(store)
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  assertWithinWorkingHours(hours, start, end)

  const date = toLocalISODate(start)
  const from = start.getHours() * 60 + start.getMinutes()
  const to = end.getHours() * 60 + end.getMinutes()
  for (const block of await store.scheduleBlocks.list()) {
    const range = blockRange(block, date)
    if (range && from < range.end && range.start < to) {
      const when = block.startTime ? ` das ${block.startTime} às ${block.endTime}` : ''
      throw new DomainError(`Agenda bloqueada em ${formatDateBR(date)}${when}${block.reason ? ` (${block.reason})` : ''}.`, 'schedule_blocked')
    }
  }

  const conflicts = (await store.appointments.list()).filter(
    (a) => a.id !== ignoreAppointmentId && isActiveAppointment(a) && collides(slot, a, hours.intervalMinutes),
  )
  if (conflicts.length > 0) throw new ScheduleConflictError(conflicts, hours.intervalMinutes)
}

export function createScheduleService({ store, clock, newId }: ServiceDeps) {
  async function availabilityOf(fromDate: ISODate, toDate: ISODate): Promise<DayAvailability[]> {
    const [hours, blocks] = await Promise.all([loadWorkingHours(store), store.scheduleBlocks.list()])
    const days: DayAvailability[] = []
    for (let date = fromDate; date <= toDate; date = addDaysISO(date, 1)) {
      const [y, m, d] = date.split('-').map(Number)
      const day = hours.days[new Date(y, m - 1, d).getDay()]
      days.push({
        date,
        open: day.open,
        start: day.open ? day.start : undefined,
        end: day.open ? day.end : undefined,
        blocks: blocks.flatMap((b) => {
          const range = blockRange(b, date)
          return range ? [{ id: b.id, start: toHHMM(range.start), end: toHHMM(Math.min(range.end, 24 * 60 - 1)), reason: b.reason, fullDay: !b.startTime }] : []
        }),
      })
    }
    return days
  }

  return {
    workingHours: () => loadWorkingHours(store),

    /** Horário de atendimento e bloqueios de cada dia do intervalo (inclusive). */
    availability: availabilityOf,

    /**
     * Horários de início livres no dia para a duração pedida (passos de 15 min),
     * respeitando horário, bloqueios, outros agendamentos e o intervalo entre pacientes.
     * No dia de hoje, só horários futuros.
     */
    async freeSlots({ date, durationMinutes, patientId = '', ignoreAppointmentId }: { date: ISODate; durationMinutes: number; patientId?: Id; ignoreAppointmentId?: Id }): Promise<string[]> {
      const [day] = await availabilityOf(date, date)
      if (!day.open || durationMinutes <= 0) return []
      const hours = await loadWorkingHours(store)
      const [y, m, d] = date.split('-').map(Number)
      const dayStart = new Date(y, m - 1, d)
      const dayEnd = new Date(y, m - 1, d + 1)
      const others = (await store.appointments.list()).filter(
        (a) => a.id !== ignoreAppointmentId && isActiveAppointment(a) && new Date(a.start) < dayEnd && new Date(a.end) > dayStart,
      )
      const now = clock.now()
      const slots: string[] = []
      for (let minute = minutesOf(day.start!); minute + durationMinutes <= minutesOf(day.end!); minute += SLOT_STEP_MINUTES) {
        const start = new Date(y, m - 1, d, 0, minute)
        if (start < now) continue
        const end = new Date(start.getTime() + durationMinutes * 60_000)
        const blocked = day.blocks.some((b) => minute < minutesOf(b.end) + (b.fullDay ? 1 : 0) && minutesOf(b.start) < minute + durationMinutes)
        const candidate = { start: start.toISOString(), end: end.toISOString(), patientId }
        if (!blocked && !others.some((a) => collides(candidate, a, hours.intervalMinutes))) slots.push(toHHMM(minute))
      }
      return slots
    },

    async listBlocks({ fromDate }: { fromDate?: ISODate } = {}): Promise<ScheduleBlock[]> {
      return (await store.scheduleBlocks.list())
        .filter((b) => !fromDate || b.endDate >= fromDate)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    },

    /** Bloqueia a agenda; devolve os agendamentos que já existiam no período, para remarcar. */
    async createBlock(input: BlockInput): Promise<{ block: ScheduleBlock; affected: AppointmentView[] }> {
      const data = parse(blockSchema, input)
      return store.transaction(async () => {
        const now = clock.now().toISOString()
        const block: ScheduleBlock = { id: newId(), ...data, createdAt: now, updatedAt: now }
        await store.scheduleBlocks.save(block)
        const names = new Map((await store.patients.list()).map((p) => [p.id, p.name]))
        const affected = (await store.appointments.list())
          .filter((a: Appointment) => {
            if (!isActiveAppointment(a) || a.status === 'completed') return false
            const start = new Date(a.start)
            const end = new Date(a.end)
            const range = blockRange(block, toLocalISODate(start))
            return Boolean(range && start.getHours() * 60 + start.getMinutes() < range.end && range.start < end.getHours() * 60 + end.getMinutes())
          })
          .map((a) => ({ ...a, patientName: names.get(a.patientId) ?? 'Paciente', total: a.items.reduce((s, i) => s + i.price, 0) }))
          .sort((a, b) => a.start.localeCompare(b.start))
        return { block, affected }
      })
    },

    async removeBlock(id: Id): Promise<void> {
      if (!(await store.scheduleBlocks.get(id))) throw new NotFoundError('Bloqueio')
      await store.scheduleBlocks.remove(id)
    },
  }
}

export type ScheduleService = ReturnType<typeof createScheduleService>
