import type { AppointmentStatus } from '@/domain'

/** Cores por status do agendamento — mesmas na legenda, na grade de horários e no mês. */
export const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled: 'bg-lilas',
  confirmed: 'bg-info',
  completed: 'bg-success',
  cancelled: 'bg-cinza',
  no_show: 'bg-danger',
}

export const STATUS_BLOCK: Record<AppointmentStatus, string> = {
  scheduled: 'bg-lilas-soft border-lilas text-noite',
  confirmed: 'bg-info-soft border-info text-noite',
  completed: 'bg-success-soft border-success text-noite',
  cancelled: 'bg-neutral-soft border-cinza text-ink-muted line-through decoration-ink-muted/40',
  no_show: 'bg-danger-soft border-danger text-noite',
}
