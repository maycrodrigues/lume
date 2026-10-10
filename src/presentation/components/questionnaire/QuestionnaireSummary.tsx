import type { Answers, Cell, Column, Gender, GridAnswer, ListAnswer, Question, Questionnaire } from '@/domain'
import { describeAnswer, formatNumber } from '@/domain'
import { cn } from '../../lib/cn'
import { visibleSections } from './QuestionnaireForm'

const cellText = (c: Column, v: Cell | undefined) => (v === undefined ? '—' : typeof v === 'number' ? `${formatNumber(v)}${c.unit ? ` ${c.unit}` : ''}` : v)

function Table({ columns, rows }: { columns: Array<{ id: string; label: string; column?: Column }>; rows: Array<{ key: string; cells: Record<string, string> }> }) {
  return (
    <table className="mt-1 w-full text-xs">
      <thead>
        <tr className="text-left text-ink-muted">
          {columns.map((c) => <th key={c.id} className="py-1 pr-3 font-medium">{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-line">
            {columns.map((c) => <td key={c.id} className="num py-1 pr-3 text-ink">{r.cells[c.id]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AnswerValue({ question, answers }: { question: Question; answers: Answers }) {
  const answer = answers[question.id]
  if (question.type === 'grid') {
    const grid = answer as GridAnswer
    return (
      <Table
        columns={[{ id: '_row', label: question.rowHeader ?? '' }, ...question.columns.map((c) => ({ id: c.id, label: c.label }))]}
        rows={Object.entries(grid).map(([row, cells]) => ({
          key: row,
          cells: { _row: row, ...Object.fromEntries(question.columns.map((c) => [c.id, cellText(c, cells[c.id])])) },
        }))}
      />
    )
  }
  if (question.type === 'list') {
    return (
      <Table
        columns={question.columns.map((c) => ({ id: c.id, label: c.label }))}
        rows={(answer as ListAnswer).map((row, i) => ({ key: String(i), cells: Object.fromEntries(question.columns.map((c) => [c.id, cellText(c, row[c.id])])) }))}
      />
    )
  }
  return <span>{describeAnswer(question, answer, answers)}</span>
}

const isShown = (q: Question, answers: Answers) => (q.type === 'computed' ? Boolean(q.compute(answers)) : answers[q.id] !== undefined)

/** Somente o que foi respondido, organizado por seção. */
export function QuestionnaireSummary({ questionnaire, answers, gender, className, compact }: { questionnaire: Questionnaire; answers: Answers; gender?: Gender; className?: string; compact?: boolean }) {
  const sections = visibleSections(questionnaire, gender)
    .map((s) => ({ ...s, questions: s.questions.filter((q) => isShown(q, answers)) }))
    .filter((s) => s.questions.length)

  if (sections.length === 0) return <p className={cn('text-sm text-ink-muted', className)}>Nenhuma resposta registrada.</p>

  return (
    <div className={cn('space-y-5', className)}>
      {sections.map((section) => (
        <section key={section.id} className="break-inside-avoid">
          <h4 className={cn('eyebrow', compact ? 'mb-2' : 'mb-3 border-b border-line pb-1.5')}>{section.title}</h4>
          <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 print:grid-cols-2">
            {section.questions.map((q) => (
              <div key={q.id} className={cn('min-w-0 break-inside-avoid', (q.type === 'grid' || q.type === 'list' || q.wide) && 'sm:col-span-2 print:col-span-2')}>
                <dt className="text-[11px] text-ink-muted">{q.label}</dt>
                <dd className="text-sm leading-snug whitespace-pre-line text-ink">
                  <AnswerValue question={q} answers={answers} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
