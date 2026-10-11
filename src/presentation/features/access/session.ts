import { useCallback, useEffect, useRef, useState } from 'react'

export type SessionState = 'checking' | 'locked' | 'unlocked'

type Message = { type: 'ask' } | { type: 'unlocked' } | { type: 'locked' }

const CHANNEL = 'lume-access'
/** Tempo para outra aba aberta responder que o painel já está liberado. */
const ASK_TIMEOUT_MS = 250

// BroadcastChannel não tem targetOrigin: as mensagens só circulam entre abas da mesma origem.
// oxlint-disable-next-line unicorn/require-post-message-target-origin
const send = (channel: BroadcastChannel | undefined, message: Message) => channel?.postMessage(message)

/**
 * Sessão de acesso desta aba. Cada acesso começa bloqueado. Abas do painel abertas ao mesmo
 * tempo compartilham a sessão (a impressão abre em outra aba), e bloquear vale para todas.
 */
export function useAccessSession() {
  const [state, setState] = useState<SessionState>(() => (typeof BroadcastChannel === 'undefined' ? 'locked' : 'checking'))
  const stateRef = useRef(state)
  const channelRef = useRef<BroadcastChannel>(undefined)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(CHANNEL)
    channelRef.current = channel
    channel.addEventListener('message', (event: MessageEvent<Message>) => {
      if (event.data.type === 'ask' && stateRef.current === 'unlocked') send(channel, { type: 'unlocked' })
      if (event.data.type === 'unlocked') setState('unlocked')
      if (event.data.type === 'locked') setState('locked')
    })
    send(channel, { type: 'ask' })
    const timer = setTimeout(() => setState((s) => (s === 'checking' ? 'locked' : s)), ASK_TIMEOUT_MS)
    return () => {
      clearTimeout(timer)
      channel.close()
      channelRef.current = undefined
    }
  }, [])

  const unlock = useCallback(() => {
    setState('unlocked')
    send(channelRef.current, { type: 'unlocked' })
  }, [])

  const lock = useCallback(() => {
    setState('locked')
    send(channelRef.current, { type: 'locked' })
  }, [])

  return { state, unlock, lock }
}
