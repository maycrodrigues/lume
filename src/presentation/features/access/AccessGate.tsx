import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import { useServices } from '../../app/services'
import { LockScreen } from './LockScreen'
import { useAccessSession } from './session'

interface AccessContextValue {
  lock: () => Promise<void>
  /** Até quando o painel abre sem pedir o PIN (próxima segunda-feira, 00h). */
  until: string
}

const AccessContext = createContext<AccessContextValue | null>(null)

export function useAccess() {
  const value = use(AccessContext)
  if (!value) throw new Error('AccessGate ausente.')
  return value
}

/** Nada do painel (nem os dados) é exibido sem o PIN digitado nesta semana. */
export function AccessGate({ children }: { children: ReactNode }) {
  const services = useServices()
  const { status, changed } = useAccessSession()

  const lock = useCallback(async () => {
    await services.access.lock()
    await changed()
  }, [services, changed])
  const until = status?.state === 'unlocked' ? status.until : ''
  const value = useMemo(() => ({ lock, until }), [lock, until])

  if (!status) return <div className="min-h-dvh bg-noite" />
  if (status.state !== 'unlocked') return <LockScreen status={status} onChanged={changed} />
  return <AccessContext value={value}>{children}</AccessContext>
}
