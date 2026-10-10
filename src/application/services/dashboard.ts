import type { Cents, Patient } from '@/domain'
import { isActiveAppointment, sumCents } from '@/domain'
import { currentMonth, monthOf, startOfLocalDay, toLocalISODate } from '../dates'
import type { AppointmentService, AppointmentView } from './appointments'
import type { ServiceDeps } from './deps'
import type { FinanceService, MonthPoint } from './finance'

export interface DashboardOverview {
  today: AppointmentView[]
  upcoming: AppointmentView[]
  kpis: {
    appointmentsToday: number
    activePatients: number
    newPatientsThisMonth: number
    monthIncome: Cents
    monthReceivable: Cents
    monthBalance: Cents
    overdueCount: number
    overdueAmount: Cents
  }
  revenue: MonthPoint[]
  birthdays: Array<{ patient: Patient; day: number }>
  topProcedures: Array<{ name: string; count: number; revenue: Cents }>
}

export function createDashboardService(
  { store, clock }: ServiceDeps,
  { appointments, finance }: { appointments: AppointmentService; finance: FinanceService },
) {
  return {
    async overview(): Promise<DashboardOverview> {
      const now = clock.now()
      const dayStart = startOfLocalDay(now)
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1)
      const month = currentMonth(now)
      const ninetyDaysAgo = new Date(dayStart.getTime() - 90 * 86_400_000).toISOString()

      const [todayAll, upcoming, patients, summary, revenue, overdue, consultations] = await Promise.all([
        appointments.listRange(dayStart.toISOString(), dayEnd.toISOString()),
        appointments.upcoming(6),
        store.patients.list(),
        finance.summary(month),
        finance.series(month, 6),
        finance.overdue(),
        store.consultations.list(),
      ])

      const today = todayAll.filter((a) => a.status !== 'cancelled')
      const active = patients.filter((p) => p.active)
      const monthNumber = now.getMonth() + 1

      const ranking = new Map<string, { name: string; count: number; revenue: Cents }>()
      for (const c of consultations.filter((c) => c.date >= ninetyDaysAgo)) {
        for (const p of c.procedures) {
          const current = ranking.get(p.procedureId) ?? { name: p.name, count: 0, revenue: 0 }
          ranking.set(p.procedureId, { ...current, count: current.count + 1, revenue: current.revenue + p.price })
        }
      }

      return {
        today,
        upcoming: upcoming.filter((a) => a.start >= dayEnd.toISOString()),
        kpis: {
          appointmentsToday: today.filter(isActiveAppointment).length,
          activePatients: active.length,
          newPatientsThisMonth: patients.filter((p) => monthOf(toLocalISODate(new Date(p.createdAt))) === month).length,
          monthIncome: summary.incomePaid,
          monthReceivable: summary.incomePending,
          monthBalance: summary.balance,
          overdueCount: overdue.filter((e) => e.type === 'income').length,
          overdueAmount: sumCents(overdue.filter((e) => e.type === 'income').map((e) => e.amount)),
        },
        revenue,
        birthdays: active
          .filter((p) => p.birthDate && Number(p.birthDate.slice(5, 7)) === monthNumber)
          .map((patient) => ({ patient, day: Number(patient.birthDate!.slice(8, 10)) }))
          .sort((a, b) => a.day - b.day),
        topProcedures: [...ranking.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 5),
      }
    },
  }
}

export type DashboardService = ReturnType<typeof createDashboardService>
