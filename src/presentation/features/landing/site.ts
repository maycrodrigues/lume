import { createContext, useEffect, useState } from 'react'
import type { SiteProfile } from '@/domain'

/**
 * Dados do site público. Vêm de `site.json`, publicado pelo painel (Configurações → Site);
 * enquanto não houver publicação, valem os padrões abaixo e os campos de contato não aparecem.
 */
export type SiteInfo = Omit<SiteProfile, 'professionalName' | 'publishedAt'> & { professionalName?: string }

export const FALLBACK_SITE: SiteInfo = {
  clinicName: 'LUME · Estética & Cuidado Integrado',
  hours: [
    { days: 'Segunda a sexta', time: '10h às 17h' },
    { days: 'Sábado', time: '12h às 16h' },
  ],
}

export const SiteContext = createContext<SiteInfo>(FALLBACK_SITE)

const WHATSAPP_MESSAGE = 'Olá! Gostaria de agendar uma avaliação na LUME.'

export const whatsappLink = (number: string) => `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

/** Botões "Agendar avaliação": WhatsApp, se publicado; senão, a seção de contato. */
export const bookingLink = (site: SiteInfo) => (site.whatsapp ? { href: whatsappLink(site.whatsapp), external: true } : { href: '#contato', external: false })

export function useSiteInfo(): SiteInfo {
  const [site, setSite] = useState(FALLBACK_SITE)
  useEffect(() => {
    let alive = true
    fetch(`${import.meta.env.BASE_URL}site.json`, { cache: 'no-cache' })
      .then((response) => (response.ok && response.headers.get('content-type')?.includes('json') ? (response.json() as Promise<SiteProfile>) : undefined))
      .then((profile) => {
        if (alive && profile?.professionalName) setSite({ ...FALLBACK_SITE, ...profile })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  return site
}
