import type { Patient } from '@/domain'
import { ANAMNESIS, NUTRITION, questionnaireAlerts } from '@/domain'
import { Alert } from '../../components/ui/Alert'

/** Alertas clínicos que precisam estar à vista antes de qualquer procedimento (perguntas marcadas como alerta na Anamnese e na Nutricional). */
export function ClinicalAlerts({ patient, className }: { patient: Patient; className?: string }) {
  const alerts = [...questionnaireAlerts(ANAMNESIS, patient.anamnesis), ...questionnaireAlerts(NUTRITION, patient.nutrition ?? {})]
  if (alerts.length === 0) return null
  return (
    <Alert tone="warning" title="Atenção clínica" className={className}>
      <ul className="flex flex-wrap gap-x-5 gap-y-0.5">
        {alerts.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </Alert>
  )
}
