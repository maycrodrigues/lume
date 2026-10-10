import type { Entity, Id, ISODate } from './shared'

/** Foto de acompanhamento da Paciente; pode estar ligada a um Atendimento. */
export interface Photo extends Entity {
  patientId: Id
  consultationId?: Id
  takenAt: ISODate
  region?: string
  caption?: string
  /** Arquivo da imagem (redimensionada) e da miniatura. */
  fileId: Id
  thumbnailId: Id
  mimeType: string
  width: number
  height: number
  size: number
}

export const PHOTO_REGIONS = [
  'Face — frontal',
  'Face — perfil direito',
  'Face — perfil esquerdo',
  'Face — 45° direito',
  'Face — 45° esquerdo',
  'Pescoço e colo',
  'Abdômen',
  'Costas',
  'Braços',
  'Glúteos',
  'Coxas',
  'Pernas',
  'Couro cabeludo',
] as const
