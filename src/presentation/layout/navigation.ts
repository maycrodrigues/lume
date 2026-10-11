import { CalendarDays, LayoutDashboard, Package, ScrollText, Settings, Sparkles, TicketPercent, Users, Wallet, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Painel', icon: LayoutDashboard },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/pacientes', label: 'Pacientes', icon: Users },
  { to: '/admin/procedimentos', label: 'Procedimentos', icon: Sparkles },
  { to: '/admin/pacotes', label: 'Pacotes', icon: Package },
  { to: '/admin/cupons', label: 'Cupons', icon: TicketPercent },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/admin/registros', label: 'Registros', icon: ScrollText },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

/** Nome legível da página para o registro de navegação. */
export function pageName(fullPath: string): string {
  const pathname = fullPath.replace(/^\/admin(?=\/|$)/, '') || '/'
  if (pathname.endsWith('/anamnese/imprimir')) return 'Impressão de anamnese'
  if (pathname.startsWith('/fichas/')) return 'Impressão de ficha'
  if (pathname.startsWith('/pacientes/')) return 'Prontuário'
  if (pathname.startsWith('/prescricoes/')) return 'Impressão de prescrição'
  return NAV_ITEMS.find((item) => item.to === fullPath.replace(/\/$/, ''))?.label ?? pathname
}
