import type { Cents, Entity, Id, ISODateTime } from './shared'
import { DomainError } from './shared'

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

/** Procedimento reservado no Agendamento — cópia dos dados do catálogo no momento do agendamento. */
export interface AppointmentItem {
  procedureId: Id
  name: string
  price: Cents
  durationMinutes: number
}

export interface Appointment extends Entity {
  patientId: Id
  start: ISODateTime
  end: ISODateTime
  items: AppointmentItem[]
  status: AppointmentStatus
  notes?: string
  consultationId?: Id
}

/** Agendamentos que ocupam a agenda (entram no cálculo de Conflito de horário). */
export const isActiveAppointment = (a: Pick<Appointment, 'status'>): boolean =>
  a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'completed'

export const overlaps = (
  a: { start: ISODateTime; end: ISODateTime },
  b: { start: ISODateTime; end: ISODateTime },
): boolean => new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)

export const totalDuration = (items: AppointmentItem[]): number =>
  items.reduce((sum, item) => sum + item.durationMinutes, 0)

/**
 * Transições que a Profissional pode fazer manualmente.
 * "Realizado" não está aqui: só é alcançado registrando um Atendimento.
 */
const MANUAL_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['scheduled', 'cancelled', 'no_show'],
  completed: [],
  cancelled: ['scheduled'],
  no_show: ['scheduled'],
}

export const allowedManualTransitions = (from: AppointmentStatus): AppointmentStatus[] => MANUAL_TRANSITIONS[from]

export function assertManualTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!MANUAL_TRANSITIONS[from].includes(to)) {
    throw new DomainError('Esta mudança de status não é permitida para o agendamento.', 'invalid_transition')
  }
}

export const isEditableAppointment = (a: Pick<Appointment, 'status'>): boolean =>
  a.status === 'scheduled' || a.status === 'confirmed'

/** Lançado quando o horário pedido colide com outro Agendamento ativo (sobreposição ou intervalo). */
export class ScheduleConflictError extends DomainError {
  constructor(
    readonly conflicts: Appointment[],
    intervalMinutes = 0,
  ) {
    super(
      intervalMinutes > 0
        ? `Horário indisponível: há outro agendamento neste horário ou sem o intervalo de ${intervalMinutes} minutos entre pacientes.`
        : 'Horário indisponível: há outro agendamento neste horário.',
      'schedule_conflict',
    )
    this.name = 'ScheduleConflictError'
  }
}
