import { base, en, Faker, pt_BR } from '@faker-js/faker'
import type {
  Answers,
  Appointment,
  AppointmentItem,
  Assessment,
  Consultation,
  Coupon,
  FinancialEntry,
  Gender,
  IssuedCoupon,
  MaritalStatus,
  Package,
  Patient,
  PatientPackage,
  PaymentMethod,
  PerformedProcedure,
  Prescription,
  PrescriptionItem,
  Procedure,
  ScheduleBlock,
} from '@/domain'
import { blockRange, CONSULTATION_CHARGE_CATEGORY, couponDiscount, DEFAULT_WORKING_HOURS, minutesOf, packagePricing, SLOT_STEP_MINUTES } from '@/domain'
import { addDaysISO, toLocalISODate } from './dates'
import type { IdGenerator, Snapshot } from './ports'

/*
 * Dados de demonstração realistas (Faker pt-BR) que respeitam as mesmas regras da agenda:
 * horário de atendimento padrão, intervalo entre pacientes, bloqueios e saldo de pacotes.
 * Determinístico: a mesma data de referência gera sempre os mesmos dados.
 */

const HISTORY_DAYS = 150
const FUTURE_DAYS = 21
const PATIENT_COUNT = 24
const DAY_MS = 86_400_000

const PROCEDURES: Array<{ name: string; category: string; price: number; duration: number; description: string; weight: number }> = [
  { name: 'Avaliação integrativa', category: 'Avaliação', price: 15000, duration: 60, description: 'Anamnese completa, análise de pele e plano de cuidado personalizado.', weight: 0 },
  { name: 'Limpeza de pele profunda', category: 'Facial', price: 22000, duration: 90, description: 'Higienização, esfoliação, extração e máscara calmante.', weight: 9 },
  { name: 'Peeling de diamante', category: 'Facial', price: 18000, duration: 45, description: 'Microdermoabrasão para renovação celular.', weight: 5 },
  { name: 'Microagulhamento', category: 'Facial', price: 45000, duration: 60, description: 'Indução percutânea de colágeno com drug delivery.', weight: 4 },
  { name: 'Radiofrequência facial', category: 'Facial', price: 25000, duration: 50, description: 'Estímulo de colágeno e firmeza.', weight: 5 },
  { name: 'Drenagem linfática', category: 'Corporal', price: 16000, duration: 60, description: 'Técnica manual para redução de edema e retenção.', weight: 9 },
  { name: 'Toxina botulínica', category: 'Injetáveis', price: 120000, duration: 45, description: 'Aplicação em terço superior.', weight: 2 },
  { name: 'Bioestimulador de colágeno', category: 'Injetáveis', price: 180000, duration: 60, description: 'Ácido polilático para flacidez.', weight: 1 },
  { name: 'Auriculoterapia', category: 'Terapias integrativas', price: 9000, duration: 30, description: 'Equilíbrio emocional, ansiedade e sono.', weight: 4 },
  { name: 'Massagem relaxante', category: 'Bem-estar', price: 17000, duration: 60, description: 'Massagem com óleos essenciais.', weight: 6 },
]

const OCCUPATIONS = ['Advogada', 'Arquiteta', 'Professora', 'Enfermeira', 'Engenheira', 'Designer', 'Empresária', 'Psicóloga', 'Contadora', 'Jornalista', 'Analista de sistemas', 'Dentista', 'Farmacêutica', 'Publicitária', 'Administradora', 'Fisioterapeuta', 'Nutricionista', 'Corretora de imóveis']
const SP_NEIGHBORHOODS = ['Moema', 'Vila Mariana', 'Pinheiros', 'Perdizes', 'Tatuapé', 'Santana', 'Itaim Bibi', 'Brooklin', 'Vila Madalena', 'Mooca', 'Jardins', 'Aclimação', 'Saúde', 'Lapa']
const NEARBY_CITIES = ['Santo André', 'São Bernardo do Campo', 'Guarulhos', 'Osasco', 'Barueri', 'São Caetano do Sul']
// A lista de sobrenomes do Faker pt-BR é curta; misturamos com sobrenomes comuns para variar mais.
const SURNAMES = ['Almeida', 'Andrade', 'Barbosa', 'Cardoso', 'Carvalho', 'Castro', 'Correia', 'Cunha', 'Dias', 'Fernandes', 'Freitas', 'Gomes', 'Lima', 'Lopes', 'Machado', 'Martins', 'Mendes', 'Monteiro', 'Nascimento', 'Nunes', 'Pereira', 'Pinto', 'Ribeiro', 'Rocha', 'Rodrigues', 'Teixeira', 'Vieira']
const DDDS = ['11', '11', '11', '11', '11', '12', '13', '19']
const EMAIL_PROVIDERS = ['gmail.com', 'gmail.com', 'gmail.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'yahoo.com.br']

const COMPLAINTS = ['Manchas e textura irregular na região malar', 'Pele sem viço e com aspecto cansado', 'Inchaço nas pernas ao final do dia', 'Linhas de expressão na testa e glabela', 'Ansiedade e dificuldade para dormir', 'Flacidez leve no contorno facial', 'Acne e poros dilatados na zona T', 'Celulite e retenção de líquido nos glúteos']
const GOALS = ['Uniformizar o tom da pele', 'Prevenção do envelhecimento', 'Reduzir medidas e inchaço', 'Bem-estar e redução do estresse', 'Pele mais firme e luminosa', 'Controlar a oleosidade']
const EVOLUTIONS = ['Procedimento realizado sem intercorrências. Pele respondeu bem, leve eritema esperado.', 'Boa evolução em relação à sessão anterior; textura mais uniforme.', 'Paciente relatou conforto durante todo o procedimento. Orientada sobre cuidados pós.', 'Redução visível de edema. Paciente relata melhora na disposição.', 'Sessão concluída conforme plano. Reavaliar em 15 dias.', 'Pele mais hidratada e luminosa; manter protocolo.']
const PREVIOUS_EVOLUTIONS = ['Relata melhora da textura desde a última sessão.', 'Sem queixas após a sessão anterior.', 'Leve sensibilidade nos dois primeiros dias, resolvida espontaneamente.', 'Percebeu redução do inchaço ao longo da semana.']
const RECOMMENDATIONS = ['Evitar exposição solar por 48h e usar protetor FPS 50.', 'Manter hidratação e beber 2 litros de água por dia.', 'Não usar ácidos por 5 dias. Retorno em 15 dias.', 'Evitar atividade física intensa nas próximas 24h.']
const EQUIPMENT: Record<string, string> = {
  Avaliação: 'Lupa com luz e lâmpada de Wood',
  Facial: 'Alta frequência e vapor de ozônio',
  Corporal: 'Manual',
  Injetáveis: 'Seringa e agulha 30G',
  'Terapias integrativas': 'Sementes de mostarda e cristais',
  'Bem-estar': 'Manual',
}
const ACTIVES: Record<string, string | undefined> = {
  Facial: 'Ácido hialurônico, vitamina C e niacinamida',
  Corporal: 'Óleo de semente de uva',
  Injetáveis: 'Produto conforme ficha de harmonização',
  'Bem-estar': 'Óleos essenciais de lavanda e laranja-doce',
}
const HOME_CARE: PrescriptionItem[][] = [
  [
    { name: 'Protetor solar FPS 50 com cor', instructions: 'Aplicar pela manhã e reaplicar a cada 3 horas.' },
    { name: 'Sérum de vitamina C 15%', dosage: '5 gotas', instructions: 'Aplicar pela manhã, antes do protetor solar.' },
  ],
  [
    { name: 'Gel de limpeza suave', instructions: 'Lavar o rosto manhã e noite.' },
    { name: 'Hidratante com ácido hialurônico', instructions: 'Aplicar à noite após a limpeza.' },
  ],
  [
    { name: 'Água', dosage: '2 litros/dia', instructions: 'Distribuir ao longo do dia.' },
    { name: 'Chá de camomila', dosage: '1 xícara', instructions: 'Tomar 30 minutos antes de dormir.' },
  ],
]
const METHODS: PaymentMethod[] = ['pix', 'pix', 'pix', 'credit_card', 'credit_card', 'debit_card', 'cash']
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** CPF fictício com dígitos verificadores válidos. */
function fakeCpf(faker: Faker): string {
  const digits = faker.string.numeric({ length: 9, allowLeadingZeros: true }).split('').map(Number)
  const check = (length: number) => {
    const sum = digits.slice(0, length).reduce((s, d, i) => s + d * (length + 1 - i), 0)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  digits.push(check(9))
  digits.push(check(10))
  return digits.join('')
}

const emailPart = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

export function buildDemoSnapshot(now: Date, newId: IdGenerator): Partial<Snapshot> {
  const faker = new Faker({ locale: [pt_BR, en, base] })
  faker.seed(20261010)
  const pick = <T>(list: readonly T[]) => faker.helpers.arrayElement(list)
  const chance = (probability: number) => faker.datatype.boolean({ probability })
  const day = (offset: number, hour = 0, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute)
  const stamp = (date: Date) => {
    const iso = new Date(Math.min(date.getTime(), now.getTime())).toISOString()
    return { createdAt: iso, updatedAt: iso }
  }
  const hours = DEFAULT_WORKING_HOURS
  /** Próximo dia útil (segunda a sexta) a partir do deslocamento informado. */
  const weekdayFrom = (offset: number) => {
    let o = offset
    while (!hours.days[day(o).getDay()].open || day(o).getDay() === 6) o++
    return o
  }

  // ── Catálogo ────────────────────────────────────────────────────────────
  const procedures: Procedure[] = PROCEDURES.map((p) => ({
    id: newId(),
    name: p.name,
    category: p.category,
    price: p.price,
    durationMinutes: p.duration,
    description: p.description,
    active: true,
    ...stamp(day(-HISTORY_DAYS - 30, 9)),
  }))
  const procedure = (name: string) => procedures.find((p) => p.name === name)!
  const categoryOf = (procedureId: string) => procedures.find((p) => p.id === procedureId)!.category
  const weighted = PROCEDURES.filter((p) => p.weight > 0).map((p) => ({ value: procedure(p.name), weight: p.weight }))

  // ── Pacientes ───────────────────────────────────────────────────────────
  const cpfs = new Set<string>()
  const patients: Patient[] = Array.from({ length: PATIENT_COUNT }, (_, i) => {
    const sex = chance(0.86) ? ('female' as const) : ('male' as const)
    const gender: Gender = sex
    const firstName = faker.person.firstName(sex)
    const surname = () => (chance(0.5) ? faker.person.lastName() : pick(SURNAMES))
    let lastName = `${surname()} ${surname()}`
    while (new Set(lastName.split(' ')).size < 2) lastName = `${surname()} ${surname()}`
    let cpf = fakeCpf(faker)
    while (cpfs.has(cpf)) cpf = fakeCpf(faker)
    cpfs.add(cpf)
    const inCapital = chance(0.72)
    // Cadastros espalhados pelo histórico: os primeiros são os mais antigos.
    const createdAt = day(-HISTORY_DAYS + Math.round((i / (PATIENT_COUNT - 1)) * (HISTORY_DAYS - 3)), 9, 30)
    const registeredOn = toLocalISODate(createdAt)
    return {
      id: newId(),
      name: `${firstName} ${lastName}`,
      birthDate: toLocalISODate(faker.date.birthdate({ mode: 'age', min: 22, max: 66, refDate: now })),
      cpf,
      rg: `${faker.string.numeric(2)}.${faker.string.numeric(3)}.${faker.string.numeric(3)}-${faker.string.numeric(1)}`,
      gender,
      maritalStatus: faker.helpers.weightedArrayElement<MaritalStatus>([
        { value: 'married', weight: 5 },
        { value: 'single', weight: 4 },
        { value: 'stable_union', weight: 2 },
        { value: 'divorced', weight: 1 },
      ]),
      phone: `(${pick(DDDS)}) 9${faker.string.numeric(4)}-${faker.string.numeric(4)}`,
      email: `${emailPart(firstName)}.${emailPart(lastName.split(' ')[0])}${faker.number.int({ min: 1, max: 99 })}@${pick(EMAIL_PROVIDERS)}`,
      address: `${faker.location.street()}, ${faker.number.int({ min: 12, max: 2400 })}`,
      neighborhood: inCapital ? pick(SP_NEIGHBORHOODS) : 'Centro',
      city: inCapital ? 'São Paulo' : pick(NEARBY_CITIES),
      state: 'SP',
      zipCode: `0${faker.number.int(inCapital ? { min: 1000, max: 5999 } : { min: 6000, max: 9999 })}-${faker.string.numeric(3)}`,
      occupation: sex === 'female' ? pick(OCCUPATIONS) : pick(['Engenheiro', 'Advogado', 'Empresário', 'Professor', 'Analista de sistemas']),
      referralSource: faker.helpers.weightedArrayElement([
        { value: 'Instagram', weight: 5 },
        { value: 'Indicação', weight: 5 },
        { value: 'Google', weight: 2 },
        { value: 'Passou em frente', weight: 1 },
      ]),
      active: true,
      anamnesis: demoAnamnesis(faker, gender, registeredOn),
      anamnesisUpdatedAt: createdAt.toISOString(),
      imageConsent: chance(0.85) ? { scope: chance(0.75) ? 'clinical' : 'clinical_and_marketing', date: registeredOn } : undefined,
      ...stamp(createdAt),
    }
  })

  // ── Bloqueios de agenda ─────────────────────────────────────────────────
  const holiday = toLocalISODate(day(weekdayFrom(16)))
  const course = toLocalISODate(day(weekdayFrom(8)))
  const scheduleBlocks: ScheduleBlock[] = [
    { id: newId(), startDate: holiday, endDate: holiday, reason: 'Feriado municipal', ...stamp(day(-10, 18)) },
    { id: newId(), startDate: course, endDate: course, startTime: '13:00', endTime: '15:00', reason: 'Curso de atualização', ...stamp(day(-10, 18)) },
  ]

  // ── Agenda montada com as mesmas regras do sistema ──────────────────────
  type Booking = { startMin: number; endMin: number; patientId: string }
  const bookedByDay = new Map<string, Booking[]>()

  /** Inícios livres no dia: dentro do horário, fora de bloqueios e com intervalo entre pacientes diferentes. */
  const freeStarts = (date: Date, duration: number, patient: Patient) => {
    const dayHours = hours.days[date.getDay()]
    if (!dayHours.open) return []
    const iso = toLocalISODate(date)
    const blocked = scheduleBlocks.flatMap((b) => blockRange(b, iso) ?? [])
    const booked = bookedByDay.get(iso) ?? []
    const registered = new Date(patient.createdAt).getTime()
    const starts: number[] = []
    for (let m = minutesOf(dayHours.start); m + duration <= minutesOf(dayHours.end); m += SLOT_STEP_MINUTES) {
      if (new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, m).getTime() < registered) continue
      if (blocked.some((r) => m < r.end && r.start < m + duration)) continue
      const clash = booked.some((b) => {
        const gap = b.patientId === patient.id ? 0 : hours.intervalMinutes
        return m < b.endMin + gap && b.startMin < m + duration + gap
      })
      if (!clash) starts.push(m)
    }
    return starts
  }

  const appointments: Appointment[] = []
  const book = (date: Date, startMin: number, patient: Patient, items: AppointmentItem[], notes?: string) => {
    const duration = items.reduce((s, i) => s + i.durationMinutes, 0)
    const iso = toLocalISODate(date)
    bookedByDay.set(iso, [...(bookedByDay.get(iso) ?? []), { startMin, endMin: startMin + duration, patientId: patient.id }])
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, startMin)
    const end = new Date(start.getTime() + duration * 60_000)
    const roll = faker.number.float({ min: 0, max: 1 })
    const status: Appointment['status'] =
      end < now
        ? roll < 0.06 ? 'no_show' : roll < 0.13 ? 'cancelled' : 'completed'
        : roll < 0.05 ? 'cancelled' : start.getTime() - now.getTime() < 3 * DAY_MS && roll < 0.75 ? 'confirmed' : 'scheduled'
    const appointment: Appointment = {
      id: newId(),
      patientId: patient.id,
      start: start.toISOString(),
      end: end.toISOString(),
      items,
      status,
      notes,
      ...stamp(new Date(Math.max(start.getTime() - 7 * DAY_MS, new Date(patient.createdAt).getTime()))),
    }
    appointments.push(appointment)
    return appointment
  }
  const itemOf = (p: Procedure): AppointmentItem => ({ procedureId: p.id, name: p.name, price: p.price, durationMinutes: p.durationMinutes })

  // Pacote contratado: drenagens semanais, algumas já feitas e outras agendadas.
  const packageClient = patients[3]
  const drenagem = procedure('Drenagem linfática')
  const packageAppointments = new Set<string>()
  for (let week = 0; week < 7; week++) {
    const date = day(weekdayFrom(-34 + week * 7))
    const starts = freeStarts(date, drenagem.durationMinutes, packageClient)
    if (starts.length === 0) continue
    const appointment = book(date, starts[0], packageClient, [itemOf(drenagem)], 'Sessão do pacote Detox corporal')
    if (appointment.status === 'cancelled' || appointment.status === 'no_show') appointment.status = new Date(appointment.end) < now ? 'completed' : 'confirmed'
    packageAppointments.add(appointment.id)
  }

  // Demais atendimentos; a primeira visita de cada paciente é a avaliação integrativa.
  const evaluated = new Set<string>([packageClient.id])
  for (let offset = -HISTORY_DAYS; offset <= FUTURE_DAYS; offset++) {
    const date = day(offset)
    if (!hours.days[date.getDay()].open) continue
    const target = offset === 0 ? 4 : date.getDay() === 6 ? faker.number.int({ min: 0, max: 2 }) : faker.number.int({ min: 1, max: 5 })
    for (let n = 0; n < target; n++) {
      const eligible = patients.filter((p) => new Date(p.createdAt) < day(offset + 1))
      if (eligible.length === 0) break
      const patient = pick(eligible)
      const main = evaluated.has(patient.id) ? faker.helpers.weightedArrayElement(weighted) : procedure('Avaliação integrativa')
      const items = [itemOf(main)]
      if (main.durationMinutes <= 60 && main.name !== 'Auriculoterapia' && chance(0.15)) items.push(itemOf(procedure('Auriculoterapia')))
      const starts = freeStarts(date, items.reduce((s, i) => s + i.durationMinutes, 0), patient)
      if (starts.length === 0) continue
      book(date, pick(starts), patient, items)
      evaluated.add(patient.id)
    }
  }
  appointments.sort((a, b) => a.start.localeCompare(b.start))

  // ── Pacotes ─────────────────────────────────────────────────────────────
  const packagesStamp = stamp(day(-HISTORY_DAYS, 9))
  const packages: Package[] = [
    {
      id: newId(),
      name: 'Detox corporal',
      description: 'Drenagem linfática semanal com massagem relaxante para fechar o ciclo.',
      items: [{ procedureId: drenagem.id, quantity: 8 }, { procedureId: procedure('Massagem relaxante').id, quantity: 2 }],
      discountPercent: 15,
      validityDays: 90,
      active: true,
      ...packagesStamp,
    },
    {
      id: newId(),
      name: 'Pele radiante',
      description: 'Avaliação, limpezas e peelings intercalados para uniformizar e iluminar.',
      items: [
        { procedureId: procedure('Avaliação integrativa').id, quantity: 1 },
        { procedureId: procedure('Limpeza de pele profunda').id, quantity: 3 },
        { procedureId: procedure('Peeling de diamante').id, quantity: 3 },
      ],
      discountPercent: 10,
      validityDays: 120,
      active: true,
      ...packagesStamp,
    },
    {
      id: newId(),
      name: 'Equilíbrio integrativo',
      description: 'Massagens e auriculoterapia para sono, ansiedade e bem-estar.',
      items: [{ procedureId: procedure('Massagem relaxante').id, quantity: 4 }, { procedureId: procedure('Auriculoterapia').id, quantity: 4 }],
      discountPercent: 12,
      validityDays: 60,
      active: true,
      ...packagesStamp,
    },
  ]
  const detox = packages[0]
  const detoxLines = detox.items.map((i) => {
    const p = procedures.find((x) => x.id === i.procedureId)!
    return { procedureId: p.id, name: p.name, unitPrice: p.price, quantity: i.quantity }
  })
  const detoxPricing = packagePricing(detoxLines, detox.discountPercent)
  const contractDate = toLocalISODate(day(-36))
  const contractEntryId = newId()
  const contract: PatientPackage = {
    id: newId(),
    patientId: packageClient.id,
    packageId: detox.id,
    name: detox.name,
    items: detoxLines,
    fullPrice: detoxPricing.fullPrice,
    discountPercent: detox.discountPercent,
    price: detoxPricing.finalPrice,
    purchasedAt: contractDate,
    expiresAt: addDaysISO(contractDate, detox.validityDays!),
    financialEntryId: contractEntryId,
    notes: 'Parcelado em 3× no cartão.',
    ...stamp(day(-36, 17)),
  }

  // ── Atendimentos, cobranças e prescrições ───────────────────────────────
  const consultations: Consultation[] = []
  const prescriptions: Prescription[] = []
  const financialEntries: FinancialEntry[] = [
    {
      id: contractEntryId,
      type: 'income',
      description: `Pacote ${detox.name} · ${packageClient.name}`,
      category: 'Pacotes',
      amount: detoxPricing.finalPrice,
      dueDate: contractDate,
      status: 'paid',
      paidAt: contractDate,
      method: 'credit_card',
      patientId: packageClient.id,
      ...stamp(day(-36, 17)),
    },
  ]
  const sessions = new Map<string, number>()

  for (const appointment of appointments.filter((a) => a.status === 'completed')) {
    const patient = patients.find((p) => p.id === appointment.patientId)!
    const consultationId = newId()
    const fromPackage = packageAppointments.has(appointment.id)
    const performed: PerformedProcedure[] = appointment.items.map((i) => ({
      procedureId: i.procedureId,
      name: i.name,
      price: fromPackage ? 0 : i.price,
      patientPackageId: fromPackage ? contract.id : undefined,
    }))
    const key = `${patient.id}:${appointment.items[0].procedureId}`
    const session = (sessions.get(key) ?? 0) + 1
    sessions.set(key, session)
    const category = categoryOf(appointment.items[0].procedureId)
    const end = new Date(appointment.end)
    const total = performed.reduce((s, p) => s + p.price, 0)

    let financialEntryId: string | undefined
    if (total > 0) {
      const paid = now.getTime() - end.getTime() > 4 * DAY_MS || chance(0.6)
      financialEntryId = newId()
      financialEntries.push({
        id: financialEntryId,
        type: 'income',
        description: `Atendimento · ${patient.name}`,
        category: CONSULTATION_CHARGE_CATEGORY,
        amount: total,
        dueDate: toLocalISODate(end),
        status: paid ? 'paid' : 'pending',
        paidAt: paid ? toLocalISODate(end) : undefined,
        method: paid ? pick(METHODS) : undefined,
        patientId: patient.id,
        consultationId,
        ...stamp(end),
      })
    }

    const firstVisit = category === 'Avaliação'
    consultations.push({
      id: consultationId,
      patientId: patient.id,
      appointmentId: appointment.id,
      date: appointment.start,
      sessionNumber: firstVisit ? undefined : session,
      chiefComplaint: firstVisit ? String(patient.anamnesis.complaint) : undefined,
      examination: firstVisit ? 'Avaliação conforme ficha; fototipo, biotipo e plano de cuidado registrados.' : undefined,
      previousEvolution: session > 1 ? pick(PREVIOUS_EVOLUTIONS) : undefined,
      evolution: pick(EVOLUTIONS),
      equipment: EQUIPMENT[category],
      activeIngredients: ACTIVES[category],
      intercurrences: chance(0.04) ? 'Eritema leve e transitório, resolvido com compressa fria.' : undefined,
      recommendations: pick(RECOMMENDATIONS),
      procedures: performed,
      financialEntryId,
      ...stamp(end),
    })
    appointment.consultationId = consultationId

    if ((category === 'Facial' || firstVisit) && chance(0.45)) {
      prescriptions.push({ id: newId(), patientId: patient.id, consultationId, date: toLocalISODate(end), items: pick(HOME_CARE), ...stamp(end) })
    }
  }

  // ── Despesas mensais ────────────────────────────────────────────────────
  const supplier = faker.company.name()
  const expenses: Array<[string, string, number, number, PaymentMethod]> = [
    ['Aluguel da sala', 'Aluguel', 280000, 5, 'bank_transfer'],
    ['Energia e internet', 'Contas (água, luz, internet)', 38000, 10, 'boleto'],
    [`Reposição de insumos · ${supplier}`, 'Insumos', 120000, 12, 'pix'],
    ['Impulsionamento Instagram', 'Marketing', 45000, 20, 'credit_card'],
    ['Simples Nacional', 'Impostos', 65000, 20, 'boleto'],
    ['Honorários do contador', 'Outras despesas', 35000, 25, 'pix'],
  ]
  for (let back = 5; back >= -1; back--) {
    for (const [description, category, amount, dueDay, method] of expenses) {
      const due = new Date(now.getFullYear(), now.getMonth() - back, dueDay)
      const paid = due <= now
      financialEntries.push({
        id: newId(),
        type: 'expense',
        description,
        category,
        amount: amount + faker.number.int({ min: 0, max: 8 }) * 1000,
        dueDate: toLocalISODate(due),
        status: paid ? 'paid' : 'pending',
        paidAt: paid ? toLocalISODate(due) : undefined,
        method: paid ? method : undefined,
        ...stamp(due),
      })
    }
  }

  // ── Cupons ──────────────────────────────────────────────────────────────
  const couponsStamp = stamp(day(-90, 9))
  const coupons: Coupon[] = [
    { id: newId(), name: 'Primeira visita', description: 'Boas-vindas para novas pacientes.', discountPercent: 10, validityDays: 30, procedureIds: [], active: true, ...couponsStamp },
    { id: newId(), name: 'Mês do aniversário', description: 'Enviado no início do mês de aniversário.', discountPercent: 15, validityDays: 30, procedureIds: [], active: true, ...couponsStamp },
    {
      id: newId(),
      name: 'Indicação de amiga',
      description: 'Para quem indicou uma nova paciente.',
      discountPercent: 10,
      validityDays: 45,
      procedureIds: [procedure('Limpeza de pele profunda').id, drenagem.id],
      active: true,
      ...couponsStamp,
    },
  ]
  const codes = new Set<string>()
  const issue = (coupon: Coupon, patient: Patient, issuedOn: Date): IssuedCoupon => {
    let code = `LUME-${faker.string.fromCharacters(CODE_ALPHABET, 6)}`
    while (codes.has(code)) code = `LUME-${faker.string.fromCharacters(CODE_ALPHABET, 6)}`
    codes.add(code)
    const issuedAt = toLocalISODate(issuedOn)
    return {
      id: newId(),
      couponId: coupon.id,
      patientId: patient.id,
      code,
      name: coupon.name,
      discountPercent: coupon.discountPercent,
      procedureIds: coupon.procedureIds,
      issuedAt,
      expiresAt: addDaysISO(issuedAt, coupon.validityDays),
      channel: pick(['whatsapp', 'whatsapp', 'email', 'in_person'] as const),
      ...stamp(new Date(issuedOn.getFullYear(), issuedOn.getMonth(), issuedOn.getDate(), 18)),
    }
  }
  const newest = patients[PATIENT_COUNT - 1]
  const issuedCoupons: IssuedCoupon[] = [
    issue(coupons[1], patients[0], day(-4)),
    issue(coupons[0], newest, day(-2)),
    issue(coupons[2], patients[5], day(-12)),
    issue(coupons[0], patients[8], day(-50)), // não usado: já expirou
  ]

  // Cupom já usado: enviado alguns dias antes de um atendimento avulso recente e aplicado nele.
  const recent = consultations.filter(
    (c) => c.financialEntryId && c.procedures.every((p) => !p.patientPackageId) && now.getTime() - new Date(c.date).getTime() < 25 * DAY_MS,
  )
  const target = recent.length ? pick(recent) : consultations.findLast((c) => c.financialEntryId)
  if (target) {
    const when = new Date(target.date)
    const redeemed = issue(coupons[1], patients.find((p) => p.id === target.patientId)!, new Date(when.getFullYear(), when.getMonth(), when.getDate() - 6))
    const { discount } = couponDiscount(redeemed, target.procedures)
    target.coupon = { issuedCouponId: redeemed.id, code: redeemed.code, discountPercent: redeemed.discountPercent }
    target.discount = discount
    const entry = financialEntries.find((e) => e.id === target.financialEntryId)!
    entry.amount -= discount
    entry.description = `${entry.description} · cupom ${redeemed.code}`
    redeemed.redeemedAt = target.date
    redeemed.consultationId = target.id
    issuedCoupons.push(redeemed)
  }

  // ── Fichas de avaliação ─────────────────────────────────────────────────
  const assessments: Assessment[] = []
  for (const patient of patients.slice(0, 14)) {
    const first = consultations.find((c) => c.patientId === patient.id)
    if (!first) continue
    assessments.push({
      id: newId(),
      patientId: patient.id,
      template: 'facial',
      date: toLocalISODate(new Date(first.date)),
      consultationId: first.id,
      answers: {
        facial_fitzpatrick: pick(['II', 'III', 'III', 'IV', 'V']),
        facial_biotype: pick(['Eudérmica', 'Lipídica', 'Alípica', 'Mista']),
        facial_ostia: pick(['Dilatados na zona T', 'Dilatados em toda a face', 'Contraídos']),
        facial_state: { values: faker.helpers.arrayElements(['Normal', 'Desidratado', 'Sensibilizado', 'Acneico', 'Seborreico'], { min: 1, max: 2 }) },
        facial_involution: { values: faker.helpers.arrayElements(['Linhas', 'Sulcos', 'Rugas'], { min: 1, max: 2 }) },
        facial_glogau: pick(['I', 'II', 'III']),
        facial_pigmentation: { values: faker.helpers.arrayElements(['Efélides', 'Melanose', 'Hipercromia', 'Melanose solar'], { min: 0, max: 2 }) },
      },
      ...stamp(new Date(first.updatedAt)),
    })
  }
  ;[packageClient, patients[1], patients[4]].forEach((patient, i) => {
    for (let n = 0; n < 3; n++) {
      const date = day(weekdayFrom(-75 + n * 30), 10)
      if (date < new Date(patient.createdAt)) continue
      const loss = n * (1.2 + i * 0.5)
      assessments.push({
        id: newId(),
        patientId: patient.id,
        template: 'body',
        date: toLocalISODate(date),
        answers: {
          body_weight: Math.round((66 + i * 5 - loss) * 10) / 10,
          body_height: 160 + i * 4,
          body_hldgType: 'Edematosa',
          body_hldgGrade: n < 2 ? 'II' : 'I',
          body_perimetry: {
            Cintura: { ref: Math.round((78 + i * 4 - loss) * 10) / 10 },
            Quadril: { ref: Math.round((101 + i * 3 - loss * 0.8) * 10) / 10 },
            'Abdômen / flanco': { plus5: 88 + i * 3 - loss, ref: 90 + i * 3 - loss, minus5: 92 + i * 3 - loss },
          },
        },
        ...stamp(date),
      })
    }
  })

  return {
    procedures,
    patients,
    appointments,
    consultations,
    prescriptions,
    financialEntries,
    assessments,
    packages,
    patientPackages: [contract],
    coupons,
    issuedCoupons,
    scheduleBlocks,
  }
}

function demoAnamnesis(faker: Faker, gender: Gender, declarationDate: string): Answers {
  const pick = <T>(list: readonly T[]) => faker.helpers.arrayElement(list)
  const yesNo = (probability: number, detail?: () => string) =>
    faker.datatype.boolean({ probability }) ? { yes: true, ...(detail ? { detail: detail() } : {}) } : { yes: false }
  const answers: Answers = {
    complaint: pick(COMPLAINTS),
    complaintDuration: pick(['3 meses', '6 meses', '1 ano', 'Mais de 2 anos']),
    goals: pick(GOALS),
    cosmetics: yesNo(0.8, () => pick(['Hidratante e protetor solar', 'Sérum de vitamina C', 'Ácido glicólico à noite', 'Apenas sabonete'])),
    sunExposure: yesNo(0.4, () => pick(['Fins de semana, cerca de 2h', 'Diariamente no trajeto', 'Praia nas férias'])),
    sunscreen: yesNo(0.7, () => pick(['Diariamente, FPS 50', 'Só quando vai à praia', 'FPS 30 pela manhã'])),
    smoking: yesNo(0.06, () => pick(['5 cigarros por dia', '10 cigarros por dia'])),
    alcohol: yesNo(0.5, () => pick(['Socialmente, fins de semana', '1 taça de vinho por dia'])),
    physicalActivity: yesNo(0.6, () => pick(['Pilates 2x/semana', 'Caminhada diária', 'Musculação 3x/semana', 'Yoga 1x/semana'])),
    waterIntake: faker.number.int({ min: 3, max: 10 }),
    sleepHours: faker.number.int({ min: 5, max: 8 }),
    sleepQuality: pick(['Boa', 'Regular', 'Péssima']),
    diet: pick(['Boa', 'Regular']),
    bowel: pick(['1–2 vezes por dia', '3–4 vezes por semana', '1–2 vezes por semana']),
    previousAesthetic: yesNo(0.5, () => pick(['Limpeza de pele', 'Peeling químico', 'Toxina botulínica', 'Drenagem linfática'])),
    allergies: yesNo(0.2, () => pick(['Dipirona', 'Látex', 'Iodo', 'Níquel', 'Ácidos (AHA)'])),
    pacemaker: yesNo(0.02, () => 'Há 3 anos'),
    bloodPressure: yesNo(0.1, () => 'Hipertensão controlada'),
    diabetes: yesNo(0.05, () => 'Tipo 2'),
    hormonal: yesNo(0.15, () => pick(['Hipotireoidismo', 'SOP'])),
    stress: yesNo(0.55),
    declarationConfirmed: true,
    declarationDate,
  }
  if (gender === 'female') {
    answers.contraceptive = yesNo(0.35, () => 'Oral')
    answers.pregnant = { yes: false }
    answers.breastfeeding = { yes: false }
  }
  if (faker.datatype.boolean({ probability: 0.35 })) {
    answers.medications = [{ name: pick(['Levotiroxina 50mcg', 'Losartana 50mg', 'Anticoncepcional oral', 'Vitamina D 2.000 UI']), dose: '1 comprimido ao dia', duration: pick(['6 meses', '2 anos', '5 anos']) }]
  }
  return answers
}
