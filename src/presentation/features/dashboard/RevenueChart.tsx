import { useEffect, useRef, useState } from 'react'
import type { MonthPoint } from '@/application'
import { formatMoney, formatMoneyCompact, formatMonthShort, formatMonthYear } from '../../lib/format'

const SERIES = [
  { key: 'income' as const, label: 'Receitas', color: 'var(--color-chart-income)' },
  { key: 'expense' as const, label: 'Despesas', color: 'var(--color-chart-expense)' },
]

const HEIGHT = 240
const PAD = { top: 24, right: 8, bottom: 28, left: 76 }
const BAR = 24
const GAP = 2

/** Escala com ticks redondos (1, 2 ou 5 × 10ⁿ), no máximo 5 intervalos. */
function niceScale(value: number) {
  if (value <= 0) return { max: 100_000, ticks: [0, 25_000, 50_000, 75_000, 100_000] }
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => value / s <= 5)!
  const max = Math.ceil(value / step) * step
  return { max, ticks: Array.from({ length: max / step + 1 }, (_, i) => i * step) }
}

/** Barra com ponta arredondada (4px) e base reta. */
const barPath = (x: number, y: number, w: number, h: number) => {
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

/** Receitas e despesas pagas por mês — colunas agrupadas, um único eixo. */
export function RevenueChart({ data }: { data: MonthPoint[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [hover, setHover] = useState<number>()
  const [asTable, setAsTable] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { max, ticks } = niceScale(Math.max(...data.flatMap((d) => [d.income, d.expense])))
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const band = plotW / data.length
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  const groupW = BAR * 2 + GAP
  const last = data.length - 1

  return (
    <div ref={ref} className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex gap-4" aria-label="Legenda">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs font-medium text-accent hover:text-noite">
          {asTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-ink-muted uppercase">
              <th className="py-2 font-medium">Mês</th>
              <th className="py-2 text-right font-medium">Receitas</th>
              <th className="py-2 text-right font-medium">Despesas</th>
              <th className="py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody className="num">
            {data.map((d) => (
              <tr key={d.month} className="border-t border-line">
                <td className="py-2 text-ink-soft first-letter:uppercase">{formatMonthYear(d.month)}</td>
                <td className="py-2 text-right">{formatMoney(d.income)}</td>
                <td className="py-2 text-right">{formatMoney(d.expense)}</td>
                <td className="py-2 text-right font-medium">{formatMoney(d.income - d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg width={width} height={HEIGHT} role="img" aria-label="Receitas e despesas pagas nos últimos meses" className="block">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-ink-muted text-[11px]">
                  {formatMoneyCompact(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x0 = PAD.left + i * band + (band - groupW) / 2
              return (
                <g key={d.month}>
                  {SERIES.map((s, j) => {
                    const v = d[s.key]
                    const h = (v / max) * plotH
                    return <path key={s.key} d={barPath(x0 + j * (BAR + GAP), y(v), BAR, h)} fill={s.color} opacity={hover === undefined || hover === i ? 1 : 0.45} className="transition-opacity" />
                  })}
                  {i === last && d.income > 0 && (
                    <text x={x0 + BAR / 2} y={y(d.income) - 6} textAnchor="middle" className="num fill-ink text-[11px] font-medium">
                      {formatMoneyCompact(d.income)}
                    </text>
                  )}
                  <text x={PAD.left + i * band + band / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-muted text-[11px] capitalize">
                    {formatMonthShort(d.month)}
                  </text>
                  <rect
                    x={PAD.left + i * band}
                    y={PAD.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${formatMonthYear(d.month)}: receitas ${formatMoney(d.income)}, despesas ${formatMoney(d.expense)}`}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(undefined)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(undefined)}
                    className="cursor-default outline-none"
                  />
                </g>
              )
            })}
          </svg>
          {hover !== undefined && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-48 rounded-xl border border-line bg-white px-3.5 py-3 text-xs shadow-pop"
              style={{ left: Math.min(PAD.left + hover * band + band / 2 + 8, width - 200) }}
            >
              <p className="mb-2 font-medium text-ink first-letter:uppercase">{formatMonthYear(data[hover].month)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="num font-medium text-ink">{formatMoney(data[hover][s.key])}</span>
                </p>
              ))}
              <p className="mt-1.5 flex justify-between border-t border-line pt-1.5">
                <span className="text-ink-muted">Saldo</span>
                <span className="num font-medium text-ink">{formatMoney(data[hover].income - data[hover].expense)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
