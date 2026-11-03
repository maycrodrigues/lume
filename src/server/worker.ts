import { DurableObject } from 'cloudflare:workers'
import { createServices } from '@/application'
import type { ImageProcessor, PinHasher, SitePublisher, SiteTokenStore } from '@/application/ports'
import { DomainError } from '@/domain'
import { createMemoryCredentialStore } from '@/infrastructure/memory/memoryCredentialStore'
import { createSqlStore, type SqlDatabase } from '@/infrastructure/sql/sqlStore'
import { AccessDenied, createAccessVerifier } from './accessAuth'
import { dispatch, type RpcResult } from './rpc'

/*
 * Raiz de composição do servidor (Cloudflare Workers, plano gratuito):
 * - /api/rpc → confere o login do Cloudflare Access e chama os serviços no Durable Object;
 * - todo o resto → site e painel (assets estáticos, com fallback de SPA).
 * Ver ADR 0007.
 */

export interface Env {
  ASSETS: Fetcher
  CLINIC: DurableObjectNamespace<Clinic>
  /** Ex.: `clinica.cloudflareaccess.com`. Sem ele (ou sem AUD), a API fica desligada. */
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  /** E-mails autorizados, separados por vírgula (camada extra além da política do Access). */
  ALLOWED_EMAILS?: string
}

/** O SQLite do Durable Object na interface do adapter. */
const durableSql = (storage: DurableObjectStorage): SqlDatabase => ({
  run: (query, ...params) => storage.sql.exec(query, ...params).toArray() as Array<Record<string, never>>,
  transaction: (work) => storage.transaction(() => work()),
})

const notOnServer = (what: string) => () => {
  throw new DomainError(`${what} acontece no aparelho, não no servidor.`, 'local_only')
}

// Imagens são preparadas no aparelho (canvas) antes de subir; PIN e publicação do site são locais.
const images: ImageProcessor = { process: notOnServer('O preparo de imagens') }
const pinHasher: PinHasher = { hash: notOnServer('O PIN'), verify: notOnServer('O PIN') }
const sitePublisher: SitePublisher = { verify: notOnServer('A publicação do site'), publish: notOnServer('A publicação do site') }
const siteToken: SiteTokenStore = { get: async () => undefined, save: notOnServer('A publicação do site'), clear: async () => undefined }

/** Os dados da clínica: um banco SQLite só dela, com uma operação por vez. */
export class Clinic extends DurableObject<Env> {
  private services = createServices({
    store: createSqlStore(durableSql(this.ctx.storage)),
    clock: { now: () => new Date() },
    newId: () => crypto.randomUUID(),
    images,
    credentials: createMemoryCredentialStore(),
    pinHasher,
    sitePublisher,
    siteToken,
  })

  async call(request: unknown, user: string): Promise<RpcResult> {
    const result = await dispatch(this.services, request)
    if (result.ok && isWrite(request)) {
      await this.services.activity.record({ category: 'system', action: 'api.call', message: `${describe(request)} por ${user}` }).catch(() => undefined)
    }
    return result
  }
}

const isWrite = (request: unknown) => !/^(get|list|query|search|stats|overview|profile|status|record\b|availability|freeSlots|workingHours)/i.test((request as { method?: string }).method ?? '')
const describe = (request: unknown) => {
  const { service, method } = request as { service?: string; method?: string }
  return `${service}.${method}`
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

let verifier: ReturnType<typeof createAccessVerifier> | undefined

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
      return json({ error: { message: 'API desligada: configure o login (Cloudflare Access) antes de usar dados na nuvem.' } }, 503)
    }
    verifier ??= createAccessVerifier({ teamDomain: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD, allowedEmails: env.ALLOWED_EMAILS?.split(',') })

    let user: { email: string }
    try {
      user = await verifier(request.headers.get('Cf-Access-Jwt-Assertion'))
    } catch (error) {
      return json({ error: { message: error instanceof AccessDenied ? error.message : 'Login necessário.' } }, 401)
    }

    if (url.pathname === '/api/me' && request.method === 'GET') return json({ email: user.email })
    if (url.pathname !== '/api/rpc' || request.method !== 'POST') return json({ error: { message: 'Endereço da API desconhecido.' } }, 404)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: { message: 'Pedido inválido.' } }, 400)
    }
    const clinic = env.CLINIC.get(env.CLINIC.idFromName('lume'))
    const result = (await clinic.call(body, user.email)) as RpcResult
    return result.ok ? json({ value: result.value ?? null }) : json({ error: result.error }, result.status)
  },
} satisfies ExportedHandler<Env>
