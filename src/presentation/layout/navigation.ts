import { CalendarDays, LayoutDashboard, Package, ScrollText, Settings, Sparkles, TicketPercent, Users, Wallet, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/procedimentos', label: 'Procedimentos', icon: Sparkles },
  { to: '/pacotes', label: 'Pacotes', icon: Package },
  { to: '/cupons', label: 'Cupons', icon: TicketPercent },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/registros', label: 'Registros', icon: ScrollText },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

/** Nome legível da página para o registro de navegação. */
export function pageName(pathname: string): string {
  if (pathname.endsWith('/anamnese/imprimir')) return 'Impressão de anamnese'
  if (pathname.startsWith('/fichas/')) return 'Impressão de ficha'
  if (pathname.startsWith('/pacientes/')) return 'Prontuário'
  if (pathname.startsWith('/prescricoes/')) return 'Impressão de prescrição'
  return NAV_ITEMS.find((item) => item.to === pathname)?.label ?? pathname
}
