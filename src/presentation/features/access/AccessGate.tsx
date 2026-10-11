import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import { useServices } from '../../app/services'
import { LockScreen } from './LockScreen'
import { useAccessSession } from './session'

const AccessContext = createContext<{ lock: () => Promise<void> } | null>(null)

export function useAccess() {
  const value = use(AccessContext)
  if (!value) throw new Error('AccessGate ausente.')
  return value
}

/** Nada do painel (nem os dados) é exibido antes de o PIN ser conferido nesta sessão. */
export function AccessGate({ children }: { children: ReactNode }) {
  const services = useServices()
  const { state, unlock, lock: closeSession } = useAccessSession()

  const lock = useCallback(async () => {
    await services.access.lock()
    closeSession()
  }, [services, closeSession])
  const value = useMemo(() => ({ lock }), [lock])

  if (state === 'checking') return <div className="min-h-dvh bg-noite" />
  if (state === 'locked') return <LockScreen onUnlocked={unlock} />
  return <AccessContext value={value}>{children}</AccessContext>
}
