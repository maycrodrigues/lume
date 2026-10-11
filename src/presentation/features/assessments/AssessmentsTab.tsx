import { ChevronDown, ClipboardList, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import type { MedicalRecord } from '@/application'
import type { Assessment, AssessmentTemplateId } from '@/domain'
import { ASSESSMENT_TEMPLATES, formatNumber } from '@/domain'
import { useServices } from '../../app/services'
import { QuestionnaireSummary } from '../../components/questionnaire/QuestionnaireSummary'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { consultationLabel } from '../photos/AddPhotosModal'

export function NewAssessmentMenu({ onPick }: { onPick: (template: AssessmentTemplateId) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <Button icon={<Plus className="size-4" />} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Nova ficha
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <ul role="menu" className="absolute right-0 z-20 mt-1.5 w-60 rounded-xl border border-line bg-white p-1 shadow-pop">
          {(Object.keys(ASSESSMENT_TEMPLATES) as AssessmentTemplateId[]).map((id) => (
            <li key={id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onPick(id)
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-perola-soft"
              >
                {ASSESSMENT_TEMPLATES[id].title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MeasureEvolutionCard({ patientId, template }: { patientId: string; template: AssessmentTemplateId }) {
  const services = useServices()
  const { data } = useLiveQuery(() => services.assessments.measureEvolution(patientId, template), [patientId, template])
  if (!data || data.dates.length < 2 || data.rows.length === 0) return null
  const delta = (values: Array<number | undefined>) => {
    const known = values.filter((v): v is number => v !== undefined)
    if (known.length < 2) return undefined
    return Math.round((known[known.length - 1] - known[0]) * 100) / 100
  }
  return (
    <Card>
      <CardHeader eyebrow={ASSESSMENT_TEMPLATES[template].title} title="Evolução das medidas" />
      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-ink-muted uppercase">
              <th className="py-2 pr-4 font-medium">Medida</th>
              {data.dates.map((d) => <th key={d} className="num py-2 pr-4 text-right font-medium">{formatDate(d, 'dd/MM/yy')}</th>)}
              <th className="py-2 text-right font-medium">Variação</th>
            </tr>
          </thead>
          <tbody className="num">
            {data.rows.map((row) => {
              const d = delta(row.values)
              return (
                <tr key={row.key} className="border-t border-line">
                  <td className="py-2 pr-4 text-ink-soft">{row.label}</td>
                  {row.values.map((v, i) => <td key={i} className="py-2 pr-4 text-right text-ink">{v === undefined ? '—' : formatNumber(v)}</td>)}
                  <td className="py-2 text-right font-medium text-ink">
                    {d === undefined ? '—' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${formatNumber(Math.abs(d))}${row.unit ? ` ${row.unit}` : ''}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function AssessmentCard({ assessment, record, onEdit }: { assessment: Assessment; record: MedicalRecord; onEdit: () => void }) {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const [expanded, setExpanded] = useState(false)
  const questionnaire = ASSESSMENT_TEMPLATES[assessment.template]
  const consultation = record.consultations.find((c) => c.id === assessment.consultationId)

  const remove = async () => {
    const ok = await confirm({ title: 'Excluir ficha', message: `Excluir a ${questionnaire.title.toLowerCase()} de ${formatDate(assessment.date)}? Uma cópia fica em Registros.`, confirmLabel: 'Excluir' })
    if (ok) await action('assessment.remove', () => services.assessments.remove(assessment.id), { success: 'Ficha excluída.' })
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">{formatDate(assessment.date, "d 'de' MMMM 'de' yyyy")}</p>
          <h3 className="text-[15px] font-medium text-ink">{questionnaire.title}</h3>
          {consultation && <Badge tone="lilac" dot={false} className="mt-1.5">Atendimento de {consultationLabel(consultation)}</Badge>}
        </div>
        <div className="-mr-2 flex">
          <Link to={`/admin/fichas/${assessment.id}/imprimir`} target="_blank" rel="noreferrer" title="Imprimir" aria-label="Imprimir ficha" className="inline-flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-perola-soft hover:text-ink">
            <Printer className="size-4" strokeWidth={1.5} />
          </Link>
          <IconButton label="Editar ficha" onClick={onEdit}>
            <Pencil className="size-4" strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Excluir ficha" onClick={remove} className="hover:!bg-danger-soft hover:!text-danger">
            <Trash2 className="size-4" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
      <div className={cn('relative mt-4', !expanded && 'max-h-56 overflow-hidden')}>
        <QuestionnaireSummary questionnaire={questionnaire} answers={assessment.answers} gender={record.patient.gender} compact />
        {!expanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />}
      </div>
      <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-xs font-medium text-accent hover:text-noite">
        {expanded ? 'Mostrar menos' : 'Ver ficha completa'}
      </button>
    </Card>
  )
}

export function AssessmentsTab({ record, onNew, onEdit }: { record: MedicalRecord; onNew: (template: AssessmentTemplateId) => void; onEdit: (a: Assessment) => void }) {
  const templatesWithHistory = (Object.keys(ASSESSMENT_TEMPLATES) as AssessmentTemplateId[]).filter(
    (t) => record.assessments.filter((a) => a.template === t).length >= 2,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Avaliações datadas para acompanhar a evolução: facial, corporal (perimetria e adipometria), capilar e harmonização.</p>
        <NewAssessmentMenu onPick={onNew} />
      </div>
      {record.assessments.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardList className="size-5" strokeWidth={1.5} />} title="Nenhuma ficha de avaliação" description="Registre a avaliação inicial e as reavaliações para comparar a evolução ao longo do tratamento." />
        </Card>
      ) : (
        <>
          {templatesWithHistory.map((t) => <MeasureEvolutionCard key={t} patientId={record.patient.id} template={t} />)}
          <div className="grid gap-4 xl:grid-cols-2">
            {record.assessments.map((a) => <AssessmentCard key={a.id} assessment={a} record={record} onEdit={() => onEdit(a)} />)}
          </div>
        </>
      )}
    </div>
  )
}
