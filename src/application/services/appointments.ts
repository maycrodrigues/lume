import { z } from 'zod'
import type { Appointment, AppointmentItem, AppointmentStatus, Cents, Id, ISODateTime } from '@/domain'
import {
  assertManualTransition,
  DomainError,
  isEditableAppointment,
  NotFoundError,
  overlaps,
  sumCents,
  totalDuration,
} from '@/domain'
import { addMinutes } from '../dates'
import { isoDateTime, optionalText, parse } from '../validation'
import type { ServiceDeps } from './deps'
import { assertBookable } from './schedule'

const scheduleSchema = z.object({
  patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
  start: isoDateTime,
  procedureIds: z.array(z.string()).min(1, 'Selecione ao menos um procedimento.'),
  notes: optionalText,
})

export type ScheduleInput = z.input<typeof scheduleSchema>

export interface AppointmentView extends Appointment {
  patientName: string
  total: Cents
}

export function createAppointmentService({ store, clock, newId }: ServiceDeps) {
  async function get(id: Id): Promise<Appointment> {
    const appointment = await store.appointments.get(id)
    if (!appointment) throw new NotFoundError('Agendamento')
    return appointment
  }

  async function toViews(appointments: Appointment[]): Promise<AppointmentView[]> {
    const names = new Map((await store.patients.list()).map((p) => [p.id, p.name]))
    return appointments
      .map((a) => ({ ...a, patientName: names.get(a.patientId) ?? 'Paciente removida', total: sumCents(a.items.map((i) => i.price)) }))
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  async function buildSlot(input: z.output<typeof scheduleSchema>, ignoreId?: Id) {
    if (!(await store.patients.get(input.patientId))) throw new NotFoundError('Paciente')
    const items: AppointmentItem[] = []
    for (const procedureId of input.procedureIds) {
      const procedure = await store.procedures.get(procedureId)
      if (!procedure) throw new NotFoundError('Procedimento')
      items.push({ procedureId, name: procedure.name, price: procedure.price, durationMinutes: procedure.durationMinutes })
    }
    const start = new Date(input.start)
    const slot = { start: start.toISOString(), end: addMinutes(start, totalDuration(items)).toISOString() }
    await assertBookable(store, { ...slot, patientId: input.patientId }, ignoreId)
    return { ...slot, items }
  }

  return {
    get,

    async getView(id: Id): Promise<AppointmentView> {
      const [view] = await toViews([await get(id)])
      return view
    },

    /** Agendamentos que tocam o intervalo [from, to), em ordem cronológica. */
    async listRange(from: ISODateTime, to: ISODateTime): Promise<AppointmentView[]> {
      const range = { start: from, end: to }
      return toViews((await store.appointments.list()).filter((a) => overlaps(a, range)))
    },

    async upcoming(limit = 5): Promise<AppointmentView[]> {
      const now = clock.now().toISOString()
      const next = (await store.appointments.list()).filter((a) => a.start >= now && isEditableAppointment(a))
      return (await toViews(next)).slice(0, limit)
    },

    async schedule(input: ScheduleInput): Promise<Appointment> {
      const data = parse(scheduleSchema, input)
      return store.transaction(async () => {
        const slot = await buildSlot(data)
        const now = clock.now().toISOString()
        const appointment: Appointment = {
          id: newId(),
          patientId: data.patientId,
          ...slot,
          status: 'scheduled',
          notes: data.notes,
          createdAt: now,
          updatedAt: now,
        }
        await store.appointments.save(appointment)
        return appointment
      })
    },

    async reschedule(id: Id, input: ScheduleInput): Promise<Appointment> {
      const data = parse(scheduleSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        if (!isEditableAppointment(current)) {
          throw new DomainError('Só é possível alterar agendamentos ainda não realizados ou cancelados.', 'not_editable')
        }
        const slot = await buildSlot(data, id)
        const updated: Appointment = {
          ...current,
          patientId: data.patientId,
          ...slot,
          notes: data.notes,
          updatedAt: clock.now().toISOString(),
        }
        await store.appointments.save(updated)
        return updated
      })
    },

    async setStatus(id: Id, status: AppointmentStatus): Promise<void> {
      await store.transaction(async () => {
        const current = await get(id)
        assertManualTransition(current.status, status)
        await store.appointments.save({ ...current, status, updatedAt: clock.now().toISOString() })
      })
    },

    async remove(id: Id): Promise<void> {
      await store.transaction(async () => {
        const current = await get(id)
        if (current.status === 'completed') {
          throw new DomainError(
            'Agendamento realizado faz parte do prontuário. Exclua o atendimento antes, se necessário.',
            'has_consultation',
          )
        }
        await store.appointments.remove(id)
      })
    },
  }
}

export type AppointmentService = ReturnType<typeof createAppointmentService>
