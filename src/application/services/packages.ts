import { z } from 'zod'
import type { Cents, ContractStatus, ContractUsage, Id, ISODate, Package, PackagePricing, PatientPackage, FinancialEntry } from '@/domain'
import { contractStatus, contractUsage, DomainError, NotFoundError, packagePricing } from '@/domain'
import { addDaysISO, formatDateBR, toLocalISODate } from '../dates'
import type { DataStore } from '../ports'
import { optionalIsoDate, optionalPaymentMethod, optionalPositiveInt, optionalText, parse, requiredText } from '../validation'
import type { ServiceDeps } from './deps'

const percent = z
  .number({ error: 'Informe o desconto.' })
  .min(0, 'O desconto deve ficar entre 0% e 100%.')
  .max(100, 'O desconto deve ficar entre 0% e 100%.')

const packageSchema = z.object({
  name: requiredText('Informe o nome do pacote.'),
  description: optionalText,
  items: z
    .array(
      z.object({
        procedureId: z.string().min(1, 'Selecione o procedimento.'),
        quantity: z.number().int('Quantidade inválida.').min(1, 'A quantidade mínima é 1.').max(100, 'A quantidade máxima é 100.'),
      }),
    )
    .min(1, 'Inclua ao menos um procedimento no pacote.'),
  discountPercent: percent,
  validityDays: optionalPositiveInt,
  active: z.boolean().default(true),
})

const sellSchema = z.object({
  packageId: z.string().min(1, 'Selecione o pacote.'),
  patientId: z.string({ error: 'Selecione a paciente.' }).min(1, 'Selecione a paciente.'),
  discountPercent: percent.optional(),
  purchasedAt: optionalIsoDate,
  notes: optionalText,
  charge: z
    .object({ status: z.enum(['pending', 'paid']), method: optionalPaymentMethod, dueDate: optionalIsoDate })
    .optional(),
})

export type PackageInput = z.input<typeof packageSchema>
export type SellPackageInput = z.input<typeof sellSchema>

export interface PackageLine {
  procedureId: Id
  name: string
  unitPrice: Cents
  quantity: number
  /** Procedimento excluído do catálogo depois de entrar no pacote. */
  missing?: boolean
}

export interface PackageView extends Package {
  lines: PackageLine[]
  pricing: PackagePricing
}

export interface ContractView extends PatientPackage {
  usage: ContractUsage[]
  status: ContractStatus
  remainingSessions: number
}

export interface AvailableSession {
  patientPackageId: Id
  packageName: string
  procedureId: Id
  procedureName: string
  remaining: number
  expiresAt?: ISODate
}

/** Junta itens repetidos do mesmo procedimento. */
const mergeItems = (items: Array<{ procedureId: Id; quantity: number }>) => {
  const merged = new Map<Id, number>()
  items.forEach((i) => merged.set(i.procedureId, (merged.get(i.procedureId) ?? 0) + i.quantity))
  return [...merged].map(([procedureId, quantity]) => ({ procedureId, quantity }))
}

export async function contractViews(store: DataStore, patientId: Id, today: ISODate): Promise<ContractView[]> {
  const [contracts, consultations] = await Promise.all([store.patientPackages.where('patientId', patientId), store.consultations.where('patientId', patientId)])
  return contracts
    .map((contract) => {
      const usage = contractUsage(contract, consultations)
      return { ...contract, usage, status: contractStatus(contract, usage, today), remainingSessions: usage.reduce((s, u) => s + Math.max(u.remaining, 0), 0) }
    })
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt) || b.createdAt.localeCompare(a.createdAt))
}

/**
 * Confere se as linhas marcadas como sessão de pacote podem ser usadas: pacote da paciente,
 * ativo, dentro da validade, com o procedimento e com saldo (considerando as próprias linhas).
 */
export async function assertPackageSessions(
  store: DataStore,
  patientId: Id,
  lines: Array<{ procedureId: Id; patientPackageId?: Id }>,
  today: ISODate,
  ignoreConsultationId?: Id,
) {
  const requested = lines.filter((l) => l.patientPackageId)
  if (requested.length === 0) return
  const consultations = (await store.consultations.where('patientId', patientId)).filter((c) => c.id !== ignoreConsultationId)
  const pending = new Map<string, number>()
  for (const line of requested) {
    const contract = await store.patientPackages.get(line.patientPackageId!)
    if (!contract || contract.patientId !== patientId) throw new NotFoundError('Pacote contratado')
    if (contract.cancelledAt) throw new DomainError(`O pacote "${contract.name}" foi cancelado.`, 'package_cancelled')
    if (contract.expiresAt && contract.expiresAt < today) {
      throw new DomainError(`O pacote "${contract.name}" venceu em ${formatDateBR(contract.expiresAt)}.`, 'package_expired')
    }
    const usage = contractUsage(contract, consultations).find((u) => u.procedureId === line.procedureId)
    if (!usage) throw new DomainError(`O pacote "${contract.name}" não inclui este procedimento.`, 'package_item')
    const key = `${contract.id}:${line.procedureId}`
    const taken = (pending.get(key) ?? 0) + 1
    if (taken > usage.remaining) {
      throw new DomainError(`O pacote "${contract.name}" não tem mais sessões de ${usage.name}.`, 'package_exhausted')
    }
    pending.set(key, taken)
  }
}

export function createPackageService({ store, clock, newId }: ServiceDeps) {
  const today = () => toLocalISODate(clock.now())

  async function get(id: Id): Promise<Package> {
    const pkg = await store.packages.get(id)
    if (!pkg) throw new NotFoundError('Pacote')
    return pkg
  }

  async function toView(pkg: Package): Promise<PackageView> {
    const lines: PackageLine[] = []
    for (const item of pkg.items) {
      const procedure = await store.procedures.get(item.procedureId)
      lines.push({ procedureId: item.procedureId, name: procedure?.name ?? 'Procedimento removido', unitPrice: procedure?.price ?? 0, quantity: item.quantity, missing: !procedure })
    }
    return { ...pkg, lines, pricing: packagePricing(lines, pkg.discountPercent) }
  }

  async function assertProcedures(items: Array<{ procedureId: Id }>) {
    for (const item of items) if (!(await store.procedures.get(item.procedureId))) throw new NotFoundError('Procedimento')
  }

  return {
    get,

    async getView(id: Id): Promise<PackageView> {
      return toView(await get(id))
    },

    async list({ includeInactive = true }: { includeInactive?: boolean } = {}): Promise<PackageView[]> {
      const packages = (await store.packages.list()).filter((p) => includeInactive || p.active)
      const views = await Promise.all(packages.map(toView))
      return views.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR'))
    },

    async create(input: PackageInput): Promise<Package> {
      const data = parse(packageSchema, input)
      return store.transaction(async () => {
        await assertProcedures(data.items)
        const now = clock.now().toISOString()
        const pkg: Package = { id: newId(), ...data, items: mergeItems(data.items), createdAt: now, updatedAt: now }
        await store.packages.save(pkg)
        return pkg
      })
    },

    async update(id: Id, input: PackageInput): Promise<Package> {
      const data = parse(packageSchema, input)
      return store.transaction(async () => {
        const current = await get(id)
        await assertProcedures(data.items)
        const updated: Package = { ...current, ...data, items: mergeItems(data.items), updatedAt: clock.now().toISOString() }
        await store.packages.save(updated)
        return updated
      })
    },

    /** Seguro: pacotes contratados guardam cópia de nome, itens e valores. */
    async remove(id: Id): Promise<void> {
      await store.packages.remove(id)
    },

    /** Contrata o pacote para a paciente: congela itens e valores, define a validade e lança a cobrança. */
    async sell(input: SellPackageInput): Promise<PatientPackage> {
      const data = parse(sellSchema, input)
      return store.transaction(async () => {
        const pkg = await get(data.packageId)
        const patient = await store.patients.get(data.patientId)
        if (!patient) throw new NotFoundError('Paciente')
        const view = await toView(pkg)
        if (view.lines.some((l) => l.missing)) throw new DomainError('O pacote tem procedimento que não existe mais no catálogo. Edite o pacote antes de contratar.', 'package_missing')
        const discountPercent = data.discountPercent ?? pkg.discountPercent
        const pricing = packagePricing(view.lines, discountPercent)
        const purchasedAt = data.purchasedAt ?? today()
        const stamp = clock.now().toISOString()
        const contractId = newId()

        let entry: FinancialEntry | undefined
        if (data.charge && pricing.finalPrice > 0) {
          const paid = data.charge.status === 'paid'
          entry = {
            id: newId(),
            type: 'income',
            description: `Pacote ${pkg.name} · ${patient.name}`,
            category: 'Pacotes',
            amount: pricing.finalPrice,
            dueDate: data.charge.dueDate ?? purchasedAt,
            status: data.charge.status,
            paidAt: paid ? today() : undefined,
            method: paid ? data.charge.method : undefined,
            patientId: patient.id,
            createdAt: stamp,
            updatedAt: stamp,
          }
        }

        const contract: PatientPackage = {
          id: contractId,
          patientId: patient.id,
          packageId: pkg.id,
          name: pkg.name,
          items: view.lines.map((l) => ({ procedureId: l.procedureId, name: l.name, unitPrice: l.unitPrice, quantity: l.quantity })),
          fullPrice: pricing.fullPrice,
          discountPercent,
          price: pricing.finalPrice,
          purchasedAt,
          expiresAt: pkg.validityDays ? addDaysISO(purchasedAt, pkg.validityDays) : undefined,
          financialEntryId: entry?.id,
          notes: data.notes,
          createdAt: stamp,
          updatedAt: stamp,
        }
        await store.patientPackages.save(contract)
        if (entry) await store.financialEntries.save(entry)
        return contract
      })
    },

    contracts(patientId: Id): Promise<ContractView[]> {
      return contractViews(store, patientId, today())
    },

    /** Sessões que a paciente ainda pode usar hoje (pacotes ativos, dentro da validade). */
    async availableSessions(patientId: Id): Promise<AvailableSession[]> {
      return (await contractViews(store, patientId, today()))
        .filter((c) => c.status === 'active')
        .flatMap((c) =>
          c.usage
            .filter((u) => u.remaining > 0)
            .map((u) => ({ patientPackageId: c.id, packageName: c.name, procedureId: u.procedureId, procedureName: u.name, remaining: u.remaining, expiresAt: c.expiresAt })),
        )
    },

    /** Cancela o pacote: as sessões restantes deixam de valer. O financeiro não é alterado. */
    async cancelContract(id: Id): Promise<void> {
      await store.transaction(async () => {
        const contract = await store.patientPackages.get(id)
        if (!contract) throw new NotFoundError('Pacote contratado')
        await store.patientPackages.save({ ...contract, cancelledAt: clock.now().toISOString(), updatedAt: clock.now().toISOString() })
      })
    },

    /** Exclui um pacote contratado por engano: só sem sessões usadas; a cobrança pendente sai junto. */
    async removeContract(id: Id): Promise<void> {
      await store.transaction(async () => {
        const contract = await store.patientPackages.get(id)
        if (!contract) throw new NotFoundError('Pacote contratado')
        const consultations = await store.consultations.where('patientId', contract.patientId)
        if (contractUsage(contract, consultations).some((u) => u.used > 0)) {
          throw new DomainError('Este pacote já tem sessões usadas. Cancele em vez de excluir.', 'package_in_use')
        }
        const entry = contract.financialEntryId ? await store.financialEntries.get(contract.financialEntryId) : undefined
        if (entry && entry.status !== 'paid') await store.financialEntries.remove(entry.id)
        await store.patientPackages.remove(id)
      })
    },
  }
}

export type PackageService = ReturnType<typeof createPackageService>
