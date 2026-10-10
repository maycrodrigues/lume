import type { Cents, Entity, Id, ISODate } from './shared'

export type EntryType = 'income' | 'expense'
export type EntryStatus = 'pending' | 'paid' | 'cancelled'
export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'boleto' | 'other'

/** Entrada ou saída de dinheiro. */
export interface FinancialEntry extends Entity {
  type: EntryType
  description: string
  category: string
  amount: Cents
  dueDate: ISODate
  status: EntryStatus
  paidAt?: ISODate
  method?: PaymentMethod
  patientId?: Id
  consultationId?: Id
  notes?: string
}

export const INCOME_CATEGORIES = ['Atendimentos', 'Pacotes', 'Produtos', 'Outras receitas'] as const
export const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Insumos',
  'Produtos',
  'Equipamentos',
  'Marketing',
  'Pessoal',
  'Impostos',
  'Contas (água, luz, internet)',
  'Cursos e capacitação',
  'Outras despesas',
] as const

export const CONSULTATION_CHARGE_CATEGORY = 'Atendimentos'
