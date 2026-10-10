import type { Cents } from '@/domain'
import { DISCOUNT_STEPS, packagePricing } from '@/domain'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'

interface Props {
  fullPrice: Cents
  sessions: number
  value: number
  onChange?: (percent: number) => void
}

/**
 * Simulador de desconto: um degrau por porcentagem, com barra proporcional ao valor final,
 * economia e valor por sessão. O degrau escolhido fica destacado.
 */
export function DiscountLadder({ fullPrice, sessions, value, onChange }: Props) {
  const steps = [...new Set([...DISCOUNT_STEPS, value])].sort((a, b) => a - b)
  const priceAt = (percent: number) => packagePricing([{ unitPrice: fullPrice, quantity: 1 }], percent)

  return (
    <div className="space-y-4">
      <ul className="space-y-1" aria-label="Valores por desconto">
        {steps.map((percent) => {
          const { finalPrice, discount } = priceAt(percent)
          const perSession = sessions ? Math.round(finalPrice / sessions) : 0
          const selected = percent === value
          const width = fullPrice ? (finalPrice / fullPrice) * 100 : 0
          return (
            <li key={percent}>
              <button
                type="button"
                disabled={!onChange}
                aria-pressed={selected}
                onClick={() => onChange?.(percent)}
                className={cn(
                  'grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors sm:grid-cols-[52px_1fr_auto_88px]',
                  selected ? 'bg-perola-soft ring-1 ring-lilas' : onChange && 'hover:bg-offwhite',
                )}
              >
                <span className={cn('num text-sm', selected ? 'font-medium text-noite' : 'text-ink-soft')}>{percent === 0 ? 'Avulso' : `${percent}%`}</span>
                <span className="h-3 overflow-hidden rounded-r-[4px] bg-line/60">
                  <span className={cn('block h-full rounded-r-[4px] transition-all', selected ? 'bg-noite' : 'bg-lilas')} style={{ width: `${width}%` }} />
                </span>
                <span className="num text-right">
                  <span className={cn('block text-sm', selected ? 'font-medium text-noite' : 'text-ink')}>{formatMoney(finalPrice)}</span>
                  <span className="block text-[11px] text-ink-muted">{discount ? `economia ${formatMoney(discount)}` : 'sem desconto'}</span>
                </span>
                <span className="num hidden text-right text-[11px] text-ink-muted sm:block">
                  {formatMoney(perSession)}
                  <br />
                  por sessão
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {onChange && (
        <label className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
          <span className="text-xs whitespace-nowrap text-ink-soft">Outro desconto</span>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-noite"
            aria-label="Desconto personalizado"
          />
          <span className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="num h-8 w-16 rounded-lg border border-line-strong pr-5 pl-2 text-right text-sm focus:border-lilas focus:outline-none"
              aria-label="Desconto em porcentagem"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-ink-muted">%</span>
          </span>
        </label>
      )}
    </div>
  )
}
