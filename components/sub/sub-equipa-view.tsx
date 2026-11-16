// components/sub/sub-equipa-view.tsx
// A equipa do empreiteiro: cada pessoa com o valor/hora. Toca numa pessoa para editar; "+ Adicionar" para criar.
"use client"
import { useState } from "react"
import { Plus, Users, Loader2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { type SubMembro, newId, saveSubEquipa, fmtEuro, iniciais, explainFirebaseError } from "@/lib/subempreiteiros-service"

const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isFinite(n) && n > 0 ? n : 0 }
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

export function SubEquipaView({ uid, equipa, onSaved, semTitulo }: { uid: string; equipa: SubMembro[]; onSaved: () => void; semTitulo?: boolean }) {
  const [edit, setEdit] = useState<SubMembro | "novo" | null>(null)
  const [nome, setNome] = useState("")
  const [valor, setValor] = useState("")
  const [saving, setSaving] = useState(false)
  const [remover, setRemover] = useState<SubMembro | null>(null)

  const abrir = (m: SubMembro | "novo") => {
    setEdit(m)
    setNome(m === "novo" ? "" : m.nome)
    setValor(m === "novo" || !m.valorHora ? "" : String(m.valorHora))
  }

  const persist = async (lista: SubMembro[]) => {
    setSaving(true)
    try { await saveSubEquipa(uid, lista); onSaved(); return true }
    catch (err) { alert(`Não foi possível guardar: ${explainFirebaseError(err)}`); return false }
    finally { setSaving(false) }
  }

  const guardar = async () => {
    if (!nome.trim() || !edit) return
    const lista = edit === "novo"
      ? [...equipa, { id: newId(), nome: nome.trim(), valorHora: num(valor) }]
      : equipa.map(m => m.id === edit.id ? { ...m, nome: nome.trim(), valorHora: num(valor) } : m)
    if (await persist(lista)) setEdit(null)
  }

  const confirmarRemover = async () => {
    if (!remover) return
    if (await persist(equipa.filter(m => m.id !== remover.id))) { setRemover(null); setEdit(null) }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        {!semTitulo && (
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black tracking-tight">A minha equipa</h2>
            <p className="text-xs text-muted-foreground">Quem trabalha contigo e quanto custa por hora</p>
          </div>
        )}
        {semTitulo && <div className="flex-1" />}
        <button onClick={() => abrir("novo")}
          className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 active:scale-95 shadow-lg shadow-primary/20 shrink-0">
          <Plus className="h-4 w-4" />Adicionar
        </button>
      </div>

      {equipa.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Users className="h-7 w-7" /></div>
          <p className="text-base font-black">Ainda sem equipa</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">Adiciona cada colaborador com o valor/hora. Depois escolhes quem trabalhou em cada dia, no calendário.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {equipa.map(m => (
            <button key={m.id} onClick={() => abrir(m)}
              className="w-full text-left rounded-2xl border border-border/40 bg-card shadow-sm p-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">{iniciais(m.nome)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">{m.nome}</p>
                <p className="text-[11px] text-muted-foreground">{m.valorHora ? `${fmtEuro(m.valorHora)} por hora` : "Sem valor/hora"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </button>
          ))}
          <p className="text-[10px] text-muted-foreground/60 text-center pt-1">Alterar o valor/hora só afeta registos futuros — os dias já registados mantêm o valor da altura.</p>
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="max-w-md rounded-3xl p-5 gap-4">
          <div>
            <DialogTitle className="text-lg font-black">{edit === "novo" ? "Novo colaborador" : "Editar colaborador"}</DialogTitle>
            <DialogDescription className="text-xs">Nome e quanto custa por hora de trabalho</DialogDescription>
          </div>
          <div className="space-y-1.5">
            <label className={lbl}>Nome</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: João Silva" className="h-12 rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <label className={lbl}>Valor por hora</label>
            <div className="relative">
              <Input inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="h-12 rounded-2xl pr-14 text-lg font-black tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€/h</span>
            </div>
          </div>
          <button onClick={guardar} disabled={!nome.trim() || saving}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar
          </button>
          {edit && edit !== "novo" && (
            <button onClick={() => setRemover(edit)} className="text-xs font-bold text-destructive py-1 active:opacity-60">Remover da equipa</button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!remover} onOpenChange={o => !o && !saving && setRemover(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {remover?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>Deixa de aparecer na lista para novos dias. Os dias já registados mantêm-se como estão.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); confirmarRemover() }} disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving ? "A remover…" : "Remover"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
