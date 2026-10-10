import { cn } from '../../lib/cn'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  tone: 'success' | 'error'
  message: string
}

interface ToastApi {
  success(message: string): void
  error(message: string): void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (tone: ToastItem['tone'], message: string) => {
      const id = Date.now() + Math.random()
      setItems((all) => [...all.slice(-3), { id, tone, message }])
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 3500)
    },
    [dismiss],
  )
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <ToastContext value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100%-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-pop',
              t.tone === 'success' ? 'border-success/20' : 'border-danger/25',
            )}
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} />
            )}
            <p className="flex-1 leading-snug text-ink">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="text-ink-muted hover:text-ink">
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) throw new Error('ToastProvider ausente.')
  return api
}
