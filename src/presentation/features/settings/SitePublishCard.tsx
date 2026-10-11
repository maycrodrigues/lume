import { ExternalLink, Globe, Link2Off, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, Input } from '../../components/ui/Field'
import { useAction, useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { timeAgo } from '../../lib/format'

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'
const siteUrl = () => `${location.origin}${import.meta.env.BASE_URL}`

/** Configurações → Site: o que vai para o site público e o botão de publicar. */
export function SitePublishCard() {
  const services = useServices()
  const action = useAction()
  const { submit, pending, error } = useSubmit()
  const [version, setVersion] = useState(0)
  const [token, setToken] = useState('')
  const { data: profile } = useLiveQuery(() => services.site.profile(), [], ['settings'])
  const { data: status } = useLiveQuery(() => services.site.status(), [version], ['activity'])

  const connect = async (e: FormEvent) => {
    e.preventDefault()
    const result = await submit('site.connect', () => services.site.connect(token), { success: 'Site conectado. Agora é só publicar.' })
    if (result.ok) {
      setToken('')
      setVersion((v) => v + 1)
    }
  }

  const rows: Array<[string, string | undefined]> = [
    ['Profissional', profile && [profile.professionalName, profile.professionalRegistry].filter(Boolean).join(' · ')],
    ['WhatsApp', profile?.whatsapp ? profile.phone : undefined],
    ['E-mail', profile?.email],
    ['Instagram', profile?.instagram && `@${profile.instagram}`],
    ['Endereço', profile?.address],
    ['Horários', profile?.hours.map((h) => `${h.days}, ${h.time}`).join(' · ')],
  ]

  return (
    <Card>
      <CardHeader
        eyebrow="Site"
        title="Dados no site da clínica"
        action={
          <a href={siteUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-noite">
            Ver site
            <ExternalLink className="size-3.5" strokeWidth={1.5} />
          </a>
        }
      />
      <div className="space-y-4 px-5 pb-5">
        <p className="text-sm text-ink-muted">
          O site mostra o nome da profissional, o botão de WhatsApp e os contatos abaixo. Para mudar, edite <strong className="font-medium text-ink">Dados da clínica</strong> e o{' '}
          <strong className="font-medium text-ink">Horário de atendimento</strong> e publique de novo.
        </p>
        <dl className="divide-y divide-line rounded-xl border border-line text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 px-3.5 py-2.5">
              <dt className="w-24 shrink-0 text-ink-muted">{label}</dt>
              <dd className={value ? 'min-w-0 break-words text-ink' : 'text-ink-muted italic'}>{value || (label === 'WhatsApp' ? 'informe um celular com DDD em Telefone' : 'não informado')}</dd>
            </div>
          ))}
        </dl>

        {status?.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">{status.lastPublishedAt ? `Última publicação ${timeAgo(status.lastPublishedAt)}.` : 'Ainda não publicado.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                icon={<Link2Off className="size-4" strokeWidth={1.5} />}
                onClick={async () => {
                  if ((await action('site.disconnect', () => services.site.disconnect(), { success: 'Publicação desconectada.' })).ok) setVersion((v) => v + 1)
                }}
              >
                Desconectar
              </Button>
              <Button
                icon={<Send className="size-4" strokeWidth={1.5} />}
                onClick={() => action('site.publish', () => services.site.publish(), { success: 'Dados enviados. O site atualiza em 1 a 2 minutos.' })}
              >
                Publicar no site
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={connect} className="space-y-3 rounded-xl bg-offwhite px-4 py-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <Globe className="size-4 text-accent" strokeWidth={1.5} />
              Conectar a publicação (uma vez neste navegador)
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-ink-soft">
              <li>
                Abra a{' '}
                <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="font-medium text-accent underline-offset-2 hover:underline">
                  criação de token do GitHub
                </a>{' '}
                com a conta dona do site.
              </li>
              <li>Em <em>Repository access</em>, escolha <em>Only select repositories</em> → <strong>lume</strong>.</li>
              <li>Em <em>Permissions</em> → <em>Contents</em>, marque <strong>Read and write</strong>. Gere o token e cole abaixo.</li>
            </ol>
            {error && <Alert>{error}</Alert>}
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Token de publicação" className="min-w-0 flex-1">
                {(id) => <Input id={id} type="password" autoComplete="off" spellCheck={false} placeholder="github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} />}
              </Field>
              <Button type="submit" loading={pending} disabled={!token.trim()}>Conectar</Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}
