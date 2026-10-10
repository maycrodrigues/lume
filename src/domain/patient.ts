import type { Answers } from './questionnaire'
import type { Entity, ISODate, ISODateTime } from './shared'

export type Gender = 'female' | 'male' | 'other' | 'unspecified'

export type MaritalStatus = 'single' | 'married' | 'stable_union' | 'divorced' | 'widowed'

/** Autorização de uso de imagem dada pela Paciente. */
export interface ImageConsent {
  scope: 'clinical' | 'clinical_and_marketing' | 'denied'
  date: ISODate
}

export interface Patient extends Entity {
  name: string
  birthDate?: ISODate
  cpf?: string
  rg?: string
  gender: Gender
  maritalStatus?: MaritalStatus
  phone?: string
  phoneAlt?: string
  email?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  occupation?: string
  referralSource?: string
  notes?: string
  active: boolean
  /** Respostas da Ficha de Anamnese (modelo `ANAMNESIS`). */
  anamnesis: Answers
  anamnesisUpdatedAt?: ISODateTime
  imageConsent?: ImageConsent
}

export function ageAt(birthDate: ISODate | undefined, today: Date): number | undefined {
  if (!birthDate) return undefined
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = today.getFullYear() - y
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return age
}

export const onlyDigits = (value: string): string => value.replace(/\D/g, '')

/** Valida os dígitos verificadores do CPF. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}
