import { attemptsUntilPause, DomainError, isValidPin, pauseAfterFailures } from '@/domain'
import type { ActivityService } from '../activityLog'
import type { CredentialStore, PinCredential, PinHasher } from '../ports'
import type { ServiceDeps } from './deps'

export type AccessStatus =
  /** Primeiro acesso neste navegador: ainda não há PIN. */
  | { state: 'setup' }
  | { state: 'locked'; failedAttempts: number; pausedUntil?: string }

export interface AccessDeps {
  credentials: CredentialStore
  pinHasher: PinHasher
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function waitText(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return seconds < 60 ? plural(seconds, 'segundo', 'segundos') : plural(Math.ceil(seconds / 60), 'minuto', 'minutos')
}

function assertNewPin(pin: string, confirmation: string) {
  if (!isValidPin(pin)) throw new DomainError('O PIN deve ter 4 números.', 'invalid_pin')
  if (pin !== confirmation) throw new DomainError('Os PINs digitados não são iguais.', 'pin_mismatch')
}

/**
 * PIN de acesso ao painel (ver ADR 0005). O serviço confere o PIN e controla as tentativas;
 * manter a sessão aberta ou bloqueada é papel da interface.
 */
export function createAccessService({ store, clock }: ServiceDeps, { credentials, pinHasher }: AccessDeps, activity: ActivityService) {
  const log = (action: string, message: string, level: 'info' | 'warning' = 'info') => activity.record({ category: 'access', action, message, level })

  async function current(): Promise<PinCredential> {
    const credential = await credentials.get()
    if (!credential) throw new DomainError('Crie um PIN de acesso primeiro.', 'no_pin')
    return credential
  }

  /** Confere o PIN respeitando as pausas; erros contam para a próxima pausa. */
  async function verify(pin: string): Promise<PinCredential> {
    const credential = await current()
    const now = clock.now()
    if (credential.pausedUntil && new Date(credential.pausedUntil) > now) {
      throw new DomainError(`Muitas tentativas erradas. Tente de novo em ${waitText(new Date(credential.pausedUntil).getTime() - now.getTime())}.`, 'paused')
    }
    if (isValidPin(pin) && (await pinHasher.verify(pin, credential))) {
      if (credential.failedAttempts > 0 || credential.pausedUntil) await credentials.save({ ...credential, failedAttempts: 0, pausedUntil: undefined })
      return credential
    }
    const failedAttempts = credential.failedAttempts + 1
    const pause = pauseAfterFailures(failedAttempts)
    await credentials.save({ ...credential, failedAttempts, pausedUntil: pause ? new Date(now.getTime() + pause).toISOString() : undefined })
    await log('access.denied', `PIN incorreto (${plural(failedAttempts, 'tentativa errada seguida', 'tentativas erradas seguidas')})`, 'warning')
    if (pause) throw new DomainError(`Muitas tentativas erradas. Tente de novo em ${waitText(pause)}.`, 'paused')
    const left = attemptsUntilPause(failedAttempts)
    throw new DomainError(`PIN incorreto. Mais ${plural(left, 'tentativa', 'tentativas')} antes de uma pausa.`, 'wrong_pin')
  }

  return {
    async status(): Promise<AccessStatus> {
      const credential = await credentials.get()
      if (!credential) return { state: 'setup' }
      const paused = credential.pausedUntil && new Date(credential.pausedUntil) > clock.now()
      return { state: 'locked', failedAttempts: credential.failedAttempts, ...(paused ? { pausedUntil: credential.pausedUntil } : {}) }
    },

    async createPin(pin: string, confirmation: string): Promise<void> {
      if (await credentials.get()) throw new DomainError('Já existe um PIN de acesso neste navegador.', 'pin_exists')
      assertNewPin(pin, confirmation)
      const now = clock.now().toISOString()
      await credentials.save({ ...(await pinHasher.hash(pin)), createdAt: now, updatedAt: now, failedAttempts: 0 })
      await log('access.pin_create', 'PIN de acesso criado')
    },

    async unlock(pin: string): Promise<void> {
      await verify(pin)
      await log('access.unlock', 'Acesso liberado com PIN')
    },

    async changePin(currentPin: string, pin: string, confirmation: string): Promise<void> {
      const credential = await verify(currentPin)
      assertNewPin(pin, confirmation)
      await credentials.save({ ...(await pinHasher.hash(pin)), createdAt: credential.createdAt, updatedAt: clock.now().toISOString(), failedAttempts: 0 })
      await log('access.pin_change', 'PIN de acesso alterado')
    },

    /** Registra o bloqueio pedido pela Profissional (a interface fecha a sessão). */
    async lock(): Promise<void> {
      await log('access.lock', 'Painel bloqueado')
    },

    /** "Esqueci o PIN": sem o PIN, a única saída é apagar os dados da clínica e começar de novo. */
    async resetAll(): Promise<void> {
      await store.load({}, 'replace')
      await credentials.clear()
      await log('access.reset', 'PIN esquecido: dados da clínica apagados e PIN removido (registros de atividade preservados)', 'warning')
    },
  }
}

export type AccessService = ReturnType<typeof createAccessService>
