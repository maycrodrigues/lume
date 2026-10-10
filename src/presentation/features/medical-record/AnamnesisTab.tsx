import { Printer } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'
import type { Answers, Patient } from '@/domain'
import { ANAMNESIS } from '@/domain'
import { useServices } from '../../app/services'
import { QuestionnaireForm } from '../../components/questionnaire/QuestionnaireForm'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { useSubmit } from '../../hooks/useAction'
import { formatDateTime } from '../../lib/format'

export function AnamnesisTab({ patient }: { patient: Patient }) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const [answers, setAnswers] = useState<Answers>(patient.anamnesis)
  const [dirty, setDirty] = useState(false)

  const save = async () => {
    const result = await submit('patient.anamnesis', () => services.patients.updateAnamnesis(patient.id, answers), { success: 'Anamnese salva.' })
    if (result.ok) {
      setAnswers(result.value.anamnesis)
      setDirty(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {patient.anamnesisUpdatedAt ? `Última atualização em ${formatDateTime(patient.anamnesisUpdatedAt)}` : 'Anamnese ainda não preenchida.'}
        </p>
        <Link
          to={`/pacientes/${patient.id}/anamnese/imprimir`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-accent hover:bg-perola-soft hover:text-noite"
        >
          <Printer className="size-3.5" strokeWidth={1.5} />
          Imprimir ficha para assinatura
        </Link>
      </div>
      {error && <Alert>{error}</Alert>}
      <QuestionnaireForm
        questionnaire={ANAMNESIS}
        value={answers}
        gender={patient.gender}
        onChange={(next) => {
          setAnswers(next)
          setDirty(true)
        }}
      />
      <div className="sticky bottom-4 z-10 flex justify-end">
        <div className="flex items-center gap-3 rounded-full border border-line bg-white/95 py-1.5 pr-1.5 pl-4 shadow-pop backdrop-blur">
          <span className="text-xs text-ink-muted">{dirty ? 'Alterações não salvas' : 'Tudo salvo'}</span>
          <Button onClick={save} loading={pending} disabled={!dirty}>Salvar anamnese</Button>
        </div>
      </div>
    </div>
  )
}
