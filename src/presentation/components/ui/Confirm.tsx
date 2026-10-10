import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Input } from './Field'
import { Modal } from './Modal'

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  /** Exige digitar esta palavra para liberar a confirmação (ações destrutivas em massa). */
  typeToConfirm?: string
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [typed, setTyped] = useState('')
  const resolver = useRef<(v: boolean) => void>(undefined)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setTyped('')
    setOptions(opts)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    setOptions(null)
  }

  const blocked = Boolean(options?.typeToConfirm && typed.trim().toUpperCase() !== options.typeToConfirm)

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => close(false)}
        size="sm"
        title={options?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Voltar
            </Button>
            <Button variant={options?.tone === 'primary' ? 'primary' : 'danger'} disabled={blocked} onClick={() => close(true)}>
              {options?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
          <div>{options?.message}</div>
          {options?.typeToConfirm && (
            <label className="block space-y-1.5">
              <span className="text-xs">
                Digite <strong className="text-ink">{options.typeToConfirm}</strong> para confirmar
              </span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} data-autofocus />
            </label>
          )}
        </div>
      </Modal>
    </ConfirmContext>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = use(ConfirmContext)
  if (!confirm) throw new Error('ConfirmProvider ausente.')
  return confirm
}
