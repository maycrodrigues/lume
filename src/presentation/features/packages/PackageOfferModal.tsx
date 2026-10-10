import { Check, Copy, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { PackageView } from '@/application'
import type { Id } from '@/domain'
import { DISCOUNT_STEPS, packagePricing } from '@/domain'
import { useServices } from '../../app/services'
import { Button, buttonClass } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PatientPicker } from '../../components/ui/PatientPicker'
import { useToast } from '../../components/ui/Toast'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'
import { packageOfferMessage, whatsappUrl } from '../../lib/messages'

interface Props {
  pkg?: PackageView
  onClose: () => void
  onContract: (input: { packageId: Id; patientId: Id; discountPercent: number }) => void
}

/** Tela para mostrar à paciente: as opções de desconto lado a lado, para ela escolher. */
export function PackageOfferModal({ pkg, onClose, onContract }: Props) {
  return pkg ? <OfferDialog key={pkg.id} pkg={pkg} onClose={onClose} onContract={onContract} /> : null
}

function OfferDialog({ pkg, onClose, onContract }: Required<Props>) {
  const services = useServices()
  const toast = useToast()
  const { data: patients = [] } = useLiveQuery(() => services.patients.list(), [])
  const { data: settings } = useLiveQuery(() => services.settings.get(), [], ['settings'])
  const [patientId, setPatientId] = useState<Id>()
  const [levels, setLevels] = useState<number[]>(() => [...new Set([5, 10, pkg.discountPercent])].sort((a, b) => a - b))
  const [chosen, setChosen] = useState(pkg.discountPercent)

  const patient = patients.find((p) => p.id === patientId)
  const options = levels.map((percent) => {
    const p = packagePricing(pkg.lines, percent)
    return { discountPercent: percent, finalPrice: p.finalPrice, perSession: p.perSession, savings: p.discount }
  })
  const message = packageOfferMessage({
    patientName: patient?.name,
    packageName: pkg.name,
    lines: pkg.lines,
    fullPrice: pkg.pricing.fullPrice,
    options,
    validityDays: pkg.validityDays,
    clinicName: settings?.clinicName ?? 'LUME',
  })
  const whatsapp = whatsappUrl(patient?.phone, message)

  const toggleLevel = (percent: number) =>
    setLevels((all) => (all.includes(percent) ? (all.length > 1 ? all.filter((p) => p !== percent) : all) : [...all, percent].sort((a, b) => a - b)))

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={pkg.name}
      description={pkg.lines.map((l) => `${l.quantity}× ${l.name}`).join(' · ')}
      footer={
        <>
          <Button
            variant="ghost"
            icon={<Copy className="size-4" strokeWidth={1.5} />}
            onClick={() => void navigator.clipboard.writeText(message).then(() => toast.success('Texto da oferta copiado.'))}
          >
            Copiar texto
          </Button>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
              <MessageCircle className="size-4" strokeWidth={1.5} />
              Enviar por WhatsApp
            </a>
          ) : (
            <Button variant="secondary" disabled title="Selecione uma paciente com celular">Enviar por WhatsApp</Button>
          )}
          <Button disabled={!patientId} onClick={() => patientId && onContract({ packageId: pkg.id, patientId, discountPercent: chosen })}>
            Contratar com {chosen}%
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-ink-muted">Valor avulso</p>
            <p className="num text-lg text-ink-soft line-through">{formatMoney(pkg.pricing.fullPrice)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Opções de desconto exibidas">
            <span className="mr-1 text-xs text-ink-muted">Mostrar:</span>
            {DISCOUNT_STEPS.filter((p) => p > 0).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleLevel(p)}
                aria-pressed={levels.includes(p)}
                className={cn('h-7 rounded-full px-2.5 text-xs transition-colors', levels.includes(p) ? 'bg-noite text-white' : 'bg-perola-soft text-ink-soft hover:bg-perola')}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className={cn('grid gap-3', options.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {options.map((o) => {
            const selected = o.discountPercent === chosen
            return (
              <button
                key={o.discountPercent}
                type="button"
                onClick={() => setChosen(o.discountPercent)}
                aria-pressed={selected}
                className={cn(
                  'relative rounded-2xl border p-5 text-left transition-all',
                  selected ? 'border-noite bg-noite text-white shadow-pop' : 'border-line bg-white hover:border-cinza',
                )}
              >
                {selected && (
                  <span className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-full bg-white/15">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                )}
                <p className={cn('eyebrow', selected && 'text-perola')}>{o.discountPercent}% de desconto</p>
                <p className="num mt-3 text-2xl font-medium tracking-tight">{formatMoney(o.finalPrice)}</p>
                <p className={cn('num mt-1 text-xs', selected ? 'text-cinza' : 'text-ink-muted')}>{formatMoney(o.perSession)} por sessão</p>
                <p className={cn('num mt-3 text-xs font-medium', selected ? 'text-perola' : 'text-success')}>Economia de {formatMoney(o.savings)}</p>
              </button>
            )
          })}
        </div>

        <Field label="Paciente" hint="Para enviar por WhatsApp ou contratar.">
          {(id) => <PatientPicker id={id} patients={patients} value={patientId} onChange={setPatientId} />}
        </Field>
        {pkg.validityDays && <p className="text-xs text-ink-muted">Sessões válidas por {pkg.validityDays} dias após a contratação.</p>}
      </div>
    </Modal>
  )
}
