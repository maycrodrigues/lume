import { fromBase64, toBase64 } from '@/application/binary'
import type { PinDigest, PinHasher } from '@/application/ports'

/** Recomendação OWASP para PBKDF2-HMAC-SHA256. */
const DEFAULT_ITERATIONS = 600_000

async function derive(pin: string, salt: ArrayBuffer, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

/** Comparação em tempo constante, para não vazar quantos bytes coincidem. */
function sameBytes(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

/** PIN derivado com PBKDF2-SHA256 e sal aleatório por PIN (WebCrypto do navegador). */
export function createWebCryptoPinHasher({ iterations = DEFAULT_ITERATIONS } = {}): PinHasher {
  return {
    async hash(pin) {
      const salt = crypto.getRandomValues(new Uint8Array(16)).buffer
      return { hash: toBase64(await derive(pin, salt, iterations)), salt: toBase64(salt), iterations }
    },
    async verify(pin, digest: PinDigest) {
      const candidate = await derive(pin, fromBase64(digest.salt), digest.iterations)
      return sameBytes(candidate, fromBase64(digest.hash))
    },
  }
}
