// components/sub/sub-equipa-view.tsx
// Equipa do subempreiteiro: nome do colaborador + valor/hora. Usada no calendário para registar horas.
"use client"
import { useState } from "react"
import { Plus, Trash2, Users, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { type SubMembro, newId, saveSubEquipa, explainFirebaseError } from "@/lib/subempreiteiros-service"

const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isFinite(n) && n > 0 ? n : 0 }
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

export function SubEquipaView({ uid, equipa, onSaved }: { uid: string; equipa: SubMembro[]; onSaved: () => void }) {
  const [nome, setNome] = useState("")
  const [valor, setValor] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const persist = async (lista: SubMembro[]) => {
    setSaving(true)
    try { await saveSubEquipa(uid, lista); onSaved() }
    catch (err) { alert(`Não foi possível guardar: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  const adicionar = async () => {
    if (!nome.trim()) return
    await persist([...equipa, { id: newId(), nome: nome.trim(), valorHora: num(valor) }])
    setNome(""); setValor("")
  }

  // edição inline — grava ao sair do campo
  const editar = (id: string, patch: Partial<SubMembro>) => {
    const novo = equipa.map(m => m.id === id ? { ...m, ...patch } : m)
    if (JSON.stringify(novo) !== JSON.stringify(equipa)) persist(novo)
  }

  const remover = async (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setConfirmDel(null)
    await persist(equipa.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm font-black">A minha equipa</p>
          <p className="text-[11px] text-muted-foreground">Define cada colaborador e o valor/hora. Depois escolhes no calendário quem trabalhou e quantas horas.</p>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-3 space-y-2.5">
        <p className={lbl}>Novo colaborador</p>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="h-11 rounded-xl" />
          <Input inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="€/hora" className="h-11 rounded-xl" />
        </div>
        <button onClick={adicionar} disabled={!nome.trim() || saving}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98]">
          <Plus className="h-4 w-4" />Adicionar
        </button>
      </div>

      {equipa.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Ainda sem colaboradores na equipa.</p>
      ) : (
        <div className="space-y-2">
          {equipa.map(m => (
            <div key={m.id} className="rounded-2xl border border-border/40 bg-card p-3 flex items-center gap-2">
              <Input defaultValue={m.nome} onBlur={e => e.target.value.trim() && editar(m.id, { nome: e.target.value.trim() })}
                className="h-10 rounded-lg text-sm font-semibold flex-1 min-w-0" />
              <div className="relative w-24 shrink-0">
                <Input inputMode="decimal" defaultValue={m.valorHora ? String(m.valorHora) : ""} placeholder="0"
                  onBlur={e => editar(m.id, { valorHora: num(e.target.value) })} className="h-10 rounded-lg text-sm pr-9" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">€/h</span>
              </div>
              <button onClick={() => remover(m.id)} aria-label="Remover"
                className={`h-10 px-2.5 rounded-lg flex items-center gap-1 text-xs font-bold shrink-0 ${confirmDel === m.id ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}>
                <Trash2 className="h-4 w-4" />{confirmDel === m.id ? "Sim" : ""}
              </button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Alterar o valor/hora só afeta registos futuros — os dias já registados mantêm o valor da altura.
          </p>
        </div>
      )}
    </div>
  )
}
