import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-perola to-lilas font-medium text-noite',
        size === 'sm' && 'size-8 text-[11px]',
        size === 'md' && 'size-10 text-xs',
        size === 'lg' && 'size-16 text-lg',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
