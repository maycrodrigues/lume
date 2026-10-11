import { useEffect } from 'react'
import { Outlet } from 'react-router'
import type { Services } from '@/application'
import { ConfirmProvider } from '../components/ui/Confirm'
import { ToastProvider } from '../components/ui/Toast'
import { AccessGate } from '../features/access/AccessGate'
import { ErrorBoundary } from './ErrorBoundary'
import { ServicesProvider } from './services'

/** Tudo em /admin: serviços, avisos, confirmações e o PIN de acesso antes de qualquer tela. */
export function AdminRoot({ services }: { services: Services }) {
  useEffect(() => {
    const previous = document.title
    document.title = 'Painel · LUME'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <ErrorBoundary services={services}>
      <ServicesProvider services={services}>
        <ToastProvider>
          <ConfirmProvider>
            <AccessGate>
              <Outlet />
            </AccessGate>
          </ConfirmProvider>
        </ToastProvider>
      </ServicesProvider>
    </ErrorBoundary>
  )
}
