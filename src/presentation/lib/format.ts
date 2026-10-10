import { format, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Cents, ISODate } from '@/domain'
import { onlyDigits } from '@/domain'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compactMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })

export const formatMoney = (cents: Cents) => money.format(cents / 100)
export const formatMoneyCompact = (cents: Cents) => compactMoney.format(cents / 100)

/** Data civil `YYYY-MM-DD` → Date local (sem deslocamento de fuso). */
export const parseLocalDate = (date: ISODate) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatDate = (value: ISODate | Date, pattern = 'dd/MM/yyyy') =>
  format(typeof value === 'string' && value.length === 10 ? parseLocalDate(value) : new Date(value), pattern, { locale: ptBR })

export const formatDateTime = (iso: string) => format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
export const formatTime = (iso: string) => format(new Date(iso), 'HH:mm')
export const formatLong = (date: Date) => format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
export const formatMonthYear = (month: string) => format(parseLocalDate(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR })
export const formatMonthShort = (month: string) => format(parseLocalDate(`${month}-01`), 'MMM', { locale: ptBR })
export const timeAgo = (iso: string) => formatDistanceToNowStrict(new Date(iso), { locale: ptBR, addSuffix: true })

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function formatPhone(value?: string) {
  if (!value) return ''
  const d = onlyDigits(value)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return value
}

export function formatCpf(value?: string) {
  if (!value) return ''
  const d = onlyDigits(value)
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : value
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .map((w) => w[0]?.toUpperCase())
    .join('')

export const firstName = (name: string) => name.split(/\s+/)[0] ?? name

/** `Date` local → valor de `<input type="date">`. */
export const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd')
/** `Date` local → valor de `<input type="time">`. */
export const toTimeInput = (date: Date) => format(date, 'HH:mm')
/** Valores de `<input type="date">` + `<input type="time">` → ISO. */
export const fromDateTimeInputs = (date: string, time: string) => new Date(`${date}T${time || '00:00'}`).toISOString()

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}
