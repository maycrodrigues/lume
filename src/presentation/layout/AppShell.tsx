import clsx from 'clsx'
import { HardDrive, LockKeyhole, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useServices } from '../app/services'
import { LumeWordmark } from '../components/brand/Logo'
import { useAccess } from '../features/access/AccessGate'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { firstName, formatLong } from '../lib/format'
import { NAV_ITEMS, pageName } from './navigation'

export function AppShell() {
  const services = useServices()
  const { lock, until } = useAccess()
  const location = useLocation()
  // O menu móvel fica aberto só na navegação em que foi aberto: trocar de página o fecha.
  const [menuOpenAt, setMenuOpenAt] = useState<string>()
  const menuOpen = menuOpenAt === location.key
  const lastLogged = useRef<string>(undefined)
  const { data: settings } = useLiveQuery(() => services.settings.get(), [], ['settings'])

  useEffect(() => {
    const path = location.pathname + location.search
    if (lastLogged.current === path) return
    lastLogged.current = path
    void services.activity.record({
      category: 'navigation',
      action: 'view',
      message: `Acessou ${pageName(location.pathname)}`,
      context: { path },
    })
  }, [services, location.pathname, location.search])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-7 pb-8">
        <LumeWordmark />
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] transition-colors',
                isActive ? 'bg-white/[0.07] font-medium text-white' : 'text-cinza hover:bg-white/[0.04] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx('absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-lilas transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
                <Icon className={clsx('size-[18px]', isActive ? 'text-perola' : 'text-lilas')} strokeWidth={1.5} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <p className="text-[13px] text-white">{settings ? firstName(settings.professionalName) : '—'}</p>
        <p className="mt-0.5 truncate text-[11px] text-cinza/80">{settings?.professionalRegistry ?? 'Configure seus dados'}</p>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] tracking-wide text-cinza/70">
          <HardDrive className="size-3" strokeWidth={1.5} />
          Dados salvos neste computador
        </p>
        <button
          type="button"
          onClick={() => void lock()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-2 text-xs text-cinza transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <LockKeyhole className="size-3.5" strokeWidth={1.5} />
          Bloquear painel
        </button>
        <p className="mt-2 text-center text-[10px] text-cinza/70">PIN pedido de novo {formatLong(new Date(until))}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] bg-noite lg:block">{sidebar}</aside>

      <div className="no-print sticky top-0 z-20 flex items-center justify-between bg-noite px-4 py-3 lg:hidden">
        <LumeWordmark compact />
        <button type="button" onClick={() => setMenuOpenAt(location.key)} aria-label="Abrir menu" className="rounded-full p-2 text-white hover:bg-white/10">
          <Menu className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div role="presentation" className="absolute inset-0 bg-noite/50" onClick={() => setMenuOpenAt(undefined)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-noite">
            <button type="button" onClick={() => setMenuOpenAt(undefined)} aria-label="Fechar menu" className="absolute top-4 right-3 rounded-full p-2 text-white hover:bg-white/10">
              <X className="size-5" strokeWidth={1.5} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
