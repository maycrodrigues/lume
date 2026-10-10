import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: string; count?: number; icon?: ReactNode }> }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
            value === t.value ? 'border-noite text-noite' : 'border-transparent text-ink-muted hover:text-ink',
          )}
        >
          {t.icon}
          {t.label}
          {t.count !== undefined && (
            <span className={cn('num rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-noite text-white' : 'bg-perola-soft text-ink-soft')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
