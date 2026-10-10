import type {
  ActivityCategory,
  ActivityEntry,
  Appointment,
  Assessment,
  ClinicSettings,
  Consultation,
  Coupon,
  EntityName,
  FinancialEntry,
  Id,
  ISODateTime,
  IssuedCoupon,
  Package,
  Patient,
  PatientPackage,
  Photo,
  ScheduleBlock,
  Prescription,
  Procedure,
} from '@/domain'

/**
 * Coleção de entidades persistidas.
 * Contrato: `save` faz upsert pelo `id`; `remove` de um id inexistente não falha;
 * `list`/`where` não garantem ordenação.
 */
export interface Repository<T extends { id: Id }> {
  get(id: Id): Promise<T | undefined>
  list(): Promise<T[]>
  where<K extends keyof T & string>(field: K, value: NonNullable<T[K]>): Promise<T[]>
  count(): Promise<number>
  save(entity: T): Promise<void>
  remove(id: Id): Promise<void>
}

/** Conteúdo binário (ex.: imagem). Guardado como ArrayBuffer para ser portável entre bancos. */
export interface StoredFile {
  id: Id
  type: string
  data: ArrayBuffer
}

export interface ActivityQuery {
  category?: ActivityCategory
  entity?: EntityName
  entityId?: Id
  from?: ISODateTime
  to?: ISODateTime
  limit?: number
}

/** Registros de atividade: só acrescenta, nunca altera. Consultas retornam os mais recentes primeiro. */
export interface ActivityStore {
  append(entry: ActivityEntry): Promise<void>
  query(query: ActivityQuery): Promise<ActivityEntry[]>
  count(): Promise<number>
}

export type Collection =
  | 'patients'
  | 'procedures'
  | 'appointments'
  | 'consultations'
  | 'prescriptions'
  | 'financialEntries'
  | 'settings'
  | 'assessments'
  | 'photos'
  | 'files'
  | 'packages'
  | 'patientPackages'
  | 'coupons'
  | 'issuedCoupons'
  | 'scheduleBlocks'
  | 'activity'

export const COLLECTIONS: readonly Collection[] = [
  'patients',
  'procedures',
  'appointments',
  'consultations',
  'prescriptions',
  'financialEntries',
  'settings',
  'assessments',
  'photos',
  'files',
  'packages',
  'patientPackages',
  'coupons',
  'issuedCoupons',
  'scheduleBlocks',
  'activity',
]

export interface Snapshot {
  patients: Patient[]
  procedures: Procedure[]
  appointments: Appointment[]
  consultations: Consultation[]
  prescriptions: Prescription[]
  financialEntries: FinancialEntry[]
  settings: ClinicSettings[]
  assessments: Assessment[]
  photos: Photo[]
  files: StoredFile[]
  packages: Package[]
  patientPackages: PatientPackage[]
  coupons: Coupon[]
  issuedCoupons: IssuedCoupon[]
  scheduleBlocks: ScheduleBlock[]
  activity: ActivityEntry[]
}

export type ChangeListener = (changed: ReadonlySet<Collection>) => void

/**
 * Seam de persistência. Hoje: IndexedDB (navegador) e memória (testes).
 * Para migrar para um banco remoto, basta um novo adapter que cumpra esta interface.
 */
export interface DataStore {
  patients: Repository<Patient>
  procedures: Repository<Procedure>
  appointments: Repository<Appointment>
  consultations: Repository<Consultation>
  prescriptions: Repository<Prescription>
  financialEntries: Repository<FinancialEntry>
  settings: Repository<ClinicSettings>
  assessments: Repository<Assessment>
  photos: Repository<Photo>
  /** Binários (imagens). Não use `list()` aqui — carrega todos os arquivos. */
  files: Repository<StoredFile>
  packages: Repository<Package>
  patientPackages: Repository<PatientPackage>
  coupons: Repository<Coupon>
  issuedCoupons: Repository<IssuedCoupon>
  scheduleBlocks: Repository<ScheduleBlock>
  activity: ActivityStore
  /**
   * Executa `work` atomicamente: ou todas as escritas são gravadas, ou nenhuma.
   * Dentro de `work`, só aguarde operações deste DataStore (o IndexedDB fecha a
   * transação se a execução esperar por qualquer outra promise).
   */
  transaction<T>(work: () => Promise<T>): Promise<T>
  /** Notifica após cada escrita efetivada (após o commit, quando dentro de transação). */
  subscribe(listener: ChangeListener): () => void
  dump(): Promise<Snapshot>
  /** `replace` apaga os dados (exceto registros de atividade) antes de carregar. */
  load(snapshot: Partial<Snapshot>, mode: 'merge' | 'replace'): Promise<void>
}

export interface Clock {
  now(): Date
}

export type IdGenerator = () => Id

export interface EncodedImage {
  type: string
  data: ArrayBuffer
}

export interface ProcessedImage {
  image: EncodedImage
  thumbnail: EncodedImage
  width: number
  height: number
}

/**
 * Prepara uma imagem enviada pela Profissional: corrige orientação, reduz para tamanho
 * de prontuário e gera miniatura. Lança `DomainError` se o arquivo não for uma imagem legível.
 */
export interface ImageProcessor {
  process(file: Blob): Promise<ProcessedImage>
}
