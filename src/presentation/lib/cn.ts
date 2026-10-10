import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta classes condicionais; em conflito (ex.: `bg-white` × `bg-noite`), vence a última. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
