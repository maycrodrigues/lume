import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { LumeIcon } from '../components/brand/Logo'
import { useServices } from './services'

/** Erro dentro de uma rota: registra em Registros e mostra uma tela na identidade da marca. */
export function RouteError() {
  const error = useRouteError()
  const services = useServices()

  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status === 404) return
    void services.activity.recordError(error, { source: 'route', path: location.pathname })
  }, [error, services])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-offwhite p-6">
      <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <LumeIcon className="mx-auto mb-4 size-12" tone="dark" />
        <p className="eyebrow mb-3">Algo saiu do lugar</p>
        <h1 className="text-xl font-light text-noite">Não foi possível exibir esta tela</h1>
        <p className="mt-2 text-sm text-ink-muted">Seus dados estão seguros. O erro foi gravado em Registros para análise.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => location.reload()} className="h-10 rounded-full border border-line-strong px-5 text-sm font-medium text-ink">
            Tentar novamente
          </button>
          <button type="button" onClick={() => location.assign(import.meta.env.BASE_URL)} className="h-10 rounded-full bg-noite px-5 text-sm font-medium text-white">
            Voltar ao painel
          </button>
        </div>
      </div>
    </div>
  )
}
