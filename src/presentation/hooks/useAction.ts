import { useCallback, useState } from 'react'
import { DomainError } from '@/domain'
import { useServices } from '../app/services'
import { useToast } from '../components/ui/Toast'

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

/** Mensagem amigável para a Profissional; erros inesperados não expõem detalhes técnicos. */
export const errorMessage = (error: unknown) =>
  error instanceof DomainError ? error.message : 'Algo não saiu como esperado. O erro foi registrado em Registros.'

function useRecordError() {
  const services = useServices()
  return useCallback(
    (error: unknown, context: Record<string, unknown>) => {
      if (error instanceof DomainError) {
        void services.activity.record({
          category: 'error',
          level: 'warning',
          action: error.code,
          message: error.message,
          context: { ...context, path: location.pathname },
        })
      } else {
        void services.activity.recordError(error, { ...context, path: location.pathname })
      }
    },
    [services],
  )
}

/** Ações pontuais (botões): sucesso e erro aparecem como aviso flutuante. Todo erro é registrado. */
export function useAction() {
  const toast = useToast()
  const recordError = useRecordError()
  return useCallback(
    async <T>(
      label: string,
      run: () => Promise<T>,
      options: { success?: string; onError?: (error: unknown) => boolean } = {},
    ): Promise<ActionResult<T>> => {
      try {
        const value = await run()
        if (options.success) toast.success(options.success)
        return { ok: true, value }
      } catch (error) {
        recordError(error, { action: label })
        if (!options.onError?.(error)) toast.error(errorMessage(error))
        return { ok: false, error }
      }
    },
    [toast, recordError],
  )
}

/** Envio de formulários: o erro fica visível dentro do formulário; sucesso vira aviso flutuante. */
export function useSubmit() {
  const toast = useToast()
  const recordError = useRecordError()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  const submit = useCallback(
    async <T>(label: string, run: () => Promise<T>, options: { success?: string; onError?: (error: unknown) => boolean } = {}) => {
      setPending(true)
      setError(undefined)
      try {
        const value = await run()
        if (options.success) toast.success(options.success)
        return { ok: true, value } as ActionResult<T>
      } catch (err) {
        recordError(err, { action: label })
        if (!options.onError?.(err)) setError(errorMessage(err))
        return { ok: false, error: err } as ActionResult<T>
      } finally {
        setPending(false)
      }
    },
    [toast, recordError],
  )

  return { submit, pending, error, setError }
}
