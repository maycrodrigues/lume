import { cn } from '../../lib/cn'
import { X } from 'lucide-react'
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
  /** Quando informado, o corpo vira um <form> e o rodapé pode usar type="submit". */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

/** Diálogo nativo (<dialog>): foco preso, Esc fecha, backdrop estilizado. */
export function Modal({ open, onClose, title, description, size = 'md', children, footer, onSubmit }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // `showModal` move o foco para o primeiro elemento focável (o botão de fechar);
      // o campo marcado com `data-autofocus` recebe o foco depois de aberto.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const content = (
    <>
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-light tracking-wide text-noite">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 rounded-full p-1.5 text-ink-muted hover:bg-perola-soft hover:text-ink">
          <X className="size-5" strokeWidth={1.5} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-offwhite/60 px-6 py-3.5">{footer}</footer>}
    </>
  )
  const bodyClass = 'flex max-h-[calc(100dvh-2rem)] flex-col'

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-pop',
        SIZES[size],
      )}
    >
      {open &&
        (onSubmit ? (
          <form
            noValidate
            className={bodyClass}
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit(e)
            }}
          >
            {content}
          </form>
        ) : (
          <div className={bodyClass}>{content}</div>
        ))}
    </dialog>
  )
}
