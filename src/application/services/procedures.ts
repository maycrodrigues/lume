import { z } from 'zod'
import type { Id, Procedure } from '@/domain'
import { normalizeText, NotFoundError } from '@/domain'
import { cents, optionalText, parse, requiredText } from '../validation'
import type { ServiceDeps } from './deps'

const procedureSchema = z.object({
  name: requiredText('Informe o nome do procedimento.'),
  category: requiredText('Informe a categoria.'),
  description: optionalText,
  price: cents,
  durationMinutes: z
    .number({ error: 'Informe a duração.' })
    .int('A duração deve ser em minutos inteiros.')
    .min(5, 'A duração mínima é de 5 minutos.')
    .max(600, 'A duração máxima é de 10 horas.'),
  active: z.boolean().default(true),
})

export type ProcedureInput = z.input<typeof procedureSchema>

export function createProcedureService({ store, clock, newId }: ServiceDeps) {
  async function get(id: Id): Promise<Procedure> {
    const procedure = await store.procedures.get(id)
    if (!procedure) throw new NotFoundError('Procedimento')
    return procedure
  }

  return {
    get,

    async list({ search, includeInactive = true }: { search?: string; includeInactive?: boolean } = {}) {
      const term = search ? normalizeText(search) : ''
      return (await store.procedures.list())
        .filter((p) => includeInactive || p.active)
        .filter((p) => !term || normalizeText(`${p.name} ${p.category} ${p.description ?? ''}`).includes(term))
        .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'))
    },

    async create(input: ProcedureInput): Promise<Procedure> {
      const data = parse(procedureSchema, input)
      const now = clock.now().toISOString()
      const procedure: Procedure = {
        id: newId(),
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        durationMinutes: data.durationMinutes,
        active: data.active,
        createdAt: now,
        updatedAt: now,
      }
      await store.procedures.save(procedure)
      return procedure
    },

    async update(id: Id, input: ProcedureInput): Promise<Procedure> {
      const data = parse(procedureSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        const updated: Procedure = { ...current, ...data, updatedAt: clock.now().toISOString() }
        await store.procedures.save(updated)
        return updated
      })
    },

    /** Seguro: Agendamentos e Atendimentos guardam cópia do nome e valor do procedimento. */
    async remove(id: Id): Promise<void> {
      await store.procedures.remove(id)
    },
  }
}

export type ProcedureService = ReturnType<typeof createProcedureService>
