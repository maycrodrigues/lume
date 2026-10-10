import { useState } from 'react'
import type { FinancialEntry, PaymentMethod } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { formatDate, formatMoney, toDateInput } from '../../lib/format'
import { PAYMENT_METHODS } from '../../lib/labels'

interface Props {
  entry?: FinancialEntry & { patientName?: string }
  onClose: () => void
}

/** Confirmação antes de marcar um lançamento como pago/recebido, com forma e data do pagamento. */
export function ConfirmPaymentModal(props: Props) {
  return props.entry ? <ConfirmPaymentDialog key={props.entry.id} entry={props.entry} onClose={props.onClose} /> : null
}

function ConfirmPaymentDialog({ entry, onClose }: Required<Props>) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const today = toDateInput(new Date())
  const [method, setMethod] = useState<PaymentMethod>(entry.method ?? 'pix')
  const [paidAt, setPaidAt] = useState(today)
  const income = entry.type === 'income'
  const overdue = entry.status === 'pending' && entry.dueDate < today

  const onSubmit = async () => {
    const result = await submit('finance.markPaid', () => services.finance.markPaid(entry.id, { method, paidAt }), {
      success: income ? 'Recebimento registrado.' : 'Pagamento registrado.',
    })
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={income ? 'Confirmar recebimento' : 'Confirmar pagamento'}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Voltar</Button>
          <Button type="submit" loading={pending}>{income ? 'Confirmar recebimento' : 'Confirmar pagamento'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <div className="rounded-xl border border-line bg-offwhite/60 px-4 py-3.5">
          <p className="text-sm font-medium text-ink">{entry.description}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {[entry.patientName && !entry.description.includes(entry.patientName) && entry.patientName, entry.category, `vencimento ${formatDate(entry.dueDate)}`].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-2xl font-medium tracking-tight text-noite">{formatMoney(entry.amount)}</p>
            {overdue && <Badge tone="danger">Vencido</Badge>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Forma de pagamento" required>
            {(id) => (
              <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            )}
          </Field>
          <Field label={income ? 'Recebido em' : 'Pago em'} required>
            {(id) => <Input id={id} type="date" value={paidAt} max={today} onChange={(e) => setPaidAt(e.target.value)} />}
          </Field>
        </div>
      </div>
    </Modal>
  )
}
