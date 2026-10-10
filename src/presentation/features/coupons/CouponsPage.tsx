import { CalendarClock, Pencil, Plus, Send, TicketPercent, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { CouponView } from '@/application'
import type { Id, IssuedCouponStatus } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { Segmented } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { CouponFormModal } from './CouponFormModal'
import { CouponValidator } from './CouponValidator'
import { IssueCouponModal } from './IssueCouponModal'
import { IssuedCouponsTable } from './IssuedCouponsTable'

type Tab = 'issued' | 'coupons'

export function CouponsPage() {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const [tab, setTab] = useState<Tab>('issued')
  const [status, setStatus] = useState<IssuedCouponStatus | 'all'>('all')
  const [editing, setEditing] = useState<CouponView | 'new'>()
  const [issuing, setIssuing] = useState<{ couponId?: Id }>()
  const { data: coupons = [] } = useLiveQuery(() => services.coupons.list(), [])
  const { data: issued = [] } = useLiveQuery(() => services.coupons.issued({ status: status === 'all' ? undefined : status }), [status])
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list(), [])

  const remove = async (c: CouponView) => {
    if (await confirm({ title: 'Excluir cupom', message: `Excluir o cupom "${c.name}"?`, confirmLabel: 'Excluir' })) {
      await action('coupon.remove', () => services.coupons.remove(c.id), { success: 'Cupom excluído.' })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Cupons de desconto"
        description="Cada paciente recebe um código pessoal, de uso único, válido por um prazo a partir do envio. Vale só para procedimentos avulsos."
        actions={
          <>
            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Novo cupom</Button>
            <Button icon={<Send className="size-4" strokeWidth={1.5} />} onClick={() => setIssuing({})}>Enviar cupom</Button>
          </>
        }
      />

      <div className="mb-6">
        <CouponValidator />
      </div>

      <div className="mb-4">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'issued', label: 'Enviados às pacientes' },
            { value: 'coupons', label: 'Cupons cadastrados', count: coupons.length },
          ]}
        />
      </div>

      {tab === 'issued' && (
        <Card>
          <div className="overflow-x-auto border-b border-line px-5 py-3.5">
            <Segmented<IssuedCouponStatus | 'all'>
              value={status}
              onChange={setStatus}
              size="sm"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'available', label: 'Disponíveis' },
                { value: 'redeemed', label: 'Utilizados' },
                { value: 'expired', label: 'Expirados' },
              ]}
            />
          </div>
          {issued.length === 0 ? (
            <EmptyState icon={<TicketPercent className="size-5" strokeWidth={1.5} />} title="Nenhum cupom por aqui" description="Envie um cupom a uma paciente para gerar o código pessoal dela." />
          ) : (
            <IssuedCouponsTable coupons={issued} />
          )}
        </Card>
      )}

      {tab === 'coupons' &&
        (coupons.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TicketPercent className="size-5" strokeWidth={1.5} />}
              title="Nenhum cupom cadastrado"
              description="Cadastre o desconto e a validade; depois envie para as pacientes."
              action={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Novo cupom</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coupons.map((c) => {
              const ended = c.issuableUntil && c.issuableUntil < new Date().toISOString().slice(0, 10)
              return (
                <Card key={c.id} className={cn('flex flex-col p-5', !c.active && 'opacity-70')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="num text-3xl font-light text-noite">{c.discountPercent}%</p>
                      <h3 className="mt-1 text-[15px] font-medium text-ink">{c.name}</h3>
                    </div>
                    <div className="-mt-1 -mr-2 flex">
                      <IconButton label="Editar cupom" onClick={() => setEditing(c)}>
                        <Pencil className="size-4" strokeWidth={1.5} />
                      </IconButton>
                      <IconButton label="Excluir cupom" onClick={() => remove(c)} className="hover:!bg-danger-soft hover:!text-danger">
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </IconButton>
                    </div>
                  </div>
                  {c.description && <p className="mt-1 text-sm text-ink-muted">{c.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="lilac" dot={false}>
                      <CalendarClock className="size-3" strokeWidth={1.75} /> {c.validityDays} dias após o envio
                    </Badge>
                    {!c.active && <Badge tone="neutral">Inativo</Badge>}
                    {c.issuableUntil && <Badge tone={ended ? 'danger' : 'warning'}>{ended ? 'Campanha encerrada' : `Envio até ${formatDate(c.issuableUntil)}`}</Badge>}
                  </div>
                  <p className="mt-3 mb-4 text-xs text-ink-muted">
                    {c.procedureIds.length ? `Vale para: ${c.procedureIds.map((id) => procedures.find((p) => p.id === id)?.name ?? '—').join(', ')}` : 'Vale para qualquer procedimento avulso'}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                    <p className="num text-xs text-ink-muted">
                      {c.issuedCount} enviados · {c.redeemedCount} utilizados
                    </p>
                    <Button size="sm" variant="soft" disabled={!c.active || Boolean(ended)} onClick={() => setIssuing({ couponId: c.id })}>Enviar</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ))}

      <CouponFormModal open={editing !== undefined} coupon={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />
      <IssueCouponModal open={issuing !== undefined} couponId={issuing?.couponId} onClose={() => setIssuing(undefined)} />
    </>
  )
}
