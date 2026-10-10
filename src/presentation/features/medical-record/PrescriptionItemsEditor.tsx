import { Plus, X } from 'lucide-react'
import type { PrescriptionItem } from '@/domain'
import { Button, IconButton } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'

export type PrescriptionItemDraft = PrescriptionItem & { key: string }

export const emptyItem = (): PrescriptionItemDraft => ({ key: crypto.randomUUID(), name: '', dosage: '', instructions: '' })

export const toDrafts = (items: PrescriptionItem[]): PrescriptionItemDraft[] =>
  items.length ? items.map((i) => ({ ...i, dosage: i.dosage ?? '', key: crypto.randomUUID() })) : [emptyItem()]

export const fromDrafts = (drafts: PrescriptionItemDraft[]): PrescriptionItem[] =>
  drafts.map(({ name, dosage, instructions }) => ({ name, dosage: dosage || undefined, instructions }))

export function PrescriptionItemsEditor({ items, onChange }: { items: PrescriptionItemDraft[]; onChange: (items: PrescriptionItemDraft[]) => void }) {
  const update = (key: string, patch: Partial<PrescriptionItem>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-12 gap-2 px-1 text-[11px] font-medium tracking-wide text-ink-muted uppercase sm:grid">
        <span className="col-span-4">Item / produto</span>
        <span className="col-span-2">Dose / qtd.</span>
        <span className="col-span-5">Modo de uso</span>
      </div>
      {items.map((item, index) => (
        <div key={item.key} className="grid grid-cols-12 gap-2">
          <Input className="col-span-12 sm:col-span-4" placeholder={`Item ${index + 1}`} value={item.name} onChange={(e) => update(item.key, { name: e.target.value })} aria-label={`Item ${index + 1}`} />
          <Input className="col-span-4 sm:col-span-2" placeholder="Ex.: 5 gotas" value={item.dosage} onChange={(e) => update(item.key, { dosage: e.target.value })} aria-label="Dose" />
          <Input className="col-span-7 sm:col-span-5" placeholder="Ex.: aplicar pela manhã" value={item.instructions} onChange={(e) => update(item.key, { instructions: e.target.value })} aria-label="Modo de uso" />
          <IconButton label="Remover item" className="col-span-1 self-center" disabled={items.length === 1} onClick={() => onChange(items.filter((i) => i.key !== item.key))}>
            <X className="size-4" strokeWidth={1.5} />
          </IconButton>
        </div>
      ))}
      <Button variant="ghost" size="sm" icon={<Plus className="size-3.5" />} onClick={() => onChange([...items, emptyItem()])}>
        Adicionar item
      </Button>
    </div>
  )
}
