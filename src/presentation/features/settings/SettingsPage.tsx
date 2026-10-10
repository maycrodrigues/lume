import { DatabaseBackup, Download, HardDrive, Sparkles, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { SettingsInput } from '@/application'
import type { ClinicSettings } from '@/domain'
import { useServices } from '../../app/services'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/Confirm'
import { Field, Input } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAction, useSubmit } from '../../hooks/useAction'
import { useLiveQuery } from '../../hooks/useLiveQuery'
import { downloadJson, timeAgo, toDateInput } from '../../lib/format'
import { WorkingHoursCard } from './WorkingHoursCard'

const COUNT_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  procedures: 'Procedimentos',
  appointments: 'Agendamentos',
  consultations: 'Atendimentos',
  prescriptions: 'Prescrições',
  financialEntries: 'Lançamentos',
  assessments: 'Fichas de avaliação',
  photos: 'Fotos',
  packages: 'Pacotes',
  patientPackages: 'Pacotes contratados',
  coupons: 'Cupons',
  issuedCoupons: 'Cupons emitidos',
  scheduleBlocks: 'Bloqueios de agenda',
  activity: 'Registros de atividade',
}

function ClinicForm({ settings }: { settings: ClinicSettings }) {
  const services = useServices()
  const { submit, pending, error } = useSubmit()
  const { register, handleSubmit, reset, formState } = useForm<Required<SettingsInput>>({
    defaultValues: {
      clinicName: settings.clinicName,
      professionalName: settings.professionalName,
      professionalRegistry: settings.professionalRegistry ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      address: settings.address ?? '',
      instagram: settings.instagram ?? '',
    },
  })
  const onSubmit = handleSubmit(async (values) => {
    const result = await submit('settings.save', () => services.settings.save(values), { success: 'Dados da clínica salvos.' })
    if (result.ok) reset(values)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-5 pb-5">
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da clínica" required>{(id) => <Input id={id} {...register('clinicName')} />}</Field>
        <Field label="Profissional responsável" required>{(id) => <Input id={id} {...register('professionalName')} />}</Field>
        <Field label="Registro profissional" hint="Aparece na prescrição. Ex.: CRBM 12345">{(id) => <Input id={id} {...register('professionalRegistry')} />}</Field>
        <Field label="Telefone">{(id) => <Input id={id} {...register('phone')} />}</Field>
        <Field label="E-mail">{(id) => <Input id={id} type="email" {...register('email')} />}</Field>
        <Field label="Instagram">{(id) => <Input id={id} placeholder="@lume.estetica" {...register('instagram')} />}</Field>
        <Field label="Endereço" className="sm:col-span-2">{(id) => <Input id={id} {...register('address')} />}</Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={!formState.isDirty}>Salvar</Button>
      </div>
    </form>
  )
}

export function SettingsPage() {
  const services = useServices()
  const confirm = useConfirm()
  const action = useAction()
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: settings } = useLiveQuery(() => services.settings.get(), [], ['settings'])
  const { data: stats } = useLiveQuery(() => services.backup.stats(), [], ['patients', 'procedures', 'appointments', 'consultations', 'prescriptions', 'financialEntries', 'assessments', 'photos', 'packages', 'patientPackages', 'coupons', 'issuedCoupons', 'scheduleBlocks', 'activity'])
  const { data: photoUsage } = useLiveQuery(() => services.photos.storageUsage(), [], ['photos'])
  const { data: lastBackup } = useLiveQuery(() => services.activity.query({ category: 'system', search: 'backup.export', limit: 1 }), [], ['activity'])
  const [storage, setStorage] = useState<{ persisted: boolean; usage?: number }>()

  useEffect(() => {
    void Promise.all([navigator.storage?.persisted?.() ?? false, navigator.storage?.estimate?.()]).then(([persisted, estimate]) =>
      setStorage({ persisted: Boolean(persisted), usage: estimate?.usage }),
    )
  }, [])

  const exportBackup = () =>
    action('backup.export', async () => {
      const file = await services.backup.exportData()
      downloadJson(`lume-backup-${toDateInput(new Date())}.json`, file)
    }, { success: 'Backup exportado. Guarde o arquivo em local seguro.' })

  const importBackup = async (file: File) => {
    const ok = await confirm({
      title: 'Restaurar backup',
      message: `Todos os dados atuais serão substituídos pelos do arquivo "${file.name}". Os registros de atividade são preservados. Recomenda-se exportar um backup antes.`,
      confirmLabel: 'Restaurar',
      typeToConfirm: 'RESTAURAR',
    })
    if (!ok) return
    await action('backup.import', async () => services.backup.importData(JSON.parse(await file.text())), { success: 'Backup restaurado.' })
  }

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Apagar todos os dados',
      message: 'Pacientes, prontuários, agenda, procedimentos e finanças serão apagados deste computador. Os registros de atividade são preservados. Esta ação não pode ser desfeita sem um backup.',
      confirmLabel: 'Apagar tudo',
      typeToConfirm: 'APAGAR',
    })
    if (ok) await action('data.clear', () => services.backup.clearAll(), { success: 'Dados apagados.' })
  }

  return (
    <>
      <PageHeader eyebrow="Sistema" title="Configurações" description="Dados da clínica, backup e armazenamento." />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Clínica" title="Dados da clínica e da profissional" />
            {settings && <ClinicForm key={settings.updatedAt} settings={settings} />}
          </Card>
          <WorkingHoursCard />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Segurança dos dados" title="Backup" />
            <div className="space-y-4 px-5 pb-5">
              <Alert tone={lastBackup?.length ? 'info' : 'warning'}>
                {lastBackup?.length ? `Último backup exportado ${timeAgo(lastBackup[0].timestamp)}.` : 'Nenhum backup exportado ainda.'} Os dados ficam apenas neste navegador — exporte um backup com frequência. O arquivo inclui as fotos.
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button icon={<Download className="size-4" strokeWidth={1.5} />} onClick={exportBackup}>Exportar backup</Button>
                <Button variant="secondary" icon={<Upload className="size-4" strokeWidth={1.5} />} onClick={() => fileRef.current?.click()}>Restaurar backup</Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void importBackup(file)
                  }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Armazenamento" title="Dados neste computador" />
            <div className="space-y-4 px-5 pb-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {stats &&
                  Object.entries(stats)
                    .filter(([k]) => k !== 'settings' && k !== 'files')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-line pb-1.5">
                        <dt className="text-ink-muted">{COUNT_LABELS[k] ?? k}</dt>
                        <dd className="num text-ink">{v}</dd>
                      </div>
                    ))}
              </dl>
              {storage && (
                <p className="flex items-center gap-2 text-xs text-ink-muted">
                  <HardDrive className="size-3.5" strokeWidth={1.5} />
                  {storage.persisted ? 'Armazenamento persistente concedido pelo navegador' : 'Armazenamento não persistente — o navegador pode limpar os dados se faltar espaço'}
                  {storage.usage !== undefined && ` · ${(storage.usage / 1024 / 1024).toFixed(1)} MB em uso`}
                  {photoUsage && photoUsage.count > 0 && ` (fotos: ${(photoUsage.bytes / 1024 / 1024).toFixed(1)} MB)`}
                </p>
              )}
              {stats?.patients === 0 && (
                <Button variant="soft" icon={<Sparkles className="size-4" strokeWidth={1.5} />} onClick={() => action('demo.load', () => services.backup.loadDemoData(), { success: 'Dados de demonstração carregados.' })}>
                  Carregar dados de demonstração
                </Button>
              )}
            </div>
          </Card>

          <Card className="border-danger/20">
            <CardHeader eyebrow="Zona de cuidado" title="Apagar dados" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
              <p className="max-w-xs text-sm text-ink-muted">Remove todos os dados do painel neste computador. Útil para sair do modo de demonstração.</p>
              <Button variant="danger" icon={<Trash2 className="size-4" strokeWidth={1.5} />} onClick={clearAll}>Apagar tudo</Button>
            </div>
          </Card>
        </div>
      </div>
      <p className="mt-8 flex items-center justify-center gap-2 text-[11px] tracking-wide text-ink-muted">
        <DatabaseBackup className="size-3.5" strokeWidth={1.5} />
        LUME · Painel de gestão v0.1 · dados locais (IndexedDB)
      </p>
    </>
  )
}
