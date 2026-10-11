import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FinancialEntryView } from '@/application'
import { currentMonth, lastMonths } from '@/application/dates'
import type { EntryStatus, EntryType } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Segmented, Select } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatMoney, formatMonthYear } from '../../lib/format'
import { ENTRY_STATUS, PAYMENT_METHODS } from '../../lib/labels'
import { StatTile } from '../dashboard/StatTile'
import { ConfirmPaymentModal } from './ConfirmPaymentModal'
import { EntryFormModal } from './EntryFormModal'

const shiftMonth = (month: string, step: number) => (step < 0 ? lastMonths(month, 2)[0] : nextMonth(month))
function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function FinancePage() {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const [month, setMonth] = useState(() => currentMonth(new Date()))
  const [type, setType] = useState<EntryType | 'all'>('all')
  const [status, setStatus] = useState<EntryStatus | ''>('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<{ entry?: FinancialEntryView; type?: EntryType }>()
  const [paying, setPaying] = useState<FinancialEntryView>()

  const { data: summary } = useLiveQuery(() => services.finance.summary(month), [month])
  const { data: entries = [], loading } = useLiveQuery(
    () => services.finance.list({ month, type: type === 'all' ? undefined : type, status: status || undefined, search }),
    [month, type, status, search],
  )
  const { data: overdue = [] } = useLiveQuery(() => services.finance.overdue(), [])

  const remove = async (e: FinancialEntryView) => {
    if (await confirm({ title: 'Excluir lançamento', message: `Excluir "${e.description}" (${formatMoney(e.amount)})? Uma cópia fica em Registros.`, confirmLabel: 'Excluir' })) {
      await action('finance.remove', () => services.finance.remove(e.id), { success: 'Lançamento excluído.' })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Financeiro"
        description="Receitas, despesas e o que ainda está para entrar ou sair."
        actions={
          <>
            <Button variant="secondary" icon={<ArrowDownRight className="size-4" strokeWidth={1.5} />} onClick={() => setEditing({ type: 'expense' })}>Despesa</Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setEditing({ type: 'income' })}>Receita</Button>
          </>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <IconButton label="Mês anterior" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft className="size-4" strokeWidth={1.5} />
        </IconButton>
        <h2 className="min-w-44 text-center text-lg font-light text-noite first-letter:uppercase">{formatMonthYear(month)}</h2>
        <IconButton label="Próximo mês" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRight className="size-4" strokeWidth={1.5} />
        </IconButton>
        {month !== currentMonth(new Date()) && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth(new Date()))}>Mês atual</Button>
        )}
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Recebido" value={formatMoney(summary?.incomePaid ?? 0)} icon={<ArrowUpRight className="size-4" strokeWidth={1.5} />} />
        <StatTile label="A receber" value={formatMoney(summary?.incomePending ?? 0)} />
        <StatTile label="Despesas pagas" value={formatMoney(summary?.expensePaid ?? 0)} icon={<ArrowDownRight className="size-4" strokeWidth={1.5} />} />
        <StatTile label="A pagar" value={formatMoney(summary?.expensePending ?? 0)} />
        <StatTile label="Saldo do mês" value={formatMoney(summary?.balance ?? 0)} emphasis hint="Recebido − despesas pagas" />
      </div>

      {overdue.length > 0 && (
        <div className="mb-5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <strong className="font-medium">{overdue.length} {overdue.length === 1 ? 'lançamento vencido' : 'lançamentos vencidos'}</strong> em aberto:{' '}
          {overdue.slice(0, 3).map((e) => `${e.description} (${formatDate(e.dueDate)})`).join(' · ')}
          {overdue.length > 3 && '…'}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <Segmented<EntryType | 'all'> value={type} onChange={setType} size="sm" options={[{ value: 'all', label: 'Todos' }, { value: 'income', label: 'Receitas' }, { value: 'expense', label: 'Despesas' }]} />
          <div className="flex flex-wrap items-center gap-2">
            <Select className="h-9 w-40 text-xs" value={status} onChange={(e) => setStatus(e.target.value as EntryStatus | '')} aria-label="Situação">
              <option value="">Todas as situações</option>
              {Object.entries(ENTRY_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <div className="relative w-56">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
              <Input className="h-9 pl-9 text-xs" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar lançamentos" />
            </div>
          </div>
        </div>

        {!loading && entries.length === 0 ? (
          <EmptyState icon={<Receipt className="size-5" strokeWidth={1.5} />} title="Nenhum lançamento neste mês" description="Cobranças de atendimentos entram aqui automaticamente. Registre também as despesas para acompanhar o saldo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wider text-ink-muted uppercase">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className={clsx(loading && 'opacity-60')}>
                {entries.map((e) => (
                  <tr key={e.id} className="group border-t border-line hover:bg-offwhite/60">
                    <td className="num px-5 py-3 whitespace-nowrap text-ink-soft">{formatDate(e.dueDate)}</td>
                    <td className="px-5 py-3">
                      <p className="text-ink">{e.description}</p>
                      <p className="text-xs text-ink-muted">{[e.patientName && !e.description.includes(e.patientName) && e.patientName, e.method && PAYMENT_METHODS[e.method]].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{e.category}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={ENTRY_STATUS[e.status].tone}>{ENTRY_STATUS[e.status].label}</Badge>
                        {e.overdue && <Badge tone="danger">Vencido</Badge>}
                      </div>
                    </td>
                    <td className={clsx('num px-5 py-3 text-right font-medium whitespace-nowrap', e.status === 'cancelled' ? 'text-ink-muted line-through' : 'text-ink')}>
                      <span className="mr-1 text-xs font-normal text-ink-muted">{e.type === 'income' ? '+' : '−'}</span>
                      {formatMoney(e.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-0.5">
                        {e.status === 'pending' && (
                          <IconButton label={e.type === 'income' ? 'Marcar como recebido' : 'Marcar como pago'} onClick={() => setPaying(e)} className="hover:!bg-success-soft hover:!text-success">
                            <CheckCircle2 className="size-4" strokeWidth={1.5} />
                          </IconButton>
                        )}
                        <IconButton label="Editar" onClick={() => setEditing({ entry: e })}>
                          <Pencil className="size-4" strokeWidth={1.5} />
                        </IconButton>
                        <IconButton label="Excluir" onClick={() => remove(e)} className="hover:!bg-danger-soft hover:!text-danger">
                          <Trash2 className="size-4" strokeWidth={1.5} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EntryFormModal open={editing !== undefined} entry={editing?.entry} initialType={editing?.type} onClose={() => setEditing(undefined)} />
      <ConfirmPaymentModal entry={paying} onClose={() => setPaying(undefined)} />
    </>
  )
}
