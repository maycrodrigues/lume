import type { Cents, IssuedCoupon } from '@/domain'
import { onlyDigits } from '@/domain'
import { firstName, formatDate, formatMoney } from './format'

/** Link do WhatsApp com a mensagem pronta; quem envia é a Profissional, pelo próprio WhatsApp. */
export function whatsappUrl(phone: string | undefined, text: string): string | undefined {
  if (!phone) return undefined
  const digits = onlyDigits(phone)
  if (digits.length < 10) return undefined
  const full = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

export const mailtoUrl = (email: string | undefined, subject: string, body: string) =>
  email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : undefined

export function couponMessage(coupon: IssuedCoupon, patientName: string, clinicName: string, procedureNames: string[]): string {
  const scope = procedureNames.length ? `em ${procedureNames.join(', ')}` : 'em qualquer procedimento avulso'
  return [
    `Olá, ${firstName(patientName)}!`,
    '',
    `Você ganhou um cupom de ${coupon.discountPercent}% de desconto na ${clinicName}, válido ${scope}.`,
    '',
    `Código: ${coupon.code}`,
    `Válido até ${formatDate(coupon.expiresAt)}.`,
    '',
    'É só apresentar este código no dia do seu atendimento. O cupom é pessoal, vale uma vez e não se aplica a pacotes.',
    '',
    'Beleza que equilibra, saúde que ilumina.',
  ].join('\n')
}

export interface OfferOption {
  discountPercent: number
  finalPrice: Cents
  perSession: Cents
  savings: Cents
}

export function packageOfferMessage(input: {
  patientName?: string
  packageName: string
  lines: Array<{ name: string; quantity: number }>
  fullPrice: Cents
  options: OfferOption[]
  validityDays?: number
  clinicName: string
}): string {
  const greeting = input.patientName ? `Olá, ${firstName(input.patientName)}!` : 'Olá!'
  return [
    greeting,
    '',
    `Preparei o pacote *${input.packageName}* na ${input.clinicName}:`,
    ...input.lines.map((l) => `• ${l.quantity}× ${l.name}`),
    '',
    `Valor avulso: ${formatMoney(input.fullPrice)}`,
    ...input.options.map((o) =>
      o.discountPercent === 0
        ? `Sem desconto: ${formatMoney(o.finalPrice)}`
        : `Com ${o.discountPercent}% de desconto: ${formatMoney(o.finalPrice)} (${formatMoney(o.perSession)} por sessão, economia de ${formatMoney(o.savings)})`,
    ),
    ...(input.validityDays ? ['', `As sessões podem ser usadas em até ${input.validityDays} dias após a contratação.`] : []),
    '',
    'Beleza que equilibra, saúde que ilumina.',
  ].join('\n')
}
