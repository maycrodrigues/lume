import type { CredentialStore, PinCredential } from '@/application/ports'

/** Credencial em memória (testes). */
export function createMemoryCredentialStore(): CredentialStore & { peek(): PinCredential | undefined } {
  let credential: PinCredential | undefined
  return {
    get: async () => (credential ? { ...credential } : undefined),
    save: async (next) => {
      credential = { ...next }
    },
    clear: async () => {
      credential = undefined
    },
    peek: () => credential,
  }
}
