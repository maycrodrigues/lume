import { Check, Plus, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { Answer, Answers, Cell, Column, Gender, GridAnswer, ListAnswer, MultiAnswer, Question, Questionnaire, Section, YesNoAnswer } from '@/domain'
import { cn } from '../../lib/cn'
import { Button, IconButton } from '../ui/Button'
import { controlClass, Input, Select, Textarea } from '../ui/Field'

interface FormProps {
  questionnaire: Questionnaire
  value: Answers
  onChange: (answers: Answers) => void
  gender?: Gender
  /** `cards`: cada seção em um card (página). `plain`: seções separadas por linha (dentro de modal). */
  variant?: 'cards' | 'plain'
}

export const visibleSections = (q: Questionnaire, gender?: Gender) => q.sections.filter((s) => s.audience !== 'female' || gender !== 'male')

/** Formulário gerado a partir do modelo: um componente para todas as Fichas. */
export function QuestionnaireForm({ questionnaire, value, onChange, gender, variant = 'cards' }: FormProps) {
  const set = (id: string, answer: Answer | undefined) => {
    const next = { ...value }
    if (answer === undefined) delete next[id]
    else next[id] = answer
    onChange(next)
  }

  return (
    <div className={variant === 'cards' ? 'space-y-4' : 'space-y-8'}>
      {visibleSections(questionnaire, gender).map((section) => (
        <section key={section.id} className={cn(variant === 'cards' && 'rounded-2xl border border-line bg-white p-5 shadow-card')}>
          <div className={cn('mb-4', variant === 'plain' && 'border-b border-line pb-2')}>
            <h3 className="eyebrow">{section.title}</h3>
            {section.description && <p className="mt-1 text-xs text-ink-muted">{section.description}</p>}
          </div>
          <SectionBody section={section} value={value} set={set} />
        </section>
      ))}
    </div>
  )
}

function SectionBody({ section, value, set }: { section: Section; value: Answers; set: (id: string, a: Answer | undefined) => void }) {
  if (section.layout === 'checklist') {
    const yesno = section.questions.filter((q) => q.type === 'yesno')
    const others = section.questions.filter((q) => q.type !== 'yesno')
    return (
      <>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {yesno.map((q) => (
            <li key={q.id} className="grid items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)]">
              <span className="text-sm text-ink">
                {q.label}
                {q.alert && <span className="ml-1.5 text-[10px] font-medium tracking-wide text-warning uppercase">alerta</span>}
              </span>
              <YesNo value={value[q.id] as YesNoAnswer | undefined} onChange={(a) => set(q.id, a)} />
              {q.type === 'yesno' && q.detail && (value[q.id] as YesNoAnswer | undefined)?.yes ? (
                <Input
                  className="h-9"
                  placeholder={q.detail}
                  aria-label={`${q.label} — ${q.detail}`}
                  value={(value[q.id] as YesNoAnswer).detail ?? ''}
                  onChange={(e) => set(q.id, { yes: true, detail: e.target.value })}
                />
              ) : (
                <span className="hidden sm:block" />
              )}
            </li>
          ))}
        </ul>
        {others.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((q) => <QuestionField key={q.id} question={q} value={value[q.id]} answers={value} onChange={(a) => set(q.id, a)} />)}
          </div>
        )}
      </>
    )
  }
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {section.questions.map((q) => <QuestionField key={q.id} question={q} value={value[q.id]} answers={value} onChange={(a) => set(q.id, a)} />)}
    </div>
  )
}

function QuestionField({ question: q, value, answers, onChange }: { question: Question; value: Answer | undefined; answers: Answers; onChange: (a: Answer | undefined) => void }) {
  const id = useId()
  const wide = q.wide || q.type === 'list' || q.type === 'grid' || q.type === 'multi'
  const label = (
    <label htmlFor={id} className="text-xs font-medium text-ink-soft">
      {q.label}
      {q.alert && <span className="ml-1.5 text-[10px] font-medium tracking-wide text-warning uppercase">alerta</span>}
    </label>
  )

  let control: ReactNode
  switch (q.type) {
    case 'text':
      control = <Input id={id} placeholder={q.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'textarea':
      control = <Textarea id={id} rows={2} placeholder={q.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'number':
      control = <NumberInput id={id} unit={q.unit} value={value as Cell | undefined} onChange={onChange} />
      break
    case 'date':
      control = <Input id={id} type="date" className="max-w-52" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      break
    case 'check':
      return (
        <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-offwhite/60 px-4 py-3', wide && 'sm:col-span-2')}>
          <input type="checkbox" className="mt-0.5 size-4 accent-noite" checked={value === true} onChange={(e) => onChange(e.target.checked || undefined)} />
          <span className="text-sm text-ink">{q.label}</span>
        </label>
      )
    case 'yesno':
      control = (
        <div className="flex flex-wrap items-center gap-3">
          <YesNo value={value as YesNoAnswer | undefined} onChange={onChange} />
          {q.detail && (value as YesNoAnswer | undefined)?.yes && (
            <Input className="h-9 min-w-48 flex-1" placeholder={q.detail} aria-label={`${q.label} — ${q.detail}`} value={(value as YesNoAnswer).detail ?? ''} onChange={(e) => onChange({ yes: true, detail: e.target.value })} />
          )}
        </div>
      )
      break
    case 'choice':
      control = <Pills options={q.options} selected={value ? [value as string] : []} onToggle={(o) => onChange(value === o ? undefined : o)} />
      break
    case 'multi': {
      const current = (value as MultiAnswer | undefined) ?? { values: [] }
      control = (
        <div className="space-y-2">
          <Pills
            multiple
            options={q.options}
            selected={current.values}
            onToggle={(o) => onChange({ ...current, values: current.values.includes(o) ? current.values.filter((v) => v !== o) : [...current.values, o] })}
          />
          {q.other && <Input className="h-9" placeholder="Outros" aria-label={`${q.label} — outros`} value={current.other ?? ''} onChange={(e) => onChange({ ...current, other: e.target.value })} />}
        </div>
      )
      break
    }
    case 'list':
      control = <ListEditor columns={q.columns} addLabel={q.addLabel} value={(value as ListAnswer | undefined) ?? []} onChange={onChange} />
      break
    case 'grid':
      control = <GridEditor rows={q.rows} rowHeader={q.rowHeader} columns={q.columns} value={(value as GridAnswer | undefined) ?? {}} onChange={onChange} />
      break
    case 'computed':
      control = <p className="num flex h-10 items-center rounded-xl bg-offwhite px-3 text-sm text-ink">{q.compute(answers) ?? '—'}</p>
      break
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', wide && 'sm:col-span-2')}>
      {label}
      {control}
      {q.hint && <p className="text-xs text-ink-muted">{q.hint}</p>}
    </div>
  )
}

function YesNo({ value, onChange }: { value: YesNoAnswer | undefined; onChange: (a: YesNoAnswer | undefined) => void }) {
  const option = (yes: boolean, label: string) => {
    const active = value?.yes === yes
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onChange(active ? undefined : yes ? { yes, detail: value?.detail } : { yes })}
        className={cn(
          'h-8 rounded-full px-3.5 text-xs font-medium transition-colors',
          active ? (yes ? 'bg-noite text-white' : 'bg-cinza text-noite') : 'text-ink-muted hover:text-ink',
        )}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="inline-flex w-fit rounded-full border border-line bg-white p-0.5">
      {option(false, 'Não')}
      {option(true, 'Sim')}
    </div>
  )
}

function Pills({ options, selected, onToggle, multiple }: { options: string[]; selected: string[]; onToggle: (o: string) => void; multiple?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={() => onToggle(o)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
              on ? 'border-noite bg-noite text-white' : 'border-line-strong bg-white text-ink-soft hover:border-cinza hover:text-ink',
            )}
          >
            {multiple && on && <Check className="size-3" strokeWidth={2.5} />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

const cellText = (v: Cell | undefined) => (v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : v)

function NumberInput({ id, unit, value, onChange, className, label }: { id?: string; unit?: string; value: Cell | undefined; onChange: (v: string) => void; className?: string; label?: string }) {
  return (
    <div className={cn('relative max-w-52', className)}>
      <input
        id={id}
        inputMode="decimal"
        aria-label={label}
        className={cn(controlClass, 'num h-10', unit && 'pr-16')}
        value={cellText(value)}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
      />
      {unit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-muted">{unit}</span>}
    </div>
  )
}

function CellInput({ column, value, onChange, label }: { column: Column; value: Cell | undefined; onChange: (v: string) => void; label: string }) {
  if (column.kind === 'number') return <NumberInput className="max-w-none" unit={column.unit} value={value} onChange={onChange} label={label} />
  if (column.kind === 'select')
    return (
      <Select className="h-9 text-xs" aria-label={label} value={cellText(value)} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {column.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    )
  return <Input className="h-9" aria-label={label} value={cellText(value)} onChange={(e) => onChange(e.target.value)} />
}

function ListEditor({ columns, value, onChange, addLabel }: { columns: Column[]; value: ListAnswer; onChange: (v: ListAnswer) => void; addLabel?: string }) {
  const rows = value.length ? value : [{}]
  const update = (index: number, colId: string, v: string) => onChange(rows.map((r, i) => (i === index ? { ...r, [colId]: v } : r)))
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-wide text-ink-muted uppercase">
              {columns.map((c) => <th key={c.id} className="pr-2 pb-1.5 font-medium">{c.label}</th>)}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.id} className="pr-2 pb-2">
                    <CellInput column={c} value={row[c.id]} onChange={(v) => update(i, c.id, v)} label={`${c.label} ${i + 1}`} />
                  </td>
                ))}
                <td className="pb-2">
                  <IconButton label="Remover linha" disabled={rows.length === 1 && !Object.keys(row).length} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                    <X className="size-4" strokeWidth={1.5} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="ghost" size="sm" icon={<Plus className="size-3.5" />} onClick={() => onChange([...rows, {}])}>
        {addLabel ?? 'Adicionar linha'}
      </Button>
    </div>
  )
}

function GridEditor({ rows, rowHeader, columns, value, onChange }: { rows: string[]; rowHeader?: string; columns: Column[]; value: GridAnswer; onChange: (v: GridAnswer) => void }) {
  const update = (row: string, colId: string, v: string) => onChange({ ...value, [row]: { ...value[row], [colId]: v } })
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-offwhite/70">
          <tr className="text-left text-[11px] tracking-wide text-ink-muted uppercase">
            <th className="px-3 py-2 font-medium">{rowHeader ?? ''}</th>
            {columns.map((c) => (
              <th key={c.id} className="px-2 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t border-line">
              <td className="px-3 py-1.5 whitespace-nowrap text-ink">{row}</td>
              {columns.map((c) => (
                <td key={c.id} className="min-w-28 px-2 py-1.5">
                  <CellInput column={c} value={value[row]?.[c.id]} onChange={(v) => update(row, c.id, v)} label={`${row} — ${c.label}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
