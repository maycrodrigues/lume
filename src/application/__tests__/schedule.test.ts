import { describe, expect, it } from 'vitest'
import { ScheduleConflictError } from '@/domain'
import { at, seedBasics, setup } from './setup'

describe('Agenda', () => {
  it('calcula o término pela soma das durações e guarda o valor dos procedimentos', async () => {
    const { services } = setup()
    const { maria, limpeza, drenagem } = await seedBasics(services)

    const a = await services.appointments.schedule({
      patientId: maria.id,
      start: at('2026-10-12T14:00'),
      procedureIds: [limpeza.id, drenagem.id],
    })

    expect(a.end).toBe(at('2026-10-12T15:50'))
    expect(a.status).toBe('scheduled')
    const [view] = await services.appointments.listRange(at('2026-10-12T00:00'), at('2026-10-13T00:00'))
    expect(view).toMatchObject({ patientName: 'Maria Souza', total: 33000 })
  })

  it('recusa dois agendamentos no mesmo horário — sem exceção', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const ana = await services.patients.create({ name: 'Ana Lima' })
    await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })

    await expect(
      services.appointments.schedule({ patientId: ana.id, start: at('2026-10-12T14:30'), procedureIds: [limpeza.id] }),
    ).rejects.toBeInstanceOf(ScheduleConflictError)
  })

  it('exige 15 minutos de intervalo entre pacientes diferentes', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const ana = await services.patients.create({ name: 'Ana Lima' })
    await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })

    await expect(
      services.appointments.schedule({ patientId: ana.id, start: at('2026-10-12T15:00'), procedureIds: [limpeza.id] }),
    ).rejects.toThrow('intervalo de 15 minutos')
    await expect(
      services.appointments.schedule({ patientId: ana.id, start: at('2026-10-12T12:50'), procedureIds: [limpeza.id] }),
    ).rejects.toThrow('intervalo de 15 minutos')
    await expect(
      services.appointments.schedule({ patientId: ana.id, start: at('2026-10-12T15:15'), procedureIds: [limpeza.id] }),
    ).resolves.toBeDefined()
    await expect(
      services.appointments.schedule({ patientId: ana.id, start: at('2026-10-12T12:45'), procedureIds: [limpeza.id] }),
    ).resolves.toBeDefined()
  })

  it('a mesma paciente pode ter horários colados, sem intervalo', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })
    await expect(
      services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T15:00'), procedureIds: [limpeza.id] }),
    ).resolves.toBeDefined()
  })

  it('agendamentos cancelados liberam o horário', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const a = await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })
    await services.appointments.setStatus(a.id, 'cancelled')

    await expect(
      services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] }),
    ).resolves.toBeDefined()
  })

  it('remarcar não conflita consigo mesmo', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const a = await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })
    const moved = await services.appointments.reschedule(a.id, { patientId: maria.id, start: at('2026-10-12T14:30'), procedureIds: [limpeza.id] })
    expect(moved.start).toBe(at('2026-10-12T14:30'))
  })

  it('só chega a "Realizado" registrando um atendimento', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const a = await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })
    await expect(services.appointments.setStatus(a.id, 'completed')).rejects.toThrow('não é permitida')
  })
})

describe('Horário de atendimento', () => {
  it('só agenda dentro do horário do dia (padrão: seg–sex 10h–17h, sáb 12h–16h, domingo fechado)', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const book = (local: string) => services.appointments.schedule({ patientId: maria.id, start: at(local), procedureIds: [limpeza.id] })

    await expect(book('2026-10-12T09:00')).rejects.toThrow('Fora do horário de atendimento (segunda-feira: 10:00–17:00)')
    await expect(book('2026-10-12T16:30')).rejects.toThrow('iria das 16:30 às 17:30')
    await expect(book('2026-10-11T12:00')).rejects.toThrow('não atende aos domingos')
    await expect(book('2026-10-17T15:30')).rejects.toThrow('sábado: 12:00–16:00')
    await expect(book('2026-10-12T16:00')).resolves.toBeDefined()
    await expect(book('2026-10-17T12:00')).resolves.toBeDefined()
  })

  it('o horário configurado passa a valer para novos agendamentos, sem apagar os dados da clínica', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await services.settings.save({ clinicName: 'LUME', professionalName: 'Ana' })
    const hours = await services.settings.workingHours()
    hours.days[0] = { open: true, start: '09:00', end: '12:00' }
    hours.intervalMinutes = 30
    await services.settings.saveWorkingHours(hours)

    expect((await services.settings.get()).clinicName).toBe('LUME')
    await expect(services.appointments.schedule({ patientId: maria.id, start: at('2026-10-11T09:00'), procedureIds: [limpeza.id] })).resolves.toBeDefined()
    await expect(services.settings.saveWorkingHours({ ...hours, days: hours.days.map((d) => ({ ...d, start: '18:00', end: '08:00' })) })).rejects.toThrow('início deve ser antes do fim')
  })

  it('bloqueio de dia inteiro ou de faixa de horário impede agendar', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const book = (local: string) => services.appointments.schedule({ patientId: maria.id, start: at(local), procedureIds: [limpeza.id] })
    await services.schedule.createBlock({ startDate: '2026-10-14', endDate: '2026-10-14', reason: 'Feriado municipal' })
    await services.schedule.createBlock({ startDate: '2026-10-15', endDate: '2026-10-15', startTime: '13:00', endTime: '15:00', reason: 'Curso' })

    await expect(book('2026-10-14T10:00')).rejects.toThrow('Agenda bloqueada em 14/10/2026 (Feriado municipal)')
    await expect(book('2026-10-15T14:00')).rejects.toThrow('Curso')
    await expect(book('2026-10-15T12:30')).rejects.toThrow('Curso')
    await expect(book('2026-10-15T15:00')).resolves.toBeDefined()
  })

  it('ao bloquear, avisa quais agendamentos já existem no período', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-20T10:00'), procedureIds: [limpeza.id] })
    const { affected } = await services.schedule.createBlock({ startDate: '2026-10-19', endDate: '2026-10-23', reason: 'Férias' })
    expect(affected.map((a) => a.patientName)).toEqual(['Maria Souza'])
    await expect(services.schedule.createBlock({ startDate: '2026-10-25', endDate: '2026-10-24' })).rejects.toThrow('data final')
  })

  it('lista os horários livres do dia para a duração pedida', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const ana = await services.patients.create({ name: 'Ana Lima' })
    await services.appointments.schedule({ patientId: maria.id, start: at('2026-10-12T14:00'), procedureIds: [limpeza.id] })

    const slots = await services.schedule.freeSlots({ date: '2026-10-12', durationMinutes: 60, patientId: ana.id })
    expect(slots[0]).toBe('10:00')
    expect(slots).toContain('12:45')
    expect(slots).not.toContain('13:00')
    expect(slots).not.toContain('15:00')
    expect(slots).toContain('15:15')
    expect(slots.at(-1)).toBe('16:00')
    expect(await services.schedule.freeSlots({ date: '2026-10-11', durationMinutes: 60 })).toEqual([])
  })

  it('informa o horário e os bloqueios de cada dia para a agenda', async () => {
    const { services } = setup()
    await services.schedule.createBlock({ startDate: '2026-10-15', endDate: '2026-10-15', startTime: '13:00', endTime: '15:00', reason: 'Curso' })
    const days = await services.schedule.availability('2026-10-11', '2026-10-15')
    expect(days.map((d) => [d.date, d.open, d.start, d.end])).toEqual([
      ['2026-10-11', false, undefined, undefined],
      ['2026-10-12', true, '10:00', '17:00'],
      ['2026-10-13', true, '10:00', '17:00'],
      ['2026-10-14', true, '10:00', '17:00'],
      ['2026-10-15', true, '10:00', '17:00'],
    ])
    expect(days[4].blocks).toMatchObject([{ start: '13:00', end: '15:00', reason: 'Curso', fullDay: false }])
  })
})
