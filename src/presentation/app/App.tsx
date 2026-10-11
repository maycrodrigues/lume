import { RouterProvider } from 'react-router/dom'
import type { Services } from '@/application'
import { ConfirmProvider } from '../components/ui/Confirm'
import { ToastProvider } from '../components/ui/Toast'
import { AccessGate } from '../features/access/AccessGate'
import { ErrorBoundary } from './ErrorBoundary'
import { router } from './router'
import { ServicesProvider } from './services'

export function App({ services }: { services: Services }) {
  return (
    <ErrorBoundary services={services}>
      <ServicesProvider services={services}>
        <ToastProvider>
          <ConfirmProvider>
            <AccessGate>
              <RouterProvider router={router} />
            </AccessGate>
          </ConfirmProvider>
        </ToastProvider>
      </ServicesProvider>
    </ErrorBoundary>
  )
}
