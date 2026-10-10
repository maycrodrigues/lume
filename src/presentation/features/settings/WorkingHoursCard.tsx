import { CalendarOff, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { DayHours, WorkingHours } from '@/domain'
import { WEEKDAY_NAMES } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button, IconButton } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { Input, Select, Switch } from '../../components/ui/Field'
import { useAction, useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, toDateInput } from '../../lib/format'
import { BlockScheduleModal } from '../schedule/BlockScheduleModal'

/** Segunda a domingo, como a profissional lê a semana. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const INTERVALS = [0, 5, 10, 15, 20, 30, 45, 60]

function HoursForm({ initial }: { initial: WorkingHours }) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const [hours, setHours] = useState(initial)
  const [dirty, setDirty] = useState(false)

  const setDay = (weekday: number, patch: Partial<DayHours>) => {
    setHours((h) => ({ ...h, days: h.days.map((d, i) => (i === weekday ? { ...d, ...patch } : d)) }))
    setDirty(true)
  }

  const save = async () => {
    const result = await submit('schedule.workingHours', () => services.settings.saveWorkingHours(hours), { success: 'Horário de atendimento salvo.' })
    if (result.ok) setDirty(false)
  }

  return (
    <div className="space-y-4 px-5 pb-5">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {WEEK_ORDER.map((weekday) => {
          const day = hours.days[weekday]
          return (
            <li key={weekday} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-32 text-sm text-ink first-letter:uppercase">{WEEKDAY_NAMES[weekday]}</span>
              <Switch checked={day.open} onChange={(open) => setDay(weekday, { open })} label={day.open ? 'Atende' : 'Fechado'} />
              {day.open && (
                <span className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
                  <Input type="time" step={900} className="h-9 w-28" value={day.start} onChange={(e) => setDay(weekday, { start: e.target.value })} aria-label={`Início ${WEEKDAY_NAMES[weekday]}`} />
                  às
                  <Input type="time" step={900} className="h-9 w-28" value={day.end} onChange={(e) => setDay(weekday, { end: e.target.value })} aria-label={`Fim ${WEEKDAY_NAMES[weekday]}`} />
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">Intervalo entre pacientes</span>
          <Select
            className="w-44"
            value={hours.intervalMinutes}
            onChange={(e) => {
              setHours((h) => ({ ...h, intervalMinutes: Number(e.target.value) }))
              setDirty(true)
            }}
          >
            {INTERVALS.map((m) => <option key={m} value={m}>{m === 0 ? 'Sem intervalo' : `${m} minutos`}</option>)}
          </Select>
        </label>
        <Button onClick={save} loading={pending} disabled={!dirty}>Salvar horário</Button>
      </div>
      <p className="text-xs text-ink-muted">Vale para novos agendamentos e remarcações; os já marcados não são alterados. Um agendamento precisa começar e terminar dentro do horário do dia.</p>
    </div>
  )
}

export function WorkingHoursCard() {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const [blocking, setBlocking] = useState(false)
  const { data: hours } = useLiveQuery(() => services.settings.workingHours(), [], ['settings'])
  const { data: blocks = [] } = useLiveQuery(() => services.schedule.listBlocks({ fromDate: toDateInput(new Date()) }), [])

  const unblock = async (id: string) => {
    if (await confirm({ title: 'Remover bloqueio', message: 'O período volta a ficar disponível para agendamentos.', confirmLabel: 'Remover', tone: 'primary' })) {
      await action('schedule.unblock', () => services.schedule.removeBlock(id), { success: 'Bloqueio removido.' })
    }
  }

  return (
    <Card>
      <CardHeader eyebrow="Agenda" title="Horário de atendimento" />
      {hours && <HoursForm key={JSON.stringify(hours)} initial={hours} />}
      <div className="border-t border-line px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">Bloqueios programados</p>
          <Button size="sm" variant="secondary" icon={<CalendarOff className="size-3.5" strokeWidth={1.5} />} onClick={() => setBlocking(true)}>Bloquear agenda</Button>
        </div>
        {blocks.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum bloqueio futuro. Use para feriados, férias, cursos ou compromissos.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="num flex-1 text-ink">
                  {formatDate(b.startDate)}
                  {b.endDate !== b.startDate && ` a ${formatDate(b.endDate)}`}
                  <span className="text-ink-muted"> · {b.startTime ? `${b.startTime}–${b.endTime}` : 'dia inteiro'}</span>
                </span>
                {b.reason && <span className="truncate text-ink-soft">{b.reason}</span>}
                <IconButton label="Remover bloqueio" onClick={() => unblock(b.id)} className="hover:!bg-danger-soft hover:!text-danger">
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BlockScheduleModal open={blocking} onClose={() => setBlocking(false)} />
    </Card>
  )
}
