import { ArrowRight, AtSign, CalendarHeart, Check, Clock, Droplets, Flower2, HeartHandshake, Leaf, Mail, MapPin, MessageCircle, Sparkles, Syringe, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LumeIcon, LumeWordmark } from '../../components/brand/Logo'
import { cn } from '../../lib/cn'
import { bookingLink, CLINIC } from './clinic'

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

const TREATMENTS: Array<{ icon: LucideIcon; title: string; text: string; items: string[] }> = [
  { icon: Flower2, title: 'Facial', text: 'Pele limpa, uniforme e com viço.', items: ['Limpeza de pele profunda', 'Peeling de diamante', 'Microagulhamento', 'Radiofrequência facial'] },
  { icon: Droplets, title: 'Corporal', text: 'Leveza, menos inchaço e mais disposição.', items: ['Drenagem linfática', 'Massagem relaxante', 'Pacotes de sessões'] },
  { icon: Syringe, title: 'Injetáveis', text: 'Resultados naturais, com segurança.', items: ['Toxina botulínica', 'Bioestimulador de colágeno'] },
  { icon: Leaf, title: 'Terapias integrativas', text: 'Equilíbrio emocional, sono e bem-estar.', items: ['Auriculoterapia', 'Óleos essenciais'] },
]

const STEPS = [
  { title: 'Avaliação integrativa', text: 'Uma conversa completa sobre saúde, hábitos e objetivos, com análise da pele e do corpo.' },
  { title: 'Plano de cuidado', text: 'Você recebe um protocolo personalizado, com as sessões, os cuidados em casa e valores claros.' },
  { title: 'Sessões e evolução', text: 'A cada sessão registramos o que foi feito e como você evoluiu, e ajustamos o que for preciso.' },
]

/** Página pública da clínica (rota principal). O painel fica em /admin. */
export function LandingPage() {
  return (
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
    </div>
  )
}

function BookingButton({ children = 'Agendar avaliação', tone = 'dark', className }: { children?: ReactNode; tone?: 'dark' | 'light'; className?: string }) {
  return (
    <a
      href={bookingLink.href}
      {...(bookingLink.external ? { target: '_blank', rel: 'noreferrer' } : {})}
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

/** Arco com o ícone da marca, a "pérola" e o cartão da primeira consulta. */
function HeroArt() {
  return (
    <div className="relative mx-auto h-[400px] w-[280px] sm:h-[480px] sm:w-[340px]" aria-hidden>
      <div className="absolute inset-0 rounded-t-full rounded-b-[2.5rem] bg-linear-to-b from-perola via-perola-soft to-lilas/45 shadow-pop" />
      <div className="absolute inset-3 rounded-t-full rounded-b-[2rem] border border-white/70" />
      <LumeIcon className="absolute top-[20%] left-1/2 size-32 -translate-x-1/2 sm:size-36" tone="dark" />
      <p className="absolute top-[56%] w-full text-center text-xl font-light tracking-[0.42em] text-noite">LUME</p>
      <div className="absolute -bottom-5 -left-8 size-24 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#ead9e6_45%,#a794b3)] shadow-pop sm:-left-12 sm:size-28" />
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
  return (
    <section id="abordagem" className="scroll-mt-18 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          eyebrow="Nossa abordagem"
          title="Cuidado que começa por você"
          text="Antes de qualquer procedimento, entendemos a sua história. Assim, cada escolha faz sentido para a sua saúde, e não só para o espelho."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl border border-line bg-offwhite/60 p-7">
              <span className="flex size-12 items-center justify-center rounded-full bg-perola text-accent">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-6 text-lg font-normal text-noite">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
            </article>
          ))}
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
          {TREATMENTS.map(({ icon: Icon, title, text, items }) => (
            <article key={title} className="group rounded-3xl border border-line bg-white p-7 shadow-card transition-shadow hover:shadow-pop">
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
  const channels = [
    CLINIC.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: 'Conversar agora', href: bookingLink.href },
    CLINIC.instagram && { icon: AtSign, label: 'Instagram', value: `@${CLINIC.instagram}`, href: `https://instagram.com/${CLINIC.instagram}` },
    CLINIC.email && { icon: Mail, label: 'E-mail', value: CLINIC.email, href: `mailto:${CLINIC.email}` },
    CLINIC.address && { icon: MapPin, label: 'Endereço', value: CLINIC.address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLINIC.address)}` },
  ].filter(Boolean) as Array<{ icon: LucideIcon; label: string; value: string; href: string }>

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
            {bookingLink.external && <BookingButton className="mt-8" />}
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
              {CLINIC.hours.map((h) => (
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
  return (
    <footer className="bg-noite">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <LumeWordmark />
          <p className="mt-4 text-xs tracking-[0.2em] text-cinza uppercase">Beleza que equilibra, saúde que ilumina.</p>
        </div>
        <div className="space-y-2 text-xs text-cinza/80 md:text-right">
          <p>
            © {new Date().getFullYear()} {CLINIC.name}
          </p>
          <Link to="/admin" className="inline-block text-cinza/70 underline-offset-4 hover:text-white hover:underline">
            Área da profissional
          </Link>
        </div>
      </div>
    </footer>
  )
}
