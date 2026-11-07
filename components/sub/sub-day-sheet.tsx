// components/sub/sub-day-sheet.tsx
// Registo de um dia, ao estilo do formulário dos colaboradores: abas por serviço (obra + equipa + horas + o que foi feito + fotos).
// Os preços só aparecem no total, em baixo.
"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, X, Check, Repeat, Trash2, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ServiceFotos } from "@/components/forms/service-fotos"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type { ServiceFoto } from "@/lib/types"
import {
  type SubDia, type SubObra, type SubMembro, type SubRegisto,
  newId, saveDia, fmtEuro, explainFirebaseError, servicosDoDia,
} from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  date: string                 // YYYY-MM-DD
  dia: SubDia | null
  dias: SubDia[]               // todos os dias (para "repetir o último dia")
  obras: SubObra[]
  equipa: SubMembro[]
  subUid: string
  empresaNome: string
}

type LReg = SubRegisto & { txt: string }
type LServ = { id: string; obraId: string; descricao: string; fotos: ServiceFoto[]; registos: LReg[] }

const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isFinite(n) && n > 0 ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
const vazio = (obraId = ""): LServ => ({ id: newId(), obraId, descricao: "", fotos: [], registos: [] })
const mantemTxt = (r: SubRegisto): LReg => ({ ...r, txt: String(r.horas) })

export function SubDaySheet({ open, onClose, onSaved, date, dia, dias, obras, equipa, subUid, empresaNome }: Props) {
  const ativas = useMemo(() => obras.filter(o => o.estado === "ativa"), [obras])
  const [servicos, setServicos] = useState<LServ[]>([])
  const [activeId, setActiveId] = useState("")
  const [picker, setPicker] = useState(false)
  const [pickSel, setPickSel] = useState<Set<string>>(new Set())
  const [confirmDel, setConfirmDel] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const existentes: LServ[] = dia
      ? servicosDoDia(dia).map(s => ({ id: s.id, obraId: s.obraId, descricao: s.descricao, fotos: s.fotos, registos: s.registos.map(mantemTxt) }))
      : []
    const inicial = existentes.length ? existentes : [vazio(ativas.length === 1 ? ativas[0].id : "")]
    setServicos(inicial); setActiveId(inicial[0].id)
    setConfirmDel(false); setPicker(false)
  }, [open, dia, ativas])

  const ativo = servicos.find(s => s.id === activeId) ?? servicos[0]
  const patch = (id: string, p: Partial<LServ>) => setServicos(ss => ss.map(s => s.id === id ? { ...s, ...p } : s))

  const addServico = () => { const n = vazio(); setServicos(ss => [...ss, n]); setActiveId(n.id); setConfirmDel(false) }
  const removeServico = () => {
    if (!ativo) return
    if (!confirmDel) { setConfirmDel(true); return }
    const resto = servicos.filter(s => s.id !== ativo.id)
    const novos = resto.length ? resto : [vazio()]
    setServicos(novos); setActiveId(novos[0].id); setConfirmDel(false)
  }

  // ── Adicionar equipa (seletor, como nos colaboradores) ──
  const abrirPicker = () => { setPickSel(new Set(ativo?.registos.map(r => r.membroId) ?? [])); setPicker(true) }
  const aplicarPicker = () => {
    if (!ativo) return
    const atuais = new Map(ativo.registos.map(r => [r.membroId, r]))
    const registos: LReg[] = equipa.filter(m => pickSel.has(m.id)).map(m =>
      atuais.get(m.id) ?? { id: newId(), obraId: ativo.obraId, obraNome: "", membroId: m.id, membroNome: m.nome, horas: 8, valorHora: m.valorHora, custo: r2(8 * m.valorHora), txt: "8" })
    patch(ativo.id, { registos }); setPicker(false)
  }
  const setHoras = (sid: string, rid: string, txt: string) => setServicos(ss => ss.map(s => s.id !== sid ? s : {
    ...s, registos: s.registos.map(r => r.id === rid ? { ...r, txt, horas: num(txt), custo: r2(num(txt) * r.valorHora) } : r),
  }))
  const tirar = (sid: string, rid: string) => setServicos(ss => ss.map(s => s.id !== sid ? s : { ...s, registos: s.registos.filter(r => r.id !== rid) }))

  // ── Atalho: repetir o último dia registado ──
  const anterior = useMemo(
    () => dias.filter(d => d.date < date && d.registos.length > 0).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    [dias, date],
  )
  const diaVazio = servicos.every(s => s.registos.length === 0 && !s.descricao.trim() && s.fotos.length === 0)
  const repetirAnterior = () => {
    if (!anterior) return
    const ids = new Set(ativas.map(o => o.id))
    const novos: LServ[] = servicosDoDia(anterior).filter(s => ids.has(s.obraId)).map(s => ({
      id: newId(), obraId: s.obraId, descricao: "", fotos: [],
      registos: s.registos.map(r => {
        const m = equipa.find(x => x.id === r.membroId)
        const valorHora = m ? m.valorHora : r.valorHora // valor/hora atual, se o membro ainda existir
        return { ...r, id: newId(), valorHora, custo: r2(r.horas * valorHora), txt: String(r.horas) }
      }),
    }))
    if (novos.length) { setServicos(novos); setActiveId(novos[0].id) }
  }

  // ── Totais (só aqui aparece dinheiro) ──
  const todos = servicos.flatMap(s => s.registos)
  const totalH = todos.reduce((a, r) => a + r.horas, 0)
  const totalC = todos.reduce((a, r) => a + r.custo, 0)
  const porPessoa = useMemo(() => {
    const m = new Map<string, { nome: string; c: number }>()
    todos.forEach(r => m.set(r.membroId, { nome: r.membroNome, c: (m.get(r.membroId)?.c ?? 0) + r.custo }))
    return Array.from(m.values())
  }, [todos])

  const guardar = async () => {
    for (const s of servicos) {
      const temConteudo = s.registos.length > 0 || s.descricao.trim() || s.fotos.length > 0
      if (!temConteudo) continue
      if (!s.obraId) { alert("Escolhe a obra em todos os serviços."); setActiveId(s.id); return }
      if (s.registos.length === 0) { alert("Adiciona a equipa em todos os serviços."); setActiveId(s.id); return }
    }
    setSaving(true)
    try {
      await saveDia(subUid, empresaNome, date, servicos.map(s => {
        const obra = obras.find(o => o.id === s.obraId)
        const obraNome = obra?.nome ?? ""
        return {
          id: s.id, obraId: s.obraId, obraNome, descricao: s.descricao, fotos: s.fotos,
          registos: s.registos.filter(r => r.horas > 0).map(({ txt: _t, ...r }) => ({ ...r, obraId: s.obraId, obraNome })),
        }
      }))
      onSaved(); onClose()
    } catch (err) { alert(`Não foi possível guardar: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  const titulo = new Date(date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
  const nomeAba = (s: LServ, i: number) => obras.find(o => o.id === s.obraId)?.nome || `Serviço ${i + 1}`

  return (
    <>
      <Sheet open={open} onOpenChange={o => !o && onClose()}>
        <SheetContent side="bottom" className="z-[120] rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          {/* Topo fixo com X */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-5 pt-5 pb-3 flex items-start gap-3">
            <SheetHeader className="flex-1 min-w-0 text-left space-y-0">
              <SheetTitle className="text-xl font-black capitalize">{titulo}</SheetTitle>
              <SheetDescription className="text-xs">{empresaNome}</SheetDescription>
            </SheetHeader>
            <button type="button" onClick={onClose} aria-label="Fechar"
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center shrink-0 active:scale-90 transition-transform">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pb-4 space-y-4">
            {diaVazio && anterior && (
              <button type="button" onClick={repetirAnterior}
                className="w-full h-11 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
                <Repeat className="h-4 w-4" />Repetir {new Date(anterior.date + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
              </button>
            )}

            <div className="flex items-center justify-between">
              <p className={lbl}>Serviços do dia</p>
              <button type="button" onClick={addServico}
                className="flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 active:scale-95">
                <Plus className="h-3.5 w-3.5" />Adicionar serviço
              </button>
            </div>

            {ativo && (
              <Tabs value={ativo.id} onValueChange={id => { setActiveId(id); setConfirmDel(false) }} className="w-full">
                {servicos.length > 1 && (
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="flex w-max gap-1.5 bg-transparent p-0 h-auto">
                      {servicos.map((s, i) => (
                        <TabsTrigger key={s.id} value={s.id}
                          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/40 bg-background/60 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm">
                          {nomeAba(s, i)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                )}

                {servicos.map(s => (
                  <TabsContent key={s.id} value={s.id} className="mt-0 space-y-4">
                    {/* Obra */}
                    <div className="space-y-1.5">
                      <label className={lbl}>Obra</label>
                      {ativas.length === 0 ? (
                        <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">Ainda não tens obras ativas atribuídas.</p>
                      ) : (
                        <select value={s.obraId} onChange={e => patch(s.id, { obraId: e.target.value })}
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                          <option value="" disabled>Escolher obra…</option>
                          {obras.filter(o => o.estado === "ativa" || o.id === s.obraId).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Equipa */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={lbl}>Equipa</label>
                        <button type="button" onClick={abrirPicker}
                          className="flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 active:scale-95">
                          <Users className="h-3.5 w-3.5" />Adicionar equipa
                        </button>
                      </div>
                      {s.registos.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-dashed border-border/60">
                          {equipa.length === 0 ? "Cria primeiro a tua equipa no separador Equipa." : "Toca em “Adicionar equipa” para escolher quem trabalhou."}
                        </p>
                      ) : s.registos.map(r => (
                        <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-2 pl-3">
                          <span className="flex-1 min-w-0 text-sm font-semibold truncate">{r.membroNome}</span>
                          <Input inputMode="decimal" value={r.txt} onChange={e => setHoras(s.id, r.id, e.target.value)}
                            className="h-9 w-16 rounded-lg text-sm text-center" />
                          <span className="text-[10px] text-muted-foreground w-3">h</span>
                          <button type="button" onClick={() => tirar(s.id, r.id)} aria-label="Retirar"
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* O que foi feito + fotos */}
                    <div className="space-y-1.5">
                      <label className={lbl}>O que foi feito <span className="normal-case font-medium opacity-60">(opcional)</span></label>
                      <Textarea value={s.descricao} onChange={e => patch(s.id, { descricao: e.target.value })} rows={3}
                        placeholder="Descreve o trabalho…" className="rounded-xl resize-none text-sm" />
                    </div>
                    <ServiceFotos serviceId={`${subUid}_${date}_${s.id}`} fotos={s.fotos} onChange={f => patch(s.id, { fotos: f })}
                      onUploadingChange={setUploading} userId={subUid} />

                    {(servicos.length > 1 || s.registos.length > 0 || s.obraId) && (
                      <button type="button" onClick={removeServico}
                        className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] ${confirmDel ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive"}`}>
                        <Trash2 className="h-3.5 w-3.5" />{confirmDel ? "Confirmar: remover este serviço" : "Remover serviço"}
                      </button>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          {/* Rodapé fixo: total + valores individuais (bem pequenos) + ações */}
          <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t border-border/50 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2.5">
            {totalH > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Total do dia · {totalH} h</span>
                  <span className="text-lg font-black tabular-nums">{fmtEuro(totalC)}</span>
                </div>
                <p className="text-[9px] leading-snug text-muted-foreground/60 mt-0.5">
                  {porPessoa.map(p => `${p.nome} ${fmtEuro(p.c)}`).join(" · ")}
                </p>
              </div>
            )}
            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-border/45 text-sm font-semibold">Cancelar</button>
              <button type="button" onClick={guardar} disabled={saving || uploading}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
                {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}{uploading ? "A enviar fotos…" : "Guardar dia"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Seletor de equipa */}
      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent side="bottom" className="z-[140] rounded-t-3xl border-0 bg-background max-h-[80dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-md sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <div className="flex items-start gap-3">
              <SheetHeader className="flex-1 text-left space-y-0">
                <SheetTitle className="text-lg font-black">Quem trabalhou?</SheetTitle>
                <SheetDescription className="text-xs">Escolhe os colaboradores deste serviço</SheetDescription>
              </SheetHeader>
              <button type="button" onClick={() => setPicker(false)} aria-label="Fechar"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><X className="h-4 w-4" /></button>
            </div>
            {equipa.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Ainda sem equipa. Adiciona colaboradores no separador <b>Equipa</b>.</p>
            ) : (
              <div className="space-y-1.5">
                {equipa.map(m => {
                  const on = pickSel.has(m.id)
                  return (
                    <button key={m.id} type="button"
                      onClick={() => setPickSel(p => { const n = new Set(p); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n })}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? "border-primary/40 bg-primary/5" : "border-border/40"}`}>
                      <span className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="text-sm font-semibold truncate">{m.nome}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <button type="button" onClick={aplicarPicker}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98]">
              Confirmar{pickSel.size > 0 ? ` (${pickSel.size})` : ""}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
