import type {
  ActivityCategory,
  AppointmentStatus,
  ContractStatus,
  CouponChannel,
  IssuedCouponStatus,
  EntityName,
  EntryStatus,
  EntryType,
  Gender,
  ImageConsent,
  MaritalStatus,
  PaymentMethod,
} from '@/domain'

export type Tone = 'neutral' | 'lilac' | 'info' | 'success' | 'warning' | 'danger'

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  scheduled: { label: 'Agendado', tone: 'lilac' },
  confirmed: { label: 'Confirmado', tone: 'info' },
  completed: { label: 'Realizado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_show: { label: 'Faltou', tone: 'danger' },
}

export const ENTRY_STATUS: Record<EntryStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

export const ENTRY_TYPE: Record<EntryType, string> = { income: 'Receita', expense: 'Despesa' }

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  other: 'Outro',
}

export const GENDERS: Record<Gender, string> = {
  female: 'Feminino',
  male: 'Masculino',
  other: 'Outro',
  unspecified: 'Prefere não informar',
}

export const MARITAL_STATUS: Record<MaritalStatus, string> = {
  single: 'Solteira(o)',
  married: 'Casada(o)',
  stable_union: 'União estável',
  divorced: 'Divorciada(o)',
  widowed: 'Viúva(o)',
}

export const IMAGE_CONSENT: Record<ImageConsent['scope'], { label: string; description: string }> = {
  clinical: { label: 'Apenas prontuário', description: 'Fotos só para acompanhamento clínico' },
  clinical_and_marketing: { label: 'Prontuário e divulgação', description: 'Também em redes sociais e materiais da clínica' },
  denied: { label: 'Recusada', description: 'A paciente não autorizou o uso de imagem' },
}

export const ACTIVITY_CATEGORIES: Record<ActivityCategory, string> = {
  data: 'Dados',
  access: 'Acesso',
  navigation: 'Navegação',
  system: 'Sistema',
  error: 'Erros',
}

export const ENTITY_NAMES: Record<EntityName, string> = {
  patient: 'Paciente',
  procedure: 'Procedimento',
  appointment: 'Agendamento',
  consultation: 'Atendimento',
  prescription: 'Prescrição',
  financialEntry: 'Lançamento',
  settings: 'Configurações',
  assessment: 'Ficha',
  photo: 'Foto',
  package: 'Pacote',
  patientPackage: 'Pacote contratado',
  coupon: 'Cupom',
  issuedCoupon: 'Cupom emitido',
  scheduleBlock: 'Bloqueio de agenda',
}

export const CONTRACT_STATUS: Record<ContractStatus, { label: string; tone: Tone }> = {
  active: { label: 'Ativo', tone: 'success' },
  completed: { label: 'Concluído', tone: 'info' },
  expired: { label: 'Vencido', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

export const COUPON_STATUS: Record<IssuedCouponStatus, { label: string; tone: Tone }> = {
  available: { label: 'Disponível', tone: 'success' },
  redeemed: { label: 'Utilizado', tone: 'info' },
  expired: { label: 'Expirado', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

export const COUPON_CHANNELS: Record<CouponChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  in_person: 'Pessoalmente',
}

/** Rótulos legíveis dos campos que aparecem nos registros de alteração. */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  birthDate: 'Data de nascimento',
  cpf: 'CPF',
  gender: 'Gênero',
  phone: 'Telefone',
  email: 'E-mail',
  address: 'Endereço',
  city: 'Cidade',
  occupation: 'Profissão',
  referralSource: 'Como conheceu',
  notes: 'Observações',
  active: 'Ativo(a)',
  category: 'Categoria',
  description: 'Descrição',
  price: 'Valor',
  durationMinutes: 'Duração (min)',
  patientId: 'Paciente',
  start: 'Início',
  end: 'Término',
  items: 'Itens',
  status: 'Status',
  consultationId: 'Atendimento',
  appointmentId: 'Agendamento',
  date: 'Data',
  chiefComplaint: 'Queixa principal',
  assessment: 'Avaliação',
  evolution: 'Evolução',
  recommendations: 'Orientações',
  procedures: 'Procedimentos',
  financialEntryId: 'Cobrança',
  type: 'Tipo',
  amount: 'Valor',
  dueDate: 'Data/vencimento',
  paidAt: 'Pago em',
  method: 'Forma de pagamento',
  clinicName: 'Nome da clínica',
  professionalName: 'Profissional',
  professionalRegistry: 'Registro profissional',
  instagram: 'Instagram',
  rg: 'RG',
  maritalStatus: 'Estado civil',
  phoneAlt: 'Telefone alternativo',
  neighborhood: 'Bairro',
  state: 'UF',
  zipCode: 'CEP',
  anamnesisUpdatedAt: 'Anamnese atualizada em',
  'imageConsent.scope': 'Autorização de uso de imagem',
  'imageConsent.date': 'Data da autorização de imagem',
  sessionNumber: 'Nº da sessão',
  examination: 'Exame / análise',
  previousEvolution: 'Evolução desde a sessão anterior',
  equipment: 'Equipamento utilizado',
  activeIngredients: 'Ativos utilizados',
  intercurrences: 'Intercorrências',
  template: 'Modelo da ficha',
  takenAt: 'Data da foto',
  region: 'Área',
  caption: 'Legenda',
  discountPercent: 'Desconto (%)',
  validityDays: 'Prazo (dias)',
  issuableUntil: 'Pode ser enviado até',
  procedureIds: 'Procedimentos',
  code: 'Código',
  issuedAt: 'Enviado em',
  expiresAt: 'Validade',
  redeemedAt: 'Utilizado em',
  cancelledAt: 'Cancelado em',
  channel: 'Canal',
  coupon: 'Cupom',
  discount: 'Desconto',
  purchasedAt: 'Contratado em',
  fullPrice: 'Valor sem desconto',
  startDate: 'Data inicial',
  endDate: 'Data final',
  startTime: 'Horário inicial',
  endTime: 'Horário final',
  reason: 'Motivo',
  'workingHours.days': 'Horário de atendimento',
  'workingHours.intervalMinutes': 'Intervalo entre pacientes (min)',
}
