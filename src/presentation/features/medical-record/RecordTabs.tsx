import { CalendarDays, CheckCircle2, ClipboardList, FileText, Pencil, Printer, Receipt, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import type { MedicalRecord } from '@/application'
import { useState } from 'react'
import type { Consultation, FinancialEntry, Photo, Prescription } from '@/domain'
import { ConfirmPaymentModal } from '../finance/ConfirmPaymentModal'
import { PhotoThumb } from '../photos/PhotoThumb'
import { consultationTotal } from '@/domain'
import { useServices } from '../../app/services'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAction } from '../../hooks/useAction'
import { formatDate, formatDateTime, formatMoney, formatTime } from '../../lib/format'
import { APPOINTMENT_STATUS, ENTRY_STATUS, PAYMENT_METHODS } from '../../lib/labels'

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">{label}</p>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{value}</p>
    </div>
  )
}

export function ConsultationsTab({ record, onEdit, onNew, onOpenPhotos }: { record: MedicalRecord; onEdit: (c: Consultation) => void; onNew: () => void; onOpenPhotos: (photos: Photo[], index: number) => void }) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()

  const remove = async (c: Consultation) => {
    const ok = await confirm({
      title: 'Excluir atendimento',
      message: 'O registro clínico será excluído. O agendamento de origem volta a ficar em aberto, a cobrança pendente é removida (a já paga é mantida) e prescrições, fichas e fotos continuam no prontuário. Uma cópia fica em Registros.',
      confirmLabel: 'Excluir atendimento',
    })
    if (ok) await action('consultation.remove', () => services.consultations.remove(c.id), { success: 'Atendimento excluído.' })
  }

  if (record.consultations.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ClipboardList className="size-5" strokeWidth={1.5} />} title="Nenhum atendimento registrado" description="Registre o atendimento ao final de cada sessão: procedimentos, evolução e orientações." action={<Button onClick={onNew}>Registrar atendimento</Button>} />
      </Card>
    )
  }

  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[27px] before:w-px before:bg-line">
      {record.consultations.map((c) => {
        const prescription = record.prescriptions.find((p) => p.consultationId === c.id)
        const entry = record.financialEntries.find((f) => f.id === c.financialEntryId)
        const photos = record.photos.filter((p) => p.consultationId === c.id)
        const d = new Date(c.date)
        return (
          <li key={c.id} className="relative flex gap-4">
            <div className="relative z-[1] flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-line bg-white text-center shadow-card">
              <span className="num text-lg leading-none font-light text-noite">{d.getDate()}</span>
              <span className="mt-0.5 text-[10px] tracking-wider text-ink-muted uppercase">{formatDate(c.date, 'MMM yy')}</span>
            </div>
            <Card className="min-w-0 flex-1 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Atendimento · {formatTime(c.date)}
                    {c.sessionNumber && <span className="font-normal text-ink-muted"> · {c.sessionNumber}ª sessão</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.procedures.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-perola-soft px-2.5 py-1 text-xs text-noite">
                        <Sparkles className="size-3 text-accent" strokeWidth={1.5} />
                        {p.name}
                        <span className="num text-ink-muted">{p.patientPackageId ? 'pacote' : formatMoney(p.price)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {entry && <Badge tone={ENTRY_STATUS[entry.status].tone}>{ENTRY_STATUS[entry.status].label} · {formatMoney(entry.amount)}</Badge>}
                  <IconButton label="Editar atendimento" onClick={() => onEdit(c)}>
                    <Pencil className="size-4" strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Excluir atendimento" onClick={() => remove(c)} className="hover:!bg-danger-soft hover:!text-danger">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </IconButton>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail label="Queixa principal" value={c.chiefComplaint} />
                <Detail label="Exame / análise" value={c.examination} />
                <Detail label="Equipamento utilizado" value={c.equipment} />
                <Detail label="Ativos utilizados" value={c.activeIngredients} />
                <Detail label="Evolução desde a sessão anterior" value={c.previousEvolution} />
                <Detail label="Evolução da sessão / conduta" value={c.evolution} />
                <Detail label="Orientações" value={c.recommendations} />
              </div>
              {c.intercurrences && (
                <div className="mt-4 rounded-xl bg-warning-soft px-4 py-2.5 text-sm text-warning">
                  <span className="font-medium">Intercorrências:</span> {c.intercurrences}
                </div>
              )}
              {photos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {photos.map((p, i) => <PhotoThumb key={p.id} photo={p} size="sm" onClick={() => onOpenPhotos(photos, i)} />)}
                </div>
              )}
              {c.procedures.some((p) => p.notes) && (
                <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-ink-soft">
                  {c.procedures.filter((p) => p.notes).map((p, i) => (
                    <li key={i}>
                      <span className="font-medium text-ink">{p.name}:</span> {p.notes}
                    </li>
                  ))}
                </ul>
              )}
              {prescription && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-offwhite px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <FileText className="size-4 text-accent" strokeWidth={1.5} />
                    Prescrição com {prescription.items.length} {prescription.items.length === 1 ? 'item' : 'itens'}
                  </span>
                  <Link to={`/prescricoes/${prescription.id}/imprimir`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-noite">
                    <Printer className="size-3.5" strokeWidth={1.5} />
                    Imprimir
                  </Link>
                </div>
              )}
              <p className="num mt-3 text-right text-xs text-ink-muted">
                {c.coupon && c.discount ? `Cupom ${c.coupon.code} (${c.coupon.discountPercent}%): −${formatMoney(c.discount)} · ` : ''}
                Total {formatMoney(consultationTotal(c))}
              </p>
            </Card>
          </li>
        )
      })}
    </ol>
  )
}

export function ProceduresTab({ record }: { record: MedicalRecord }) {
  if (record.performedProcedures.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Sparkles className="size-5" strokeWidth={1.5} />} title="Nenhum procedimento realizado" description="Os procedimentos aparecem aqui ao registrar atendimentos." />
      </Card>
    )
  }
  const counts = new Map<string, number>()
  record.performedProcedures.forEach((p) => counts.set(p.name, (counts.get(p.name) ?? 0) + 1))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => (
          <span key={name} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-soft">
            {name} <span className="num font-medium text-noite">×{n}</span>
          </span>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-ink-muted uppercase">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Procedimento</th>
              <th className="px-5 py-3 font-medium">Observações</th>
              <th className="px-5 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {record.performedProcedures.map((p, i) => (
              <tr key={`${p.consultationId}-${i}`} className="border-t border-line">
                <td className="num px-5 py-3 whitespace-nowrap text-ink-soft">{formatDateTime(p.date)}</td>
                <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-5 py-3 text-ink-muted">{p.notes ?? '—'}</td>
                <td className="num px-5 py-3 text-right text-ink">{formatMoney(p.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function PrescriptionsTab({ record, onEdit, onNew }: { record: MedicalRecord; onEdit: (p: Prescription) => void; onNew: () => void }) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()

  const remove = async (p: Prescription) => {
    if (await confirm({ title: 'Excluir prescrição', message: `Excluir a prescrição de ${formatDate(p.date)}? Uma cópia fica em Registros.`, confirmLabel: 'Excluir' })) {
      await action('prescription.remove', () => services.prescriptions.remove(p.id), { success: 'Prescrição excluída.' })
    }
  }

  if (record.prescriptions.length === 0) {
    return (
      <Card>
        <EmptyState icon={<FileText className="size-5" strokeWidth={1.5} />} title="Nenhuma prescrição" description="Prescreva cuidados domiciliares, dermocosméticos e orientações de uso." action={<Button onClick={onNew}>Nova prescrição</Button>} />
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {record.prescriptions.map((p) => (
        <Card key={p.id} className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">{p.consultationId ? 'Do atendimento' : 'Avulsa'}</p>
              <p className="text-sm font-medium text-ink">{formatDate(p.date, "d 'de' MMMM 'de' yyyy")}</p>
            </div>
            <div className="-mt-1 -mr-2 flex">
              <Link to={`/prescricoes/${p.id}/imprimir`} target="_blank" rel="noreferrer" title="Imprimir" aria-label="Imprimir" className="inline-flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-perola-soft hover:text-ink">
                <Printer className="size-4" strokeWidth={1.5} />
              </Link>
              <IconButton label="Editar prescrição" onClick={() => onEdit(p)}>
                <Pencil className="size-4" strokeWidth={1.5} />
              </IconButton>
              <IconButton label="Excluir prescrição" onClick={() => remove(p)} className="hover:!bg-danger-soft hover:!text-danger">
                <Trash2 className="size-4" strokeWidth={1.5} />
              </IconButton>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {p.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="num flex size-5 shrink-0 items-center justify-center rounded-full bg-perola-soft text-[11px] text-noite">{i + 1}</span>
                <div>
                  <p className="text-ink">
                    {item.name}
                    {item.dosage && <span className="text-ink-muted"> — {item.dosage}</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{item.instructions}</p>
                </div>
              </li>
            ))}
          </ol>
          {p.notes && <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">{p.notes}</p>}
        </Card>
      ))}
    </div>
  )
}

export function AppointmentsTab({ record, onOpen }: { record: MedicalRecord; onOpen: (id: string) => void }) {
  if (record.appointments.length === 0) {
    return (
      <Card>
        <EmptyState icon={<CalendarDays className="size-5" strokeWidth={1.5} />} title="Nenhum agendamento" />
      </Card>
    )
  }
  return (
    <Card className="divide-y divide-line">
      {record.appointments.map((a) => (
        <button key={a.id} type="button" onClick={() => onOpen(a.id)} className="flex w-full flex-wrap items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-offwhite/70">
          <span className="num w-40 text-sm text-ink">{formatDateTime(a.start)}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{a.items.map((i) => i.name).join(', ')}</span>
          <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
        </button>
      ))}
    </Card>
  )
}

export function FinanceTab({ record }: { record: MedicalRecord }) {
  const [paying, setPaying] = useState<FinancialEntry>()
  if (record.financialEntries.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Receipt className="size-5" strokeWidth={1.5} />} title="Nenhum lançamento" description="Cobranças de atendimentos e lançamentos vinculados à paciente aparecem aqui." />
      </Card>
    )
  }
  return (
    <Card className="divide-y divide-line">
      {record.financialEntries.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
          <span className="num w-24 text-sm text-ink-soft">{formatDate(e.dueDate)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">{e.description}</span>
            {e.method && <span className="text-xs text-ink-muted">{PAYMENT_METHODS[e.method]}</span>}
          </span>
          <Badge tone={ENTRY_STATUS[e.status].tone}>{ENTRY_STATUS[e.status].label}</Badge>
          <span className="num w-28 text-right text-sm font-medium text-ink">{formatMoney(e.amount)}</span>
          {e.status === 'pending' && (
            <Button size="sm" variant="soft" icon={<CheckCircle2 className="size-3.5" strokeWidth={1.75} />} onClick={() => setPaying(e)}>
              Recebido
            </Button>
          )}
        </div>
      ))}
      <ConfirmPaymentModal entry={paying && { ...paying, patientName: record.patient.name }} onClose={() => setPaying(undefined)} />
    </Card>
  )
}
