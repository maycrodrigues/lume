import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccessStatus } from '@/application'
import { useServices } from '../../app/services'

type Message = { type: 'changed' }

const CHANNEL = 'lume-access'
/** Com a aba aberta, confere a cada minuto se a segunda-feira chegou. */
const EXPIRY_CHECK_MS = 60_000

// BroadcastChannel não tem targetOrigin: as mensagens só circulam entre abas da mesma origem.
// oxlint-disable-next-line unicorn/require-post-message-target-origin
const send = (channel: BroadcastChannel | undefined, message: Message) => channel?.postMessage(message)

/**
 * Situação do acesso neste navegador. A fonte da verdade é o serviço de acesso; as abas abertas
 * só avisam umas às outras que algo mudou (PIN digitado, painel bloqueado) para reler.
 */
export function useAccessSession() {
  const services = useServices()
  const [status, setStatus] = useState<AccessStatus>()
  const channelRef = useRef<BroadcastChannel>(undefined)

  const refresh = useCallback(() => services.access.status().then(setStatus), [services])

  useEffect(() => {
    void refresh()
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(CHANNEL)
    channelRef.current = channel
    channel.addEventListener('message', () => void refresh())
    return () => {
      channel.close()
      channelRef.current = undefined
    }
  }, [refresh])

  // O acesso expira na segunda-feira mesmo com o painel aberto (inclusive ao voltar de um computador suspenso).
  useEffect(() => {
    if (status?.state !== 'unlocked') return
    const check = () => {
      if (Date.now() >= new Date(status.until).getTime()) void refresh()
    }
    const timer = setInterval(check, EXPIRY_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [status, refresh])

  /** Relê a situação e avisa as outras abas. */
  const changed = useCallback(async () => {
    await refresh()
    send(channelRef.current, { type: 'changed' })
  }, [refresh])

  return { status, changed }
}
