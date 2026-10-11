import type { WorkingHours } from './schedule'
import type { ISODateTime } from './shared'

/**
 * Dados da clínica publicados no site público. Só informação de contato e apresentação —
 * nada de pacientes, agenda ou finanças.
 */
export interface SiteProfile {
  clinicName: string
  professionalName: string
  professionalRegistry?: string
  /** Número do WhatsApp no formato internacional, só dígitos (ex.: 5511912345678). */
  whatsapp?: string
  /** Telefone como foi digitado, para exibir. */
  phone?: string
  email?: string
  /** Usuário do Instagram, sem @. */
  instagram?: string
  address?: string
  hours: Array<{ days: string; time: string }>
  publishedAt: ISODateTime
}

/** Telefone brasileiro (com ou sem 55) → número do WhatsApp; `undefined` se não for um celular/fixo válido. */
export function toWhatsAppNumber(phone: string | undefined): string | undefined {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (/^55\d{10,11}$/.test(digits)) return digits
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`
  return undefined
}

/** "@lume.estetica", "instagram.com/lume.estetica/" → "lume.estetica". */
export function toInstagramHandle(value: string | undefined): string | undefined {
  const handle = (value ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
  return handle || undefined
}

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
/** Ordem de exibição: segunda a domingo. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const hourText = (hhmm: string) => {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

/** Horário de atendimento em linhas legíveis: dias seguidos com o mesmo horário ficam juntos. */
export function describeWorkingHours(hours: WorkingHours): Array<{ days: string; time: string }> {
  const groups: Array<{ first: number; last: number; start: string; end: string }> = []
  for (const day of DISPLAY_ORDER) {
    const h = hours.days[day]
    if (!h.open) continue
    const previous = groups.at(-1)
    const contiguous = previous && DISPLAY_ORDER.indexOf(day) === DISPLAY_ORDER.indexOf(previous.last) + 1
    if (previous && contiguous && previous.start === h.start && previous.end === h.end) previous.last = day
    else groups.push({ first: day, last: day, start: h.start, end: h.end })
  }
  return groups.map((g) => ({
    days: g.first === g.last ? DAY_LABELS[g.first] : `${DAY_LABELS[g.first]} a ${DAY_LABELS[g.last].toLowerCase()}`,
    time: `${hourText(g.start)} às ${hourText(g.end)}`,
  }))
}
