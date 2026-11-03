import { describe, expect, it } from 'vitest'
import { setup } from '@/application/__tests__/setup'
import { dispatch } from './rpc'

describe('API do painel (despachante)', () => {
  it('executa o método do serviço e devolve o resultado', async () => {
    const { services } = setup()
    const created = await dispatch(services, { service: 'patients', method: 'create', args: [{ name: 'Ana Lima', gender: 'female' }] })
    expect(created).toMatchObject({ ok: true, value: { name: 'Ana Lima' } })

    const listed = await dispatch(services, { service: 'patients', method: 'list', args: [] })
    expect(listed.ok && (listed.value as unknown[]).length).toBe(1)
  })

  it('erros de regra voltam como 400 com a mensagem para a profissional', async () => {
    const { services } = setup()
    expect(await dispatch(services, { service: 'patients', method: 'create', args: [{ name: '', gender: 'female' }] })).toMatchObject({ ok: false, status: 400 })
  })

  it('recusa pedidos malformados, serviços locais e nomes que não são métodos', async () => {
    const { services } = setup()
    expect(await dispatch(services, { service: 'patients' })).toMatchObject({ ok: false, status: 400 })
    for (const [service, method] of [['access', 'resetAll'], ['site', 'publish'], ['subscribe', 'call'], ['patients', 'constructor'], ['patients', '__proto__'], ['toString', 'call'], ['nada', 'x']]) {
      expect(await dispatch(services, { service, method, args: [] }), `${service}.${method}`).toMatchObject({ ok: false, status: 404 })
    }
  })

  it('erro inesperado vira 500 genérico e fica registrado', async () => {
    const { services } = setup()
    const result = await dispatch(services, { service: 'backup', method: 'importData', args: [{ format: 'lume-backup', version: 2, data: { files: [{ id: 'x', data: '%%%' }] } }] })
    expect(result).toEqual({ ok: false, status: 500, error: { message: 'Algo não saiu como esperado no servidor. O erro foi registrado.' } })
    expect(await services.activity.query({ category: 'error' })).not.toHaveLength(0)
  })
})
