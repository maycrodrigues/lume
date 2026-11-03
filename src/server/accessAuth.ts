/**
 * Confere o token que o Cloudflare Access coloca em cada pedido (`Cf-Access-Jwt-Assertion`)
 * depois do login: assinatura RS256 com as chaves públicas do time, validade, aplicativo
 * (audience), emissor e, se configurado, a lista de e-mails autorizados.
 */
export interface AccessConfig {
  /** Ex.: `clinica.cloudflareaccess.com`. */
  teamDomain: string
  /** "Application Audience (AUD) Tag" do aplicativo no Access. */
  audience: string
  allowedEmails?: string[]
}

interface Jwk extends JsonWebKey {
  kid?: string
}

const fromB64url = (value: string) => {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

const decodeJson = <T,>(part: string): T => JSON.parse(new TextDecoder().decode(fromB64url(part))) as T

export class AccessDenied extends Error {}

export function createAccessVerifier(config: AccessConfig, http: typeof fetch = (...args) => fetch(...args)) {
  const issuer = `https://${config.teamDomain}`
  const allowed = config.allowedEmails?.map((e) => e.trim().toLowerCase()).filter(Boolean)
  let keys: { at: number; byKid: Map<string, CryptoKey> } | undefined

  async function key(kid: string): Promise<CryptoKey> {
    // As chaves do Access giram; recarrega a cada hora ou ao ver um kid desconhecido.
    if (!keys || Date.now() - keys.at > 3_600_000 || !keys.byKid.has(kid)) {
      const response = await http(`${issuer}/cdn-cgi/access/certs`)
      if (!response.ok) throw new AccessDenied('Não foi possível obter as chaves do Cloudflare Access.')
      const { keys: list } = (await response.json()) as { keys: Jwk[] }
      const entries = await Promise.all(
        list.map(async (jwk) => [jwk.kid ?? '', await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])] as const),
      )
      keys = { at: Date.now(), byKid: new Map(entries) }
    }
    const found = keys.byKid.get(kid)
    if (!found) throw new AccessDenied('Chave do token desconhecida.')
    return found
  }

  return async function verify(token: string | null | undefined): Promise<{ email: string }> {
    const parts = token?.split('.') ?? []
    if (parts.length !== 3) throw new AccessDenied('Login necessário.')
    const [head, body, signature] = parts
    const header = decodeJson<{ alg?: string; kid?: string }>(head)
    if (header.alg !== 'RS256' || !header.kid) throw new AccessDenied('Token inválido.')

    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await key(header.kid), fromB64url(signature), new TextEncoder().encode(`${head}.${body}`))
    if (!valid) throw new AccessDenied('Assinatura do token inválida.')

    const claims = decodeJson<{ aud?: string | string[]; iss?: string; exp?: number; nbf?: number; email?: string }>(body)
    const now = Date.now() / 1000
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!audiences.includes(config.audience)) throw new AccessDenied('Token de outro aplicativo.')
    if (claims.iss !== issuer) throw new AccessDenied('Emissor do token inválido.')
    if (!claims.exp || claims.exp < now || (claims.nbf && claims.nbf > now + 60)) throw new AccessDenied('Login expirado.')
    const email = claims.email?.toLowerCase()
    if (!email) throw new AccessDenied('Token sem e-mail.')
    if (allowed?.length && !allowed.includes(email)) throw new AccessDenied('E-mail sem acesso ao painel.')
    return { email }
  }
}
