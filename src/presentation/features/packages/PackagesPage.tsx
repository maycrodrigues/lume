import { CalendarClock, Package as PackageIcon, Pencil, Plus, Presentation, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { PackageView } from '@/application'
import type { Id } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import { PackageFormModal } from './PackageFormModal'
import { PackageOfferModal } from './PackageOfferModal'
import { SellPackageModal } from './SellPackageModal'

export function PackagesPage() {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const { data: packages, loading } = useLiveQuery(() => services.packages.list(), [])
  const [editing, setEditing] = useState<PackageView | 'new'>()
  const [offering, setOffering] = useState<PackageView>()
  const [selling, setSelling] = useState<{ packageId?: Id; patientId?: Id; discountPercent?: number }>()

  const remove = async (p: PackageView) => {
    const ok = await confirm({
      title: 'Excluir pacote',
      message: <>Excluir <strong className="text-ink">{p.name}</strong> do catálogo? Pacotes já contratados pelas pacientes continuam valendo.</>,
      confirmLabel: 'Excluir',
    })
    if (ok) await action('package.remove', () => services.packages.remove(p.id), { success: 'Pacote excluído.' })
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Pacotes"
        description="Combine procedimentos com desconto e oferte à paciente comparando as opções."
        actions={
          <>
            <Button variant="secondary" onClick={() => setSelling({})}>Contratar pacote</Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Novo pacote</Button>
          </>
        }
      />

      {!loading && packages?.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PackageIcon className="size-5" strokeWidth={1.5} />}
            title="Nenhum pacote cadastrado"
            description="Monte pacotes com várias sessões e use o simulador para ofertar descontos de forma visual."
            action={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Novo pacote</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {packages?.map((p) => (
            <Card key={p.id} className={cn('flex flex-col p-5', !p.active && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-medium text-ink">{p.name}</h3>
                    {!p.active && <Badge tone="neutral">Inativo</Badge>}
                    {p.lines.some((l) => l.missing) && <Badge tone="danger">Procedimento removido</Badge>}
                  </div>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.description}</p>}
                </div>
                <div className="-mt-1 -mr-2 flex">
                  <IconButton label="Editar pacote" onClick={() => setEditing(p)}>
                    <Pencil className="size-4" strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Excluir pacote" onClick={() => remove(p)} className="hover:!bg-danger-soft hover:!text-danger">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </IconButton>
                </div>
              </div>

              <ul className="mt-4 mb-5 space-y-1 text-sm">
                {p.lines.map((l) => (
                  <li key={l.procedureId} className="flex justify-between gap-3">
                    <span className="text-ink-soft">
                      <span className="num font-medium text-ink">{l.quantity}×</span> {l.name}
                    </span>
                    <span className="num text-ink-muted">{formatMoney(l.unitPrice * l.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="num text-xs text-ink-muted line-through">{formatMoney(p.pricing.fullPrice)}</span>
                    {p.discountPercent > 0 && <Badge tone="success" dot={false}>−{p.discountPercent}%</Badge>}
                  </div>
                  <p className="num text-xl font-medium text-noite">{formatMoney(p.pricing.finalPrice)}</p>
                  <p className="num text-[11px] text-ink-muted">
                    {p.pricing.sessions} sessões · {formatMoney(p.pricing.perSession)} cada
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.validityDays && (
                    <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                      <CalendarClock className="size-3.5" strokeWidth={1.5} />
                      válido {p.validityDays} dias
                    </span>
                  )}
                  <Button size="sm" variant="soft" icon={<Presentation className="size-3.5" strokeWidth={1.5} />} disabled={!p.active} onClick={() => setOffering(p)}>
                    Ofertar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PackageFormModal open={editing !== undefined} pkg={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />
      <PackageOfferModal
        pkg={offering}
        onClose={() => setOffering(undefined)}
        onContract={(input) => {
          setOffering(undefined)
          setSelling(input)
        }}
      />
      <SellPackageModal open={selling !== undefined} {...selling} onClose={() => setSelling(undefined)} />
    </>
  )
}
