import { cn } from '../../lib/cn'
import { Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import type { Id, Patient } from '@/domain'
import { normalizeText } from '@/domain'
import { formatPhone } from '../../lib/format'
import { Avatar } from './Avatar'
import { controlClass } from './Field'

/** Combobox de pacientes com busca por nome ou telefone. */
export function PatientPicker({ patients, value, onChange, id, disabled }: { patients: Patient[]; value?: Id; onChange: (id: Id) => void; id?: string; disabled?: boolean }) {
  const listId = useId()
  const selected = patients.find((p) => p.id === value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const options = useMemo(() => {
    const term = normalizeText(query)
    const digits = query.replace(/\D/g, '')
    return patients
      .filter((p) => !term || normalizeText(p.name).includes(term) || (digits.length > 2 && (p.phone ?? '').replace(/\D/g, '').includes(digits)))
      .slice(0, 8)
  }, [patients, query])

  const choose = (p: Patient) => {
    onChange(p.id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        autoComplete="off"
        placeholder="Buscar paciente por nome ou telefone…"
        className={cn(controlClass, 'h-10 pl-9')}
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => {
          setOpen(true)
          setActive(0)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, options.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault()
            choose(options[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-pop">
          {options.length === 0 && <li className="px-3 py-2.5 text-sm text-ink-muted">Nenhuma paciente encontrada.</li>}
          {options.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={p.id === value}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(p)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2', i === active && 'bg-perola-soft')}
            >
              <Avatar name={p.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{p.name}</span>
                {p.phone && <span className="block text-xs text-ink-muted">{formatPhone(p.phone)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
