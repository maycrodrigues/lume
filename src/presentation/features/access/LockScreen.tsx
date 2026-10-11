import { Delete, LockKeyhole } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { AccessStatus } from '@/application'
import { PIN_LENGTH } from '@/domain'
import { useServices } from '../../app/services'
import { LumeIcon } from '../../components/brand/Logo'
import { useConfirm } from '../../components/ui/Confirm'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../hooks/useAction'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Tela de PIN: cria o PIN no primeiro acesso e pede o PIN em todos os outros. */
export function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const services = useServices()
  const confirm = useConfirm()
  const [status, setStatus] = useState<AccessStatus>()
  const [firstEntry, setFirstEntry] = useState<string>()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string>()
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(() => services.access.status().then(setStatus), [services])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const pausedFor = status?.state === 'locked' && status.pausedUntil ? new Date(status.pausedUntil).getTime() - now : 0
  const paused = pausedFor > 0

  // Contagem regressiva da pausa; ao terminar, volta a aceitar tentativas.
  useEffect(() => {
    if (status?.state !== 'locked' || !status.pausedUntil) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= new Date(status.pausedUntil!).getTime()) {
        setError(undefined)
        void refresh()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [status, refresh])

  const fail = (message: string) => {
    setError(message)
    setShake((n) => n + 1)
    setPin('')
  }

  const submit = async (value: string) => {
    if (!status) return
    if (status.state === 'setup' && firstEntry === undefined) {
      setFirstEntry(value)
      setPin('')
      setError(undefined)
      return
    }
    setBusy(true)
    try {
      if (status.state === 'setup') await services.access.createPin(firstEntry!, value)
      else await services.access.unlock(value)
      onUnlocked()
    } catch (e) {
      if (status.state === 'setup') setFirstEntry(undefined)
      fail(status.state === 'setup' ? `${errorMessage(e)} Comece de novo.` : errorMessage(e))
      setNow(Date.now())
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const press = (key: string) => {
    if (busy || paused || !status) return
    if (key === 'back') {
      setPin((p) => p.slice(0, -1))
      return
    }
    const next = (pin + key).slice(0, PIN_LENGTH)
    setPin(next)
    if (next.length === PIN_LENGTH) void submit(next)
  }

  // Teclado físico: números, Backspace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const forgot = async () => {
    const ok = await confirm({
      title: 'Esqueci o PIN',
      message:
        'Sem o PIN não é possível abrir os dados. Para voltar a usar o painel neste navegador, todos os dados da clínica serão apagados e você criará um PIN novo. Se tiver um backup, poderá restaurá-lo depois em Configurações.',
      confirmLabel: 'Apagar dados e criar PIN',
      typeToConfirm: 'APAGAR',
    })
    if (!ok) return
    setBusy(true)
    try {
      await services.access.resetAll()
      setFirstEntry(undefined)
      setPin('')
      setError(undefined)
      await refresh()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const creating = status?.state === 'setup'
  const title = creating ? (firstEntry === undefined ? 'Crie seu PIN de acesso' : 'Confirme o PIN') : 'Painel bloqueado'
  const description = creating
    ? firstEntry === undefined
      ? 'Escolha 4 números. Ele será pedido sempre que o painel for aberto neste navegador.'
      : 'Digite os mesmos 4 números mais uma vez.'
    : 'Digite seu PIN de 4 números para entrar.'

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-noite px-4 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-lilas/10 blur-3xl" />
      <div className="relative w-full max-w-[320px] text-center">
        <LumeIcon className="mx-auto size-14" />
        <p className="mt-4 text-[22px] font-light tracking-[0.42em]">LUME</p>
        <p className="mt-1.5 text-[8px] font-medium tracking-[0.14em] text-cinza uppercase">Estética &amp; Cuidado Integrado</p>

        <h1 className="mt-10 text-lg font-light">{status ? title : ' '}</h1>
        <p className="mx-auto mt-1.5 max-w-[280px] text-xs leading-relaxed text-cinza">{status ? description : ' '}</p>

        <div
          key={shake}
          className={cn('mt-7 flex justify-center gap-4', shake > 0 && 'animate-shake')}
          role="status"
          aria-live="polite"
          aria-label={`${pin.length} de ${PIN_LENGTH} números digitados`}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span key={i} className={cn('size-3.5 rounded-full border transition-colors', i < pin.length ? 'border-perola bg-perola' : 'border-lilas/70')} />
          ))}
        </div>

        <p className="mt-4 min-h-10 text-xs leading-relaxed text-[#F2BCC6]" role="alert">
          {paused ? `Muitas tentativas erradas. Tente de novo em ${clock(pausedFor)}.` : error}
        </p>

        <div className="mx-auto mt-2 grid w-fit grid-cols-3 gap-3">
          {KEYS.map((k) => (
            <PinKey key={k} label={k} onPress={() => press(k)} disabled={busy || paused || !status} />
          ))}
          <span />
          <PinKey label="0" onPress={() => press('0')} disabled={busy || paused || !status} />
          <button
            type="button"
            onClick={() => press('back')}
            disabled={busy || paused || pin.length === 0}
            aria-label="Apagar último número"
            className="flex size-16 items-center justify-center rounded-full text-cinza transition-colors hover:text-white disabled:opacity-30"
          >
            <Delete className="size-6" strokeWidth={1.5} />
          </button>
        </div>

        <div className="mt-8 min-h-5 text-xs">
          {busy ? (
            <span className="inline-flex items-center gap-2 text-cinza">
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
              Conferindo…
            </span>
          ) : (
            status?.state === 'locked' && (
              <button type="button" onClick={forgot} className="text-lilas underline-offset-4 hover:text-perola hover:underline">
                Esqueci o PIN
              </button>
            )
          )}
        </div>

        <p className="mt-10 flex items-center justify-center gap-1.5 text-[10px] tracking-wide text-cinza/70">
          <LockKeyhole className="size-3" strokeWidth={1.5} />
          Os dados ficam só neste navegador
        </p>
      </div>
    </main>
  )
}

function PinKey({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="num flex size-16 items-center justify-center rounded-full bg-white/[0.06] text-2xl font-light text-white transition-colors hover:bg-white/[0.12] active:bg-white/[0.18] disabled:opacity-40"
    >
      {label}
    </button>
  )
}
