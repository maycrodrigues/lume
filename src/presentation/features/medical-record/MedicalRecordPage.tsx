import { Archive, ArchiveRestore, ArrowLeft, CalendarPlus, ClipboardPen, FilePlus2, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { AppointmentView } from '@/application'
import type { Assessment, AssessmentTemplateId, Consultation, Photo, Prescription } from '@/domain'
import { ageAt } from '@/domain'
import { useServices } from '../../app/services'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs } from '../../components/ui/Tabs'
import { useAction } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '../../lib/format'
import { AssessmentFormModal } from '../assessments/AssessmentFormModal'
import { AssessmentsTab } from '../assessments/AssessmentsTab'
import { PatientCouponsPanel } from '../coupons/PatientCouponsPanel'
import { PatientPackagesPanel } from '../packages/PatientPackagesPanel'
import { PatientFormModal } from '../patients/PatientFormModal'
import { AddPhotosModal } from '../photos/AddPhotosModal'
import { PhotosTab } from '../photos/PhotosTab'
import { PhotoViewer } from '../photos/PhotoViewer'
import { AppointmentDetailsModal } from '../schedule/AppointmentDetailsModal'
import { AppointmentFormModal } from '../schedule/AppointmentFormModal'
import { AnamnesisTab } from './AnamnesisTab'
import { ClinicalAlerts } from './ClinicalAlerts'
import { ConsultationFormModal } from './ConsultationFormModal'
import { PrescriptionFormModal } from './PrescriptionFormModal'
import { AppointmentsTab, ConsultationsTab, FinanceTab, PrescriptionsTab, ProceduresTab } from './RecordTabs'

type Tab = 'consultations' | 'anamnesis' | 'assessments' | 'photos' | 'procedures' | 'prescriptions' | 'packages' | 'appointments' | 'finance'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] tracking-wide text-ink-muted uppercase">{label}</p>
      <p className="num mt-1 truncate text-[15px] text-ink">{value}</p>
    </div>
  )
}

export function MedicalRecordPage() {
  const { patientId = '' } = useParams()
  const services = useServices()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const action = useAction()
  const [tab, setTab] = useState<Tab>('consultations')
  const [editingPatient, setEditingPatient] = useState(false)
  const [consultationForm, setConsultationForm] = useState<{ consultation?: Consultation; appointment?: AppointmentView }>()
  const [prescriptionForm, setPrescriptionForm] = useState<{ prescription?: Prescription }>()
  const [scheduling, setScheduling] = useState<{ appointment?: AppointmentView }>()
  const [openAppointment, setOpenAppointment] = useState<string>()
  const [assessmentForm, setAssessmentForm] = useState<{ template?: AssessmentTemplateId; assessment?: Assessment }>()
  const [addingPhotos, setAddingPhotos] = useState(false)
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number | undefined }>({ photos: [], index: undefined })
  const openPhotos = (photos: Photo[], index: number) => setViewer({ photos, index })
  const { data: record, error } = useLiveQuery(() => services.medicalRecords.get(patientId), [patientId])

  if (error) {
    return <EmptyState title="Paciente não encontrada" description="O cadastro pode ter sido excluído." action={<Link to="/pacientes" className="text-sm font-medium text-accent">Voltar para pacientes</Link>} />
  }
  if (!record || record.patient.id !== patientId) return null
  const { patient, summary } = record
  const age = ageAt(patient.birthDate, new Date())

  const toggleArchive = async () => {
    if (patient.active && !(await confirm({ title: 'Arquivar paciente', message: 'A paciente deixa de aparecer nas listas e na agenda, mas todo o prontuário é mantido. É possível reativar depois.', confirmLabel: 'Arquivar', tone: 'primary' }))) return
    await action('patient.archive', () => services.patients.setActive(patient.id, !patient.active), { success: patient.active ? 'Paciente arquivada.' : 'Paciente reativada.' })
  }

  const remove = async () => {
    const ok = await confirm({ title: 'Excluir paciente', message: `Excluir definitivamente o cadastro de ${patient.name}? Só é possível quando não há histórico clínico ou financeiro. Uma cópia fica em Registros.`, confirmLabel: 'Excluir' })
    if (ok && (await action('patient.remove', () => services.patients.remove(patient.id), { success: 'Cadastro excluído.' })).ok) navigate('/pacientes')
  }

  return (
    <>
      <Link to="/pacientes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Pacientes
      </Link>

      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-start gap-5 bg-gradient-to-r from-perola-soft via-white to-white p-6">
          <Avatar name={patient.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">Prontuário</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-light tracking-wide text-noite">{patient.name}</h1>
              {!patient.active && <Badge tone="neutral">Arquivada</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
              {age !== undefined && <span>{age} anos · {formatDate(patient.birthDate!)}</span>}
              {patient.phone && (
                <a href={`https://wa.me/55${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent">
                  <Phone className="size-3.5" strokeWidth={1.5} />
                  {formatPhone(patient.phone)}
                </a>
              )}
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                  <Mail className="size-3.5" strokeWidth={1.5} />
                  {patient.email}
                </a>
              )}
              {patient.city && <span>{patient.city}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<ClipboardPen className="size-4" strokeWidth={1.75} />} onClick={() => setConsultationForm({})}>Registrar atendimento</Button>
            <Button variant="secondary" icon={<CalendarPlus className="size-4" strokeWidth={1.5} />} onClick={() => setScheduling({})}>Agendar</Button>
            <Button variant="secondary" icon={<FilePlus2 className="size-4" strokeWidth={1.5} />} onClick={() => setPrescriptionForm({})}>Prescrição</Button>
            <div className="flex">
              <IconButton label="Editar cadastro" onClick={() => setEditingPatient(true)}>
                <Pencil className="size-4" strokeWidth={1.5} />
              </IconButton>
              <IconButton label={patient.active ? 'Arquivar' : 'Reativar'} onClick={toggleArchive}>
                {patient.active ? <Archive className="size-4" strokeWidth={1.5} /> : <ArchiveRestore className="size-4" strokeWidth={1.5} />}
              </IconButton>
              <IconButton label="Excluir cadastro" onClick={remove} className="hover:!bg-danger-soft hover:!text-danger">
                <Trash2 className="size-4" strokeWidth={1.5} />
              </IconButton>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 border-t border-line px-6 py-4 sm:grid-cols-5">
          <Stat label="Atendimentos" value={String(summary.consultationCount)} />
          <Stat label="Último atendimento" value={summary.lastConsultationAt ? formatDate(summary.lastConsultationAt) : '—'} />
          <Stat label="Próximo horário" value={summary.nextAppointment ? formatDateTime(summary.nextAppointment.start) : '—'} />
          <Stat label="Total pago" value={formatMoney(summary.totalPaid)} />
          <Stat label="Em aberto" value={formatMoney(summary.totalPending)} />
        </div>
      </Card>

      <ClinicalAlerts anamnesis={patient.anamnesis} className="mb-5" />

      <div className="mb-5">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'consultations', label: 'Atendimentos', count: record.consultations.length },
            { value: 'anamnesis', label: 'Anamnese' },
            { value: 'assessments', label: 'Fichas', count: record.assessments.length },
            { value: 'photos', label: 'Fotos', count: record.photos.length },
            { value: 'procedures', label: 'Procedimentos', count: record.performedProcedures.length },
            { value: 'prescriptions', label: 'Prescrições', count: record.prescriptions.length },
            { value: 'packages', label: 'Pacotes e cupons' },
            { value: 'appointments', label: 'Agendamentos', count: record.appointments.length },
            { value: 'finance', label: 'Financeiro', count: record.financialEntries.length },
          ]}
        />
      </div>

      {tab === 'consultations' && (
        <ConsultationsTab record={record} onEdit={(c) => setConsultationForm({ consultation: c })} onNew={() => setConsultationForm({})} onOpenPhotos={openPhotos} />
      )}
      {/* Sempre montada: trocar de aba não descarta uma anamnese em edição. */}
      <div hidden={tab !== 'anamnesis'}>
        <AnamnesisTab key={patient.anamnesisUpdatedAt ?? 'new'} patient={patient} />
      </div>
      {tab === 'assessments' && <AssessmentsTab record={record} onNew={(template) => setAssessmentForm({ template })} onEdit={(assessment) => setAssessmentForm({ assessment })} />}
      {tab === 'photos' && <PhotosTab record={record} onAdd={() => setAddingPhotos(true)} onOpen={openPhotos} />}
      {tab === 'procedures' && <ProceduresTab record={record} />}
      {tab === 'prescriptions' && <PrescriptionsTab record={record} onEdit={(p) => setPrescriptionForm({ prescription: p })} onNew={() => setPrescriptionForm({})} />}
      {tab === 'packages' && (
        <div className="space-y-8">
          <PatientPackagesPanel patient={patient} />
          <PatientCouponsPanel patient={patient} />
        </div>
      )}
      {tab === 'appointments' && <AppointmentsTab record={record} onOpen={setOpenAppointment} />}
      {tab === 'finance' && <FinanceTab record={record} />}

      {patient.notes && (
        <p className="mt-6 rounded-xl border border-dashed border-line-strong px-4 py-3 text-xs text-ink-muted">
          <span className="font-medium text-ink-soft">Observações do cadastro:</span> {patient.notes}
        </p>
      )}

      <PatientFormModal open={editingPatient} patient={patient} onClose={() => setEditingPatient(false)} />
      <AssessmentFormModal
        open={assessmentForm !== undefined}
        patient={patient}
        consultations={record.consultations}
        template={assessmentForm?.template}
        assessment={assessmentForm?.assessment}
        onClose={() => setAssessmentForm(undefined)}
      />
      <AddPhotosModal open={addingPhotos} patient={patient} consultations={record.consultations} onClose={() => setAddingPhotos(false)} />
      <PhotoViewer
        photos={viewer.photos.map((p) => record.photos.find((x) => x.id === p.id)).filter((p): p is Photo => Boolean(p))}
        index={viewer.index}
        onIndexChange={(index) => setViewer((v) => ({ ...v, index }))}
        consultations={record.consultations}
      />
      <ConsultationFormModal
        open={consultationForm !== undefined}
        patientId={patient.id}
        consultation={consultationForm?.consultation}
        appointment={consultationForm?.appointment}
        onClose={() => setConsultationForm(undefined)}
      />
      <PrescriptionFormModal open={prescriptionForm !== undefined} patientId={patient.id} prescription={prescriptionForm?.prescription} onClose={() => setPrescriptionForm(undefined)} />
      <AppointmentFormModal open={scheduling !== undefined} initialPatientId={patient.id} appointment={scheduling?.appointment} onClose={() => setScheduling(undefined)} />
      <AppointmentDetailsModal
        appointmentId={openAppointment}
        onClose={() => setOpenAppointment(undefined)}
        onReschedule={(a) => {
          setOpenAppointment(undefined)
          setScheduling({ appointment: a })
        }}
        onRegister={(a) => {
          setOpenAppointment(undefined)
          setConsultationForm({ appointment: a })
        }}
      />
    </>
  )
}
