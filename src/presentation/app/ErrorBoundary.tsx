import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { Services } from '@/application'

interface Props {
  services: Services
  children: ReactNode
}

/** Captura erros de renderização, registra e oferece recarregar sem perder dados. */
export class ErrorBoundary extends Component<Props, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void this.props.services.activity.recordError(error, {
      source: 'render',
      path: location.pathname,
      componentStack: info.componentStack?.split('\n').slice(0, 6).join('\n'),
    })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-offwhite p-6">
        <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <p className="eyebrow mb-3">Algo saiu do lugar</p>
          <h1 className="text-xl font-light text-noite">Não foi possível exibir esta tela</h1>
          <p className="mt-2 text-sm text-ink-muted">Seus dados estão seguros. O erro foi gravado em Registros para análise.</p>
          <button type="button" onClick={() => location.assign(`${import.meta.env.BASE_URL}admin`)} className="mt-6 h-10 rounded-full bg-noite px-5 text-sm font-medium text-white">
            Voltar ao painel
          </button>
        </div>
      </div>
    )
  }
}
