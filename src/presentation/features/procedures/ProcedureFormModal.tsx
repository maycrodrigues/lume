import { Controller, useForm } from 'react-hook-form'
import type { Procedure } from '@/domain'
import { PROCEDURE_CATEGORIES } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Switch, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { useSubmit } from '../../hooks/useAction'

interface FormValues {
  name: string
  category: string
  description: string
  price: number
  durationMinutes: number
  active: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  procedure?: Procedure
}

const DURATIONS = [15, 30, 45, 60, 75, 90, 120]

export function ProcedureFormModal(props: Props) {
  return props.open ? <ProcedureFormDialog {...props} /> : null
}

function ProcedureFormDialog({ procedure, onClose }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { register, handleSubmit, control, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      name: procedure?.name ?? '',
      category: procedure?.category ?? '',
      description: procedure?.description ?? '',
      price: procedure?.price ?? 0,
      durationMinutes: procedure?.durationMinutes ?? 60,
      active: procedure?.active ?? true,
    },
  })
  const duration = watch('durationMinutes')

  const onSubmit = handleSubmit(async (values) => {
    const input = { ...values, durationMinutes: Number(values.durationMinutes) }
    const result = await submit(procedure ? 'procedure.update' : 'procedure.create', () =>
      procedure ? services.procedures.update(procedure.id, input) : services.procedures.create(input),
      { success: procedure ? 'Procedimento atualizado.' : 'Procedimento cadastrado.' },
    )
    if (result.ok) onClose()
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={procedure ? 'Editar procedimento' : 'Novo procedimento'}
      description="Valor e duração padrão — podem ser ajustados em cada atendimento."
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>{procedure ? 'Salvar alterações' : 'Cadastrar procedimento'}</Button>
        </>
      }
    >
      {error && <Alert className="mb-5">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" required className="sm:col-span-2">
          {(id) => <Input id={id} data-autofocus placeholder="Ex.: Limpeza de pele profunda" {...register('name')} />}
        </Field>
        <Field label="Categoria" required>
          {(id) => (
            <>
              <Input id={id} list="procedure-categories" placeholder="Ex.: Facial" {...register('category')} />
              <datalist id="procedure-categories">
                {PROCEDURE_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Valor" required>
          {(id) => <Controller control={control} name="price" render={({ field }) => <MoneyInput id={id} value={field.value} onChange={field.onChange} />} />}
        </Field>
        <Field label="Duração (minutos)" required className="sm:col-span-2">
          {(id) => (
            <div className="flex flex-wrap items-center gap-2">
              <Input id={id} type="number" min={5} step={5} className="w-28" {...register('durationMinutes', { valueAsNumber: true })} />
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setValue('durationMinutes', d)}
                  className={`h-8 rounded-full px-3 text-xs transition-colors ${Number(duration) === d ? 'bg-noite text-white' : 'bg-perola-soft text-ink-soft hover:bg-perola'}`}
                >
                  {d} min
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label="Descrição" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={3} placeholder="O que inclui, indicações, cuidados…" {...register('description')} />}
        </Field>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} label="Disponível para agendamento" description="Procedimentos inativos não aparecem ao agendar, mas continuam no histórico." />
            )}
          />
        </div>
      </div>
    </Modal>
  )
}
