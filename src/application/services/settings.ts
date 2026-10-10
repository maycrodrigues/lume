import { z } from 'zod'
import type { ClinicSettings, WorkingHours } from '@/domain'
import { CLINIC_SETTINGS_ID, DEFAULT_WORKING_HOURS } from '@/domain'
import { optionalText, parse, requiredText } from '../validation'
import type { ServiceDeps } from './deps'

const settingsSchema = z.object({
  clinicName: requiredText('Informe o nome da clínica.'),
  professionalName: requiredText('Informe o nome da profissional.'),
  professionalRegistry: optionalText,
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  instagram: optionalText,
})

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.')

const workingHoursSchema = z.object({
  days: z
    .array(z.object({ open: z.boolean(), start: time, end: time }))
    .length(7, 'Informe os sete dias da semana.')
    .refine((days) => days.every((d) => !d.open || d.start < d.end), 'Em cada dia aberto, o horário de início deve ser antes do fim.'),
  intervalMinutes: z.number().int('Intervalo inválido.').min(0, 'Intervalo inválido.').max(120, 'O intervalo máximo é de 120 minutos.'),
})

export type SettingsInput = z.input<typeof settingsSchema>
export type WorkingHoursInput = z.input<typeof workingHoursSchema>

const DEFAULTS = {
  clinicName: 'LUME · Estética & Cuidado Integrado',
  professionalName: 'Profissional responsável',
}

export function createSettingsService({ store, clock }: Pick<ServiceDeps, 'store' | 'clock'>) {
  return {
    /** Configurações salvas, ou os padrões (sem gravar) quando ainda não configuradas. */
    async get(): Promise<ClinicSettings> {
      const saved = await store.settings.get(CLINIC_SETTINGS_ID)
      if (saved) return saved
      const now = clock.now().toISOString()
      return { id: CLINIC_SETTINGS_ID, ...DEFAULTS, createdAt: now, updatedAt: now }
    },

    async save(input: SettingsInput): Promise<ClinicSettings> {
      const data = parse(settingsSchema, input)
      return store.transaction(async () => {
        const now = clock.now().toISOString()
        const current = await store.settings.get(CLINIC_SETTINGS_ID)
        const settings: ClinicSettings = {
          ...current,
          id: CLINIC_SETTINGS_ID,
          ...data,
          createdAt: current?.createdAt ?? now,
          updatedAt: now,
        }
        await store.settings.save(settings)
        return settings
      })
    },

    async workingHours(): Promise<WorkingHours> {
      return structuredClone((await store.settings.get(CLINIC_SETTINGS_ID))?.workingHours ?? DEFAULT_WORKING_HOURS)
    },

    /** Vale para os próximos agendamentos; os já marcados não são alterados. */
    async saveWorkingHours(input: WorkingHoursInput): Promise<WorkingHours> {
      const workingHours = parse(workingHoursSchema, input)
      return store.transaction(async () => {
        const now = clock.now().toISOString()
        const current = await store.settings.get(CLINIC_SETTINGS_ID)
        const base = current ?? { id: CLINIC_SETTINGS_ID, ...DEFAULTS, createdAt: now }
        await store.settings.save({ ...base, workingHours, updatedAt: now })
        return workingHours
      })
    },
  }
}

export type SettingsService = ReturnType<typeof createSettingsService>
