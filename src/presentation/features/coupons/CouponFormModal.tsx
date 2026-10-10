import { Check } from 'lucide-react'
import { useState } from 'react'
import type { Coupon, Id } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Switch, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'

interface Props {
  open: boolean
  onClose: () => void
  coupon?: Coupon
}

const PERCENT_PRESETS = [5, 10, 15, 20]
const DAY_PRESETS = [7, 15, 30, 60]

export function CouponFormModal(props: Props) {
  return props.open ? <CouponFormDialog {...props} /> : null
}

function CouponFormDialog({ onClose, coupon }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list({ includeInactive: false }), [])
  const [name, setName] = useState(coupon?.name ?? '')
  const [description, setDescription] = useState(coupon?.description ?? '')
  const [discountPercent, setDiscountPercent] = useState(coupon?.discountPercent ?? 10)
  const [validityDays, setValidityDays] = useState(coupon?.validityDays ?? 30)
  const [issuableUntil, setIssuableUntil] = useState(coupon?.issuableUntil ?? '')
  const [restricted, setRestricted] = useState(Boolean(coupon?.procedureIds.length))
  const [procedureIds, setProcedureIds] = useState<Id[]>(coupon?.procedureIds ?? [])
  const [active, setActive] = useState(coupon?.active ?? true)

  const onSubmit = async () => {
    const input = { name, description, discountPercent, validityDays, issuableUntil, procedureIds: restricted ? procedureIds : [], active }
    const result = await submit(coupon ? 'coupon.update' : 'coupon.create', () => (coupon ? services.coupons.update(coupon.id, input) : services.coupons.create(input)), {
      success: coupon ? 'Cupom atualizado.' : 'Cupom cadastrado.',
    })
    if (result.ok) onClose()
  }

  const chip = (on: boolean) => cn('h-8 rounded-full px-3 text-xs transition-colors', on ? 'bg-noite text-white' : 'bg-perola-soft text-ink-soft hover:bg-perola')

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={coupon ? 'Editar cupom' : 'Novo cupom'}
      description="Cada envio gera um código pessoal, de uso único, para a paciente."
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Salvar cupom</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {coupon && <Alert tone="info">Alterações valem para os próximos envios. Cupons já enviados mantêm o desconto e a validade prometidos.</Alert>}
        <Field label="Nome do cupom" required>
          {(id) => <Input id={id} data-autofocus placeholder="Ex.: Primeira visita, Mês do aniversário" value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Desconto" required>
            {(id) => (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-24">
                  <Input id={id} type="number" min={1} max={100} className="pr-7" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-muted">%</span>
                </div>
                {PERCENT_PRESETS.map((p) => (
                  <button key={p} type="button" className={chip(discountPercent === p)} onClick={() => setDiscountPercent(p)}>{p}%</button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Validade após o envio" required hint="A paciente tem esse prazo para fazer o procedimento.">
            {(id) => (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-24">
                  <Input id={id} type="number" min={1} max={365} className="pr-11" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-muted">dias</span>
                </div>
                {DAY_PRESETS.map((d) => (
                  <button key={d} type="button" className={chip(validityDays === d)} onClick={() => setValidityDays(d)}>{d}</button>
                ))}
              </div>
            )}
          </Field>
        </div>
        <Field label="Pode ser enviado até (opcional)" hint="Para campanhas com data de término. Depois disso o cupom não pode mais ser enviado.">
          {(id) => <Input id={id} type="date" className="max-w-52" value={issuableUntil} onChange={(e) => setIssuableUntil(e.target.value)} />}
        </Field>

        <div className="space-y-3">
          <Switch checked={restricted} onChange={setRestricted} label="Vale só para alguns procedimentos" description="Desligado: vale para qualquer procedimento avulso. Nunca vale para pacotes." />
          {restricted && (
            <div className="flex flex-wrap gap-1.5">
              {procedures.map((p) => {
                const on = procedureIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setProcedureIds((all) => (on ? all.filter((x) => x !== p.id) : [...all, p.id]))}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors', on ? 'border-noite bg-noite text-white' : 'border-line-strong bg-white text-ink-soft hover:border-cinza')}
                  >
                    {on && <Check className="size-3" strokeWidth={2.5} />}
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <Field label="Descrição interna">
          {(id) => <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quando usar este cupom" />}
        </Field>
        <Switch checked={active} onChange={setActive} label="Ativo" description="Cupons inativos não podem ser enviados; os já enviados continuam valendo até a validade." />
      </div>
    </Modal>
  )
}
