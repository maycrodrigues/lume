import { ChevronRight, Plus, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ageAt } from '@/domain'
import { useServices } from '../../app/services'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Switch } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatPhone } from '../../lib/format'
import { PatientFormModal } from './PatientFormModal'

export function PatientsPage() {
  const services = useServices()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [creating, setCreating] = useState(false)
  const { data: patients, loading } = useLiveQuery(() => services.patients.list({ search, includeInactive }), [search, includeInactive])
  const today = new Date()

  return (
    <>
      <PageHeader
        eyebrow="Cuidado"
        title="Pacientes"
        description="Cadastro, contato e acesso ao prontuário de cada paciente."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Nova paciente</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
            <Input className="pl-9" placeholder="Buscar por nome, e-mail, telefone ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar pacientes" />
          </div>
          <Switch checked={includeInactive} onChange={setIncludeInactive} label="Mostrar arquivadas" />
        </div>

        {!loading && patients?.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" strokeWidth={1.5} />}
            title={search ? 'Nenhuma paciente encontrada' : 'Nenhuma paciente cadastrada'}
            description={search ? 'Tente buscar por outro termo.' : 'Cadastre a primeira paciente para começar a montar o prontuário.'}
            action={!search && <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Nova paciente</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wider text-ink-muted uppercase">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Idade</th>
                  <th className="px-5 py-3 font-medium">Cidade</th>
                  <th className="px-5 py-3 font-medium">Desde</th>
                  <th className="px-5 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className={loading ? 'opacity-60 transition-opacity' : undefined}>
                {patients?.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/admin/pacientes/${p.id}`)} className="cursor-pointer border-t border-line transition-colors hover:bg-offwhite/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{p.name}</p>
                          {!p.active && <Badge tone="neutral" className="mt-0.5">Arquivada</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      <p>{formatPhone(p.phone) || '—'}</p>
                      {p.email && <p className="text-xs text-ink-muted">{p.email}</p>}
                    </td>
                    <td className="num px-5 py-3 text-ink-soft">{ageAt(p.birthDate, today) ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-soft">{p.city ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-muted">{formatDate(p.createdAt, 'MMM yyyy')}</td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight className="ml-auto size-4 text-ink-muted" strokeWidth={1.5} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PatientFormModal open={creating} onClose={() => setCreating(false)} onSaved={(p) => navigate(`/admin/pacientes/${p.id}`)} />
    </>
  )
}
