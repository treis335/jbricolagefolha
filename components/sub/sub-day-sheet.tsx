// components/sub/sub-day-sheet.tsx
// Registo de um dia: escolhe a obra, os colaboradores da equipa e as horas de cada um.
"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Trash2, Plus, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  type SubDia, type SubObra, type SubMembro, type SubRegisto,
  newId, saveDia, fmtEuro, explainFirebaseError,
} from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  date: string                 // YYYY-MM-DD
  dia: SubDia | null
  obras: SubObra[]
  equipa: SubMembro[]
  subUid: string
  empresaNome: string
}

const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isFinite(n) && n > 0 ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

export function SubDaySheet({ open, onClose, onSaved, date, dia, obras, equipa, subUid, empresaNome }: Props) {
  const ativas = useMemo(() => obras.filter(o => o.estado === "ativa"), [obras])
  const [registos, setRegistos] = useState<SubRegisto[]>([])
  const [obraId, setObraId] = useState("")
  const [sel, setSel] = useState<Record<string, { on: boolean; horas: string }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setRegistos(dia?.registos ?? [])
    setObraId(ativas.length === 1 ? ativas[0].id : "")
    setSel({})
  }, [open, dia, ativas])

  const toggle = (id: string) => setSel(s => ({ ...s, [id]: { on: !s[id]?.on, horas: s[id]?.horas ?? "8" } }))
  const setHoras = (id: string, h: string) => setSel(s => ({ ...s, [id]: { on: s[id]?.on ?? true, horas: h } }))

  const marcados = equipa.filter(m => sel[m.id]?.on && num(sel[m.id].horas) > 0)

  const adicionar = () => {
    const obra = ativas.find(o => o.id === obraId)
    if (!obra || marcados.length === 0) return
    setRegistos(prev => {
      let lista = [...prev]
      marcados.forEach(m => {
        const horas = num(sel[m.id].horas)
        const novo: SubRegisto = {
          id: newId(), obraId: obra.id, obraNome: obra.nome, membroId: m.id, membroNome: m.nome,
          horas, valorHora: m.valorHora, custo: r2(horas * m.valorHora),
        }
        const i = lista.findIndex(r => r.obraId === obra.id && r.membroId === m.id)
        if (i >= 0) lista[i] = { ...novo, id: lista[i].id } // mesma pessoa na mesma obra: atualiza
        else lista.push(novo)
      })
      return lista
    })
    setSel({})
  }

  const editarHoras = (id: string, v: string) =>
    setRegistos(rs => rs.map(r => r.id === id ? { ...r, horas: num(v), custo: r2(num(v) * r.valorHora) } : r))
  const remover = (id: string) => setRegistos(rs => rs.filter(r => r.id !== id))

  const totalH = registos.reduce((a, r) => a + r.horas, 0)
  const totalC = registos.reduce((a, r) => a + r.custo, 0)

  const guardar = async () => {
    setSaving(true)
    try {
      await saveDia(subUid, empresaNome, date, registos.filter(r => r.horas > 0))
      onSaved(); onClose()
    } catch (err) { alert(`Não foi possível guardar: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  const porObra = useMemo(() => {
    const m = new Map<string, SubRegisto[]>()
    registos.forEach(r => m.set(r.obraId, [...(m.get(r.obraId) ?? []), r]))
    return Array.from(m.entries())
  }, [registos])

  const titulo = new Date(date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="z-[120] rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <SheetHeader className="text-left space-y-0">
            <SheetTitle className="text-xl font-black capitalize">{titulo}</SheetTitle>
            <SheetDescription className="text-xs">{empresaNome}</SheetDescription>
          </SheetHeader>

          {/* Já registado */}
          {porObra.length > 0 && (
            <div className="space-y-3">
              {porObra.map(([oid, rs]) => (
                <div key={oid} className="rounded-2xl border border-border/40 bg-card p-3 space-y-2">
                  <p className="text-xs font-black">{rs[0].obraNome}</p>
                  {rs.map(r => (
                    <div key={r.id} className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-sm truncate">{r.membroNome}</span>
                      <Input inputMode="decimal" defaultValue={String(r.horas)} onBlur={e => editarHoras(r.id, e.target.value)}
                        className="h-9 w-16 rounded-lg text-sm text-center" />
                      <span className="text-[10px] text-muted-foreground w-5">h</span>
                      <span className="text-xs font-bold w-16 text-right">{fmtEuro(r.custo)}</span>
                      <button onClick={() => remover(r.id)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center" aria-label="Remover">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{totalH} h no dia</span>
                <span className="text-sm font-black">{fmtEuro(totalC)}</span>
              </div>
            </div>
          )}

          {/* Adicionar */}
          <div className="rounded-2xl border border-dashed border-border/60 p-3 space-y-3">
            <p className={lbl}>Adicionar trabalho</p>
            {ativas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ainda não tens obras ativas atribuídas.</p>
            ) : equipa.length === 0 ? (
              <p className="text-xs text-muted-foreground">Cria primeiro a tua equipa no separador <b>Equipa</b>.</p>
            ) : (
              <>
                <select value={obraId} onChange={e => setObraId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="" disabled>Escolher obra…</option>
                  {ativas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
                <div className="space-y-1.5">
                  {equipa.map(m => {
                    const on = !!sel[m.id]?.on
                    return (
                      <div key={m.id} className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${on ? "border-primary/40 bg-primary/5" : "border-border/40"}`}>
                        <button type="button" onClick={() => toggle(m.id)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" onClick={() => toggle(m.id)} className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold truncate">{m.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtEuro(m.valorHora)}/h</p>
                        </button>
                        {on && (
                          <>
                            <Input inputMode="decimal" value={sel[m.id].horas} onChange={e => setHoras(m.id, e.target.value)}
                              className="h-9 w-16 rounded-lg text-sm text-center" />
                            <span className="text-[10px] text-muted-foreground">h</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button onClick={adicionar} disabled={!obraId || marcados.length === 0}
                  className="w-full h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98]">
                  <Plus className="h-4 w-4" />Adicionar ao dia
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-border/45 text-sm font-semibold">Cancelar</button>
            <button type="button" onClick={guardar} disabled={saving}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar dia
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
