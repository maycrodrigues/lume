import type { Services } from '@/application'
import { DomainError } from '@/domain'

/** Pedido do app: `services[service][method](...args)`. */
export interface RpcRequest {
  service: string
  method: string
  args: unknown[]
}

export type RpcResult = { ok: true; value: unknown } | { ok: false; status: number; error: { message: string; code?: string } }

/**
 * Serviços que continuam no aparelho e nunca são chamados pela API: o PIN e o token de
 * publicação são do navegador, e `subscribe` só faz sentido localmente.
 */
const LOCAL_ONLY = new Set(['access', 'site', 'subscribe'])

const isRequest = (value: unknown): value is RpcRequest => {
  const r = value as Partial<RpcRequest> | null
  return Boolean(r && typeof r.service === 'string' && typeof r.method === 'string' && Array.isArray(r.args))
}

/** Executa um método de serviço pedido pela API. Erros de regra viram resposta 400; o resto é registrado. */
export async function dispatch(services: Services, request: unknown): Promise<RpcResult> {
  if (!isRequest(request)) return { ok: false, status: 400, error: { message: 'Pedido inválido.' } }
  const { service, method, args } = request
  const target = !LOCAL_ONLY.has(service) && Object.hasOwn(services, service) ? (services as unknown as Record<string, unknown>)[service] : undefined
  const fn = target && typeof target === 'object' && Object.hasOwn(target, method) ? (target as Record<string, unknown>)[method] : undefined
  if (typeof fn !== 'function') return { ok: false, status: 404, error: { message: `Operação desconhecida: ${service}.${method}.` } }

  try {
    return { ok: true, value: await fn.apply(target, args) }
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, status: 400, error: { message: error.message, code: error.code } }
    await services.activity.recordError(error, { source: 'api', operation: `${service}.${method}` }).catch(() => undefined)
    return { ok: false, status: 500, error: { message: 'Algo não saiu como esperado no servidor. O erro foi registrado.' } }
  }
}
