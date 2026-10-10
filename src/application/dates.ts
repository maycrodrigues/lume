import type { ISODate } from '@/domain'

const pad = (n: number) => String(n).padStart(2, '0')

/** Data civil local (não UTC) de um instante. */
export const toLocalISODate = (date: Date): ISODate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** `YYYY-MM` de uma data civil. */
export const monthOf = (date: ISODate): string => date.slice(0, 7)

export const currentMonth = (now: Date): string => monthOf(toLocalISODate(now))

/** Lista `count` meses terminando em `endMonth` (inclusive), do mais antigo ao mais recente. */
export function lastMonths(endMonth: string, count: number): string[] {
  const [year, month] = endMonth.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 - (count - 1 - i), 1)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })
}

export const startOfLocalDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60_000)

export const formatDateBR = (date: ISODate): string => date.split('-').reverse().join('/')

export const formatDateTimeBR = (iso: string): string => {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatCentsBR = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Soma dias a uma data civil (`YYYY-MM-DD`), sem efeito de fuso horário. */
export function addDaysISO(date: ISODate, days: number): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  return toLocalISODate(new Date(y, m - 1, d + days))
}
