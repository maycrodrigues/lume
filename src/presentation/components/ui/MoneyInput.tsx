import { cn } from '../../lib/cn'
import type { Cents } from '@/domain'
import { controlClass } from './Field'

const format = (cents: Cents) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Entrada de valor em reais no estilo "caixa registradora": digitar 1234 vira R$ 12,34. */
export function MoneyInput({ value, onChange, id, className, disabled }: { value: Cents; onChange: (v: Cents) => void; id?: string; className?: string; disabled?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-muted">R$</span>
      <input
        id={id}
        inputMode="numeric"
        disabled={disabled}
        className={cn(controlClass, 'num h-10 pl-9 text-right')}
        value={format(value || 0)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
          onChange(Number(digits || '0'))
        }}
        onFocus={(e) => e.target.select()}
      />
    </div>
  )
}
