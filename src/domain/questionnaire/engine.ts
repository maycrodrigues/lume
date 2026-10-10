/**
 * Motor de questionários: as Fichas (anamnese, avaliações, harmonização) são definidas
 * como dados. Incluir uma pergunta = acrescentar um item no modelo; formulário, resumo,
 * impressão, alertas e registro de atividades se adaptam sozinhos.
 */

export interface YesNoAnswer {
  yes: boolean
  detail?: string
}

export interface MultiAnswer {
  values: string[]
  other?: string
}

export type Cell = string | number
export type ListAnswer = Array<Record<string, Cell>>
export type GridAnswer = Record<string, Record<string, Cell>>
export type Answer = string | number | boolean | YesNoAnswer | MultiAnswer | ListAnswer | GridAnswer
export type Answers = Record<string, Answer>

export interface Column {
  id: string
  label: string
  kind?: 'text' | 'number' | 'select'
  options?: string[]
  unit?: string
}

interface Base {
  /** Único entre todos os modelos — é a chave gravada nas respostas. Nunca renomeie. */
  id: string
  label: string
  hint?: string
  /** Quando respondida (ou "Sim"), aparece em "Atenção clínica". */
  alert?: boolean
  wide?: boolean
}

export type Question =
  | (Base & { type: 'text'; placeholder?: string })
  | (Base & { type: 'textarea'; placeholder?: string })
  | (Base & { type: 'number'; unit?: string })
  | (Base & { type: 'date' })
  | (Base & { type: 'check' })
  /** Sim/Não; `detail` é o rótulo do complemento pedido quando "Sim". */
  | (Base & { type: 'yesno'; detail?: string })
  | (Base & { type: 'choice'; options: string[] })
  | (Base & { type: 'multi'; options: string[]; other?: boolean })
  /** Tabela com linhas livres (ex.: medicamentos). */
  | (Base & { type: 'list'; columns: Column[]; addLabel?: string })
  /** Tabela com linhas fixas (ex.: regiões × unidades). */
  | (Base & { type: 'grid'; rows: string[]; columns: Column[]; rowHeader?: string })
  /** Valor calculado a partir de outras respostas; não é gravado. */
  | (Base & { type: 'computed'; compute: (answers: Answers) => string | undefined })

export interface Section {
  id: string
  title: string
  description?: string
  /** `female`: não exibida para pacientes do gênero masculino. */
  audience?: 'female'
  /** `checklist`: perguntas Sim/Não em linhas compactas. */
  layout?: 'checklist'
  questions: Question[]
}

export interface Questionnaire {
  id: string
  title: string
  description?: string
  sections: Section[]
}

export const allQuestions = (q: Questionnaire): Question[] => q.sections.flatMap((s) => s.questions)

/** Converte "12,5" / "12.5" / 12.5 em número; vazio ou inválido → undefined. */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  const s = value.trim()
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : undefined
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

function cleanCells(columns: Column[], raw: unknown): Record<string, Cell> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const row: Record<string, Cell> = {}
  for (const col of columns) {
    const value = (raw as Record<string, unknown>)[col.id]
    if (col.kind === 'number') {
      const n = toNumber(value)
      if (n !== undefined) row[col.id] = n
    } else {
      const t = text(value)
      if (t && (col.kind !== 'select' || col.options?.includes(t))) row[col.id] = t
    }
  }
  return Object.keys(row).length ? row : undefined
}

/** Normaliza uma resposta conforme o tipo da pergunta; resposta vazia ou inválida → undefined. */
export function cleanAnswer(question: Question, raw: unknown): Answer | undefined {
  switch (question.type) {
    case 'text':
    case 'textarea':
    case 'date':
      return text(raw) || undefined
    case 'choice': {
      const t = text(raw)
      return question.options.includes(t) ? t : undefined
    }
    case 'number':
      return toNumber(raw)
    case 'check':
      return raw === true ? true : undefined
    case 'yesno': {
      if (!raw || typeof raw !== 'object' || typeof (raw as YesNoAnswer).yes !== 'boolean') return undefined
      const { yes, detail } = raw as YesNoAnswer
      const d = yes && question.detail ? text(detail) : ''
      return d ? { yes, detail: d } : { yes }
    }
    case 'multi': {
      if (!raw || typeof raw !== 'object') return undefined
      const values = ((raw as MultiAnswer).values ?? []).filter((v) => question.options.includes(v))
      const other = question.other ? text((raw as MultiAnswer).other) : ''
      if (!values.length && !other) return undefined
      return other ? { values, other } : { values }
    }
    case 'list': {
      if (!Array.isArray(raw)) return undefined
      const rows = raw.map((r) => cleanCells(question.columns, r)).filter(Boolean) as ListAnswer
      return rows.length ? rows : undefined
    }
    case 'grid': {
      if (!raw || typeof raw !== 'object') return undefined
      const grid: GridAnswer = {}
      for (const row of question.rows) {
        const cells = cleanCells(question.columns, (raw as Record<string, unknown>)[row])
        if (cells) grid[row] = cells
      }
      return Object.keys(grid).length ? grid : undefined
    }
    case 'computed':
      return undefined
  }
}

/**
 * Mantém só respostas preenchidas e válidas para o modelo.
 * Respostas a perguntas que não existem mais no modelo (`previous`) são preservadas — histórico não se perde.
 */
export function cleanAnswers(questionnaire: Questionnaire, input: Answers, previous: Answers = {}): Answers {
  const questions = allQuestions(questionnaire)
  const known = new Set(questions.map((q) => q.id))
  const result: Answers = {}
  for (const [key, value] of Object.entries(previous)) if (!known.has(key)) result[key] = value
  for (const question of questions) {
    const answer = cleanAnswer(question, input[question.id])
    if (answer !== undefined) result[question.id] = answer
  }
  return result
}

export const formatNumber = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

const formatCell = (col: Column, value: Cell | undefined) =>
  value === undefined ? undefined : typeof value === 'number' ? `${formatNumber(value)}${col.unit ? ` ${col.unit}` : ''}` : value

/** Resposta em linguagem natural, para resumo, impressão e registro de atividades. */
export function describeAnswer(question: Question, answer: Answer | undefined, answers: Answers = {}): string | undefined {
  if (question.type === 'computed') return question.compute(answers)
  if (answer === undefined || answer === null || answer === '') return undefined
  switch (question.type) {
    case 'number':
      return typeof answer === 'number' ? `${formatNumber(answer)}${question.unit ? ` ${question.unit}` : ''}` : String(answer)
    case 'date':
      return typeof answer === 'string' ? answer.split('-').reverse().join('/') : undefined
    case 'check':
      return answer === true ? 'Sim' : undefined
    case 'yesno': {
      const a = answer as YesNoAnswer
      return a.yes ? (a.detail ? `Sim — ${a.detail}` : 'Sim') : 'Não'
    }
    case 'multi': {
      const a = answer as MultiAnswer
      return [...(a.values ?? []), ...(a.other ? [a.other] : [])].join(', ') || undefined
    }
    case 'list':
      return (answer as ListAnswer)
        .map((row) => question.columns.map((c) => formatCell(c, row[c.id])).filter(Boolean).join(' · '))
        .join('; ')
    case 'grid':
      return Object.entries(answer as GridAnswer)
        .map(([row, cells]) => `${row}: ${question.columns.map((c) => formatCell(c, cells[c.id]) && `${c.label} ${formatCell(c, cells[c.id])}`).filter(Boolean).join(', ')}`)
        .join('; ')
    default:
      return String(answer)
  }
}

/** Itens de "Atenção clínica": perguntas marcadas com `alert` que foram respondidas positivamente. */
export function questionnaireAlerts(questionnaire: Questionnaire, answers: Answers): string[] {
  return allQuestions(questionnaire)
    .filter((q) => q.alert)
    .flatMap((q) => {
      const a = answers[q.id]
      if (a === undefined) return []
      if (q.type === 'yesno') {
        const yn = a as YesNoAnswer
        return yn.yes ? [yn.detail ? `${q.label}: ${yn.detail}` : q.label] : []
      }
      if (q.type === 'list') {
        const first = q.columns[0].id
        return [`${q.label}: ${(a as ListAnswer).map((r) => r[first]).filter(Boolean).join(', ')}`]
      }
      const described = describeAnswer(q, a, answers)
      return described ? [`${q.label}: ${described}`] : []
    })
}

export interface Measure {
  key: string
  label: string
  unit?: string
  value: number
}

/** Todas as medidas numéricas respondidas (perguntas numéricas e células numéricas de tabelas). */
export function numericMeasures(questionnaire: Questionnaire, answers: Answers): Measure[] {
  return allQuestions(questionnaire).flatMap((q): Measure[] => {
    const a = answers[q.id]
    if (q.type === 'number' && typeof a === 'number') return [{ key: q.id, label: q.label, unit: q.unit, value: a }]
    if (q.type === 'grid' && a && typeof a === 'object') {
      return q.rows.flatMap((row) =>
        q.columns
          .filter((c) => c.kind === 'number' && typeof (a as GridAnswer)[row]?.[c.id] === 'number')
          .map((c) => ({
            key: `${q.id}:${row}:${c.id}`,
            label: q.columns.filter((x) => x.kind === 'number').length > 1 ? `${q.label} · ${row} (${c.label})` : `${q.label} · ${row}`,
            unit: c.unit,
            value: (a as GridAnswer)[row][c.id] as number,
          })),
      )
    }
    return []
  })
}
