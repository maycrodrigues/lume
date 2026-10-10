import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Card'

/** Tile de indicador: rótulo, valor e uma linha de contexto. */
export function StatTile({ label, value, hint, icon, emphasis, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; emphasis?: boolean; tone?: 'warning' }) {
  return (
    <Card className={clsx('p-5', emphasis && 'border-noite bg-noite text-white', tone === 'warning' && 'border-warning/30')}>
      <div className="flex items-center justify-between gap-3">
        <p className={clsx('text-xs', emphasis ? 'text-cinza' : 'text-ink-muted')}>{label}</p>
        {icon && <span className={clsx('flex size-7 items-center justify-center rounded-full', emphasis ? 'bg-white/10 text-perola' : tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-perola-soft text-accent')}>{icon}</span>}
      </div>
      <p className={clsx('mt-2 text-2xl font-medium tracking-tight', emphasis ? 'text-white' : 'text-noite')}>{value}</p>
      {hint && <p className={clsx('mt-1 text-xs', emphasis ? 'text-cinza' : 'text-ink-muted')}>{hint}</p>}
    </Card>
  )
}
