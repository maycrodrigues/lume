import { describe, expect, it } from 'vitest'
import { createWebCryptoPinHasher } from './webCryptoPinHasher'

describe('PinHasher (PBKDF2 / WebCrypto)', () => {
  const hasher = createWebCryptoPinHasher({ iterations: 1_000 })

  it('confere o PIN certo e recusa os outros', async () => {
    const digest = await hasher.hash('2580')
    expect(await hasher.verify('2580', digest)).toBe(true)
    expect(await hasher.verify('2581', digest)).toBe(false)
    expect(await hasher.verify('', digest)).toBe(false)
  })

  it('não guarda o PIN e usa um sal diferente a cada PIN criado', async () => {
    const a = await hasher.hash('2580')
    const b = await hasher.hash('2580')
    expect(JSON.stringify(a)).not.toContain('2580')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(a.iterations).toBe(1_000)
  })

  it('confere com as iterações gravadas no PIN, mesmo que o padrão mude depois', async () => {
    const digest = await createWebCryptoPinHasher({ iterations: 2_000 }).hash('2580')
    expect(await hasher.verify('2580', digest)).toBe(true)
  })
})
