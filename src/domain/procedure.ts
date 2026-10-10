import type { Cents, Entity } from './shared'

/** Serviço do catálogo da clínica. */
export interface Procedure extends Entity {
  name: string
  category: string
  description?: string
  price: Cents
  durationMinutes: number
  active: boolean
}

export const PROCEDURE_CATEGORIES = [
  'Facial',
  'Corporal',
  'Injetáveis',
  'Capilar',
  'Terapias integrativas',
  'Bem-estar',
  'Avaliação',
] as const
