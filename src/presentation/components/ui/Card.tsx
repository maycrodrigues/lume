import { cn } from '../../lib/cn'
import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-white shadow-card', className)} {...rest} />
}

export function CardHeader({ title, eyebrow, action, className }: { title: ReactNode; eyebrow?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-[15px] font-medium text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}
