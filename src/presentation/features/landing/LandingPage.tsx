import { ArrowRight, AtSign, BadgeCheck, CalendarHeart, Check, Clock, Droplets, Flower2, HeartHandshake, Leaf, Mail, MapPin, MessageCircle, Sparkles, Syringe, type LucideIcon } from 'lucide-react'
import { use, type ReactNode } from 'react'
import { Link } from 'react-router'
import { LumeIcon, LumeWordmark } from '../../components/brand/Logo'
import { cn } from '../../lib/cn'
import { Photo, PHOTOS, type LandingPhoto } from './photos'
import { bookingLink, SiteContext, useSiteInfo, whatsappLink, type SiteInfo } from './site'

const NAV = [
  { href: '#abordagem', label: 'Abordagem' },
  { href: '#tratamentos', label: 'Tratamentos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#contato', label: 'Contato' },
]

const PILLARS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Leaf, title: 'Olhar integrativo', text: 'Sono, alimentação, rotina e saúde entram na conversa. Cuidamos da causa, não só do sintoma.' },
  { icon: Sparkles, title: 'Protocolos sob medida', text: 'Cada plano combina técnicas e ativos escolhidos para a sua pele, o seu corpo e o seu momento.' },
  { icon: HeartHandshake, title: 'Acompanhamento próximo', text: 'Cada sessão é registrada, com fotos de evolução, e o cuidado é ajustado ao longo do caminho.' },
]

const TREATMENTS: Array<{ icon: LucideIcon; title: string; text: string; items: string[]; photo: LandingPhoto }> = [
  { icon: Flower2, title: 'Facial', text: 'Pele limpa, uniforme e com viço.', items: ['Limpeza de pele profunda', 'Peeling de diamante', 'Microagulhamento', 'Radiofrequência facial'], photo: PHOTOS.facial },
  { icon: Droplets, title: 'Corporal', text: 'Leveza, menos inchaço e mais disposição.', items: ['Drenagem linfática', 'Massagem relaxante', 'Pacotes de sessões'], photo: PHOTOS.body },
  { icon: Syringe, title: 'Injetáveis', text: 'Resultados naturais, com segurança.', items: ['Toxina botulínica', 'Bioestimulador de colágeno'], photo: PHOTOS.injectables },
  { icon: Leaf, title: 'Terapias integrativas', text: 'Equilíbrio emocional, sono e bem-estar.', items: ['Auriculoterapia', 'Óleos essenciais'], photo: PHOTOS.integrative },
]

const STEPS = [
  { title: 'Avaliação integrativa', text: 'Uma conversa completa sobre saúde, hábitos e objetivos, com análise da pele e do corpo.' },
  { title: 'Plano de cuidado', text: 'Você recebe um protocolo personalizado, com as sessões, os cuidados em casa e valores claros.' },
  { title: 'Sessões e evolução', text: 'A cada sessão registramos o que foi feito e como você evoluiu, e ajustamos o que for preciso.' },
]

/** Página pública da clínica (rota principal). O painel fica em /admin. */
export function LandingPage() {
  const site = useSiteInfo()
  return (
    <SiteContext value={site}>
      <div className="min-h-dvh bg-offwhite text-ink">
        <Header />
        <main>
          <Hero />
          <Approach />
          <Treatments />
          <HowItWorks />
          <Contact />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </SiteContext>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => part.length > 2 || /^[A-ZÀ-Ú]/.test(part))
    .map((part) => part[0])
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .join('')
    .toUpperCase()

/** Canais de contato publicados (só os preenchidos). */
function contactChannels(site: SiteInfo) {
  return [
    site.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: site.phone ?? 'Conversar agora', href: whatsappLink(site.whatsapp) },
    site.email && { icon: Mail, label: 'E-mail', value: site.email, href: `mailto:${site.email}` },
    site.instagram && { icon: AtSign, label: 'Instagram', value: `@${site.instagram}`, href: `https://instagram.com/${site.instagram}` },
    site.address && { icon: MapPin, label: 'Endereço', value: site.address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}` },
  ].filter(Boolean) as Array<{ icon: LucideIcon; label: string; value: string; href: string }>
}

/** Botão discreto e fixo de WhatsApp: só o ícone; o texto aparece ao passar o mouse ou focar. */
function WhatsAppButton() {
  const site = use(SiteContext)
  if (!site.whatsapp) return null
  return (
    <a
      href={whatsappLink(site.whatsapp)}
      target="_blank"
      rel="noreferrer"
      aria-label="Agendar avaliação pelo WhatsApp"
      className="group fixed right-4 bottom-4 z-40 flex h-12 items-center rounded-full border border-white/10 bg-noite/90 px-3.5 text-perola shadow-pop backdrop-blur transition-colors hover:bg-noite sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="size-5 shrink-0" strokeWidth={1.5} />
      <span className="max-w-0 overflow-hidden text-[13px] font-medium whitespace-nowrap transition-all duration-300 group-hover:ml-2 group-hover:max-w-48 group-focus-visible:ml-2 group-focus-visible:max-w-48">
        Agendar pelo WhatsApp
      </span>
    </a>
  )
}

function BookingButton({ children = 'Agendar avaliação', tone = 'dark', className }: { children?: ReactNode; tone?: 'dark' | 'light'; className?: string }) {
  const link = bookingLink(use(SiteContext))
  return (
    <a
      href={link.href}
      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-medium transition-colors',
        tone === 'dark' ? 'bg-noite text-white hover:bg-noite-700' : 'bg-perola text-noite hover:bg-white',
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4" strokeWidth={1.5} />
    </a>
  )
}

function SectionTitle({ eyebrow, title, text, light = false }: { eyebrow: string; title: string; text?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={cn('eyebrow', light && 'text-lilas')}>{eyebrow}</p>
      <h2 className={cn('mt-3 text-3xl font-light tracking-tight sm:text-4xl', light ? 'text-white' : 'text-noite')}>{title}</h2>
      {text && <p className={cn('mt-4 text-[15px] leading-relaxed', light ? 'text-cinza' : 'text-ink-soft')}>{text}</p>}
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-offwhite/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <a href="#inicio" aria-label="LUME · início">
          <LumeWordmark tone="dark" compact />
        </a>
        <nav aria-label="Seções" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-[13px] text-ink-soft transition-colors hover:text-noite">
              {item.label}
            </a>
          ))}
        </nav>
        <BookingButton className="h-10 px-5 text-[13px]">
          <span className="sm:hidden">Agendar</span>
          <span className="hidden sm:inline">Agendar avaliação</span>
        </BookingButton>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-40 size-[560px] rounded-full bg-perola/70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 size-[420px] rounded-full bg-lilas/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-28">
        <div>
          <p className="eyebrow">Estética &amp; cuidado integrado</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.08] font-light tracking-tight text-noite sm:text-6xl">
            Beleza que equilibra,
            <br />
            <span className="text-accent">saúde que ilumina.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft">
            Tratamentos estéticos com olhar integrativo: cuidamos da pele, do corpo e do bem-estar a partir de uma avaliação completa da sua saúde e da sua
            rotina.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <BookingButton />
            <a href="#tratamentos" className="inline-flex h-12 items-center rounded-full border border-line-strong bg-white/60 px-7 text-sm font-medium text-noite transition-colors hover:border-cinza hover:bg-white">
              Conhecer tratamentos
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-soft">
            {['Avaliação personalizada', 'Protocolos sob medida', 'Evolução acompanhada'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-accent" strokeWidth={1.75} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <HeroArt />
      </div>
    </section>
  )
}

/** Foto num arco (forma da marca), a "pérola" e o cartão da primeira consulta. */
function HeroArt() {
  return (
    <div className="relative mx-auto h-[400px] w-[280px] sm:h-[480px] sm:w-[340px]">
      <div className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[2.5rem] bg-perola shadow-pop">
        <Photo photo={PHOTOS.hero} priority className="size-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-noite/25 via-transparent to-perola/10" />
      </div>
      <div className="absolute inset-3 rounded-t-full rounded-b-[2rem] border border-white/60" />
      <span className="absolute top-5 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-white/85 shadow-card backdrop-blur" aria-hidden>
        <LumeIcon className="size-9" tone="dark" />
      </span>
      <div aria-hidden className="absolute -bottom-5 -left-8 size-24 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#ead9e6_45%,#a794b3)] shadow-pop sm:-left-12 sm:size-28" />
      <div className="absolute right-[-1.5rem] bottom-3 w-52 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-pop backdrop-blur sm:right-[-3rem] sm:bottom-14 sm:w-56">
        <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-accent uppercase">
          <CalendarHeart className="size-3.5" strokeWidth={1.5} />
          Primeiro passo
        </p>
        <p className="mt-2 text-sm font-medium text-noite">Avaliação integrativa</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">Anamnese completa, análise de pele e plano de cuidado.</p>
      </div>
    </div>
  )
}

function Approach() {
  const site = use(SiteContext)
  return (
    <section id="abordagem" className="scroll-mt-18 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="relative">
          <Photo photo={PHOTOS.clinic} className="aspect-[13/15] w-full rounded-[2rem] object-cover shadow-card" />
          <div className="absolute -right-3 -bottom-6 max-w-[230px] rounded-2xl bg-noite p-5 text-white shadow-pop sm:-right-6">
            <p className="text-2xl font-light">60 min</p>
            <p className="mt-1 text-xs leading-relaxed text-cinza">de avaliação integrativa antes de qualquer protocolo.</p>
          </div>
        </div>
        <div>
          <p className="eyebrow">Nossa abordagem</p>
          <h2 className="mt-3 text-3xl font-light tracking-tight text-noite sm:text-4xl">Cuidado que começa por você</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Antes de qualquer procedimento, entendemos a sua história. Assim, cada escolha faz sentido para a sua saúde, e não só para o espelho.
          </p>
          <ul className="mt-10 space-y-7">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-perola text-accent">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-lg font-normal text-noite">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          {site.professionalName && (
            <div className="mt-10 flex items-center gap-4 border-t border-line pt-7">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-noite text-base font-light tracking-wider text-perola">{initials(site.professionalName)}</span>
              <div>
                <p className="text-[11px] font-medium tracking-[0.16em] text-ink-muted uppercase">Quem cuida de você</p>
                <p className="mt-0.5 text-lg font-normal text-noite">{site.professionalName}</p>
                {site.professionalRegistry && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                    <BadgeCheck className="size-3.5 text-accent" strokeWidth={1.5} />
                    {site.professionalRegistry}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Treatments() {
  return (
    <section id="tratamentos" className="scroll-mt-18 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Tratamentos" title="Para a pele, o corpo e o bem-estar" text="Protocolos combinados conforme a sua avaliação. Valores e indicações são conversados na consulta." />
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {TREATMENTS.map(({ icon: Icon, title, text, items, photo }) => (
            <article key={title} className="group overflow-hidden rounded-3xl border border-line bg-white shadow-card transition-shadow hover:shadow-pop">
              <div className="overflow-hidden">
                <Photo photo={photo} className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-light text-noite">{title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{text}</p>
                  </div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lilas-soft text-accent">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                </div>
                <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-ink-soft">
                      <span className="size-1.5 rounded-full bg-lilas" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-18 overflow-hidden bg-noite py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-lilas/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle light eyebrow="Como funciona" title="Três passos para começar" text="Sem pressa e sem fórmulas prontas: o cuidado acompanha o seu ritmo." />
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-7">
              <span className="num text-4xl font-light text-lilas">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-5 text-lg font-normal text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cinza">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <BookingButton tone="light">Agendar minha avaliação</BookingButton>
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const site = use(SiteContext)
  const channels = contactChannels(site)

  return (
    <section id="contato" className="scroll-mt-18 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 overflow-hidden rounded-[2rem] bg-linear-to-br from-perola via-perola-soft to-white p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <div>
            <p className="eyebrow">Contato</p>
            <h2 className="mt-3 text-3xl font-light tracking-tight text-noite sm:text-4xl">Vamos cuidar de você?</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              O primeiro passo é a avaliação integrativa. Fale com a gente para escolher o melhor dia e horário.
            </p>
            {site.whatsapp && <BookingButton className="mt-8" />}
            {channels.length > 0 && (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                {channels.map(({ icon: Icon, label, value, href }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="group flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-accent shadow-card">
                        <Icon className="size-4" strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-medium tracking-[0.16em] text-ink-muted uppercase">{label}</span>
                        <span className="block text-sm break-words text-noite group-hover:text-accent">{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="self-start rounded-3xl bg-white/80 p-7 shadow-card">
            <p className="flex items-center gap-2 text-sm font-medium text-noite">
              <Clock className="size-4 text-accent" strokeWidth={1.5} />
              Horário de atendimento
            </p>
            <dl className="mt-5 divide-y divide-line">
              {site.hours.map((h) => (
                <div key={h.days} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="text-ink-soft">{h.days}</dt>
                  <dd className="num text-noite">{h.time}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">Atendimento com hora marcada.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const site = use(SiteContext)
  const channels = contactChannels(site)
  const link = 'underline-offset-4 transition-colors hover:text-white hover:underline'
  return (
    <footer className="bg-noite text-cinza">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <LumeWordmark />
          <p className="mt-5 max-w-xs text-xs leading-relaxed tracking-[0.2em] uppercase">Beleza que equilibra, saúde que ilumina.</p>
        </div>

        {site.professionalName && (
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-lilas uppercase">Profissional responsável</p>
            <p className="mt-3 text-sm text-white">{site.professionalName}</p>
            {site.professionalRegistry && <p className="mt-1 text-xs">{site.professionalRegistry}</p>}
          </div>
        )}

        {channels.length > 0 && (
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-lilas uppercase">Contato</p>
            <ul className="mt-3 space-y-2 text-sm">
              {channels.map(({ icon: Icon, label, value, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer" className={cn('inline-flex items-start gap-2 break-words', link)}>
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-lilas" strokeWidth={1.5} aria-hidden />
                    <span className="sr-only">{label}: </span>
                    {value}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-lilas uppercase">Atendimento</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {site.hours.map((h) => (
              <li key={h.days}>
                <span className="text-white">{h.days}</span> · <span className="num whitespace-nowrap">{h.time}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Com hora marcada.</p>
        </div>
      </div>

      <div className="border-t border-white/[0.08]">
        {/* Espaço extra embaixo para o botão de WhatsApp não cobrir os links. */}
        <div className={cn('mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[11px] text-cinza/70 sm:px-6 md:flex-row md:items-center md:justify-between', site.whatsapp && 'pb-24 md:pr-56 md:pb-6')}>
          <p>
            © {new Date().getFullYear()} {site.clinicName}
            {site.professionalName && ` · ${site.professionalName}`}
          </p>
          <p>
            Fotos:{' '}
            {Object.values(PHOTOS).map((photo, i, all) => (
              <span key={photo.src}>
                <a href={photo.credit.page} target="_blank" rel="noreferrer" className={link}>
                  {photo.credit.name}
                </a>
                {i < all.length - 1 ? ', ' : ''}
              </span>
            ))}{' '}
            ·{' '}
            <a href="https://unsplash.com" target="_blank" rel="noreferrer" className={link}>
              Unsplash
            </a>
          </p>
          <Link to="/admin" className={cn('whitespace-nowrap', link)}>
            Área da profissional
          </Link>
        </div>
      </div>
    </footer>
  )
}
