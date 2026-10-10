import { cn } from '../../lib/cn'
import { AlertTriangle, CircleAlert, Info } from 'lucide-react'
import type { ReactNode } from 'react'

const STYLES = {
  error: { box: 'bg-danger-soft text-danger', Icon: CircleAlert },
  warning: { box: 'bg-warning-soft text-warning', Icon: AlertTriangle },
  info: { box: 'bg-info-soft text-info', Icon: Info },
}

export function Alert({ tone = 'error', title, children, className }: { tone?: keyof typeof STYLES; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = STYLES[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl px-4 py-3 text-sm', box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>}
      </div>
    </div>
  )
}
