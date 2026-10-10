import clsx from 'clsx'
import { ChevronDown, Compass, Database, Download, Search, ServerCog, TriangleAlert } from 'lucide-react'
import { Fragment, useState } from 'react'
import type { ActivityCategory, ActivityEntry, EntityName } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Segmented, Select } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { downloadJson, formatDate, toDateInput } from '../../lib/format'
import { ACTIVITY_CATEGORIES, ENTITY_NAMES } from '../../lib/labels'
import { fieldLabel, formatChangeValue } from './formatChange'

const ICONS: Record<ActivityCategory, typeof Database> = { data: Database, navigation: Compass, system: ServerCog, error: TriangleAlert }
const PAGE = 200

export function ActivityPage() {
  const services = useServices()
  const action = useAction()
  const [category, setCategory] = useState<ActivityCategory | 'all'>('all')
  const [entity, setEntity] = useState<EntityName | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [expanded, setExpanded] = useState<string>()

  const query = {
    category: category === 'all' ? undefined : category,
    entity: entity || undefined,
    from: from ? new Date(`${from}T00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    search: search || undefined,
  }
  const { data: entries = [], loading } = useLiveQuery(() => services.activity.query({ ...query, limit }), [JSON.stringify(query), limit], ['activity'])

  const exportLogs = () =>
    action('activity.export', async () => {
      const all = await services.activity.query(query)
      downloadJson(`lume-registros-${toDateInput(new Date())}.json`, all)
      await services.activity.record({ category: 'system', action: 'activity.export', message: `Registros exportados (${all.length})` })
    })

  const groups = new Map<string, ActivityEntry[]>()
  entries.forEach((e) => {
    const day = toDateInput(new Date(e.timestamp))
    groups.set(day, [...(groups.get(day) ?? []), e])
  })

  return (
    <>
      <PageHeader
        eyebrow="Auditoria"
        title="Registros de atividade"
        description="Tudo o que acontece no painel: alterações de dados (com antes e depois), navegação, eventos do sistema e erros."
        actions={<Button variant="secondary" icon={<Download className="size-4" strokeWidth={1.5} />} onClick={exportLogs}>Exportar JSON</Button>}
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <Segmented<ActivityCategory | 'all'>
          value={category}
          onChange={(c) => {
            setCategory(c)
            setLimit(PAGE)
          }}
          size="sm"
          options={[{ value: 'all', label: 'Todos' }, ...Object.entries(ACTIVITY_CATEGORIES).map(([value, label]) => ({ value: value as ActivityCategory, label }))]}
        />
        <Select className="h-9 w-44 text-xs" value={entity} onChange={(e) => setEntity(e.target.value as EntityName | '')} aria-label="Tipo de registro">
          <option value="">Todos os tipos</option>
          {Object.entries(ENTITY_NAMES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Input type="date" className="h-9 w-36 text-xs" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
          até
          <Input type="date" className="h-9 w-36 text-xs" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
        </div>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
          <Input className="h-9 pl-9 text-xs" placeholder="Buscar nos registros" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar nos registros" />
        </div>
      </Card>

      {!loading && entries.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros para ver outros períodos ou categorias." />
        </Card>
      ) : (
        <div className={clsx('space-y-5', loading && 'opacity-60')}>
          {[...groups.entries()].map(([day, items]) => (
            <Card key={day} className="overflow-hidden">
              <p className="border-b border-line bg-offwhite/60 px-5 py-2.5 text-xs font-medium text-ink-soft first-letter:uppercase">{formatDate(day, "EEEE, d 'de' MMMM 'de' yyyy")}</p>
              <ul className="divide-y divide-line">
                {items.map((e) => {
                  const Icon = ICONS[e.category]
                  const hasDetails = Boolean(e.changes?.length || e.context)
                  const open = expanded === e.id
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        disabled={!hasDetails}
                        onClick={() => setExpanded(open ? undefined : e.id)}
                        aria-expanded={hasDetails ? open : undefined}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors enabled:hover:bg-offwhite/60"
                      >
                        <span className="num w-16 shrink-0 text-xs text-ink-muted">{new Date(e.timestamp).toLocaleTimeString('pt-BR')}</span>
                        <Icon className={clsx('size-4 shrink-0', e.level === 'error' ? 'text-danger' : e.level === 'warning' ? 'text-warning' : 'text-accent')} strokeWidth={1.5} />
                        <span className="min-w-0 flex-1 truncate text-ink">{e.message}</span>
                        {e.level !== 'info' && <Badge tone={e.level === 'error' ? 'danger' : 'warning'}>{e.level === 'error' ? 'Erro' : 'Aviso'}</Badge>}
                        {e.entity && <Badge tone="lilac" dot={false}>{ENTITY_NAMES[e.entity]}</Badge>}
                        {hasDetails && <ChevronDown className={clsx('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} strokeWidth={1.5} />}
                      </button>
                      {open && (
                        <div className="space-y-3 bg-offwhite/50 px-5 pt-1 pb-4 pl-[108px]">
                          {e.changes && e.changes.length > 0 && (
                            <div className="grid grid-cols-[minmax(140px,auto)_1fr_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-line bg-white p-3 text-xs">
                              <span className="font-medium text-ink-muted">Campo</span>
                              <span className="font-medium text-ink-muted">Antes</span>
                              <span className="font-medium text-ink-muted">Depois</span>
                              {e.changes.map((c) => (
                                <Fragment key={c.field}>
                                  <span className="text-ink-soft">{fieldLabel(c.field)}</span>
                                  <span className="break-words text-danger/80 line-through decoration-danger/30">{formatChangeValue(c.field, c.from)}</span>
                                  <span className="break-words text-success">{formatChangeValue(c.field, c.to)}</span>
                                </Fragment>
                              ))}
                            </div>
                          )}
                          {e.context && (
                            <pre className="max-h-64 overflow-auto rounded-xl border border-line bg-white p-3 text-[11px] leading-relaxed text-ink-soft">{JSON.stringify(e.context, null, 2)}</pre>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
          {entries.length >= limit && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>Carregar mais</Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
