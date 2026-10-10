import { useState } from 'react'
import type { Answers, Assessment, AssessmentTemplateId, Consultation, Patient } from '@/domain'
import { ASSESSMENT_TEMPLATES } from '@/domain'
import { useServices } from '../../app/services'
import { QuestionnaireForm } from '../../components/questionnaire/QuestionnaireForm'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { toDateInput } from '../../lib/format'
import { consultationLabel } from '../photos/AddPhotosModal'

interface Props {
  open: boolean
  onClose: () => void
  patient: Patient
  consultations: Consultation[]
  template?: AssessmentTemplateId
  assessment?: Assessment
}

export function AssessmentFormModal(props: Props) {
  return props.open && (props.assessment || props.template) ? <AssessmentFormDialog {...props} /> : null
}

function AssessmentFormDialog({ onClose, patient, consultations, template: newTemplate, assessment }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const template = assessment?.template ?? newTemplate!
  const questionnaire = ASSESSMENT_TEMPLATES[template]
  const [date, setDate] = useState(assessment?.date ?? toDateInput(new Date()))
  const [consultationId, setConsultationId] = useState(assessment?.consultationId ?? '')
  const [answers, setAnswers] = useState<Answers>(assessment?.answers ?? {})

  const onSubmit = async () => {
    const result = await submit(assessment ? 'assessment.update' : 'assessment.create', () =>
      assessment
        ? services.assessments.update(assessment.id, { date, consultationId, answers })
        : services.assessments.create({ patientId: patient.id, template, date, consultationId, answers }),
      { success: assessment ? 'Ficha atualizada.' : 'Ficha registrada.' },
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={assessment ? `Editar ${questionnaire.title.toLowerCase()}` : questionnaire.title}
      description={patient.name}
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Salvar ficha</Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Field label="Data da avaliação" required>
            {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Atendimento (opcional)">
            {(id) => (
              <Select id={id} value={consultationId} onChange={(e) => setConsultationId(e.target.value)}>
                <option value="">Sem vínculo</option>
                {consultations.map((c) => <option key={c.id} value={c.id}>{consultationLabel(c)}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <QuestionnaireForm questionnaire={questionnaire} value={answers} onChange={setAnswers} gender={patient.gender} variant="plain" />
      </div>
    </Modal>
  )
}
