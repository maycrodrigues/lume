import { describe, expect, it } from 'vitest'
import { fromBase64 } from '@/application/binary'
import type { SiteProfile } from '@/domain'
import { createGithubSitePublisher } from './githubSitePublisher'

const target = { owner: 'maycrodrigues', repo: 'lume', branch: 'main', path: 'public/site.json' }
const profile: SiteProfile = { clinicName: 'LUME', professionalName: 'Ana Lima', whatsapp: '5511912345678', hours: [], publishedAt: '2026-10-11T13:00:00.000Z' }

/** GitHub falso: responde por método + URL e guarda as chamadas. */
function fakeGithub(routes: Record<string, Array<{ status: number; body?: unknown }>>) {
  const calls: Array<{ method: string; url: string; headers: Record<string, string>; body?: Record<string, unknown> }> = []
  const http = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const key = `${method} ${url.split('?')[0]}`
    const next = routes[key]?.shift() ?? { status: 500 }
    return new Response(next.body === undefined ? null : JSON.stringify(next.body), { status: next.status })
  }) as typeof fetch
  return { http, calls }
}

const FILE = 'https://api.github.com/repos/maycrodrigues/lume/contents/public/site.json'
const REPO = 'https://api.github.com/repos/maycrodrigues/lume'

describe('Publicação no site pelo GitHub', () => {
  it('grava o arquivo no branch com o sha atual e o token no cabeçalho', async () => {
    const github = fakeGithub({ [`GET ${FILE}`]: [{ status: 200, body: { sha: 'abc123' } }], [`PUT ${FILE}`]: [{ status: 200, body: {} }] })
    await createGithubSitePublisher(target, github.http).publish(profile, 'tok')

    const put = github.calls.find((c) => c.method === 'PUT')!
    expect(put.headers.Authorization).toBe('Bearer tok')
    expect(put.body).toMatchObject({ branch: 'main', sha: 'abc123', message: 'chore(site): atualiza dados públicos da clínica' })
    expect(JSON.parse(new TextDecoder().decode(fromBase64(put.body!.content as string)))).toEqual(profile)
  })

  it('cria o arquivo quando ainda não existe', async () => {
    const github = fakeGithub({ [`GET ${FILE}`]: [{ status: 404 }], [`PUT ${FILE}`]: [{ status: 201, body: {} }] })
    await createGithubSitePublisher(target, github.http).publish(profile, 'tok')
    expect(github.calls.find((c) => c.method === 'PUT')!.body).not.toHaveProperty('sha')
  })

  it('tenta de novo uma vez se o arquivo mudou no meio do caminho', async () => {
    const github = fakeGithub({
      [`GET ${FILE}`]: [{ status: 200, body: { sha: 'velho' } }, { status: 200, body: { sha: 'novo' } }],
      [`PUT ${FILE}`]: [{ status: 409 }, { status: 200, body: {} }],
    })
    await createGithubSitePublisher(target, github.http).publish(profile, 'tok')
    expect(github.calls.filter((c) => c.method === 'PUT').map((c) => c.body!.sha)).toEqual(['velho', 'novo'])
  })

  it('explica token inválido, sem permissão e sem acesso ao repositório', async () => {
    const invalid = fakeGithub({ [`GET ${REPO}`]: [{ status: 401 }] })
    await expect(createGithubSitePublisher(target, invalid.http).verify('tok')).rejects.toThrow('Token inválido ou expirado')

    const noRepo = fakeGithub({ [`GET ${REPO}`]: [{ status: 404 }] })
    await expect(createGithubSitePublisher(target, noRepo.http).verify('tok')).rejects.toThrow('não dá acesso ao repositório maycrodrigues/lume')

    const readOnly = fakeGithub({ [`GET ${FILE}`]: [{ status: 200, body: { sha: 'abc' } }], [`PUT ${FILE}`]: [{ status: 403 }] })
    await expect(createGithubSitePublisher(target, readOnly.http).publish(profile, 'tok')).rejects.toThrow('não tem permissão de escrita')
  })
})
