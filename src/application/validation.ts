import { z } from 'zod'
import { ValidationError } from '@/domain'

export const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))

export const requiredText = (message: string) => z.string({ error: message }).trim().min(1, message)

export const isoDate = z.string({ error: 'Informe a data.' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')

export const optionalIsoDate = z
  .union([isoDate, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

export const isoDateTime = z
  .string({ error: 'Informe data e horário.' })
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Data/horário inválido.')

export const cents = z
  .number({ error: 'Informe um valor válido.' })
  .int('Informe um valor válido.')
  .min(0, 'O valor não pode ser negativo.')

export const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

export const paymentMethod = z.enum(['pix', 'cash', 'credit_card', 'debit_card', 'bank_transfer', 'boleto', 'other'])

export const optionalPaymentMethod = z
  .union([paymentMethod, z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))

/** Valida a entrada contra o schema; lança `ValidationError` com mensagens em português. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) throw new ValidationError([...new Set(result.error.issues.map((i) => i.message))])
  return result.data
}

export const optionalPositiveInt = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === '') return undefined
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isInteger(n) || n < 1) {
      ctx.addIssue({ code: 'custom', message: 'Informe um número inteiro maior que zero.' })
      return z.NEVER
    }
    return n
  })

export const optionalChoice = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal('')])
    .optional()
    .transform((v): T[number] | undefined => (v ? (v as T[number]) : undefined))
