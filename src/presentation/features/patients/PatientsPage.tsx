import { ChevronRight, FileText, Plus, Search, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { isCaseStudyPatient } from '@/application'
import { ageAt } from '@/domain'
import { useServices } from '../../app/services'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Switch } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/Toast'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatPhone } from '../../lib/format'
import { PatientFormModal } from './PatientFormModal'

export function PatientsPage() {
  const services = useServices()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [caseStudiesOnly, setCaseStudiesOnly] = useState(false)
  const [creating, setCreating] = useState(false)
  const [preparingStudy, setPreparingStudy] = useState<'create' | 'report'>()
  const run = useAction()
  const toast = useToast()
  const { data: patients, loading } = useLiveQuery(() => services.patients.list({ search, includeInactive, caseStudiesOnly }), [search, includeInactive, caseStudiesOnly])
  const today = new Date()

  /** Cadastra só as pacientes de estudo de caso que faltam; as demais pacientes não são tocadas. */
  async function createCaseStudies() {
    setPreparingStudy('create')
    const result = await run('caseStudy.create', () => services.caseStudies.createTestCases())
    setPreparingStudy(undefined)
    if (!result.ok) return
    const { created, pairs } = result.value
    const total = pairs.length * 2
    toast.success(
      created === 0 ? `As ${total} pacientes de estudo de caso já estavam cadastradas.`
      : created === total ? `${created} pacientes de estudo de caso cadastradas. As demais pacientes foram mantidas.`
      : `${created} pacientes de estudo de caso que faltavam foram cadastradas. As demais pacientes foram mantidas.`,
    )
    setSearch('')
    setCaseStudiesOnly(true)
  }

  /** Abre o relatório comparativo para imprimir (cadastra antes as pacientes que faltarem). */
  async function openCaseStudyReport() {
    setPreparingStudy('report')
    const result = await run('caseStudy.report', () => services.caseStudies.createTestCases())
    setPreparingStudy(undefined)
    if (result.ok) navigate(`/admin/estudo-de-caso/imprimir?pares=${result.value.pairs.map((pair) => pair.join('.')).join(',')}`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Cuidado"
        title="Pacientes"
        description="Cadastro, contato e acesso ao prontuário de cada paciente."
        actions={
          <>
            <Button variant="secondary" icon={<UserPlus className="size-4" strokeWidth={1.5} />} loading={preparingStudy === 'create'} disabled={Boolean(preparingStudy)} onClick={() => void createCaseStudies()}>
              Criar estudos de caso
            </Button>
            <Button variant="secondary" icon={<FileText className="size-4" strokeWidth={1.5} />} loading={preparingStudy === 'report'} disabled={Boolean(preparingStudy)} onClick={() => void openCaseStudyReport()}>
              Relatório do estudo
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Nova paciente</Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
            <Input className="pl-9" placeholder="Buscar por nome, e-mail, telefone ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar pacientes" />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Switch checked={caseStudiesOnly} onChange={setCaseStudiesOnly} label="Só estudos de caso" />
            <Switch checked={includeInactive} onChange={setIncludeInactive} label="Mostrar arquivadas" />
          </div>
        </div>

        {!loading && patients?.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" strokeWidth={1.5} />}
            title={search ? 'Nenhuma paciente encontrada' : caseStudiesOnly ? 'Nenhuma paciente de estudo de caso' : 'Nenhuma paciente cadastrada'}
            description={
              search ? 'Tente buscar por outro termo.'
              : caseStudiesOnly ? 'Cadastre as 6 pacientes de teste dos estudos de caso. As pacientes que já existem são mantidas.'
              : 'Cadastre a primeira paciente para começar a montar o prontuário.'
            }
            action={
              !search &&
              (caseStudiesOnly ? (
                <Button variant="secondary" icon={<UserPlus className="size-4" strokeWidth={1.5} />} loading={preparingStudy === 'create'} onClick={() => void createCaseStudies()}>
                  Criar estudos de caso
                </Button>
              ) : (
                <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Nova paciente</Button>
              ))
            }
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
                          {(!p.active || isCaseStudyPatient(p)) && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {isCaseStudyPatient(p) && <Badge tone="lilac">Estudo de caso</Badge>}
                              {!p.active && <Badge tone="neutral">Arquivada</Badge>}
                            </div>
                          )}
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
