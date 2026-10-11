import { ScanLine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { IssuedCouponView } from '@/application'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
import { errorMessage } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatDateTime } from '../../lib/format'
import { COUPON_STATUS } from '../../lib/labels'

const daysUntil = (date: string) => Math.round((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000)

/** Validação presencial: a paciente mostra o código e a Profissional confere aqui antes do atendimento. */
export function CouponValidator() {
  const services = useServices()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<IssuedCouponView>()
  const [error, setError] = useState<string>()
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list(), [])

  const check = async () => {
    setResult(undefined)
    setError(undefined)
    if (!code.trim()) return
    try {
      const found = await services.coupons.lookup(code)
      setResult(found)
      void services.activity.record({ category: 'system', action: 'coupon.lookup', message: `Cupom consultado: ${found.code} (${COUPON_STATUS[found.status].label})` })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const scope = result?.procedureIds.length
    ? result.procedureIds.map((id) => procedures.find((p) => p.id === id)?.name ?? 'procedimento removido').join(', ')
    : 'Qualquer procedimento avulso'

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-perola-soft text-accent">
          <ScanLine className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-48 flex-1">
          <p className="text-sm font-medium text-ink">Validar cupom</p>
          <p className="text-xs text-ink-muted">Digite o código que a paciente apresentou.</p>
        </div>
        <form
          className="flex w-full gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault()
            void check()
          }}
        >
          <Input className="num uppercase sm:w-56" placeholder="LUME-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Código do cupom" />
          <Button type="submit">Validar</Button>
        </form>
      </div>
      {error && <Alert className="mt-4">{error}</Alert>}
      {result && (
        <div className={`mt-4 rounded-xl border px-4 py-3.5 ${result.status === 'available' ? 'border-success/30 bg-success-soft/50' : 'border-line bg-offwhite'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="num text-base font-medium tracking-wider text-noite">{result.code}</p>
              <p className="text-sm text-ink-soft">
                {result.name} · <strong className="font-medium text-ink">{result.discountPercent}% de desconto</strong> ·{' '}
                <Link to={`/admin/pacientes/${result.patientId}`} className="text-accent hover:text-noite">{result.patientName}</Link>
              </p>
            </div>
            <Badge tone={COUPON_STATUS[result.status].tone}>{COUPON_STATUS[result.status].label}</Badge>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {result.status === 'available' && `Válido até ${formatDate(result.expiresAt)} (${daysUntil(result.expiresAt)} dias). Vale para: ${scope}. Aplique o código no registro do atendimento desta paciente.`}
            {result.status === 'redeemed' && `Utilizado em ${formatDateTime(result.redeemedAt!)}.`}
            {result.status === 'expired' && `Expirou em ${formatDate(result.expiresAt)}.`}
            {result.status === 'cancelled' && 'Este cupom foi cancelado.'}
          </p>
        </div>
      )}
    </Card>
  )
}
