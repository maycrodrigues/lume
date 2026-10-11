import { toBase64 } from '@/application/binary'
import type { SitePublisher } from '@/application/ports'
import { DomainError } from '@/domain'

export interface GithubSiteTarget {
  owner: string
  repo: string
  branch: string
  /** Arquivo lido pelo site (ex.: `public/site.json`, servido como `site.json`). */
  path: string
}

const COMMIT_MESSAGE = 'chore(site): atualiza dados públicos da clínica'

/**
 * Publica os dados do site gravando um arquivo no repositório pela API do GitHub; o push
 * dispara o deploy do GitHub Pages. O token (fine-grained) só precisa de "Contents: Read and write".
 */
export function createGithubSitePublisher(target: GithubSiteTarget, http: typeof fetch = (...args) => fetch(...args)): SitePublisher {
  const repoUrl = `https://api.github.com/repos/${target.owner}/${target.repo}`
  const fileUrl = `${repoUrl}/contents/${target.path}`

  async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
    let response: Response
    try {
      response = await http(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
      })
    } catch {
      throw new DomainError('Sem conexão com o GitHub. Verifique a internet e tente de novo.', 'offline')
    }
    if (response.status === 401) throw new DomainError('Token inválido ou expirado. Gere um novo token e conecte de novo.', 'invalid_token')
    return response
  }

  async function currentSha(token: string): Promise<string | undefined> {
    const response = await call(token, `${fileUrl}?ref=${encodeURIComponent(target.branch)}`)
    if (response.status === 404) return undefined
    if (!response.ok) throw failure(response.status)
    return ((await response.json()) as { sha: string }).sha
  }

  const failure = (status: number) =>
    status === 403 || status === 404
      ? new DomainError(`O token não tem permissão de escrita no repositório ${target.owner}/${target.repo} (Contents: Read and write).`, 'forbidden')
      : new DomainError(`O GitHub recusou a publicação (erro ${status}). Tente de novo em instantes.`, 'publish_failed')

  return {
    async verify(token) {
      const response = await call(token, repoUrl)
      if (response.status === 404 || response.status === 403) {
        throw new DomainError(`O token não dá acesso ao repositório ${target.owner}/${target.repo}.`, 'forbidden')
      }
      if (!response.ok) throw failure(response.status)
    },

    async publish(profile, token) {
      const content = toBase64(new TextEncoder().encode(`${JSON.stringify(profile, null, 2)}\n`).buffer as ArrayBuffer)
      // Uma nova tentativa se o arquivo mudou entre a leitura e a gravação (409/422 de sha desatualizado).
      for (let attempt = 0; attempt < 2; attempt++) {
        const sha = await currentSha(token)
        const response = await call(token, fileUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: COMMIT_MESSAGE, content, branch: target.branch, ...(sha ? { sha } : {}) }),
        })
        if (response.ok) return
        if ((response.status === 409 || response.status === 422) && attempt === 0) continue
        throw failure(response.status)
      }
    },
  }
}
