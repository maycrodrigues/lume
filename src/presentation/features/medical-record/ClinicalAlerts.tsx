import type { Answers } from '@/domain'
import { ANAMNESIS, questionnaireAlerts } from '@/domain'
import { Alert } from '../../components/ui/Alert'

/** Alertas clínicos que precisam estar à vista antes de qualquer procedimento (perguntas marcadas como alerta na Anamnese). */
export function ClinicalAlerts({ anamnesis, className }: { anamnesis: Answers; className?: string }) {
  const alerts = questionnaireAlerts(ANAMNESIS, anamnesis)
  if (alerts.length === 0) return null
  return (
    <Alert tone="warning" title="Atenção clínica" className={className}>
      <ul className="flex flex-wrap gap-x-5 gap-y-0.5">
        {alerts.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </Alert>
  )
}
