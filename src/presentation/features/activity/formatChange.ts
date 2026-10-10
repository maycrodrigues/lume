import { describeAnswer, findQuestion, type Answer } from '@/domain'
import { formatDate, formatDateTime, formatMoney } from '../../lib/format'
import { APPOINTMENT_STATUS, COUPON_CHANNELS, ENTRY_STATUS, ENTRY_TYPE, FIELD_LABELS, GENDERS, IMAGE_CONSENT, MARITAL_STATUS, PAYMENT_METHODS } from '../../lib/labels'

/** Campos de questionário chegam como `anamnesis.<id>` ou `answers.<id>`. */
const questionOf = (field: string) => {
  const [group, id] = field.split('.')
  return (group === 'anamnesis' || group === 'answers') && id ? findQuestion(id) : undefined
}

export function fieldLabel(field: string) {
  const question = questionOf(field)
  if (question) return `${field.startsWith('anamnesis.') ? 'Anamnese' : 'Ficha'} · ${question.label}`
  return FIELD_LABELS[field] ?? field
}

const LOOKUPS: Record<string, Record<string, string>> = {
  status: { ...Object.fromEntries(Object.entries(APPOINTMENT_STATUS).map(([k, v]) => [k, v.label])), ...Object.fromEntries(Object.entries(ENTRY_STATUS).map(([k, v]) => [k, v.label])) },
  method: PAYMENT_METHODS,
  gender: GENDERS,
  type: ENTRY_TYPE,
  maritalStatus: MARITAL_STATUS,
  scope: Object.fromEntries(Object.entries(IMAGE_CONSENT).map(([k, v]) => [k, v.label])),
  channel: COUPON_CHANNELS,
}

/** Valor de um campo alterado, em linguagem da Profissional. */
export function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const question = questionOf(field)
  if (question) return describeAnswer(question, value as Answer) ?? '—'
  field = field.split('.').pop()!
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number' && ['price', 'amount', 'fullPrice', 'discount'].includes(field)) return formatMoney(value)
  if (typeof value === 'string') {
    if (field.endsWith('Id')) return `vinculado (#${value.slice(0, 8)})`
    if (LOOKUPS[field]?.[value]) return LOOKUPS[field][value]
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value)
    return value
  }
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'object' && item && 'name' in item
          ? `${(item as { name: string }).name}${'price' in item ? ` (${formatMoney((item as { price: number }).price)})` : ''}`
          : JSON.stringify(item),
      )
      .join(', ')
  }
  return JSON.stringify(value)
}
