import { Send, TicketPercent } from 'lucide-react'
import { useState } from 'react'
import type { Patient } from '@/domain'
import { useServices } from '../../app/services'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { IssueCouponModal } from './IssueCouponModal'
import { IssuedCouponsTable } from './IssuedCouponsTable'

export function PatientCouponsPanel({ patient }: { patient: Patient }) {
  const services = useServices()
  const [issuing, setIssuing] = useState(false)
  const { data: coupons = [] } = useLiveQuery(() => services.coupons.issued({ patientId: patient.id }), [patient.id])

  return (
    <section>
      <CardHeader
        className="px-0 pt-0"
        eyebrow="Cupons"
        title="Cupons da paciente"
        action={<Button size="sm" variant="secondary" icon={<Send className="size-3.5" strokeWidth={1.5} />} onClick={() => setIssuing(true)}>Enviar cupom</Button>}
      />
      {coupons.length === 0 ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-ink-muted">
          <TicketPercent className="size-5 text-accent" strokeWidth={1.5} />
          Nenhum cupom enviado para esta paciente.
        </Card>
      ) : (
        <Card>
          <IssuedCouponsTable coupons={coupons} showPatient={false} />
        </Card>
      )}
      <IssueCouponModal open={issuing} patientId={patient.id} onClose={() => setIssuing(false)} />
    </section>
  )
}
