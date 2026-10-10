import { ArrowLeft, Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ClinicSettings } from '@/domain'
import { LumeIcon } from '../brand/Logo'
import { Button } from '../ui/Button'

/** Folha A4 com a identidade da LUME: cabeçalho, conteúdo, assinaturas e rodapé. */
export function PrintSheet({ clinic, onPrint, children, signatures = [] }: { clinic: ClinicSettings; onPrint: () => void; children: ReactNode; signatures?: Array<{ name: string; detail?: string }> }) {
  return (
    <div className="min-h-dvh bg-offwhite py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] items-center justify-between px-4">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => history.back()}>Voltar</Button>
        <Button
          icon={<Printer className="size-4" strokeWidth={1.5} />}
          onClick={() => {
            onPrint()
            window.print()
          }}
        >
          Imprimir / salvar PDF
        </Button>
      </div>

      <article className="mx-auto flex min-h-[277mm] max-w-[210mm] flex-col bg-white px-[18mm] py-[16mm] shadow-card print:min-h-0 print:p-0 print:shadow-none">
        <header className="flex items-center justify-between border-b border-perola pb-6">
          <div className="flex items-center gap-4">
            <LumeIcon className="size-14" tone="dark" />
            <div>
              <p className="text-2xl font-light tracking-[0.4em] text-noite">LUME</p>
              <p className="mt-1 text-[8px] font-medium tracking-[0.22em] text-ink-muted uppercase">Estética &amp; Cuidado Integrado</p>
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">{clinic.professionalName}</p>
            {clinic.professionalRegistry && <p>{clinic.professionalRegistry}</p>}
            {clinic.phone && <p>{clinic.phone}</p>}
          </div>
        </header>

        <div className="mt-8 flex-1">{children}</div>

        <div className="mt-auto break-inside-avoid pt-20">
          {signatures.length > 0 && (
            <div className="flex justify-around gap-8">
              {signatures.map((s) => (
                <div key={s.name} className="w-64 border-t border-ink/40 pt-2 text-center text-xs text-ink-soft">
                  <p className="font-medium text-ink">{s.name}</p>
                  {s.detail && <p>{s.detail}</p>}
                </div>
              ))}
            </div>
          )}
          <footer className="mt-10 flex items-center justify-between border-t border-perola pt-4 text-[10px] tracking-wide text-ink-muted">
            <span>{[clinic.address, clinic.email, clinic.instagram].filter(Boolean).join(' · ') || clinic.clinicName}</span>
            <span className="tracking-[0.2em] uppercase">Beleza que equilibra, saúde que ilumina.</span>
          </footer>
        </div>
      </article>
    </div>
  )
}
