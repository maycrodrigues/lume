/** PIN de acesso ao painel: exatamente 4 números. */
export const PIN_LENGTH = 4

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin)

/** Tentativas erradas seguidas permitidas antes de cada pausa. */
export const ATTEMPTS_BEFORE_PAUSE = 5

const FIRST_PAUSE_MS = 30_000
const MAX_PAUSE_MS = 15 * 60_000

/**
 * Pausa obrigatória depois de `failures` tentativas erradas seguidas: a cada 5 erros,
 * 30 s, depois 1 min, 2 min… até 15 min. Entre as séries não há pausa.
 */
export function pauseAfterFailures(failures: number): number {
  if (failures < ATTEMPTS_BEFORE_PAUSE || failures % ATTEMPTS_BEFORE_PAUSE !== 0) return 0
  const series = failures / ATTEMPTS_BEFORE_PAUSE
  return Math.min(FIRST_PAUSE_MS * 2 ** (series - 1), MAX_PAUSE_MS)
}

/** Tentativas que ainda restam antes da próxima pausa. */
export const attemptsUntilPause = (failures: number): number => ATTEMPTS_BEFORE_PAUSE - (failures % ATTEMPTS_BEFORE_PAUSE)
