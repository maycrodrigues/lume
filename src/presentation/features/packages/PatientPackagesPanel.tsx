import { Package as PackageIcon, Plus } from 'lucide-react'
import { useState } from 'react'
import type { ContractView } from '@/application'
import type { Patient } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatDate, formatMoney } from '../../lib/format'
import { CONTRACT_STATUS } from '../../lib/labels'
import { SellPackageModal } from './SellPackageModal'

function ContractCard({ contract }: { contract: ContractView }) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const used = contract.usage.reduce((s, u) => s + u.used, 0)
  const total = contract.usage.reduce((s, u) => s + u.quantity, 0)

  const cancel = async () => {
    const unused = used === 0
    const ok = await confirm({
      title: unused ? 'Excluir pacote contratado' : 'Cancelar pacote',
      message: unused
        ? 'Nenhuma sessão foi usada. O pacote será excluído e a cobrança pendente, se houver, também. Uma cobrança já paga continua no financeiro.'
        : `As ${contract.remainingSessions} sessões restantes deixam de valer. O financeiro não é alterado — ajuste um eventual reembolso por lá.`,
      confirmLabel: unused ? 'Excluir' : 'Cancelar pacote',
    })
    if (!ok) return
    await action('package.cancelContract', () => (unused ? services.packages.removeContract(contract.id) : services.packages.cancelContract(contract.id)), {
      success: unused ? 'Pacote excluído.' : 'Pacote cancelado.',
    })
  }

  return (
    <Card className={cn('p-5', contract.status !== 'active' && 'bg-offwhite/50')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-ink">{contract.name}</h4>
            <Badge tone={CONTRACT_STATUS[contract.status].tone}>{CONTRACT_STATUS[contract.status].label}</Badge>
          </div>
          <p className="num mt-0.5 text-xs text-ink-muted">
            Contratado em {formatDate(contract.purchasedAt)}
            {contract.expiresAt && ` · válido até ${formatDate(contract.expiresAt)}`} · {formatMoney(contract.price)}
            {contract.discountPercent > 0 && ` (−${contract.discountPercent}%)`}
          </p>
        </div>
        <p className="num text-right text-xs text-ink-muted">
          <span className="text-lg font-medium text-noite">{used}</span>/{total} sessões
        </p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {contract.usage.map((u) => (
          <li key={u.procedureId}>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">{u.name}</span>
              <span className="num text-ink-muted">
                {u.used} de {u.quantity}
                {u.remaining > 0 && contract.status === 'active' && <span className="text-success"> · {u.remaining} {u.remaining === 1 ? 'restante' : 'restantes'}</span>}
              </span>
            </div>
            <div className="mt-1 flex gap-0.5" aria-hidden>
              {Array.from({ length: u.quantity }, (_, i) => (
                <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < u.used ? 'bg-noite' : 'bg-perola')} title={u.sessions[i] ? `Sessão em ${formatDate(u.sessions[i].date)}` : undefined} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {contract.notes && <p className="mt-3 text-xs text-ink-muted">{contract.notes}</p>}
      {(contract.status === 'active' || contract.status === 'expired') && (
        <button type="button" onClick={cancel} className="mt-3 text-xs font-medium text-ink-muted hover:text-danger">
          {used === 0 ? 'Excluir contratação' : 'Cancelar pacote'}
        </button>
      )}
    </Card>
  )
}

export function PatientPackagesPanel({ patient }: { patient: Patient }) {
  const services = useServices()
  const [selling, setSelling] = useState(false)
  const { data: contracts = [] } = useLiveQuery(() => services.packages.contracts(patient.id), [patient.id])

  return (
    <section>
      <CardHeader
        className="px-0 pt-0"
        eyebrow="Pacotes"
        title="Pacotes contratados"
        action={<Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setSelling(true)}>Contratar pacote</Button>}
      />
      {contracts.length === 0 ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-ink-muted">
          <PackageIcon className="size-5 text-accent" strokeWidth={1.5} />
          Nenhum pacote contratado. As sessões de um pacote são usadas no registro do atendimento.
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {contracts.map((c) => <ContractCard key={c.id} contract={c} />)}
        </div>
      )}
      <SellPackageModal open={selling} patientId={patient.id} onClose={() => setSelling(false)} />
    </section>
  )
}
