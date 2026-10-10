import clsx from 'clsx'
import { AlertTriangle, ArrowRight, CalendarCheck, Cake, ClipboardPen, Plus, Sparkles, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { AppointmentView } from '@/application'
import { isEditableAppointment } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { firstName, formatDate, formatLong, formatMoney, formatTime, timeAgo } from '../../lib/format'
import { APPOINTMENT_STATUS } from '../../lib/labels'
import { ConsultationFormModal } from '../medical-record/ConsultationFormModal'
import { AppointmentFormModal } from '../schedule/AppointmentFormModal'
import { RevenueChart } from './RevenueChart'
import { StatTile } from './StatTile'

const greeting = (hour: number) => (hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite')

export function DashboardPage() {
  const services = useServices()
  const action = useAction()
  const [scheduling, setScheduling] = useState(false)
  const [attending, setAttending] = useState<AppointmentView | 'new'>()
  const { data: overview } = useLiveQuery(() => services.dashboard.overview(), [])
  const { data: settings } = useLiveQuery(() => services.settings.get(), [], ['settings'])
  const { data: stats } = useLiveQuery(() => services.backup.stats(), [])
  const { data: activity = [] } = useLiveQuery(
    async () => (await services.activity.query({ limit: 40 })).filter((e) => e.category !== 'navigation').slice(0, 6),
    [],
    ['activity'],
  )
  const now = new Date()

  if (!overview || !stats) return null
  const { kpis } = overview
  const isEmpty = stats.patients === 0 && stats.procedures === 0

  return (
    <>
      <PageHeader
        eyebrow={formatLong(now)}
        title={`${greeting(now.getHours())}, ${settings ? firstName(settings.professionalName) : ''}`}
        description="Beleza que equilibra, saúde que ilumina."
        actions={
          <>
            <Button variant="secondary" icon={<ClipboardPen className="size-4" strokeWidth={1.5} />} onClick={() => setAttending('new')}>Registrar atendimento</Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setScheduling(true)}>Novo agendamento</Button>
          </>
        }
      />

      {isEmpty && (
        <Card className="mb-6 overflow-hidden">
          <div className="grid gap-6 bg-gradient-to-br from-perola-soft via-white to-white p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
            <div>
              <p className="eyebrow mb-2">Primeiros passos</p>
              <h2 className="text-xl font-light text-noite">Seu painel está pronto para começar</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">Os dados ficam salvos neste computador. Comece pelo catálogo de procedimentos e pelas pacientes — ou explore com dados fictícios.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="soft" icon={<Sparkles className="size-4" strokeWidth={1.5} />} onClick={() => action('demo.load', () => services.backup.loadDemoData(), { success: 'Dados de demonstração carregados.' })}>
                  Carregar dados de demonstração
                </Button>
              </div>
            </div>
            <ol className="space-y-2.5 text-sm">
              {[
                { to: '/configuracoes', label: 'Preencha os dados da clínica e da profissional' },
                { to: '/procedimentos', label: 'Cadastre os procedimentos com valor e duração' },
                { to: '/pacientes', label: 'Cadastre as pacientes e a anamnese' },
                { to: '/agenda', label: 'Agende e registre os atendimentos' },
              ].map((step, i) => (
                <li key={step.to}>
                  <Link to={step.to} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-cinza">
                    <span className="num flex size-6 items-center justify-center rounded-full bg-noite text-[11px] text-white">{i + 1}</span>
                    <span className="flex-1 text-ink-soft">{step.label}</span>
                    <ArrowRight className="size-4 text-ink-muted" strokeWidth={1.5} />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Atendimentos hoje" value={kpis.appointmentsToday} icon={<CalendarCheck className="size-4" strokeWidth={1.5} />} hint={`${overview.today.filter((a) => a.status === 'completed').length} realizados`} />
        <StatTile label="Recebido no mês" value={formatMoney(kpis.monthIncome)} icon={<Wallet className="size-4" strokeWidth={1.5} />} hint={`${formatMoney(kpis.monthReceivable)} a receber`} />
        <StatTile label="Pacientes ativas" value={kpis.activePatients} icon={<Users className="size-4" strokeWidth={1.5} />} hint={`${kpis.newPatientsThisMonth} ${kpis.newPatientsThisMonth === 1 ? 'nova' : 'novas'} este mês`} />
        <StatTile
          label="Cobranças vencidas"
          value={formatMoney(kpis.overdueAmount)}
          icon={<AlertTriangle className="size-4" strokeWidth={1.5} />}
          tone={kpis.overdueCount > 0 ? 'warning' : undefined}
          hint={kpis.overdueCount > 0 ? `${kpis.overdueCount} em aberto — ver Financeiro` : 'Nada em atraso'}
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader eyebrow="Hoje" title="Agenda do dia" action={<ButtonLink to="/agenda" variant="ghost" size="sm">Abrir agenda</ButtonLink>} />
          {overview.today.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="size-5" strokeWidth={1.5} />} title="Nenhum agendamento para hoje" action={<Button size="sm" variant="soft" onClick={() => setScheduling(true)}>Agendar</Button>} />
          ) : (
            <ul className="divide-y divide-line px-2 pb-2">
              {overview.today.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl px-3 py-3">
                  <div className="num w-[92px] text-sm">
                    <p className="font-medium text-ink">{formatTime(a.start)}</p>
                    <p className="text-xs text-ink-muted">até {formatTime(a.end)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/pacientes/${a.patientId}`} className="truncate text-sm font-medium text-ink hover:text-accent">{a.patientName}</Link>
                    <p className="truncate text-xs text-ink-muted">{a.items.map((i) => i.name).join(' · ')}</p>
                  </div>
                  <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
                  {isEditableAppointment(a) && (
                    <Button size="sm" variant="soft" onClick={() => setAttending(a)}>Atender</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Em breve" title="Próximos agendamentos" />
          {overview.upcoming.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-ink-muted">Nenhum agendamento nos próximos dias.</p>
          ) : (
            <ul className="space-y-1 px-3 pb-3">
              {overview.upcoming.map((a) => (
                <li key={a.id}>
                  <Link to={`/pacientes/${a.patientId}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-offwhite">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-perola-soft">
                      <span className="num text-[15px] leading-none text-noite">{new Date(a.start).getDate()}</span>
                      <span className="mt-1 text-[9px] leading-none font-medium tracking-wider whitespace-nowrap text-accent uppercase">{formatDate(a.start, 'EEEEEE')}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{a.patientName}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {formatTime(a.start)} · {a.items.map((i) => i.name).join(', ')}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader eyebrow="Últimos 6 meses" title="Receitas e despesas pagas" action={<ButtonLink to="/financeiro" variant="ghost" size="sm">Financeiro</ButtonLink>} />
          <div className="px-5 pb-5">
            <RevenueChart data={overview.revenue} />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Últimos 90 dias" title="Procedimentos mais realizados" />
            {overview.topProcedures.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-muted">Aparecem aqui após os primeiros atendimentos.</p>
            ) : (
              <ul className="space-y-3 px-5 pb-5">
                {overview.topProcedures.map((p) => (
                  <li key={p.name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-ink">{p.name}</span>
                      <span className="num shrink-0 text-xs text-ink-muted">
                        <strong className="font-medium text-ink">{p.count}×</strong> · {formatMoney(p.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-perola-soft">
                      <div className="h-full rounded-full bg-lilas" style={{ width: `${(p.count / overview.topProcedures[0].count) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="Este mês" title="Aniversariantes" />
            {overview.birthdays.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-muted">Nenhuma aniversariante este mês.</p>
            ) : (
              <ul className="space-y-1 px-3 pb-3">
                {overview.birthdays.map(({ patient, day }) => (
                  <li key={patient.id}>
                    <Link to={`/pacientes/${patient.id}`} className={clsx('flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-offwhite', day === now.getDate() && 'bg-perola-soft')}>
                      <Cake className="size-4 text-accent" strokeWidth={1.5} />
                      <span className="flex-1 truncate text-sm text-ink">{patient.name}</span>
                      <span className="num text-xs text-ink-muted">{day === now.getDate() ? 'Hoje!' : `dia ${day}`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader eyebrow="Registros" title="Atividade recente" action={<ButtonLink to="/registros" variant="ghost" size="sm">Ver todos</ButtonLink>} />
        {activity.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-muted">As alterações feitas no painel aparecem aqui.</p>
        ) : (
          <ul className="divide-y divide-line px-5 pb-2">
            {activity.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="truncate text-ink-soft">{e.message}</span>
                <span className="shrink-0 text-xs text-ink-muted">{timeAgo(e.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AppointmentFormModal open={scheduling} onClose={() => setScheduling(false)} />
      <ConsultationFormModal open={attending !== undefined} appointment={attending === 'new' ? undefined : attending} onClose={() => setAttending(undefined)} />
    </>
  )
}
