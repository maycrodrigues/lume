import { useParams } from 'react-router'
import { ageAt } from '@/domain'
import { useServices } from '../../app/services'
import { PrintSheet } from '../../components/print/PrintSheet'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { formatCpf, formatDate } from '../../lib/format'

export function PrescriptionPrintPage() {
  const { prescriptionId = '' } = useParams()
  const services = useServices()
  const { data, error } = useLiveQuery(() => services.prescriptions.printable(prescriptionId), [prescriptionId])

  if (error) return <p className="p-10 text-center text-sm text-ink-muted">{error.message}</p>
  if (!data) return null
  const { prescription, patient, clinic } = data
  const age = ageAt(patient.birthDate, new Date())

  return (
    <PrintSheet
      clinic={clinic}
      signatures={[{ name: clinic.professionalName, detail: clinic.professionalRegistry }]}
      onPrint={() =>
        void services.activity.record({
          category: 'system',
          action: 'prescription.print',
          message: `Prescrição impressa: ${patient.name}`,
          context: { prescriptionId },
        })
      }
    >
      <p className="eyebrow">Prescrição</p>
      <div className="mt-3 grid grid-cols-3 gap-4 rounded-xl bg-offwhite px-5 py-4 text-sm print:bg-perola-soft/60">
        <div className="col-span-2">
          <p className="text-[11px] text-ink-muted">Paciente</p>
          <p className="font-medium text-ink">{patient.name}</p>
          {(patient.cpf || age !== undefined) && (
            <p className="text-xs text-ink-soft">
              {age !== undefined && `${age} anos`}
              {patient.cpf && ` · CPF ${formatCpf(patient.cpf)}`}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-ink-muted">Data</p>
          <p className="font-medium text-ink">{formatDate(prescription.date)}</p>
        </div>
      </div>

      <ol className="mt-8 space-y-6">
        {prescription.items.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="num mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-perola text-xs font-medium text-noite">{i + 1}</span>
            <div>
              <p className="font-medium text-ink">
                {item.name}
                {item.dosage && <span className="font-normal text-ink-soft"> — {item.dosage}</span>}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.instructions}</p>
            </div>
          </li>
        ))}
      </ol>

      {prescription.notes && <p className="mt-8 rounded-xl border border-line px-5 py-4 text-sm leading-relaxed text-ink-soft">{prescription.notes}</p>}
    </PrintSheet>
  )
}
