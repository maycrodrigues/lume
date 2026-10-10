import { createContext, use, type ReactNode } from 'react'
import type { Services } from '@/application'

const ServicesContext = createContext<Services | null>(null)

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext value={services}>{children}</ServicesContext>
}

export function useServices(): Services {
  const services = use(ServicesContext)
  if (!services) throw new Error('ServicesProvider ausente.')
  return services
}
