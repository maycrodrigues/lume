import { useState } from 'react'
import type { IssuedCouponView } from '@/application'
import type { CouponChannel, Id, IssuedCoupon } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Segmented, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PatientPicker } from '../../components/ui/PatientPicker'
import { useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { COUPON_CHANNELS } from '../../lib/labels'
import { SendCouponPanel } from './SendCouponPanel'

interface Props {
  open: boolean
  onClose: () => void
  couponId?: Id
  patientId?: Id
  /** Reenvio de um cupom já emitido: abre direto na mensagem. */
  issued?: IssuedCouponView
}

export function IssueCouponModal(props: Props) {
  return props.open ? <IssueCouponDialog {...props} /> : null
}

function IssueCouponDialog({ onClose, couponId: initialCoupon, patientId: fixedPatient, issued: existing }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { data: coupons = [] } = useLiveQuery(() => services.coupons.list(), [])
  const { data: patients = [] } = useLiveQuery(() => services.patients.list({ includeInactive: true }), [])
  const [couponId, setCouponId] = useState<Id | ''>(initialCoupon ?? '')
  const [patientId, setPatientId] = useState<Id | undefined>(fixedPatient ?? existing?.patientId)
  const [channel, setChannel] = useState<CouponChannel>('whatsapp')
  const [issued, setIssued] = useState<IssuedCoupon | undefined>(existing)

  const patient = patients.find((p) => p.id === (issued?.patientId ?? patientId))
  const available = coupons.filter((c) => c.active)

  const onSubmit = async () => {
    const result = await submit('coupon.issue', () => services.coupons.issue({ couponId, patientId: patientId ?? '', channel }), { success: 'Cupom gerado.' })
    if (result.ok) setIssued(result.value)
  }

  if (issued) {
    if (!patient) return null
    return (
      <Modal open onClose={onClose} size="md" title={existing ? 'Reenviar cupom' : 'Cupom gerado'} footer={<Button onClick={onClose}>Concluir</Button>}>
        <SendCouponPanel coupon={issued} patient={patient} />
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Enviar cupom"
      description="Gera um código pessoal para a paciente, com validade contada a partir de hoje."
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Gerar cupom</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {available.length === 0 && <Alert tone="info">Cadastre um cupom ativo antes de enviar.</Alert>}
        <Field label="Cupom" required>
          {(id) => (
            <Select id={id} value={couponId} onChange={(e) => setCouponId(e.target.value)}>
              <option value="">Selecione</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.discountPercent}% · válido {c.validityDays} dias</option>)}
            </Select>
          )}
        </Field>
        {!fixedPatient && (
          <Field label="Paciente" required>
            {(id) => <PatientPicker id={id} patients={patients.filter((p) => p.active)} value={patientId} onChange={setPatientId} />}
          </Field>
        )}
        <Field label="Como será entregue">
          {() => (
            <Segmented<CouponChannel>
              value={channel}
              onChange={setChannel}
              options={(Object.keys(COUPON_CHANNELS) as CouponChannel[]).map((c) => ({ value: c, label: COUPON_CHANNELS[c] }))}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}
