import { useParams } from 'react-router'
import type { Assessment, ClinicSettings, Patient, Questionnaire } from '@/domain'
import { ageAt, ANAMNESIS, ASSESSMENT_TEMPLATES } from '@/domain'
import { useServices } from '../../app/services'
import { PrintSheet } from '../../components/print/PrintSheet'
import { QuestionnaireSummary } from '../../components/questionnaire/QuestionnaireSummary'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatCpf, formatDate, formatPhone } from '../../lib/format'
import { GENDERS, MARITAL_STATUS } from '../../lib/labels'

interface Printable {
  patient: Patient
  clinic: ClinicSettings
  questionnaire: Questionnaire
  answers: Assessment['answers']
  date?: string
  kind: 'anamnesis' | 'assessment'
}

function PatientBlock({ patient, full }: { patient: Patient; full: boolean }) {
  const age = ageAt(patient.birthDate, new Date())
  const address = [patient.address, patient.neighborhood, [patient.city, patient.state].filter(Boolean).join('/'), patient.zipCode && `CEP ${patient.zipCode}`].filter(Boolean).join(' · ')
  const items: Array<[string, string | undefined]> = [
    ['Paciente', patient.name],
    ['Nascimento', patient.birthDate && `${formatDate(patient.birthDate)}${age !== undefined ? ` (${age} anos)` : ''}`],
    ['CPF', formatCpf(patient.cpf)],
    ...(full
      ? ([
          ['RG', patient.rg],
          ['Gênero', GENDERS[patient.gender]],
          ['Estado civil', patient.maritalStatus && MARITAL_STATUS[patient.maritalStatus]],
          ['Profissão', patient.occupation],
          ['Telefones', [formatPhone(patient.phone), formatPhone(patient.phoneAlt)].filter(Boolean).join(' · ')],
          ['E-mail', patient.email],
          ['Endereço', address],
        ] as Array<[string, string | undefined]>)
      : []),
  ]
  return (
    <dl className="grid grid-cols-3 gap-x-5 gap-y-2.5 rounded-xl bg-offwhite px-5 py-4 text-sm print:bg-perola-soft/60">
      {items
        .filter(([, v]) => v)
        .map(([label, value]) => (
          <div key={label} className={label === 'Endereço' || label === 'Paciente' ? 'col-span-2' : undefined}>
            <dt className="text-[11px] text-ink-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
    </dl>
  )
}

function PrintBody({ data }: { data: Printable }) {
  const services = useServices()
  const { patient, clinic, questionnaire, answers, kind } = data
  return (
    <PrintSheet
      clinic={clinic}
      onPrint={() => void services.activity.record({ category: 'system', action: 'questionnaire.print', message: `${questionnaire.title} impressa: ${patient.name}` })}
      signatures={kind === 'anamnesis' ? [{ name: patient.name, detail: 'Paciente' }, { name: clinic.professionalName, detail: clinic.professionalRegistry }] : [{ name: clinic.professionalName, detail: clinic.professionalRegistry }]}
    >
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="eyebrow">Prontuário</p>
          <h1 className="mt-1 text-xl font-light text-noite">{questionnaire.title}</h1>
        </div>
        {data.date && <p className="text-sm text-ink-soft">{formatDate(data.date)}</p>}
      </div>
      <PatientBlock patient={patient} full={kind === 'anamnesis'} />
      <QuestionnaireSummary className="mt-7" questionnaire={questionnaire} answers={answers} gender={patient.gender} />
      {kind === 'anamnesis' && (
        <p className="mt-8 rounded-xl border border-line px-5 py-4 text-sm leading-relaxed text-ink-soft">
          Declaro que não omiti nenhuma informação e que estas são verdadeiras. Data: ____ / ____ / ______
        </p>
      )}
    </PrintSheet>
  )
}

export function AnamnesisPrintPage() {
  const { patientId = '' } = useParams()
  const services = useServices()
  const { data, error } = useLiveQuery(async (): Promise<Printable> => {
    const [patient, clinic] = await Promise.all([services.patients.get(patientId), services.settings.get()])
    return { patient, clinic, questionnaire: ANAMNESIS, answers: patient.anamnesis, kind: 'anamnesis', date: patient.anamnesisUpdatedAt }
  }, [patientId])
  if (error) return <p className="p-10 text-center text-sm text-ink-muted">{error.message}</p>
  return data ? <PrintBody data={data} /> : null
}

export function AssessmentPrintPage() {
  const { assessmentId = '' } = useParams()
  const services = useServices()
  const { data, error } = useLiveQuery(async (): Promise<Printable> => {
    const assessment = await services.assessments.get(assessmentId)
    const [patient, clinic] = await Promise.all([services.patients.get(assessment.patientId), services.settings.get()])
    return { patient, clinic, questionnaire: ASSESSMENT_TEMPLATES[assessment.template], answers: assessment.answers, kind: 'assessment', date: assessment.date }
  }, [assessmentId])
  if (error) return <p className="p-10 text-center text-sm text-ink-muted">{error.message}</p>
  return data ? <PrintBody data={data} /> : null
}
