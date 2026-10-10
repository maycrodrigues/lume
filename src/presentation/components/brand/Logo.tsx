import { cn } from '../../lib/cn'
import { useId } from 'react'

/** Ícone LUME: duas formas orgânicas que acolhem a pérola central. */
export function LumeIcon({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const id = useId().replace(/:/g, '')
  const [armTop, armBottom] = tone === 'light' ? ['#F4E8F0', '#A794B3'] : ['#C9B6D2', '#6E5C7E']
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="LUME">
      <defs>
        <linearGradient id={`arm-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={armTop} />
          <stop offset="1" stopColor={armBottom} />
        </linearGradient>
        <radialGradient id={`pearl-${id}`} cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#EAD9E6" />
          <stop offset="1" stopColor="#A794B3" />
        </radialGradient>
      </defs>
      <path d="M50 93 C24 88 6 60 17 14 C19 44 30 68 50 81 Z" fill={`url(#arm-${id})`} />
      <path d="M50 93 C76 88 94 60 83 14 C81 44 70 68 50 81 Z" fill={`url(#arm-${id})`} />
      <path d="M50 74 C38 68 31 56 31 40 C35 55 42 64 50 68 Z" fill={`url(#arm-${id})`} opacity="0.55" />
      <path d="M50 74 C62 68 69 56 69 40 C65 55 58 64 50 68 Z" fill={`url(#arm-${id})`} opacity="0.55" />
      <circle cx="50" cy="45" r="11" fill={`url(#pearl-${id})`} />
    </svg>
  )
}

export function LumeWordmark({ tone = 'light', compact = false, className }: { tone?: 'light' | 'dark'; compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LumeIcon className={compact ? 'size-9' : 'size-11'} tone={tone} />
      <div className="leading-none">
        <p className={cn('font-light tracking-[0.42em]', compact ? 'text-lg' : 'text-[22px]', tone === 'light' ? 'text-white' : 'text-noite')}>LUME</p>
        <p className={cn('mt-1.5 text-[7px] font-medium tracking-[0.14em] whitespace-nowrap uppercase', tone === 'light' ? 'text-cinza' : 'text-ink-muted')}>
          Estética &amp; Cuidado Integrado
        </p>
      </div>
    </div>
  )
}
