import { useSearchParams } from 'react-router'
import type { CaseStudyReport } from '@/application'
import type { Agreement, AnswerComparison, ClinicSettings, Questionnaire } from '@/domain'
import { ageAt, pickQuestions } from '@/domain'
import { useServices } from '../../app/services'
import { PrintSheet } from '../../components/print/PrintSheet'
import { QuestionnaireSummary } from '../../components/questionnaire/QuestionnaireSummary'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { GENDERS } from '../../lib/labels'

const CASE_LABELS = ['Caso A', 'Caso B'] as const

const AGREEMENT: Record<Agreement, { label: string; className: string }> = {
  same: { label: 'Semelhante', className: 'bg-success-soft text-success' },
  partial: { label: 'Em parte', className: 'bg-perola-soft text-noite' },
  different: { label: 'Diferente', className: 'bg-danger-soft text-danger' },
}

/** Perguntas da seção "Análise e plano de tratamento", pelo sufixo do id (`facial_goals`, `body_goals`…). */
const planPart = (questionnaire: Questionnaire, suffixes: string[]) => pickQuestions(questionnaire, (q) => suffixes.some((s) => q.id.endsWith(`_${s}`)))
const findings = (questionnaire: Questionnaire): Questionnaire => ({ ...questionnaire, sections: questionnaire.sections.filter((s) => s.id !== 'plan') })

/** `?pares=fichaA.fichaB,fichaC.fichaD` */
const parsePairs = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((pair) => pair.split('.'))
    .filter((pair): pair is [string, string] => pair.length === 2 && pair.every(Boolean))

function Heading({ number, children }: { number: string; children: string }) {
  return (
    <h3 className="mt-8 mb-3 flex items-baseline gap-2 border-b border-perola pb-1.5 text-sm font-medium text-noite">
      <span className="text-ink-muted">{number}</span>
      {children}
    </h3>
  )
}

function ComparisonTable({ rows }: { rows: AnswerComparison[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-ink-muted">
          <th className="w-[24%] py-1.5 pr-3 font-medium">Item avaliado</th>
          <th className="py-1.5 pr-3 font-medium">{CASE_LABELS[0]}</th>
          <th className="py-1.5 pr-3 font-medium">{CASE_LABELS[1]}</th>
          <th className="w-[13%] py-1.5 font-medium">Resultado</th>
        </tr>
      </thead>
      <tbody>
        {rows.flatMap((row, i) => [
          row.section !== rows[i - 1]?.section && (
            <tr key={`${row.section}-header`} className="break-inside-avoid">
              <td colSpan={4} className="eyebrow pt-3 pb-1">{row.section}</td>
            </tr>
          ),
          <tr key={row.question.id} className="break-inside-avoid border-t border-line align-top">
            <td className="py-1.5 pr-3 text-ink-soft">{row.question.label}</td>
            <td className="num py-1.5 pr-3 text-ink">{row.values[0] ?? '—'}</td>
            <td className="num py-1.5 pr-3 text-ink">{row.values[1] ?? '—'}</td>
            <td className="py-1.5">
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', AGREEMENT[row.agreement].className)}>{AGREEMENT[row.agreement].label}</span>
            </td>
          </tr>,
        ])}
      </tbody>
    </table>
  )
}

function Synthesis({ rows }: { rows: AnswerComparison[] }) {
  const labels = (agreements: Agreement[]) => rows.filter((r) => agreements.includes(r.agreement)).map((r) => r.question.label)
  const groups: Array<[string, string[]]> = [
    ['Características semelhantes', labels(['same'])],
    ['Semelhantes em parte', labels(['partial'])],
    ['Características diferentes', labels(['different'])],
  ]
  return (
    <dl className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-offwhite px-5 py-4 text-xs print:bg-perola-soft/60">
      {groups.map(([title, items]) => (
        <div key={title}>
          <dt className="mb-1 font-medium text-ink">{title}</dt>
          <dd className="leading-relaxed text-ink-soft">{items.length ? items.join(' · ') : '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function Study({ report, index }: { report: CaseStudyReport; index: number }) {
  const { cases, questionnaire } = report
  const n = index + 1
  const today = new Date()
  return (
    <section className={cn(index > 0 && 'mt-12 break-before-page print:mt-0')}>
      <p className="eyebrow">Estudo {n}</p>
      <h2 className="mt-1 text-lg font-light text-noite">{report.title}</h2>

      <Heading number={`${n}.1`}>Indivíduos selecionados</Heading>
      <div className="grid grid-cols-2 gap-4">
        {cases.map(({ patient, assessment }, i) => (
          <div key={patient.id} className="rounded-xl bg-offwhite px-4 py-3 text-xs print:bg-perola-soft/60">
            <p className="eyebrow">{CASE_LABELS[i]}</p>
            <p className="mt-1 text-sm font-medium text-ink">{patient.name}</p>
            <p className="mt-0.5 text-ink-soft">
              {[ageAt(patient.birthDate, today) !== undefined && `${ageAt(patient.birthDate, today)} anos`, GENDERS[patient.gender], patient.occupation].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-0.5 text-ink-soft">Avaliação em {formatDate(assessment.date)}</p>
            <p className="mt-2 text-ink">{String(assessment.answers[`${assessment.template}_dysfunction`] ?? '')}</p>
          </div>
        ))}
      </div>

      <Heading number={`${n}.2`}>Avaliação estética de cada caso</Heading>
      {cases.map(({ patient, assessment }, i) => (
        <div key={patient.id} className={cn(i > 0 && 'mt-8')}>
          <p className="mb-3 text-sm font-medium text-ink">
            {CASE_LABELS[i]} — {patient.name}
          </p>
          <p className="mb-2 text-xs text-ink-muted">Anamnese: queixa, hábitos e histórico</p>
          <QuestionnaireSummary questionnaire={report.anamnesis} answers={patient.anamnesis} gender={patient.gender} compact />
          <p className="mt-5 mb-2 text-xs text-ink-muted">{questionnaire.title}</p>
          <QuestionnaireSummary questionnaire={findings(questionnaire)} answers={assessment.answers} gender={patient.gender} compact />
        </div>
      ))}

      <Heading number={`${n}.3`}>Fatores associados, agravantes, contraindicações e cuidados</Heading>
      {cases.map(({ patient, assessment }, i) => (
        <div key={patient.id} className={cn(i > 0 && 'mt-6')}>
          <p className="mb-2 text-sm font-medium text-ink">{CASE_LABELS[i]} — {patient.name}</p>
          <QuestionnaireSummary questionnaire={untitled(planPart(questionnaire, ['factors', 'aggravants', 'contraindications', 'care']))} answers={assessment.answers} compact />
        </div>
      ))}

      <Heading number={`${n}.4`}>Comparação entre os casos</Heading>
      <ComparisonTable rows={report.comparison} />
      <p className="mt-5 mb-2 text-xs text-ink-muted">Hábitos e histórico (Anamnese)</p>
      <ComparisonTable rows={report.anamnesisComparison} />
      <Synthesis rows={[...report.comparison, ...report.anamnesisComparison]} />

      <Heading number={`${n}.5`}>Interpretação dos achados e objetivos terapêuticos</Heading>
      {cases.map(({ patient, assessment }, i) => (
        <div key={patient.id} className={cn(i > 0 && 'mt-6')}>
          <p className="mb-2 text-sm font-medium text-ink">{CASE_LABELS[i]} — {patient.name}</p>
          <QuestionnaireSummary questionnaire={untitled(planPart(questionnaire, ['interpretation', 'goals']))} answers={assessment.answers} compact />
        </div>
      ))}

      <Heading number={`${n}.6`}>Protocolos de tratamento e justificativas</Heading>
      {cases.map(({ patient, assessment }, i) => (
        <div key={patient.id} className={cn(i > 0 && 'mt-6')}>
          <p className="mb-1 text-sm font-medium text-ink">Protocolo {i + 1} — {CASE_LABELS[i]} ({patient.name})</p>
          <QuestionnaireSummary questionnaire={untitled(planPart(questionnaire, ['protocol']))} answers={assessment.answers} compact />
        </div>
      ))}
    </section>
  )
}

/** Sem o título da seção: o relatório já tem os próprios subtítulos. */
const untitled = (questionnaire: Questionnaire): Questionnaire => ({ ...questionnaire, sections: questionnaire.sections.map((s) => ({ ...s, title: '' })) })

export function CaseStudyPrintPage() {
  const [params] = useSearchParams()
  const pairs = parsePairs(params.get('pares'))
  const services = useServices()
  const { data, error } = useLiveQuery(
    async (): Promise<{ reports: CaseStudyReport[]; clinic: ClinicSettings }> => {
      const [reports, clinic] = await Promise.all([services.caseStudies.report(pairs), services.settings.get()])
      return { reports, clinic }
    },
    [params.get('pares')],
  )
  if (error) return <p className="p-10 text-center text-sm text-ink-muted">{error.message}</p>
  if (!data) return null
  if (!pairs.length) return <p className="p-10 text-center text-sm text-ink-muted">Nenhum par de fichas para comparar.</p>
  const { reports, clinic } = data
  return (
    <PrintSheet
      clinic={clinic}
      onPrint={() => void services.activity.record({ category: 'system', action: 'case_study.print', message: `Estudo de caso impresso: ${reports.map((r) => r.title).join(' e ')}` })}
      signatures={[{ name: clinic.professionalName, detail: clinic.professionalRegistry }]}
    >
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="eyebrow">Estudo de caso comparativo</p>
          <h1 className="mt-1 text-xl font-light text-noite">Avaliação estética e protocolos de tratamento</h1>
        </div>
        <p className="text-sm text-ink-soft">{formatDate(new Date())}</p>
      </div>
      <p className="mb-8 text-sm leading-relaxed text-ink-soft">
        Para cada disfunção, duas pessoas foram avaliadas com a mesma ficha. O relatório traz a avaliação de cada caso, os fatores associados e as
        contraindicações, a comparação entre os achados, a interpretação com os objetivos terapêuticos e um protocolo de tratamento justificado para cada
        pessoa.
      </p>
      {reports.map((report, index) => (
        <Study key={report.cases.map((c) => c.assessment.id).join('.')} report={report} index={index} />
      ))}
    </PrintSheet>
  )
}
