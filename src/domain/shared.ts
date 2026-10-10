/** Identificador opaco de entidade (UUID). */
export type Id = string
/** Data civil no formato `YYYY-MM-DD`. */
export type ISODate = string
/** Instante no formato ISO 8601 completo. */
export type ISODateTime = string
/** Valor monetário em centavos de real — nunca usar ponto flutuante para dinheiro. */
export type Cents = number

export interface Entity {
  id: Id
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string = 'domain',
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(what: string) {
    super(`${what} não encontrado(a).`, 'not_found')
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends DomainError {
  constructor(readonly issues: string[]) {
    super(issues.join(' '), 'validation')
    this.name = 'ValidationError'
  }
}

export const sumCents = (values: Cents[]): Cents => values.reduce((total, v) => total + v, 0)

/** Normaliza texto para busca: minúsculas, sem acentos. */
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
