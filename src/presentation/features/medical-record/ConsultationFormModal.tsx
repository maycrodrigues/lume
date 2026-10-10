import { Package as PackageIcon, TicketPercent, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ContractView, IssuedCouponView } from '@/application'
import type { Appointment, Consultation, EntryStatus, Id, PaymentMethod } from '@/domain'
import { couponDiscount } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Input, Segmented, Select, Switch, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { PatientPicker } from '../../components/ui/PatientPicker'
import { useToast } from '../../components/ui/Toast'
import { errorMessage, useSubmit } from '../../hooks/useAction'
import { cn } from '../../lib/cn'
import { PendingPhotos, PhotoDropzone, toPending, type PendingPhoto } from '../photos/PhotoDropzone'
import { PhotoThumb } from '../photos/PhotoThumb'
import { uploadPhotos } from '../photos/uploadPhotos'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatMoney, fromDateTimeInputs, toDateInput, toTimeInput } from '../../lib/format'
import { PAYMENT_METHODS } from '../../lib/labels'
import { ClinicalAlerts } from './ClinicalAlerts'
import { emptyItem, fromDrafts, PrescriptionItemsEditor, type PrescriptionItemDraft } from './PrescriptionItemsEditor'

interface Props {
  open: boolean
  onClose: () => void
  patientId?: Id
  appointment?: Appointment
  consultation?: Consultation
}

interface Line {
  key: string
  procedureId: Id
  price: number
  notes: string
  /** Sessão de um pacote contratado: não é cobrada de novo. */
  patientPackageId?: Id
}

const line = (procedureId: Id, price: number, notes = '', patientPackageId?: Id): Line => ({ key: crypto.randomUUID(), procedureId, price, notes, patientPackageId })

export function ConsultationFormModal(props: Props) {
  return props.open ? <ConsultationFormDialog {...props} /> : null
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <h3 className="eyebrow whitespace-nowrap">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function ConsultationFormDialog({ onClose, patientId: fixedPatientId, appointment, consultation }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: patients = [] } = useLiveQuery(() => services.patients.list({ includeInactive: true }), [])
  const { data: procedures = [] } = useLiveQuery(() => services.procedures.list(), [])
  const editing = Boolean(consultation)

  const when = new Date(consultation?.date ?? appointment?.start ?? Date.now())
  const [patientId, setPatientId] = useState<Id | undefined>(consultation?.patientId ?? appointment?.patientId ?? fixedPatientId)
  const [date, setDate] = useState(toDateInput(when))
  const [time, setTime] = useState(toTimeInput(when))
  const [lines, setLines] = useState<Line[]>(
    consultation?.procedures.map((p) => line(p.procedureId, p.price, p.notes, p.patientPackageId)) ?? appointment?.items.map((i) => line(i.procedureId, i.price)) ?? [],
  )
  const [notes, setNotes] = useState({
    sessionNumber: consultation?.sessionNumber ? String(consultation.sessionNumber) : '',
    chiefComplaint: consultation?.chiefComplaint ?? '',
    examination: consultation?.examination ?? '',
    previousEvolution: consultation?.previousEvolution ?? '',
    evolution: consultation?.evolution ?? '',
    equipment: consultation?.equipment ?? '',
    activeIngredients: consultation?.activeIngredients ?? '',
    intercurrences: consultation?.intercurrences ?? '',
    recommendations: consultation?.recommendations ?? '',
  })
  const note = (key: keyof typeof notes) => ({
    value: notes[key],
    onChange: (e: { target: { value: string } }) => setNotes((n) => ({ ...n, [key]: e.target.value })),
  })
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const { data: patientPhotos = [] } = useLiveQuery(
    () => (consultation ? services.photos.listByPatient(consultation.patientId) : Promise.resolve([])),
    [consultation?.id],
  )
  const savedPhotos = patientPhotos.filter((p) => p.consultationId === consultation?.id)

  // Sugere o nº da sessão: quantas vezes o primeiro procedimento já foi feito na paciente, mais um.
  const firstProcedure = lines[0]?.procedureId
  const lastSuggestion = useRef('')
  useEffect(() => {
    if (editing || !patientId || !firstProcedure) return
    let alive = true
    void services.consultations.nextSessionNumber(patientId, firstProcedure).then((n) => {
      if (!alive) return
      setNotes((current) => {
        if (current.sessionNumber && current.sessionNumber !== lastSuggestion.current) return current
        lastSuggestion.current = String(n)
        return { ...current, sessionNumber: String(n) }
      })
    })
    return () => {
      alive = false
    }
  }, [services, editing, patientId, firstProcedure])
  const [withPrescription, setWithPrescription] = useState(false)
  const [items, setItems] = useState<PrescriptionItemDraft[]>([emptyItem()])
  const [prescriptionNotes, setPrescriptionNotes] = useState('')
  const [withCharge, setWithCharge] = useState(true)
  const [chargeStatus, setChargeStatus] = useState<Exclude<EntryStatus, 'cancelled'>>('paid')
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  const patient = patients.find((p) => p.id === patientId)
  const nameOf = (id: Id) => procedures.find((p) => p.id === id)?.name ?? consultation?.procedures.find((p) => p.procedureId === id)?.name ?? 'Procedimento removido'
  const listPrice = (id: Id) => procedures.find((p) => p.id === id)?.price ?? 0
  const updateLine = (key: string, patch: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  // Pacotes contratados: cada linha pode usar uma sessão, enquanto houver saldo.
  const { data: contracts = [] } = useLiveQuery(
    () => (patientId ? services.packages.contracts(patientId) : Promise.resolve([] as ContractView[])),
    [patientId],
  )
  const originallyUsed = (contractId: Id, procedureId: Id) =>
    consultation?.procedures.filter((p) => p.patientPackageId === contractId && p.procedureId === procedureId).length ?? 0
  // Na edição, um pacote já usado por este atendimento continua elegível mesmo que tenha sido concluído por ele.
  const usable = contracts.filter((c) => c.status === 'active' || Boolean(consultation?.procedures.some((p) => p.patientPackageId === c.id)))
  const freeSlots = (contract: ContractView, procedureId: Id, all: Line[], exceptKey?: string) => {
    const usage = contract.usage.find((u) => u.procedureId === procedureId)
    if (!usage) return 0
    const inForm = all.filter((l) => l.key !== exceptKey && l.patientPackageId === contract.id && l.procedureId === procedureId).length
    return usage.remaining + originallyUsed(contract.id, procedureId) - inForm
  }
  const packageFor = (l: Line, all: Line[] = lines) => usable.find((c) => freeSlots(c, l.procedureId, all, l.key) > 0)
  const contractName = (id: Id) => contracts.find((c) => c.id === id)?.name ?? 'pacote'

  /** Marca automaticamente como sessão de pacote as linhas que têm saldo disponível. */
  const withPackages = (all: Line[]) =>
    all.reduce<Line[]>((acc, l, i) => {
      const next = [...acc, ...all.slice(i)]
      const contract = l.patientPackageId ? undefined : packageFor(l, next)
      return [...acc, contract ? { ...l, patientPackageId: contract.id, price: 0 } : l]
    }, [])
  const autoApplied = useRef(false)
  useEffect(() => {
    if (editing || autoApplied.current || contracts.length === 0) return
    autoApplied.current = true
    setLines((all) => withPackages(all))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, editing])

  // Cupom: só procedimentos avulsos, uma vez por atendimento.
  const { data: availableCoupons = [] } = useLiveQuery(
    () => (patientId && !editing ? services.coupons.issued({ patientId, status: 'available' }) : Promise.resolve([] as IssuedCouponView[])),
    [patientId, editing],
  )
  const { data: editingCoupon } = useLiveQuery(
    () => (consultation?.coupon ? services.coupons.lookup(consultation.coupon.code) : Promise.resolve(undefined)),
    [consultation?.coupon?.code],
  )
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<IssuedCouponView>()
  const [couponError, setCouponError] = useState<string>()
  const activeCoupon = appliedCoupon ?? editingCoupon
  const couponLines = lines.map(({ procedureId, price, patientPackageId }) => ({ procedureId, price, patientPackageId }))
  const discount = activeCoupon ? couponDiscount(activeCoupon, couponLines).discount : 0
  const subtotal = lines.reduce((s, l) => s + l.price, 0)
  const total = subtotal - discount

  const applyCoupon = async (code: string) => {
    setCouponError(undefined)
    if (!patientId) return setCouponError('Selecione a paciente antes de aplicar o cupom.')
    try {
      const check = await services.coupons.validate({ code, patientId, procedures: couponLines })
      setAppliedCoupon(check.coupon)
      setCouponCode('')
    } catch (e) {
      setCouponError(errorMessage(e))
    }
  }

  const onSubmit = async () => {
    const clinical = {
      ...notes,
      date: date && time ? fromDateTimeInputs(date, time) : '',
      procedures: lines.map(({ procedureId, price, notes, patientPackageId }) => ({ procedureId, price, notes, patientPackageId })),
    }
    const result = await submit(editing ? 'consultation.update' : 'consultation.register', async () => {
      if (consultation) return services.consultations.update(consultation.id, clinical)
      const registered = await services.consultations.register({
        ...clinical,
        patientId: patientId ?? '',
        appointmentId: appointment?.id,
        prescription: withPrescription ? { items: fromDrafts(items), notes: prescriptionNotes } : undefined,
        couponCode: appliedCoupon?.code,
        charge: withCharge ? { status: chargeStatus, method: chargeStatus === 'paid' ? method : undefined } : undefined,
      })
      return registered.consultation
    }, { success: editing ? 'Atendimento atualizado.' : 'Atendimento registrado no prontuário.' })
    if (!result.ok) return
    if (pendingPhotos.length) {
      setUploading(true)
      const upload = await uploadPhotos(services, pendingPhotos, {
        patientId: result.value.patientId,
        consultationId: result.value.id,
        takenAt: toDateInput(new Date(result.value.date)),
      })
      setUploading(false)
      if (upload.failed.length) toast.error(`Atendimento salvo, mas ${upload.failed.length} foto(s) não foram salvas: ${upload.failed[0].message}`)
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={editing ? 'Editar atendimento' : 'Registrar atendimento'}
      description={patient ? patient.name : 'O registro fica no prontuário da paciente.'}
      onSubmit={onSubmit}
      footer={
        <>
          <p className="num mr-auto text-sm text-ink-soft">
            {discount > 0 && (
              <>
                {formatMoney(subtotal)} − {formatMoney(discount)} cupom ={' '}
              </>
            )}
            Total: <strong className="font-medium text-ink">{formatMoney(total)}</strong>
          </p>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending || uploading}>{uploading ? 'Salvando fotos…' : editing ? 'Salvar alterações' : 'Registrar atendimento'}</Button>
        </>
      }
    >
      <div className="space-y-7">
        {error && <Alert>{error}</Alert>}
        {patient && <ClinicalAlerts anamnesis={patient.anamnesis} />}

        <div className="grid gap-4 sm:grid-cols-4">
          {!fixedPatientId && !appointment && !consultation && (
            <Field label="Paciente" required className="sm:col-span-2">
              {(id) => <PatientPicker id={id} patients={patients.filter((p) => p.active)} value={patientId} onChange={setPatientId} />}
            </Field>
          )}
          <Field label="Data" required>
            {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Horário" required>
            {(id) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
          </Field>
        </div>

        <Section
          title="Procedimentos realizados"
          aside={
            <Select
              className="h-8 w-60 text-xs"
              value=""
              aria-label="Adicionar procedimento"
              onChange={(e) => {
                const p = procedures.find((x) => x.id === e.target.value)
                if (p) setLines((all) => withPackages([...all, line(p.id, p.price)]))
              }}
            >
              <option value="">+ Adicionar procedimento</option>
              {procedures.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)}</option>
              ))}
            </Select>
          }
        >
          {lines.length === 0 ? (
            <p className="rounded-xl bg-offwhite px-4 py-3 text-sm text-ink-muted">Nenhum procedimento adicionado. Use o seletor acima, ou registre apenas a evolução.</p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => {
                const suggestion = l.patientPackageId ? undefined : packageFor(l)
                return (
                  <div key={l.key} className={cn('rounded-xl border p-2 pl-3.5', l.patientPackageId ? 'border-lilas/60 bg-perola-soft/40' : 'border-line')}>
                    <div className="grid grid-cols-12 items-center gap-2">
                      <p className="col-span-12 truncate text-sm font-medium text-ink sm:col-span-4">{nameOf(l.procedureId)}</p>
                      <Input className="col-span-7 sm:col-span-5" placeholder="Observações (área, produto, lote, parâmetros…)" value={l.notes} onChange={(e) => updateLine(l.key, { notes: e.target.value })} aria-label="Observações do procedimento" />
                      {l.patientPackageId ? (
                        <p className="col-span-4 text-right text-xs font-medium text-accent sm:col-span-2">Pacote</p>
                      ) : (
                        <MoneyInput className="col-span-4 sm:col-span-2" value={l.price} onChange={(price) => updateLine(l.key, { price })} />
                      )}
                      <IconButton label="Remover procedimento" className="col-span-1 justify-self-end" onClick={() => setLines((all) => all.filter((x) => x.key !== l.key))}>
                        <X className="size-4" strokeWidth={1.5} />
                      </IconButton>
                    </div>
                    {(l.patientPackageId || suggestion) && (
                      <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-2 text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-noite"
                          checked={Boolean(l.patientPackageId)}
                          onChange={(e) =>
                            updateLine(l.key, e.target.checked && suggestion ? { patientPackageId: suggestion.id, price: 0 } : { patientPackageId: undefined, price: listPrice(l.procedureId) })
                          }
                        />
                        <PackageIcon className="size-3.5 text-accent" strokeWidth={1.5} />
                        {l.patientPackageId
                          ? `Sessão do pacote "${contractName(l.patientPackageId)}" — sem cobrança`
                          : `Usar sessão do pacote "${suggestion!.name}" (${freeSlots(suggestion!, l.procedureId, lines, l.key)} ${freeSlots(suggestion!, l.procedureId, lines, l.key) === 1 ? 'restante' : 'restantes'})`}
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section title="Cupom de desconto" aside={<span className="text-xs text-ink-muted">Não vale para sessões de pacote</span>}>
          {activeCoupon ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success-soft/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <TicketPercent className="size-5 text-success" strokeWidth={1.5} />
                <div>
                  <p className="num text-sm font-medium tracking-wider text-noite">{activeCoupon.code}</p>
                  <p className="text-xs text-ink-soft">
                    {activeCoupon.name} · {activeCoupon.discountPercent}%
                    {discount > 0 ? ` · desconto de ${formatMoney(discount)}` : ' · não vale para os procedimentos atuais'}
                  </p>
                </div>
              </div>
              {!editing && (
                <Button size="sm" variant="ghost" onClick={() => setAppliedCoupon(undefined)}>Remover</Button>
              )}
            </div>
          ) : editing ? (
            <p className="text-sm text-ink-muted">Nenhum cupom usado neste atendimento.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="num max-w-56 uppercase"
                  placeholder="LUME-XXXXXX"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void applyCoupon(couponCode)
                    }
                  }}
                  aria-label="Código do cupom"
                />
                <Button variant="secondary" disabled={!couponCode.trim()} onClick={() => applyCoupon(couponCode)}>Aplicar</Button>
              </div>
              {couponError && <Alert>{couponError}</Alert>}
              {availableCoupons.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-muted">Cupons da paciente:</span>
                  {availableCoupons.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyCoupon(c.code)}
                      className="num inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-lilas bg-perola-soft/60 px-3 text-xs text-noite hover:bg-perola"
                    >
                      <TicketPercent className="size-3.5 text-accent" strokeWidth={1.5} />
                      {c.code} · {c.discountPercent}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="Evolução clínica">
          <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
            <Field label="Nº da sessão" hint={!editing && notes.sessionNumber === lastSuggestion.current && notes.sessionNumber ? 'Sugerido' : undefined}>
              {(id) => <Input id={id} inputMode="numeric" {...note('sessionNumber')} />}
            </Field>
            <Field label="Equipamento utilizado">
              {(id) => <Input id={id} placeholder="Ex.: Radiofrequência, alta frequência…" {...note('equipment')} />}
            </Field>
            <Field label="Ativos utilizados">
              {(id) => <Input id={id} placeholder="Ex.: ácido hialurônico, vitamina C…" {...note('activeIngredients')} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Queixa principal">
              {(id) => <Textarea id={id} rows={2} {...note('chiefComplaint')} />}
            </Field>
            <Field label="Exame / análise do dia">
              {(id) => <Textarea id={id} rows={2} placeholder="Exame físico, análise de pele, medidas…" {...note('examination')} />}
            </Field>
            <Field label="Evolução desde a sessão anterior">
              {(id) => <Textarea id={id} rows={3} placeholder="Como a paciente respondeu desde a última sessão" {...note('previousEvolution')} />}
            </Field>
            <Field label="Evolução da sessão atual / conduta">
              {(id) => <Textarea id={id} rows={3} placeholder="O que foi feito e como a pele/corpo respondeu" {...note('evolution')} />}
            </Field>
            <Field label="Intercorrências">
              {(id) => <Textarea id={id} rows={2} placeholder="Reações, desconfortos, eventos adversos…" {...note('intercurrences')} />}
            </Field>
            <Field label="Orientações à paciente">
              {(id) => <Textarea id={id} rows={2} placeholder="Cuidados pós-procedimento, retorno…" {...note('recommendations')} />}
            </Field>
          </div>
        </Section>

        <Section title="Fotos de acompanhamento" aside={<span className="text-xs text-ink-muted">Opcional</span>}>
          {savedPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {savedPhotos.map((p) => <PhotoThumb key={p.id} photo={p} size="sm" />)}
              <p className="self-center text-xs text-ink-muted">Fotos já salvas — edite ou exclua na aba Fotos.</p>
            </div>
          )}
          {patient?.imageConsent?.scope === 'denied' && <Alert tone="warning">A paciente recusou a autorização de uso de imagem.</Alert>}
          <PhotoDropzone compact onFiles={(files) => setPendingPhotos((all) => [...all, ...toPending(files)])} />
          <PendingPhotos items={pendingPhotos} onChange={setPendingPhotos} />
        </Section>

        {!editing && (
          <Section title="Prescrição" aside={<Switch checked={withPrescription} onChange={setWithPrescription} label="Incluir prescrição" />}>
            {withPrescription ? (
              <div className="space-y-3">
                <PrescriptionItemsEditor items={items} onChange={setItems} />
                <Field label="Observações da prescrição">
                  {(id) => <Input id={id} value={prescriptionNotes} onChange={(e) => setPrescriptionNotes(e.target.value)} />}
                </Field>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Ative para prescrever cuidados domiciliares, cosméticos ou orientações de uso. Também é possível criar prescrições avulsas no prontuário.</p>
            )}
          </Section>
        )}

        {!editing && (
          <Section title="Cobrança" aside={<Switch checked={withCharge && total > 0} onChange={setWithCharge} label={`Lançar ${formatMoney(total)} no financeiro`} />}>
            {withCharge && total > 0 ? (
              <div className="flex flex-wrap items-end gap-4">
                <Segmented<'paid' | 'pending'> value={chargeStatus} onChange={setChargeStatus} options={[{ value: 'paid', label: 'Pago agora' }, { value: 'pending', label: 'A receber' }]} />
                {chargeStatus === 'paid' && (
                  <Field label="Forma de pagamento" className="w-56">
                    {(id) => (
                      <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                        {Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </Select>
                    )}
                  </Field>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">{total === 0 ? 'Sem valor a cobrar.' : 'Nenhuma cobrança será lançada.'}</p>
            )}
          </Section>
        )}
        {editing && consultation?.financialEntryId && (
          <Alert tone="info">Se a cobrança deste atendimento ainda estiver pendente, o valor será atualizado com o novo total.</Alert>
        )}
      </div>
    </Modal>
  )
}

