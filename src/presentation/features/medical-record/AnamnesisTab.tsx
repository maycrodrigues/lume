import { Printer } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'
import type { Answers, Patient } from '@/domain'
import { ANAMNESIS, NUTRITION } from '@/domain'
import { useServices } from '../../app/services'
import { QuestionnaireForm } from '../../components/questionnaire/QuestionnaireForm'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { useSubmit } from '../../hooks/useAction'
import { formatDateTime } from '../../lib/format'

/** Fichas únicas por paciente, gravadas no próprio cadastro. */
const KINDS = {
  anamnesis: { questionnaire: ANAMNESIS, name: 'Anamnese', path: 'anamnese', answers: (p: Patient) => p.anamnesis, updatedAt: (p: Patient) => p.anamnesisUpdatedAt },
  nutrition: { questionnaire: NUTRITION, name: 'Anamnese nutricional', path: 'nutricional', answers: (p: Patient) => p.nutrition ?? {}, updatedAt: (p: Patient) => p.nutritionUpdatedAt },
}

export function AnamnesisTab({ patient, kind }: { patient: Patient; kind: keyof typeof KINDS }) {
  const config = KINDS[kind]
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const [answers, setAnswers] = useState<Answers>(config.answers(patient))
  const [dirty, setDirty] = useState(false)
  const updatedAt = config.updatedAt(patient)

  const save = async () => {
    const update = kind === 'anamnesis' ? services.patients.updateAnamnesis : services.patients.updateNutrition
    const result = await submit(`patient.${kind}`, () => update(patient.id, answers), { success: `${config.name} salva.` })
    if (result.ok) {
      setAnswers(config.answers(result.value))
      setDirty(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {updatedAt ? `Última atualização em ${formatDateTime(updatedAt)}` : `${config.name} ainda não preenchida.`}
        </p>
        <Link
          to={`/admin/pacientes/${patient.id}/${config.path}/imprimir`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-accent hover:bg-perola-soft hover:text-noite"
        >
          <Printer className="size-3.5" strokeWidth={1.5} />
          {kind === 'anamnesis' ? 'Imprimir ficha para assinatura' : 'Imprimir ficha'}
        </Link>
      </div>
      {error && <Alert>{error}</Alert>}
      <QuestionnaireForm
        questionnaire={config.questionnaire}
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
          <Button onClick={save} loading={pending} disabled={!dirty}>Salvar {config.name.toLowerCase()}</Button>
        </div>
      </div>
    </div>
  )
}
