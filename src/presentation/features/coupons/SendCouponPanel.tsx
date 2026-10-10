import { Copy, Mail, MessageCircle } from 'lucide-react'
import type { IssuedCoupon, Patient } from '@/domain'
import { useServices } from '../../app/services'
import { Button, buttonClass } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate } from '../../lib/format'
import { couponMessage, mailtoUrl, whatsappUrl } from '../../lib/messages'

/** Código em destaque e a mensagem pronta para a Profissional enviar pelo próprio WhatsApp ou e-mail. */
export function SendCouponPanel({ coupon, patient }: { coupon: IssuedCoupon; patient: Patient }) {
  const services = useServices()
  const toast = useToast()
  const { data: settings } = useLiveQuery(() => services.settings.get(), [], ['settings'])
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list(), [])
  const names = coupon.procedureIds.map((id) => procedures.find((p) => p.id === id)?.name).filter(Boolean) as string[]
  const message = couponMessage(coupon, patient.name, settings?.clinicName ?? 'LUME', names)
  const whatsapp = whatsappUrl(patient.phone, message)
  const email = mailtoUrl(patient.email, `Seu cupom de ${coupon.discountPercent}% na LUME`, message)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-lilas bg-perola-soft/60 px-5 py-4 text-center">
        <p className="eyebrow">Cupom de {coupon.discountPercent}%</p>
        <p className="num mt-2 text-2xl font-medium tracking-[0.12em] text-noite select-all">{coupon.code}</p>
        <p className="mt-1 text-xs text-ink-muted">Válido até {formatDate(coupon.expiresAt)} · {patient.name}</p>
      </div>
      <pre className="max-h-48 overflow-y-auto rounded-xl border border-line bg-white p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">{message}</pre>
      <div className="flex flex-wrap gap-2">
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonClass('primary', 'sm')}>
            <MessageCircle className="size-3.5" strokeWidth={1.75} />
            Abrir no WhatsApp
          </a>
        ) : (
          <Button size="sm" disabled title="Paciente sem celular cadastrado">WhatsApp</Button>
        )}
        {email ? (
          <a href={email} className={buttonClass('secondary', 'sm')}>
            <Mail className="size-3.5" strokeWidth={1.5} />
            Enviar e-mail
          </a>
        ) : (
          <Button size="sm" variant="secondary" disabled title="Paciente sem e-mail cadastrado">E-mail</Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          icon={<Copy className="size-3.5" strokeWidth={1.5} />}
          onClick={() => void navigator.clipboard.writeText(message).then(() => toast.success('Mensagem copiada.'))}
        >
          Copiar mensagem
        </Button>
      </div>
    </div>
  )
}
