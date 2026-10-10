import clsx from 'clsx'
import { Clock, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Procedure } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDuration, formatMoney } from '../../lib/format'
import { ProcedureFormModal } from './ProcedureFormModal'

export function ProceduresPage() {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>()
  const [editing, setEditing] = useState<Procedure | 'new'>()
  const { data: procedures, loading } = useLiveQuery(() => services.procedures.list({ search }), [search])

  const categories = useMemo(() => [...new Set((procedures ?? []).map((p) => p.category))], [procedures])
  const visible = (procedures ?? []).filter((p) => !category || p.category === category)

  const remove = async (p: Procedure) => {
    const ok = await confirm({
      title: 'Excluir procedimento',
      message: (
        <>
          Excluir <strong className="text-ink">{p.name}</strong> do catálogo? Atendimentos e agendamentos já registrados mantêm o nome e o valor cobrados.
        </>
      ),
      confirmLabel: 'Excluir',
    })
    if (ok) await action('procedure.remove', () => services.procedures.remove(p.id), { success: 'Procedimento excluído.' })
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Procedimentos"
        description="Serviços oferecidos pela clínica, com valor e duração padrão."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Novo procedimento</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
          <Input className="pl-9" placeholder="Buscar procedimento" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar procedimento" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[undefined, ...categories].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              onClick={() => setCategory(c)}
              className={clsx('h-8 rounded-full px-3.5 text-xs font-medium transition-colors', category === c ? 'bg-noite text-white' : 'bg-white text-ink-soft ring-1 ring-line hover:ring-cinza')}
            >
              {c ?? 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {!loading && visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="size-5" strokeWidth={1.5} />}
            title={search ? 'Nenhum procedimento encontrado' : 'Catálogo vazio'}
            description={search ? undefined : 'Cadastre os procedimentos oferecidos para poder agendar e registrar atendimentos.'}
            action={!search && <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Novo procedimento</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <Card key={p.id} className={clsx('flex flex-col p-5', !p.active && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow mb-1.5">{p.category}</p>
                  <h3 className="text-[15px] font-medium text-ink">{p.name}</h3>
                </div>
                <div className="-mt-1 -mr-2 flex">
                  <IconButton label="Editar" onClick={() => setEditing(p)}>
                    <Pencil className="size-4" strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Excluir" onClick={() => remove(p)} className="hover:!bg-danger-soft hover:!text-danger">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </IconButton>
                </div>
              </div>
              {p.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{p.description}</p>}
              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                    <Clock className="size-3.5 text-accent" strokeWidth={1.5} />
                    {formatDuration(p.durationMinutes)}
                  </span>
                  {!p.active && <Badge tone="neutral">Inativo</Badge>}
                </div>
                <p className="text-lg font-light text-noite">{formatMoney(p.price)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProcedureFormModal open={editing !== undefined} procedure={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />
    </>
  )
}
