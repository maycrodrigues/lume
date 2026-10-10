import { useForm } from 'react-hook-form'
import type { PatientInput } from '@/application'
import type { Patient } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSubmit } from '../../hooks/useAction'
import { formatCpf, formatPhone, maskCpf, maskPhone } from '../../lib/format'
import { GENDERS, MARITAL_STATUS } from '../../lib/labels'

const REFERRALS = ['Instagram', 'Indicação', 'Google', 'Passou em frente', 'Facebook', 'Evento']

type FormValues = Required<Omit<PatientInput, 'gender' | 'maritalStatus'>> & { gender: Patient['gender']; maritalStatus: string }

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

const maskZip = (v: string) => v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')

const toForm = (p?: Patient): FormValues => ({
  name: p?.name ?? '',
  birthDate: p?.birthDate ?? '',
  cpf: formatCpf(p?.cpf),
  rg: p?.rg ?? '',
  gender: p?.gender ?? 'female',
  maritalStatus: p?.maritalStatus ?? '',
  phone: formatPhone(p?.phone),
  phoneAlt: formatPhone(p?.phoneAlt),
  email: p?.email ?? '',
  address: p?.address ?? '',
  neighborhood: p?.neighborhood ?? '',
  city: p?.city ?? '',
  state: p?.state ?? '',
  zipCode: p?.zipCode ?? '',
  occupation: p?.occupation ?? '',
  referralSource: p?.referralSource ?? '',
  notes: p?.notes ?? '',
})

interface Props {
  open: boolean
  onClose: () => void
  patient?: Patient
  onSaved?: (p: Patient) => void
}

export function PatientFormModal(props: Props) {
  return props.open ? <PatientFormDialog {...props} /> : null
}

function PatientFormDialog({ patient, onClose, onSaved }: Props) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { register, handleSubmit, setValue } = useForm<FormValues>({ defaultValues: toForm(patient) })

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(patient ? 'patient.update' : 'patient.create', () =>
      patient ? services.patients.update(patient.id, values as PatientInput) : services.patients.create(values as PatientInput),
      { success: patient ? 'Cadastro atualizado.' : 'Paciente cadastrada.' },
    )
    if (result.ok) {
      onSaved?.(result.value)
      onClose()
    }
  })

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={patient ? 'Editar cadastro' : 'Nova paciente'}
      description="Dados pessoais e de contato. A anamnese fica no prontuário."
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>{patient ? 'Salvar alterações' : 'Cadastrar paciente'}</Button>
        </>
      }
    >
      {error && <Alert className="mb-5">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-6">
        <Field label="Nome completo" required className="sm:col-span-4">
          {(id) => <Input id={id} data-autofocus {...register('name')} />}
        </Field>
        <Field label="Data de nascimento" className="sm:col-span-2">
          {(id) => <Input id={id} type="date" {...register('birthDate')} />}
        </Field>
        <Field label="CPF" className="sm:col-span-2">
          {(id) => <Input id={id} inputMode="numeric" placeholder="000.000.000-00" {...register('cpf', { onChange: (e) => setValue('cpf', maskCpf(e.target.value)) })} />}
        </Field>
        <Field label="RG" className="sm:col-span-2">
          {(id) => <Input id={id} {...register('rg')} />}
        </Field>
        <Field label="Gênero" className="sm:col-span-2">
          {(id) => (
            <Select id={id} {...register('gender')}>
              {Object.entries(GENDERS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Estado civil" className="sm:col-span-2">
          {(id) => (
            <Select id={id} {...register('maritalStatus')}>
              <option value="">Não informado</option>
              {Object.entries(MARITAL_STATUS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Profissão" className="sm:col-span-4">
          {(id) => <Input id={id} {...register('occupation')} />}
        </Field>
        <Field label="Celular / WhatsApp" className="sm:col-span-2">
          {(id) => <Input id={id} inputMode="tel" placeholder="(11) 99999-9999" {...register('phone', { onChange: (e) => setValue('phone', maskPhone(e.target.value)) })} />}
        </Field>
        <Field label="Telefone residencial / comercial" className="sm:col-span-2">
          {(id) => <Input id={id} inputMode="tel" {...register('phoneAlt', { onChange: (e) => setValue('phoneAlt', maskPhone(e.target.value)) })} />}
        </Field>
        <Field label="E-mail" className="sm:col-span-2">
          {(id) => <Input id={id} type="email" {...register('email')} />}
        </Field>
        <Field label="Endereço" className="sm:col-span-4">
          {(id) => <Input id={id} placeholder="Rua, número, complemento" {...register('address')} />}
        </Field>
        <Field label="CEP" className="sm:col-span-2">
          {(id) => <Input id={id} inputMode="numeric" placeholder="00000-000" {...register('zipCode', { onChange: (e) => setValue('zipCode', maskZip(e.target.value)) })} />}
        </Field>
        <Field label="Bairro" className="sm:col-span-2">
          {(id) => <Input id={id} {...register('neighborhood')} />}
        </Field>
        <Field label="Cidade" className="sm:col-span-3">
          {(id) => <Input id={id} {...register('city')} />}
        </Field>
        <Field label="UF" className="sm:col-span-1">
          {(id) => (
            <Select id={id} {...register('state')}>
              <option value="" />
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Como conheceu a clínica" className="sm:col-span-6">
          {(id) => (
            <>
              <Input id={id} list="referrals" {...register('referralSource')} />
              <datalist id="referrals">
                {REFERRALS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Observações" className="sm:col-span-6">
          {(id) => <Textarea id={id} rows={2} {...register('notes')} />}
        </Field>
      </div>
    </Modal>
  )
}
