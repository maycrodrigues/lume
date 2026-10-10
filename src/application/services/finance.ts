import { z } from 'zod'
import type { Cents, EntryStatus, EntryType, FinancialEntry, Id, ISODate } from '@/domain'
import { DomainError, normalizeText, NotFoundError, sumCents } from '@/domain'
import { formatDateBR, lastMonths, monthOf, toLocalISODate } from '../dates'
import { cents, isoDate, optionalId, optionalIsoDate, optionalPaymentMethod, optionalText, parse, requiredText } from '../validation'
import type { ServiceDeps } from './deps'

const entrySchema = z.object({
  type: z.enum(['income', 'expense']),
  description: requiredText('Informe a descrição.'),
  category: requiredText('Informe a categoria.'),
  amount: cents.refine((v) => v > 0, 'Informe um valor maior que zero.'),
  dueDate: isoDate,
  status: z.enum(['pending', 'paid', 'cancelled']),
  paidAt: optionalIsoDate,
  method: optionalPaymentMethod,
  patientId: optionalId,
  notes: optionalText,
})

const paymentSchema = z.object({ method: optionalPaymentMethod, paidAt: optionalIsoDate })

export type EntryInput = z.input<typeof entrySchema>
export type PaymentInput = z.input<typeof paymentSchema>

export interface EntryFilter {
  month: string
  type?: EntryType
  status?: EntryStatus
  search?: string
}

export interface FinancialEntryView extends FinancialEntry {
  patientName?: string
  overdue: boolean
}

export interface MonthSummary {
  incomePaid: Cents
  incomePending: Cents
  expensePaid: Cents
  expensePending: Cents
  balance: Cents
}

export interface MonthPoint {
  month: string
  income: Cents
  expense: Cents
}

export function createFinanceService({ store, clock, newId }: ServiceDeps) {
  const today = () => toLocalISODate(clock.now())

  async function get(id: Id): Promise<FinancialEntry> {
    const entry = await store.financialEntries.get(id)
    if (!entry) throw new NotFoundError('Lançamento')
    return entry
  }

  /** Pago sem data de pagamento: usa o vencimento se já passou, senão hoje. */
  const resolvePaidAt = (status: EntryStatus, dueDate: ISODate, paidAt?: ISODate) =>
    status !== 'paid' ? undefined : (paidAt ?? (dueDate <= today() ? dueDate : today()))

  const total = (entries: FinancialEntry[], type: EntryType, status: EntryStatus) =>
    sumCents(entries.filter((e) => e.type === type && e.status === status).map((e) => e.amount))

  return {
    get,

    async list({ month, type, status, search }: EntryFilter): Promise<FinancialEntryView[]> {
      const term = search ? normalizeText(search) : ''
      const names = new Map((await store.patients.list()).map((p) => [p.id, p.name]))
      const now = today()
      return (await store.financialEntries.list())
        .filter((e) => monthOf(e.dueDate) === month && (!type || e.type === type) && (!status || e.status === status))
        .map((e) => ({
          ...e,
          patientName: e.patientId ? names.get(e.patientId) : undefined,
          overdue: e.status === 'pending' && e.dueDate < now,
        }))
        .filter((e) => !term || normalizeText(`${e.description} ${e.category} ${e.patientName ?? ''}`).includes(term))
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.createdAt.localeCompare(a.createdAt))
    },

    async summary(month: string): Promise<MonthSummary> {
      const entries = (await store.financialEntries.list()).filter((e) => monthOf(e.dueDate) === month)
      const incomePaid = total(entries, 'income', 'paid')
      const expensePaid = total(entries, 'expense', 'paid')
      return {
        incomePaid,
        incomePending: total(entries, 'income', 'pending'),
        expensePaid,
        expensePending: total(entries, 'expense', 'pending'),
        balance: incomePaid - expensePaid,
      }
    },

    /** Receitas e despesas pagas por mês, do mais antigo ao mais recente. */
    async series(endMonth: string, count: number): Promise<MonthPoint[]> {
      const entries = await store.financialEntries.list()
      return lastMonths(endMonth, count).map((month) => {
        const inMonth = entries.filter((e) => monthOf(e.dueDate) === month)
        return { month, income: total(inMonth, 'income', 'paid'), expense: total(inMonth, 'expense', 'paid') }
      })
    },

    async overdue(): Promise<FinancialEntry[]> {
      const now = today()
      return (await store.financialEntries.list())
        .filter((e) => e.status === 'pending' && e.dueDate < now)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    },

    async create(input: EntryInput): Promise<FinancialEntry> {
      const data = parse(entrySchema, input)
      const now = clock.now().toISOString()
      const entry: FinancialEntry = {
        id: newId(),
        ...data,
        paidAt: resolvePaidAt(data.status, data.dueDate, data.paidAt),
        createdAt: now,
        updatedAt: now,
      }
      await store.financialEntries.save(entry)
      return entry
    },

    async update(id: Id, input: EntryInput): Promise<FinancialEntry> {
      const data = parse(entrySchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        const updated: FinancialEntry = {
          ...current,
          ...data,
          paidAt: resolvePaidAt(data.status, data.dueDate, data.paidAt),
          updatedAt: clock.now().toISOString(),
        }
        await store.financialEntries.save(updated)
        return updated
      })
    },

    /** Confirma o pagamento/recebimento; sem data informada, usa hoje. */
    async markPaid(id: Id, input: PaymentInput = {}): Promise<void> {
      const { method, paidAt } = parse(paymentSchema, input)
      await store.transaction(async () => {
        const current = await get(id)
        if (current.status === 'paid') {
          throw new DomainError(`Este lançamento já está pago desde ${formatDateBR(current.paidAt ?? current.dueDate)}.`, 'already_paid')
        }
        await store.financialEntries.save({
          ...current,
          status: 'paid',
          method: method ?? current.method,
          paidAt: paidAt ?? today(),
          updatedAt: clock.now().toISOString(),
        })
      })
    },

    async remove(id: Id): Promise<void> {
      await store.transaction(async () => {
        const current = await get(id)
        if (current.consultationId) {
          const consultation = await store.consultations.get(current.consultationId)
          if (consultation) {
            await store.consultations.save({ ...consultation, financialEntryId: undefined, updatedAt: clock.now().toISOString() })
          }
        }
        await store.financialEntries.remove(id)
      })
    },
  }
}

export type FinanceService = ReturnType<typeof createFinanceService>
