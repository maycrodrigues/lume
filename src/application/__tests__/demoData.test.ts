import { describe, expect, it } from 'vitest'
import type { Appointment } from '@/domain'
import { assertWithinWorkingHours, blockRange, collides, contractUsage, DEFAULT_WORKING_HOURS, isActiveAppointment, isValidCpf } from '@/domain'
import { toLocalISODate } from '../dates'
import { buildDemoSnapshot } from '../demoData'
import { setup } from './setup'

const toLocalISODate_ = (iso: string) => toLocalISODate(new Date(iso))

const NOW = new Date('2026-10-10T11:00')
let seq = 0
const snapshot = buildDemoSnapshot(NOW, () => `demo-${++seq}`)
const appointments = snapshot.appointments!
const active = appointments.filter(isActiveAppointment)

describe('Dados de demonstração', () => {
  it('todos os agendamentos ficam dentro do horário de atendimento', () => {
    for (const a of active) {
      expect(() => assertWithinWorkingHours(DEFAULT_WORKING_HOURS, new Date(a.start), new Date(a.end)), `${a.start}`).not.toThrow()
    }
  })

  it('não há sobreposição nem falta de intervalo entre pacientes', () => {
    const byDay = new Map<string, Appointment[]>()
    active.forEach((a) => byDay.set(toLocalISODate_(a.start), [...(byDay.get(toLocalISODate_(a.start)) ?? []), a]))
    const problems: string[] = []
    for (const list of byDay.values()) {
      list.forEach((a, i) => list.slice(i + 1).forEach((b) => collides(a, b, DEFAULT_WORKING_HOURS.intervalMinutes) && problems.push(`${a.start} × ${b.start}`)))
    }
    expect(problems).toEqual([])
  })

  it('nenhum agendamento cai em bloqueio de agenda', () => {
    for (const a of active) {
      const start = new Date(a.start)
      const end = new Date(a.end)
      for (const block of snapshot.scheduleBlocks!) {
        const range = blockRange(block, toLocalISODate_(a.start))
        const from = start.getHours() * 60 + start.getMinutes()
        const to = end.getHours() * 60 + end.getMinutes()
        expect(Boolean(range && from < range.end && range.start < to), `${a.start} em bloqueio`).toBe(false)
      }
    }
  })

  it('gera pacientes realistas e coerentes', () => {
    const patients = snapshot.patients!
    expect(patients.length).toBeGreaterThanOrEqual(20)
    expect(patients.every((p) => p.cpf && isValidCpf(p.cpf))).toBe(true)
    expect(new Set(patients.map((p) => p.cpf)).size).toBe(patients.length)
    expect(patients.every((p) => /^\(\d{2}\) 9\d{4}-\d{4}$/.test(p.phone ?? ''))).toBe(true)
    expect(patients.every((p) => /^[^@\s]+@[^@\s]+\.[a-z.]+$/.test(p.email ?? ''))).toBe(true)
    for (const a of appointments) {
      const patient = patients.find((p) => p.id === a.patientId)!
      expect(patient.createdAt <= a.start).toBe(true)
    }
  })

  it('sessões de pacote e cupons usados batem com os contratos e cupons emitidos', () => {
    for (const contract of snapshot.patientPackages!) {
      const usage = contractUsage(contract, snapshot.consultations!)
      expect(usage.every((u) => u.remaining >= 0)).toBe(true)
      expect(usage.some((u) => u.used > 0)).toBe(true)
    }
    const redeemed = snapshot.issuedCoupons!.filter((c) => c.redeemedAt)
    expect(redeemed.length).toBeGreaterThan(0)
    for (const coupon of redeemed) {
      const consultation = snapshot.consultations!.find((c) => c.id === coupon.consultationId)!
      expect(consultation.coupon?.code).toBe(coupon.code)
      expect(consultation.date.slice(0, 10) >= coupon.issuedAt).toBe(true)
    }
  })

  it('é determinístico e carrega no painel vazio', async () => {
    let s = 0
    const again = buildDemoSnapshot(NOW, () => `demo-${++s}`)
    expect(again.patients!.map((p) => p.name)).toEqual(snapshot.patients!.map((p) => p.name))

    const { services } = setup('2026-10-10T11:00')
    await services.backup.loadDemoData()
    const overview = await services.dashboard.overview()
    expect(overview.kpis.activePatients).toBeGreaterThanOrEqual(20)
    await expect(services.backup.loadDemoData()).rejects.toThrow('painel vazio')
  })
})
