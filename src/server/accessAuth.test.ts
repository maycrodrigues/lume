import { describe, expect, it } from 'vitest'
import { createAccessVerifier } from './accessAuth'

const TEAM = 'clinica.cloudflareaccess.com'
const AUD = 'aud-123'
const b64url = (data: ArrayBuffer | string) =>
  Buffer.from(typeof data === 'string' ? data : new Uint8Array(data)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function keyPair() {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1', alg: 'RS256' }
  return { pair, jwk }
}

async function token(privateKey: CryptoKey, payload: Record<string, unknown>, kid = 'k1') {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${head}.${body}`))
  return `${head}.${body}.${b64url(signature)}`
}

const now = Math.floor(Date.now() / 1000)
const claims = (extra: Record<string, unknown> = {}) => ({ aud: [AUD], iss: `https://${TEAM}`, email: 'ana@clinica.com', exp: now + 300, iat: now, ...extra })

describe('Login pelo Cloudflare Access', () => {
  it('aceita o token assinado pelo Access para este aplicativo e devolve o e-mail', async () => {
    const { pair, jwk } = await keyPair()
    const http = (async () => Response.json({ keys: [jwk] })) as unknown as typeof fetch
    const verify = createAccessVerifier({ teamDomain: TEAM, audience: AUD, allowedEmails: ['ana@clinica.com'] }, http)
    expect(await verify(await token(pair.privateKey, claims()))).toEqual({ email: 'ana@clinica.com' })
  })

  it('recusa token expirado, de outro aplicativo, de outro e-mail, adulterado ou ausente', async () => {
    const { pair, jwk } = await keyPair()
    const other = await keyPair()
    const http = (async () => Response.json({ keys: [jwk] })) as unknown as typeof fetch
    const verify = createAccessVerifier({ teamDomain: TEAM, audience: AUD, allowedEmails: ['ana@clinica.com'] }, http)

    await expect(verify(await token(pair.privateKey, claims({ exp: now - 10 })))).rejects.toThrow('Login expirado')
    await expect(verify(await token(pair.privateKey, claims({ aud: ['outro'] })))).rejects.toThrow('outro aplicativo')
    await expect(verify(await token(pair.privateKey, claims({ email: 'intrusa@x.com' })))).rejects.toThrow('sem acesso')
    await expect(verify(await token(other.pair.privateKey, claims()))).rejects.toThrow('Assinatura')
    const valid = await token(pair.privateKey, claims())
    await expect(verify(valid.replace(/\.[^.]+\./, `.${b64url(JSON.stringify(claims({ email: 'x@y.com' })))}.`))).rejects.toThrow('Assinatura')
    await expect(verify(undefined)).rejects.toThrow('Login necessário')
  })
})
