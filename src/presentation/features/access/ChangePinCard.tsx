import { KeyRound, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, Input } from '../../components/ui/Field'
import { useSubmit } from '../../hooks/useAction'
import { formatLong } from '../../lib/format'
import { useAccess } from './AccessGate'

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 4)

function PinInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return <Input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={4} className="num w-28 tracking-[0.5em]" value={value} onChange={(e) => onChange(digits(e.target.value))} />
}

/** Configurações → PIN de acesso: trocar o PIN e bloquear o painel. */
export function ChangePinCard() {
  const services = useServices()
  const { lock, until } = useAccess()
  const { submit, pending, error } = useSubmit()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await submit('access.changePin', () => services.access.changePin(current, next, confirmation), { success: 'PIN alterado.' })
    if (result.ok) {
      setCurrent('')
      setNext('')
      setConfirmation('')
    }
  }

  return (
    <Card>
      <CardHeader eyebrow="Acesso" title="PIN de acesso" />
      <form onSubmit={onSubmit} className="space-y-4 px-5 pb-5">
        <p className="text-sm text-ink-muted">
          O PIN é pedido toda segunda-feira e sempre que o painel é bloqueado. Neste navegador, o acesso está liberado até{' '}
          <strong className="font-medium text-ink">{formatLong(new Date(until))}, 00h</strong>. Bloqueie o painel ao se afastar do computador.
        </p>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap gap-4">
          <Field label="PIN atual">{(id) => <PinInput id={id} value={current} onChange={setCurrent} />}</Field>
          <Field label="Novo PIN">{(id) => <PinInput id={id} value={next} onChange={setNext} />}</Field>
          <Field label="Confirme o novo PIN">{(id) => <PinInput id={id} value={confirmation} onChange={setConfirmation} />}</Field>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="secondary" icon={<LockKeyhole className="size-4" strokeWidth={1.5} />} onClick={() => void lock()}>Bloquear agora</Button>
          <Button type="submit" loading={pending} disabled={current.length < 4 || next.length < 4 || confirmation.length < 4} icon={<KeyRound className="size-4" strokeWidth={1.5} />}>
            Alterar PIN
          </Button>
        </div>
      </form>
    </Card>
  )
}
