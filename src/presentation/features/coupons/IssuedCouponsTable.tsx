import { Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { IssuedCouponView } from '@/application'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { IconButton } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/Confirm'
import { useAction } from '../../hooks/useAction'
import { formatDate } from '../../lib/format'
import { COUPON_CHANNELS, COUPON_STATUS } from '../../lib/labels'
import { IssueCouponModal } from './IssueCouponModal'

const daysLeft = (date: string) => Math.round((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000)

export function IssuedCouponsTable({ coupons, showPatient = true }: { coupons: IssuedCouponView[]; showPatient?: boolean }) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const [resending, setResending] = useState<IssuedCouponView>()

  const cancel = async (c: IssuedCouponView) => {
    if (await confirm({ title: 'Cancelar cupom', message: `O código ${c.code} deixará de valer para ${c.patientName}.`, confirmLabel: 'Cancelar cupom' })) {
      await action('coupon.cancel', () => services.coupons.cancelIssued(c.id), { success: 'Cupom cancelado.' })
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-wider text-ink-muted uppercase">
            <th className="px-5 py-3 font-medium">Código</th>
            {showPatient && <th className="px-5 py-3 font-medium">Paciente</th>}
            <th className="px-5 py-3 font-medium">Cupom</th>
            <th className="px-5 py-3 font-medium">Enviado</th>
            <th className="px-5 py-3 font-medium">Validade</th>
            <th className="px-5 py-3 font-medium">Situação</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => {
            const left = daysLeft(c.expiresAt)
            return (
              <tr key={c.id} className="border-t border-line">
                <td className="num px-5 py-3 font-medium tracking-wider whitespace-nowrap text-noite">{c.code}</td>
                {showPatient && (
                  <td className="px-5 py-3">
                    <Link to={`/pacientes/${c.patientId}`} className="text-ink hover:text-accent">{c.patientName}</Link>
                  </td>
                )}
                <td className="px-5 py-3 text-ink-soft">
                  {c.name} · <span className="num font-medium text-ink">{c.discountPercent}%</span>
                </td>
                <td className="num px-5 py-3 text-ink-soft">
                  {formatDate(c.issuedAt)}
                  <span className="block text-[11px] text-ink-muted">{COUPON_CHANNELS[c.channel]}</span>
                </td>
                <td className="num px-5 py-3 text-ink-soft">
                  {formatDate(c.expiresAt)}
                  {c.status === 'available' && (
                    <span className={`block text-[11px] ${left <= 7 ? 'text-warning' : 'text-ink-muted'}`}>{left === 0 ? 'vence hoje' : `faltam ${left} dias`}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={COUPON_STATUS[c.status].tone}>{COUPON_STATUS[c.status].label}</Badge>
                  {c.redeemedAt && <span className="num mt-0.5 block text-[11px] text-ink-muted">em {formatDate(c.redeemedAt)}</span>}
                </td>
                <td className="px-5 py-3">
                  {c.status === 'available' && (
                    <div className="flex justify-end">
                      <IconButton label="Reenviar mensagem" onClick={() => setResending(c)}>
                        <Send className="size-4" strokeWidth={1.5} />
                      </IconButton>
                      <IconButton label="Cancelar cupom" onClick={() => cancel(c)} className="hover:!bg-danger-soft hover:!text-danger">
                        <XCircle className="size-4" strokeWidth={1.5} />
                      </IconButton>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <IssueCouponModal open={resending !== undefined} issued={resending} onClose={() => setResending(undefined)} />
    </div>
  )
}
