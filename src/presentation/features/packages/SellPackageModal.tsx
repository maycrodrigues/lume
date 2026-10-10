import { useState } from 'react'
import type { Id, PaymentMethod } from '@/domain'
import { packagePricing } from '@/domain'
import { addDaysISO } from '@/application/dates'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PatientPicker } from '../../components/ui/PatientPicker'
import { useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatMoney, toDateInput } from '../../lib/format'
import { PAYMENT_METHODS } from '../../lib/labels'

interface Props {
  open: boolean
  onClose: () => void
  packageId?: Id
  patientId?: Id
  discountPercent?: number
}

export function SellPackageModal(props: Props) {
  return props.open ? <SellPackageDialog {...props} /> : null
}

function SellPackageDialog({ onClose, packageId: initialPackage, patientId: fixedPatient, discountPercent: initialDiscount }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: packages = [] } = useLiveQuery(() => services.packages.list({ includeInactive: false }), [])
  const { data: patients = [] } = useLiveQuery(() => services.patients.list(), [])
  const [packageId, setPackageId] = useState<Id | ''>(initialPackage ?? '')
  const [patientId, setPatientId] = useState<Id | undefined>(fixedPatient)
  const [discountOverride, setDiscountOverride] = useState<number | undefined>(initialDiscount)
  const [purchasedAt, setPurchasedAt] = useState(toDateInput(new Date()))
  const [status, setStatus] = useState<'paid' | 'pending'>('paid')
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [notes, setNotes] = useState('')

  const pkg = packages.find((p) => p.id === packageId)
  const patientName = patients.find((p) => p.id === patientId)?.name
  const discountPercent = discountOverride ?? pkg?.discountPercent ?? 0
  const pricing = pkg ? packagePricing(pkg.lines, discountPercent) : undefined
  const expiresAt = pkg?.validityDays && purchasedAt ? addDaysISO(purchasedAt, pkg.validityDays) : undefined

  const onSubmit = async () => {
    const result = await submit(
      'package.sell',
      () =>
        services.packages.sell({
          packageId,
          patientId: patientId ?? '',
          discountPercent,
          purchasedAt,
          notes,
          charge: { status, method: status === 'paid' ? method : undefined },
        }),
      { success: 'Pacote contratado e lançado no financeiro.' },
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Contratar pacote"
      description={fixedPatient ? patientName : undefined}
      onSubmit={onSubmit}
      footer={
        <>
          {pricing && (
            <p className="num mr-auto text-sm text-ink-soft">
              Total: <strong className="font-medium text-ink">{formatMoney(pricing.finalPrice)}</strong>
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending} disabled={!pkg}>Contratar</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {!fixedPatient && (
          <Field label="Paciente" required>
            {(id) => <PatientPicker id={id} patients={patients} value={patientId} onChange={setPatientId} />}
          </Field>
        )}
        <Field label="Pacote" required>
          {(id) => (
            <Select
              id={id}
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value)
                setDiscountOverride(undefined)
              }}
            >
              <option value="">Selecione</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.pricing.finalPrice)}</option>)}
            </Select>
          )}
        </Field>

        {pkg && pricing && (
          <div className="rounded-xl border border-line bg-offwhite/60 px-4 py-3.5 text-sm">
            <ul className="space-y-0.5 text-ink-soft">
              {pkg.lines.map((l) => <li key={l.procedureId}>{l.quantity}× {l.name}</li>)}
            </ul>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
              <div>
                <p className="num text-xs text-ink-muted line-through">{formatMoney(pricing.fullPrice)}</p>
                <p className="num text-xl font-medium text-noite">{formatMoney(pricing.finalPrice)}</p>
                <p className="num text-[11px] text-ink-muted">{formatMoney(pricing.perSession)} por sessão</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                Desconto
                <span className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountOverride(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className="num h-9 w-20 rounded-lg border border-line-strong bg-white pr-6 pl-2 text-right text-sm focus:border-lilas focus:outline-none"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-ink-muted">%</span>
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data da contratação" required hint={expiresAt ? `Sessões válidas até ${formatDate(expiresAt)}` : 'Sem prazo para usar as sessões'}>
            {(id) => <Input id={id} type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />}
          </Field>
          <Field label="Pagamento">
            {() => <Segmented<'paid' | 'pending'> value={status} onChange={setStatus} options={[{ value: 'paid', label: 'Pago agora' }, { value: 'pending', label: 'A receber' }]} />}
          </Field>
          {status === 'paid' && (
            <Field label="Forma de pagamento">
              {(id) => (
                <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {Object.entries(PAYMENT_METHODS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </Select>
              )}
            </Field>
          )}
        </div>
        <Field label="Observações">
          {(id) => <Textarea id={id} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: parcelado em 3× no cartão" />}
        </Field>
        <p className="text-xs text-ink-muted">Cupons de desconto não se aplicam a pacotes.</p>
      </div>
    </Modal>
  )
}
