import { useState } from 'react'
import type { EntryStatus, EntryType, FinancialEntry, Id, PaymentMethod } from '@/domain'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { PatientPicker } from '../../components/ui/PatientPicker'
import { useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { toDateInput } from '../../lib/format'
import { ENTRY_STATUS, PAYMENT_METHODS } from '../../lib/labels'

interface Props {
  open: boolean
  onClose: () => void
  entry?: FinancialEntry
  initialType?: EntryType
}

export function EntryFormModal(props: Props) {
  return props.open ? <EntryFormDialog {...props} /> : null
}

function EntryFormDialog({ onClose, entry, initialType = 'income' }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: patients = [] } = useLiveQuery(() => services.patients.list({ includeInactive: true }), [])
  const [type, setType] = useState<EntryType>(entry?.type ?? initialType)
  const [description, setDescription] = useState(entry?.description ?? '')
  const [category, setCategory] = useState(entry?.category ?? '')
  const [amount, setAmount] = useState(entry?.amount ?? 0)
  const [dueDate, setDueDate] = useState(entry?.dueDate ?? toDateInput(new Date()))
  const [status, setStatus] = useState<EntryStatus>(entry?.status ?? 'paid')
  const [paidAt, setPaidAt] = useState(entry?.paidAt ?? '')
  const [method, setMethod] = useState<PaymentMethod | ''>(entry?.method ?? 'pix')
  const [patientId, setPatientId] = useState<Id | undefined>(entry?.patientId)
  const [notes, setNotes] = useState(entry?.notes ?? '')

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const onSubmit = async () => {
    const input = { type, description, category, amount, dueDate, status, paidAt: status === 'paid' ? paidAt : '', method: status === 'paid' ? method : '', patientId, notes }
    const result = await submit(entry ? 'finance.update' : 'finance.create', () => (entry ? services.finance.update(entry.id, input) : services.finance.create(input)), {
      success: entry ? 'Lançamento atualizado.' : 'Lançamento registrado.',
    })
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={entry ? 'Editar lançamento' : 'Novo lançamento'}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {entry?.consultationId && <Alert tone="info">Este lançamento é a cobrança de um atendimento.</Alert>}
        <Segmented<EntryType>
          value={type}
          onChange={(t) => {
            setType(t)
            setCategory('')
          }}
          options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]}
        />
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Descrição" required className="sm:col-span-4">
            {(id) => <Input id={id} data-autofocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'income' ? 'Ex.: Pacote 5 sessões de drenagem' : 'Ex.: Aluguel da sala'} />}
          </Field>
          <Field label="Valor" required className="sm:col-span-2">
            {(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}
          </Field>
          <Field label="Categoria" required className="sm:col-span-3">
            {(id) => (
              <>
                <Input id={id} list="entry-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
                <datalist id="entry-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </>
            )}
          </Field>
          <Field label={status === 'paid' ? 'Data' : 'Vencimento'} required className="sm:col-span-3">
            {(id) => <Input id={id} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
          <Field label="Situação" className="sm:col-span-2">
            {(id) => (
              <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as EntryStatus)}>
                {Object.entries(ENTRY_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </Select>
            )}
          </Field>
          {status === 'paid' && (
            <>
              <Field label="Forma de pagamento" className="sm:col-span-2">
                {(id) => (
                  <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {Object.entries(PAYMENT_METHODS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Pago em" hint="Vazio = data acima" className="sm:col-span-2">
                {(id) => <Input id={id} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />}
              </Field>
            </>
          )}
          <Field label="Paciente (opcional)" className="sm:col-span-6">
            {(id) => (
              <div className="flex gap-2">
                <div className="flex-1">
                  <PatientPicker id={id} patients={patients} value={patientId} onChange={setPatientId} />
                </div>
                {patientId && <Button variant="ghost" onClick={() => setPatientId(undefined)}>Remover</Button>}
              </div>
            )}
          </Field>
          <Field label="Observações" className="sm:col-span-6">
            {(id) => <Textarea id={id} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
        </div>
      </div>
    </Modal>
  )
}
