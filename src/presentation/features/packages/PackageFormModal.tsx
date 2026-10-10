import { Minus, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Id, Package } from '@/domain'
import { packagePricing } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Input, Select, Switch, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import { DiscountLadder } from './DiscountLadder'

interface Props {
  open: boolean
  onClose: () => void
  pkg?: Package
}

const VALIDITY_PRESETS = [60, 90, 120, 180]

export function PackageFormModal(props: Props) {
  return props.open ? <PackageFormDialog {...props} /> : null
}

function PackageFormDialog({ onClose, pkg }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list(), [])
  const [name, setName] = useState(pkg?.name ?? '')
  const [description, setDescription] = useState(pkg?.description ?? '')
  const [items, setItems] = useState<Array<{ procedureId: Id; quantity: number }>>(pkg?.items ?? [])
  const [discountPercent, setDiscountPercent] = useState(pkg?.discountPercent ?? 10)
  const [validityDays, setValidityDays] = useState(pkg?.validityDays ? String(pkg.validityDays) : '90')
  const [active, setActive] = useState(pkg?.active ?? true)

  const lines = items.map((i) => {
    const p = procedures.find((x) => x.id === i.procedureId)
    return { ...i, name: p?.name ?? 'Procedimento removido', unitPrice: p?.price ?? 0 }
  })
  const pricing = packagePricing(lines, discountPercent)

  const setQuantity = (procedureId: Id, quantity: number) =>
    setItems((all) => all.map((i) => (i.procedureId === procedureId ? { ...i, quantity: Math.max(1, Math.min(100, quantity)) } : i)))

  const add = (procedureId: Id) =>
    setItems((all) => (all.some((i) => i.procedureId === procedureId) ? all.map((i) => (i.procedureId === procedureId ? { ...i, quantity: i.quantity + 1 } : i)) : [...all, { procedureId, quantity: 1 }]))

  const onSubmit = async () => {
    const input = { name, description, items, discountPercent, validityDays, active }
    const result = await submit(pkg ? 'package.update' : 'package.create', () => (pkg ? services.packages.update(pkg.id, input) : services.packages.create(input)), {
      success: pkg ? 'Pacote atualizado.' : 'Pacote criado.',
    })
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={pkg ? 'Editar pacote' : 'Novo pacote'}
      description="Os valores acompanham o catálogo até o pacote ser contratado."
      onSubmit={onSubmit}
      footer={
        <>
          <p className="num mr-auto text-sm text-ink-soft">
            {pricing.sessions} {pricing.sessions === 1 ? 'sessão' : 'sessões'} · <span className="line-through">{formatMoney(pricing.fullPrice)}</span>{' '}
            <strong className="font-medium text-ink">{formatMoney(pricing.finalPrice)}</strong>
          </p>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>{pkg ? 'Salvar pacote' : 'Criar pacote'}</Button>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <Field label="Nome do pacote" required>
            {(id) => <Input id={id} data-autofocus placeholder="Ex.: Detox corporal" value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Descrição">
            {(id) => <Textarea id={id} rows={2} placeholder="O que o pacote entrega para a paciente" value={description} onChange={(e) => setDescription(e.target.value)} />}
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-ink-soft">
                Procedimentos <span className="text-danger">*</span>
              </p>
              <Select className="h-8 w-60 text-xs" value="" onChange={(e) => e.target.value && add(e.target.value)} aria-label="Adicionar procedimento ao pacote">
                <option value="">+ Adicionar procedimento</option>
                {procedures.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)}</option>)}
              </Select>
            </div>
            {lines.length === 0 ? (
              <p className="rounded-xl bg-offwhite px-4 py-3 text-sm text-ink-muted">Adicione os procedimentos e a quantidade de sessões de cada um.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {lines.map((l) => (
                  <li key={l.procedureId} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{l.name}</span>
                      <span className="num text-[11px] text-ink-muted">{formatMoney(l.unitPrice)} por sessão</span>
                    </span>
                    <span className="flex items-center rounded-full border border-line">
                      <IconButton label="Menos uma sessão" className="size-7" onClick={() => setQuantity(l.procedureId, l.quantity - 1)}>
                        <Minus className="size-3.5" />
                      </IconButton>
                      <span className="num w-7 text-center text-sm">{l.quantity}</span>
                      <IconButton label="Mais uma sessão" className="size-7" onClick={() => setQuantity(l.procedureId, l.quantity + 1)}>
                        <Plus className="size-3.5" />
                      </IconButton>
                    </span>
                    <span className="num w-24 text-right text-sm text-ink">{formatMoney(l.unitPrice * l.quantity)}</span>
                    <IconButton label="Remover do pacote" onClick={() => setItems((all) => all.filter((i) => i.procedureId !== l.procedureId))}>
                      <X className="size-4" strokeWidth={1.5} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Field label="Prazo para usar as sessões" hint="Contado a partir da contratação. Deixe vazio para não ter prazo.">
            {(id) => (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-28">
                  <Input id={id} inputMode="numeric" className="pr-12" value={validityDays} onChange={(e) => setValidityDays(e.target.value.replace(/\D/g, ''))} />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-muted">dias</span>
                </div>
                {VALIDITY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setValidityDays(String(d))}
                    className={cn('h-8 rounded-full px-3 text-xs transition-colors', validityDays === String(d) ? 'bg-noite text-white' : 'bg-perola-soft text-ink-soft hover:bg-perola')}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Switch checked={active} onChange={setActive} label="Disponível para oferta" description="Pacotes inativos não aparecem para contratar, mas os já contratados continuam valendo." />
        </div>

        <div>
          <p className="eyebrow mb-1">Simulador de desconto</p>
          <p className="mb-4 text-sm text-ink-muted">
            Escolha o desconto padrão do pacote. Na hora de ofertar, você ainda pode mostrar outras opções à paciente.
          </p>
          {pricing.fullPrice > 0 ? (
            <DiscountLadder fullPrice={pricing.fullPrice} sessions={pricing.sessions} value={discountPercent} onChange={setDiscountPercent} />
          ) : (
            <p className="rounded-xl bg-offwhite px-4 py-6 text-center text-sm text-ink-muted">Os valores aparecem aqui ao adicionar procedimentos.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
