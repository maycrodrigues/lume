import type { SiteProfile } from '@/domain'
import { describeWorkingHours, DomainError, toInstagramHandle, toWhatsAppNumber } from '@/domain'
import type { ActivityService } from '../activityLog'
import type { SitePublisher, SiteTokenStore } from '../ports'
import type { ServiceDeps } from './deps'
import type { SettingsService } from './settings'

export interface SiteDeps {
  sitePublisher: SitePublisher
  siteToken: SiteTokenStore
}

export interface SiteStatus {
  connected: boolean
  lastPublishedAt?: string
}

/** Nome padrão das Configurações: publicar com ele deixaria o site sem a profissional. */
const PLACEHOLDER_PROFESSIONAL = 'Profissional responsável'

/**
 * Site público da clínica (ver ADR 0006). Os dados vêm das Configurações e do horário de
 * atendimento; publicar envia só o que é de contato e apresentação.
 */
export function createSiteService({ clock }: Pick<ServiceDeps, 'clock'>, settings: SettingsService, activity: ActivityService, { sitePublisher, siteToken }: SiteDeps) {
  async function profile(): Promise<Omit<SiteProfile, 'publishedAt'>> {
    const s = await settings.get()
    const draft = {
      clinicName: s.clinicName,
      professionalName: s.professionalName,
      professionalRegistry: s.professionalRegistry,
      whatsapp: toWhatsAppNumber(s.phone),
      phone: s.phone,
      email: s.email,
      instagram: toInstagramHandle(s.instagram),
      address: s.address,
      hours: describeWorkingHours(await settings.workingHours()),
    }
    // Campos vazios não vão para o site.
    return Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined && v !== '')) as Omit<SiteProfile, 'publishedAt'>
  }

  return {
    /** O que o site mostrará se for publicado agora. */
    profile,

    async status(): Promise<SiteStatus> {
      const connected = Boolean(await siteToken.get())
      const [last] = await activity.query({ category: 'system', search: 'site.publish', limit: 1 })
      const lastPublishedAt = last?.context?.publishedAt as string | undefined
      return lastPublishedAt ? { connected, lastPublishedAt } : { connected }
    },

    async connect(token: string): Promise<void> {
      const value = token.trim()
      if (!value) throw new DomainError('Cole o token de publicação.', 'empty_token')
      await sitePublisher.verify(value)
      await siteToken.save(value)
      await activity.record({ category: 'system', action: 'site.connect', message: 'Publicação do site conectada' })
    },

    async disconnect(): Promise<void> {
      await siteToken.clear()
      await activity.record({ category: 'system', action: 'site.disconnect', message: 'Publicação do site desconectada' })
    },

    async publish(): Promise<SiteProfile> {
      const token = await siteToken.get()
      if (!token) throw new DomainError('Conecte o site antes de publicar.', 'not_connected')
      const data = await profile()
      if (!data.professionalName || data.professionalName === PLACEHOLDER_PROFESSIONAL) {
        throw new DomainError('Preencha o nome da profissional em Dados da clínica antes de publicar.', 'missing_professional')
      }
      const published: SiteProfile = { ...data, publishedAt: clock.now().toISOString() }
      await sitePublisher.publish(published, token)
      await activity.record({
        category: 'system',
        action: 'site.publish',
        message: `Dados publicados no site${published.whatsapp ? ' (com WhatsApp)' : ''}`,
        context: { publishedAt: published.publishedAt, fields: Object.keys(published) },
      })
      return published
    },
  }
}

export type SiteService = ReturnType<typeof createSiteService>
