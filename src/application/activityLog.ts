import type {
  ActivityCategory,
  ActivityEntry,
  ActivityLevel,
  Appointment,
  Assessment,
  ClinicSettings,
  Consultation,
  Coupon,
  DataAction,
  EntityName,
  FieldChange,
  FinancialEntry,
  Id,
  IssuedCoupon,
  Package,
  Patient,
  PatientPackage,
  Photo,
  Prescription,
  Procedure,
  ScheduleBlock,
} from '@/domain'
import { ASSESSMENT_TEMPLATES, normalizeText } from '@/domain'
import { formatCentsBR, formatDateBR, formatDateTimeBR } from './dates'
import type { ActivityQuery, Clock, DataStore, IdGenerator, Repository } from './ports'

interface Described<T> {
  entity: EntityName
  noun: string | ((entity: T) => string)
  label(entity: T, store: DataStore): Promise<string>
}

const withPatient = async (store: DataStore, patientId: Id, rest: string) => {
  const patient = await store.patients.get(patientId)
  return patient ? `${patient.name} · ${rest}` : rest
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const DESCRIPTIONS = {
  patients: { entity: 'patient', noun: 'paciente', label: async (p) => p.name } as Described<Patient>,
  procedures: { entity: 'procedure', noun: 'procedimento', label: async (p) => p.name } as Described<Procedure>,
  appointments: {
    entity: 'appointment',
    noun: 'agendamento',
    label: (a, store) => withPatient(store, a.patientId, formatDateTimeBR(a.start)),
  } as Described<Appointment>,
  consultations: {
    entity: 'consultation',
    noun: 'atendimento',
    label: (c, store) => withPatient(store, c.patientId, formatDateTimeBR(c.date)),
  } as Described<Consultation>,
  prescriptions: {
    entity: 'prescription',
    noun: 'prescrição',
    label: (p, store) =>
      withPatient(store, p.patientId, `${formatDateBR(p.date)} · ${plural(p.items.length, 'item', 'itens')}`),
  } as Described<Prescription>,
  financialEntries: {
    entity: 'financialEntry',
    noun: 'lançamento',
    label: async (f) => `${f.description} · ${formatCentsBR(f.amount)}`,
  } as Described<FinancialEntry>,
  settings: {
    entity: 'settings',
    noun: 'configurações da clínica',
    label: async (s) => s.clinicName,
  } as Described<ClinicSettings>,
  assessments: {
    entity: 'assessment',
    noun: (a) => `ficha (${ASSESSMENT_TEMPLATES[a.template]?.title ?? a.template})`,
    label: (a, store) => withPatient(store, a.patientId, formatDateBR(a.date)),
  } as Described<Assessment>,
  packages: { entity: 'package', noun: 'pacote', label: async (p) => p.name } as Described<Package>,
  patientPackages: {
    entity: 'patientPackage',
    noun: 'pacote contratado',
    label: (p, store) => withPatient(store, p.patientId, `${p.name} · ${formatCentsBR(p.price)}`),
  } as Described<PatientPackage>,
  coupons: { entity: 'coupon', noun: 'cupom', label: async (c) => `${c.name} (${c.discountPercent}%)` } as Described<Coupon>,
  issuedCoupons: {
    entity: 'issuedCoupon',
    noun: 'cupom emitido',
    label: (c, store) => withPatient(store, c.patientId, `${c.code} · ${c.discountPercent}%`),
  } as Described<IssuedCoupon>,
  scheduleBlocks: {
    entity: 'scheduleBlock',
    noun: 'bloqueio de agenda',
    label: async (b) =>
      `${formatDateBR(b.startDate)}${b.endDate !== b.startDate ? ` a ${formatDateBR(b.endDate)}` : ''}${b.startTime ? ` · ${b.startTime}–${b.endTime}` : ' · dia inteiro'}${b.reason ? ` · ${b.reason}` : ''}`,
  } as Described<ScheduleBlock>,
  photos: {
    entity: 'photo',
    noun: 'foto',
    label: (p, store) => withPatient(store, p.patientId, [formatDateBR(p.takenAt), p.region].filter(Boolean).join(' · ')),
  } as Described<Photo>,
}

const VERBS: Record<DataAction, string> = { create: 'Cadastro de', update: 'Alteração de', delete: 'Exclusão de' }

const IGNORED_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isEmpty = (v: unknown) => v === undefined || v === null || v === ''

const same = (a: unknown, b: unknown) => (isEmpty(a) && isEmpty(b)) || JSON.stringify(a) === JSON.stringify(b)

/** Campos alterados entre duas versões de uma entidade (objetos aninhados são abertos em um nível). */
export function diffEntities(before: object, after: object): FieldChange[] {
  const a = before as Record<string, unknown>
  const b = after as Record<string, unknown>
  const changes: FieldChange[] = []
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (IGNORED_FIELDS.has(key)) continue
    if (isPlainObject(a[key]) || isPlainObject(b[key])) {
      const inner = { ...(a[key] as object) } as Record<string, unknown>
      const innerAfter = { ...(b[key] as object) } as Record<string, unknown>
      for (const k of new Set([...Object.keys(inner), ...Object.keys(innerAfter)])) {
        if (!same(inner[k], innerAfter[k])) changes.push({ field: `${key}.${k}`, from: inner[k] ?? null, to: innerAfter[k] ?? null })
      }
    } else if (!same(a[key], b[key])) {
      changes.push({ field: key, from: a[key] ?? null, to: b[key] ?? null })
    }
  }
  return changes
}

/**
 * Relógio estritamente crescente: registros gravados no mesmo milissegundo
 * (ex.: várias escritas de uma transação) mantêm a ordem em que aconteceram.
 */
export function monotonicClock(clock: Clock): Clock {
  let last = 0
  return {
    now() {
      last = Math.max(clock.now().getTime(), last + 1)
      return new Date(last)
    },
  }
}

/**
 * Decora o DataStore para que TODA escrita de dados gere um Registro de atividade,
 * na mesma transação da escrita. Nenhum serviço precisa lembrar de registrar.
 */
export function withActivityLog(store: DataStore, deps: { clock: Clock; newId: IdGenerator }): DataStore {
  const append = (entry: Omit<ActivityEntry, 'id' | 'timestamp' | 'level' | 'category'>) =>
    store.activity.append({
      id: deps.newId(),
      timestamp: deps.clock.now().toISOString(),
      level: 'info',
      category: 'data',
      ...entry,
    })

  function audited<T extends { id: Id }>(inner: Repository<T>, described: Described<T>): Repository<T> {
    const message = async (action: DataAction, entity: T) => {
      const noun = typeof described.noun === 'function' ? described.noun(entity) : described.noun
      return `${VERBS[action]} ${noun}: ${await described.label(entity, store)}`
    }
    return {
      ...inner,
      async save(entity) {
        const previous = await inner.get(entity.id)
        const changes = previous ? diffEntities(previous, entity) : undefined
        if (previous && changes!.length === 0) return
        await inner.save(entity)
        const action: DataAction = previous ? 'update' : 'create'
        await append({ action, entity: described.entity, entityId: entity.id, message: await message(action, entity), changes })
      },
      async remove(id) {
        const previous = await inner.get(id)
        if (!previous) return
        await inner.remove(id)
        await append({
          action: 'delete',
          entity: described.entity,
          entityId: id,
          message: await message('delete', previous),
          context: { snapshot: previous },
        })
      },
    }
  }

  return {
    ...store,
    patients: audited(store.patients, DESCRIPTIONS.patients),
    procedures: audited(store.procedures, DESCRIPTIONS.procedures),
    appointments: audited(store.appointments, DESCRIPTIONS.appointments),
    consultations: audited(store.consultations, DESCRIPTIONS.consultations),
    prescriptions: audited(store.prescriptions, DESCRIPTIONS.prescriptions),
    financialEntries: audited(store.financialEntries, DESCRIPTIONS.financialEntries),
    settings: audited(store.settings, DESCRIPTIONS.settings),
    assessments: audited(store.assessments, DESCRIPTIONS.assessments),
    photos: audited(store.photos, DESCRIPTIONS.photos),
    packages: audited(store.packages, DESCRIPTIONS.packages),
    patientPackages: audited(store.patientPackages, DESCRIPTIONS.patientPackages),
    coupons: audited(store.coupons, DESCRIPTIONS.coupons),
    issuedCoupons: audited(store.issuedCoupons, DESCRIPTIONS.issuedCoupons),
    scheduleBlocks: audited(store.scheduleBlocks, DESCRIPTIONS.scheduleBlocks),
    // `files` fica sem registro de propósito: o registro é feito na Foto (metadados), não no binário.
  }
}

export interface ActivityEvent {
  category: Exclude<ActivityCategory, 'data'>
  action: string
  message: string
  level?: ActivityLevel
  context?: Record<string, unknown>
}

export interface ActivitySearch extends ActivityQuery {
  search?: string
  level?: ActivityLevel
}

export function createActivityService({ store, clock, newId }: { store: DataStore; clock: Clock; newId: IdGenerator }) {
  const record = (event: ActivityEvent) =>
    store.activity.append({
      id: newId(),
      timestamp: clock.now().toISOString(),
      level: event.level ?? 'info',
      category: event.category,
      action: event.action,
      message: event.message,
      context: event.context,
    })

  return {
    /** Registra um evento que não é alteração de dados (navegação, sistema). */
    record,

    recordError(error: unknown, context?: Record<string, unknown>) {
      const err = error instanceof Error ? error : new Error(String(error))
      return record({
        category: 'error',
        level: 'error',
        action: err.name || 'Error',
        message: err.message || 'Erro desconhecido',
        context: { ...context, stack: err.stack?.split('\n').slice(0, 6).join('\n') },
      })
    },

    async query({ search, level, limit, ...query }: ActivitySearch = {}): Promise<ActivityEntry[]> {
      const needsFilter = Boolean(search || level)
      const entries = await store.activity.query({ ...query, limit: needsFilter ? undefined : limit })
      if (!needsFilter) return entries
      const term = search ? normalizeText(search) : ''
      const filtered = entries.filter(
        (e) =>
          (!level || e.level === level) &&
          (!term || normalizeText(`${e.message} ${e.action} ${JSON.stringify(e.context ?? {})}`).includes(term)),
      )
      return limit ? filtered.slice(0, limit) : filtered
    },
  }
}

export type ActivityService = ReturnType<typeof createActivityService>
