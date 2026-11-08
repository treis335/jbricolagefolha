// components/sub/sub-atribuir-sheet.tsx
// Admin/patrão: atribui uma obra EXISTENTE (a mesma dos colaboradores) a uma empresa, com ordens opcionais.
"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, X, Search, HardHat, ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { type Obra, formatMorada } from "@/lib/obras-service"
import { atribuirObra, explainFirebaseError } from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  empresaUid: string
  empresaNome: string
  obras: Obra[]          // todas as obras
  onDone: () => void
  onGoObras: () => void  // ir ao separador Obras criar uma nova
}

export function SubAtribuirSheet({ open, onClose, empresaUid, empresaNome, obras, onDone, onGoObras }: Props) {
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<Obra | null>(null)
  const [ordens, setOrdens] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setQ(""); setPicked(null); setOrdens("") } }, [open])

  const lista = useMemo(() => obras
    .filter(o => !(o.subUids ?? []).includes(empresaUid) && o.estado !== "concluida")
    .filter(o => !q.trim() || `${o.nome} ${formatMorada(o)}`.toLowerCase().includes(q.trim().toLowerCase())),
  [obras, empresaUid, q])

  const confirmar = async () => {
    if (!picked) return
    setSaving(true)
    try { await atribuirObra(picked.id, empresaUid, ordens); onDone(); onClose() }
    catch (err) { alert(`Não foi possível atribuir: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="z-[130] rounded-t-3xl border-0 bg-background max-h-[88dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <div className="flex items-start gap-3">
            {picked && (
              <button onClick={() => setPicked(null)} aria-label="Voltar" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><ChevronLeft className="h-4 w-4" /></button>
            )}
            <SheetHeader className="flex-1 min-w-0 text-left space-y-0">
              <SheetTitle className="text-lg font-black">{picked ? picked.nome : "Atribuir obra"}</SheetTitle>
              <SheetDescription className="text-xs">{picked ? `Ordens para ${empresaNome}` : `A ${empresaNome}`}</SheetDescription>
            </SheetHeader>
            <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><X className="h-4 w-4" /></button>
          </div>

          {!picked ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar obra…" className="h-11 rounded-xl pl-9" />
              </div>
              <div className="space-y-2">
                {lista.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Sem obras disponíveis para atribuir.</p>
                ) : lista.map(o => (
                  <button key={o.id} onClick={() => setPicked(o)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border/40 bg-card p-2.5 text-left active:scale-[0.99]">
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: `${o.cor}22` }}>
                      {o.fotoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={o.fotoUrl} alt="" className="w-full h-full object-cover" />
                        : <HardHat className="h-5 w-5" style={{ color: o.cor }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{o.nome}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{formatMorada(o) || "Sem morada"}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={onGoObras}
                className="w-full h-10 rounded-xl border border-dashed border-border/60 text-xs font-bold text-muted-foreground active:scale-[0.98]">
                Obra nova? Criar em Obras (com mapa e foto)
              </button>
            </>
          ) : (
            <>
              <Textarea value={ordens} onChange={e => setOrdens(e.target.value)} rows={5}
                placeholder="O que a empresa deve executar nesta obra (opcional)…" className="rounded-xl resize-none text-sm" />
              <button onClick={confirmar} disabled={saving}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Atribuir obra
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
