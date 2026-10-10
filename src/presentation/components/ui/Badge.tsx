import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'
import type { Tone } from '../../lib/labels'

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral',
  lilac: 'bg-lilas-soft text-accent',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

const DOTS: Record<Tone, string> = {
  neutral: 'bg-neutral',
  lilac: 'bg-lilas',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function Badge({ tone = 'neutral', children, dot = true, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', TONES[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  )
}
