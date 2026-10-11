import { useEffect } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { LumeIcon } from '../components/brand/Logo'

/** Erro dentro de uma rota: registra (no painel) e mostra uma tela na identidade da marca. */
export function RouteError({ home, onError }: { home: '/' | '/admin'; onError?: (error: unknown) => void }) {
  const error = useRouteError()
  const navigate = useNavigate()

  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status === 404) return
    onError?.(error)
  }, [error, onError])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-offwhite p-6">
      <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <LumeIcon className="mx-auto mb-4 size-12" tone="dark" />
        <p className="eyebrow mb-3">Algo saiu do lugar</p>
        <h1 className="text-xl font-light text-noite">Não foi possível exibir esta tela</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {home === '/admin' ? 'Seus dados estão seguros. O erro foi gravado em Registros para análise.' : 'Tente novamente em instantes.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => location.reload()} className="h-10 rounded-full border border-line-strong px-5 text-sm font-medium text-ink">
            Tentar novamente
          </button>
          <button type="button" onClick={() => void navigate(home)} className="h-10 rounded-full bg-noite px-5 text-sm font-medium text-white">
            {home === '/admin' ? 'Voltar ao painel' : 'Ir para o início'}
          </button>
        </div>
      </div>
    </div>
  )
}
