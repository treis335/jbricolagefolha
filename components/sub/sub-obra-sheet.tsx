// components/sub/sub-obra-sheet.tsx
// Admin/patrão: cria ou edita uma obra atribuída a uma empresa (com as ordens a cumprir).
"use client"
import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { type SubObra, newSubObraId, saveSubObra, deleteSubObra, explainFirebaseError } from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  obra: SubObra | null
  subUid: string
  empresaNome: string
}

export function SubObraSheet({ open, onClose, onSaved, obra, subUid, empresaNome }: Props) {
  const [nome, setNome] = useState("")
  const [morada, setMorada] = useState("")
  const [ordens, setOrdens] = useState("")
  const [estado, setEstado] = useState<SubObra["estado"]>("ativa")
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!open) return
    setNome(obra?.nome ?? ""); setMorada(obra?.morada ?? "")
    setOrdens(obra?.ordens ?? ""); setEstado(obra?.estado ?? "ativa"); setConfirmDel(false)
  }, [open, obra])

  const save = async () => {
    if (!nome.trim() || saving) return
    setSaving(true)
    try {
      await saveSubObra({
        id: obra?.id ?? newSubObraId(), subUid, nome: nome.trim(), morada: morada.trim(),
        ordens: ordens.trim(), estado, criadaEm: obra?.criadaEm,
      })
      onSaved(); onClose()
    } catch (err) { alert(`Não foi possível guardar a obra: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  const del = async () => {
    if (!obra) return
    if (!confirmDel) { setConfirmDel(true); return }
    await deleteSubObra(obra.id).catch(() => {})
    onSaved(); onClose()
  }

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl z-[120]">
        <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <SheetHeader className="text-left space-y-0">
            <SheetTitle className="text-xl font-black">{obra ? "Editar obra" : "Nova obra"}</SheetTitle>
            <SheetDescription className="text-xs">Atribuída a {empresaNome}</SheetDescription>
          </SheetHeader>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome da obra</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Moradia Rua do Ouro" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Morada <span className="normal-case font-medium opacity-60">(opcional)</span></label>
            <Input value={morada} onChange={e => setMorada(e.target.value)} placeholder="Rua, código postal, cidade" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Ordens / o que fazer</label>
            <Textarea value={ordens} onChange={e => setOrdens(e.target.value)} rows={5}
              placeholder="Descreve o trabalho que a empresa deve executar…" className="rounded-xl resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50">
            {(["ativa", "concluida"] as const).map(e => (
              <button key={e} type="button" onClick={() => setEstado(e)}
                className={`h-9 rounded-lg text-xs font-bold ${estado === e ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                {e === "ativa" ? "Ativa" : "Concluída"}
              </button>
            ))}
          </div>

          <div className="flex gap-2.5 pt-1">
            {obra && (
              <button type="button" onClick={del}
                className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 ${confirmDel ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}>
                <Trash2 className="h-4 w-4" />{confirmDel ? "Confirmar" : ""}
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-border/45 text-sm font-semibold">Cancelar</button>
            <button type="button" onClick={save} disabled={!nome.trim() || saving}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
