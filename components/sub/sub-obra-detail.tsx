// components/sub/sub-obra-detail.tsx
// Detalhe de uma obra atribuída: ordens + serviços (com mão-de-obra e fotos) + totais.
// Usado pela empresa e pelo admin/patrão.
"use client"
import { useState } from "react"
import { Plus, MapPin, Pencil } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { type SubObra, type SubJob, type SubDia, statsObra, fmtEuro } from "@/lib/subempreiteiros-service"
import { SubJobCard } from "./sub-job-card"
import { SubJobSheet } from "./sub-job-sheet"

interface Props {
  open: boolean
  onClose: () => void
  obra: SubObra | null
  jobs: SubJob[]              // todos os serviços da empresa (filtra aqui pela obra)
  dias: SubDia[]              // dias registados (horas e custo por obra)
  subUid: string
  empresaNome: string
  createdBy: "empresa" | "admin"
  onChanged: () => void
  onEditObra?: () => void     // só o admin/patrão
}

export function SubObraDetail({ open, onClose, obra, jobs, dias, subUid, empresaNome, createdBy, onChanged, onEditObra }: Props) {
  const [jobOpen, setJobOpen] = useState(false)
  const [editing, setEditing] = useState<SubJob | null>(null)
  if (!obra) return null

  const daObra = jobs.filter(j => j.obraId === obra.id)
  const t = statsObra(obra.id, jobs, dias)

  return (
    <>
      <Sheet open={open} onOpenChange={o => !o && onClose()}>
        <SheetContent side="bottom" className="z-[100] rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <SheetHeader className="text-left space-y-0">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl font-black">{obra.nome}</SheetTitle>
                  <SheetDescription className="text-xs flex items-center gap-1">
                    {obra.morada ? <><MapPin className="h-3 w-3" />{obra.morada}</> : empresaNome}
                  </SheetDescription>
                </div>
                {onEditObra && (
                  <button onClick={onEditObra} className="h-9 px-3 rounded-xl bg-muted text-xs font-bold flex items-center gap-1.5 active:scale-95 mr-8">
                    <Pencil className="h-3.5 w-3.5" />Editar obra
                  </button>
                )}
              </div>
            </SheetHeader>

            {obra.ordens && (
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Ordens</p>
                <p className="text-xs whitespace-pre-wrap">{obra.ordens}</p>
              </div>
            )}

            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{daObra.length} serviço(s) · {t.horas} h de equipa</span>
              <span className="text-sm font-black">{fmtEuro(t.custo)}</span>
            </div>

            {obra.estado === "ativa" && (
              <button onClick={() => { setEditing(null); setJobOpen(true) }}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98]">
                <Plus className="h-4 w-4" />Novo serviço
              </button>
            )}

            <div className="space-y-2.5">
              {daObra.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-6">Ainda sem serviços nesta obra.</p>
                : daObra.map(j => <SubJobCard key={j.id} job={j} onClick={() => { setEditing(j); setJobOpen(true) }} />)}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SubJobSheet open={jobOpen} onClose={() => setJobOpen(false)} onSaved={onChanged}
        job={editing} obra={obra} subUid={subUid} empresaNome={empresaNome} createdBy={createdBy} />
    </>
  )
}
