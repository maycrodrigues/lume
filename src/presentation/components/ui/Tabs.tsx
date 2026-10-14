import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Abas com rolagem horizontal discreta: sem barra de rolagem; quando não cabem, setas nas
 * bordas mostram que há mais abas (trackpad e toque continuam rolando normalmente).
 */
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: string; count?: number; icon?: ReactNode }> }) {
  const listRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const update = () => setEdges({ left: list.scrollLeft > 1, right: list.scrollLeft + list.clientWidth < list.scrollWidth - 1 })
    // O ResizeObserver já avisa ao observar; o conteúdo também muda de largura quando os contadores mudam.
    const observer = new ResizeObserver(update)
    observer.observe(list)
    if (contentRef.current) observer.observe(contentRef.current)
    list.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      list.removeEventListener('scroll', update)
    }
  }, [])

  // A aba escolhida fica sempre visível (sem rolar a página na vertical).
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`)
    if (!list || !active) return
    if (active.offsetLeft < list.scrollLeft) list.scrollTo({ left: active.offsetLeft - 8, behavior: 'smooth' })
    else if (active.offsetLeft + active.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: active.offsetLeft + active.offsetWidth - list.clientWidth + 8, behavior: 'smooth' })
    }
  }, [value])

  const scroll = (direction: 1 | -1) => listRef.current?.scrollBy({ left: direction * listRef.current.clientWidth * 0.6, behavior: 'smooth' })

  return (
    <div className="relative">
      {/* A linha de base é uma sombra interna: o sublinhado da aba ativa a cobre sem vazar e criar rolagem vertical. */}
      <div
        ref={listRef}
        role="tablist"
        className="overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={contentRef} className="flex w-max gap-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              type="button"
              data-tab={t.value}
              aria-selected={value === t.value}
              onClick={() => onChange(t.value)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
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
      </div>
      {edges.left && <EdgeArrow side="left" onClick={() => scroll(-1)} />}
      {edges.right && <EdgeArrow side="right" onClick={() => scroll(1)} />}
    </div>
  )
}

/** Seta sobre um esmaecido na borda; só para mouse (pelo teclado, Tab percorre as abas). */
function EdgeArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 bottom-px flex w-16 items-center',
        side === 'left' ? 'left-0 justify-start bg-linear-to-r' : 'right-0 justify-end bg-linear-to-l',
        'from-offwhite via-offwhite/85 to-transparent',
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClick}
        className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-card transition-colors hover:text-noite"
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
