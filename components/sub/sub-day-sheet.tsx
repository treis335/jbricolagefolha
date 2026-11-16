// components/sub/sub-day-sheet.tsx
// Registo de um dia, muito simples:
//   1) Lista do que já foi registado + "Adicionar trabalho"
//   2) Um só formulário: Obra → "Como é cobrado?" (Por horas · Valor fechado · Já cobrado) → equipa → o que foi feito → fotos
// Guarda automaticamente ao confirmar cada trabalho.
"use client"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, X, Check, Users, Clock, Euro, CheckCircle2, ChevronLeft, ChevronRight, HardHat } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ServiceFotos } from "@/components/forms/service-fotos"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ServiceFoto } from "@/lib/types"
import type { Obra } from "@/lib/obras-service"
import {
  type SubDia, type SubMembro, type SubRegisto, type SubServicoDia,
  newId, saveDia, fmtEuro, explainFirebaseError, servicosDoDia, cap1, iniciais,
} from "@/lib/subempreiteiros-service"

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  date: string                 // YYYY-MM-DD
  dia: SubDia | null
  dias: SubDia[]
  obras: Obra[]
  equipa: SubMembro[]
  subUid: string
  empresaNome: string
}

type Modo = "equipa" | "fixo" | "registo"
type LReg = SubRegisto & { txt: string }
type LServ = {
  id: string; obraId: string; obraNome: string; descricao: string; fotos: ServiceFoto[]
  registos: LReg[]; modo: Modo; valorTxt: string
}

const num = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isFinite(n) && n > 0 ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

const MODOS: { m: Modo; Icon: typeof Clock; t: string; ajuda: string }[] = [
  { m: "equipa", Icon: Clock, t: "Por horas", ajuda: "Cobras pelas horas da equipa. Ex.: 2 pessoas × 8 h × 12 €/h = 192 €." },
  { m: "fixo", Icon: Euro, t: "Valor fechado", ajuda: "Cobras um valor combinado (orçamento). Ex.: 500 € para pintar a sala. As horas da equipa ficam só registadas." },
  { m: "registo", Icon: CheckCircle2, t: "Já cobrado", ajuda: "Este trabalho já foi cobrado antes. Fica só o registo — não soma ao que tens a receber." },
]

const novoTrabalho = (obraId = "", obraNome = ""): LServ =>
  ({ id: newId(), obraId, obraNome, descricao: "", fotos: [], registos: [], modo: "equipa", valorTxt: "" })
const deSalvo = (s: SubServicoDia): LServ => ({
  id: s.id, obraId: s.obraId, obraNome: s.obraNome, descricao: s.descricao, fotos: s.fotos,
  registos: s.registos.map(r => ({ ...r, txt: String(r.horas) })),
  modo: s.modo ?? (s.valorFixo ? "fixo" : "equipa"), valorTxt: s.valorFixo ? String(s.valorFixo) : "",
})
// Só "por horas" gera custo pelas horas; nos outros casos a equipa é apenas registo
const custoReg = (modo: Modo, horas: number, valorHora: number) => (modo === "equipa" ? r2(horas * valorHora) : 0)
const custoDe = (s: LServ) => s.modo === "fixo" ? num(s.valorTxt) : s.modo === "equipa" ? r2(s.registos.reduce((a, r) => a + r.custo, 0)) : 0
const horasDe = (s: LServ) => s.registos.reduce((a, r) => a + r.horas, 0)

export function SubDaySheet({ open, onClose, onSaved, date, dia, obras, equipa, subUid, empresaNome }: Props) {
  const ativas = useMemo(() => obras.filter(o => o.estado === "ativa"), [obras])
  const [servicos, setServicos] = useState<LServ[]>([])
  const [draft, setDraft] = useState<LServ | null>(null)   // trabalho em edição (null = a ver a lista)
  const [picker, setPicker] = useState(false)
  const [pickSel, setPickSel] = useState<Set<string>>(new Set())
  const [apagar, setApagar] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setServicos(dia ? servicosDoDia(dia).map(deSalvo) : [])
    setDraft(null); setPicker(false); setApagar(false)
  }, [open, dia])

  const obraNomeDe = (s: LServ) => obras.find(o => o.id === s.obraId)?.nome ?? s.obraNome ?? "Obra"
  const existeNaLista = (id: string) => servicos.some(s => s.id === id)
  const patch = (p: Partial<LServ>) => setDraft(d => (d ? { ...d, ...p } : d))

  // ── Guardar (automático) ──
  const persist = async (lista: LServ[]) => {
    setSaving(true)
    try {
      const guardar: SubServicoDia[] = lista.map(s => {
        const obraNome = obraNomeDe(s)
        return {
          id: s.id, obraId: s.obraId, obraNome, descricao: s.descricao, fotos: s.fotos, modo: s.modo,
          registos: s.registos.filter(r => r.horas > 0).map(({ txt: _t, ...r }) => ({ ...r, obraId: s.obraId, obraNome, custo: custoReg(s.modo, r.horas, r.valorHora) })),
          ...(s.modo === "fixo" ? { valorFixo: num(s.valorTxt) } : {}),
        }
      })
      await saveDia(subUid, empresaNome, date, guardar)
      setServicos(lista); onSaved()
      return true
    } catch (err) { alert(`Não foi possível guardar: ${explainFirebaseError(err)}`); return false }
    finally { setSaving(false) }
  }

  const novo = () => { const u = ativas.length === 1 ? ativas[0] : null; setDraft(novoTrabalho(u?.id ?? "", u?.nome ?? "")) }
  const editar = (s: LServ) => setDraft({ ...s, registos: s.registos.map(r => ({ ...r })) })

  const guardarTrabalho = async () => {
    if (!draft) return
    if (!draft.obraId) { alert("Escolhe a obra."); return }
    const comHoras = draft.registos.some(r => r.horas > 0)
    if (draft.modo === "equipa" && !comHoras) { alert("Adiciona a equipa e as horas."); return }
    if (draft.modo === "fixo") {
      if (!num(draft.valorTxt)) { alert("Indica o valor."); return }
      if (!draft.descricao.trim()) { alert("Descreve brevemente o trabalho."); return }
    }
    if (draft.modo === "registo" && !comHoras && !draft.descricao.trim() && draft.fotos.length === 0) {
      alert("Indica a equipa, o que foi feito ou junta fotos."); return
    }
    const limpo: LServ = { ...draft, registos: draft.registos.map(r => ({ ...r, custo: custoReg(draft.modo, r.horas, r.valorHora) })) }
    const lista = existeNaLista(limpo.id) ? servicos.map(s => (s.id === limpo.id ? limpo : s)) : [...servicos, limpo]
    if (await persist(lista)) setDraft(null)
  }
  const apagarTrabalho = async () => {
    if (!draft) return
    if (await persist(servicos.filter(s => s.id !== draft.id))) { setApagar(false); setDraft(null) }
  }

  // ── Equipa (seletor) ──
  const abrirPicker = () => { setPickSel(new Set(draft?.registos.map(r => r.membroId) ?? [])); setPicker(true) }
  const aplicarPicker = () => {
    if (!draft) return
    const atuais = new Map(draft.registos.map(r => [r.membroId, r]))
    const registos: LReg[] = equipa.filter(m => pickSel.has(m.id)).map(m =>
      atuais.get(m.id) ?? { id: newId(), obraId: draft.obraId, obraNome: "", membroId: m.id, membroNome: m.nome, horas: 8, valorHora: m.valorHora, custo: custoReg(draft.modo, 8, m.valorHora), txt: "8" })
    patch({ registos }); setPicker(false)
  }
  const setHoras = (rid: string, txt: string) => patch({
    registos: draft?.registos.map(r => r.id === rid ? { ...r, txt, horas: num(txt), custo: custoReg(draft?.modo ?? "equipa", num(txt), r.valorHora) } : r) ?? [],
  })

  // ── Totais do dia ──
  const totalC = r2(servicos.reduce((a, s) => a + custoDe(s), 0))
  const totalH = servicos.reduce((a, s) => a + horasDe(s), 0)
  const porPessoa = useMemo(() => {
    const m = new Map<string, { nome: string; c: number }>()
    servicos.filter(s => s.modo === "equipa").flatMap(s => s.registos).forEach(r =>
      m.set(r.membroId, { nome: r.membroNome, c: (m.get(r.membroId)?.c ?? 0) + r.custo }))
    const lista = Array.from(m.values())
    const fixos = servicos.filter(s => s.modo === "fixo").reduce((a, s) => a + num(s.valorTxt), 0)
    if (fixos > 0) lista.push({ nome: "Valor fechado", c: fixos })
    return lista
  }, [servicos])

  const titulo = cap1(new Date(date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }))
  const barra = "sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t border-border/50 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
  const modoAtual = MODOS.find(x => x.m === draft?.modo)

  return (
    <>
      <Sheet open={open} onOpenChange={o => !o && onClose()}>
        <SheetContent side="bottom" className="z-[120] rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          {/* Topo fixo */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-5 pt-5 pb-3 flex items-start gap-3">
            {draft && (
              <button type="button" onClick={() => setDraft(null)} aria-label="Voltar"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 active:scale-90 transition-transform">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <SheetHeader className="flex-1 min-w-0 text-left space-y-0">
              <SheetTitle className="text-xl font-black">{titulo}</SheetTitle>
              <SheetDescription className="text-xs">{draft ? (existeNaLista(draft.id) ? "Editar trabalho" : "Novo trabalho") : empresaNome}</SheetDescription>
            </SheetHeader>
            <button type="button" onClick={onClose} aria-label="Fechar"
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center shrink-0 active:scale-90 transition-transform">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Lista do dia ── */}
          {!draft && (
            <>
              <div className="px-5 pb-4 space-y-3">
                {servicos.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><HardHat className="h-6 w-6" /></div>
                    <p className="text-base font-black">Ainda nada neste dia</p>
                    <p className="text-xs text-muted-foreground">Regista o que foi feito: escolhes a obra, como é cobrado e quem trabalhou.</p>
                  </div>
                ) : servicos.map(s => {
                  const M = MODOS.find(x => x.m === s.modo)!
                  return (
                    <button key={s.id} type="button" onClick={() => editar(s)}
                      className="w-full text-left rounded-2xl border border-border/40 bg-card shadow-sm p-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><M.Icon className="h-5 w-5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{obraNomeDe(s)}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.modo === "equipa" ? `${s.registos.length} pessoa(s) · ${horasDe(s)} h` : `${M.t}${s.registos.length > 0 ? ` · ${s.registos.length} pessoa(s) · ${horasDe(s)} h` : s.descricao ? ` · ${s.descricao}` : ""}`}
                        </p>
                      </div>
                      <span className="text-sm font-black tabular-nums shrink-0 text-right">{s.modo === "registo" ? <span className="text-xs font-bold text-muted-foreground">—</span> : fmtEuro(custoDe(s))}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  )
                })}

                {ativas.length === 0 ? (
                  <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">Ainda não tens obras ativas atribuídas.</p>
                ) : (
                  <button type="button" onClick={novo}
                    className={servicos.length === 0
                      ? "w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-primary/20"
                      : "w-full h-12 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-primary/5"}>
                    <Plus className="h-4 w-4" />{servicos.length === 0 ? "Adicionar trabalho" : "Adicionar outro trabalho"}
                  </button>
                )}
              </div>

              <div className={barra}>
                {totalC > 0 && (
                  <div className="mb-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Total do dia{totalH > 0 ? ` · ${totalH} h` : ""}</span>
                      <span className="text-lg font-black tabular-nums">{fmtEuro(totalC)}</span>
                    </div>
                    <p className="text-[9px] leading-snug text-muted-foreground/60 mt-0.5">{porPessoa.map(p => `${p.nome} ${fmtEuro(p.c)}`).join(" · ")}</p>
                  </div>
                )}
                <button type="button" onClick={onClose} className="w-full h-11 rounded-xl bg-muted text-sm font-bold active:scale-[0.98]">Concluído</button>
              </div>
            </>
          )}

          {/* ── Formulário (um só) ── */}
          {draft && (
            <>
              <div className="px-5 pb-4 space-y-5">
                <div className="space-y-1.5">
                  <label className={lbl}>Obra</label>
                  <select value={draft.obraId} onChange={e => patch({ obraId: e.target.value, obraNome: obras.find(o => o.id === e.target.value)?.nome ?? "" })}
                    className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-semibold">
                    <option value="" disabled>Escolher obra…</option>
                    {obras.filter(o => o.estado === "ativa" || o.id === draft.obraId).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>

                {/* Como é cobrado? */}
                <div className="space-y-2">
                  <label className={lbl}>Como é cobrado?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MODOS.map(({ m, Icon, t }) => (
                      <button key={m} type="button" onClick={() => patch({ modo: m })}
                        className={`h-[72px] rounded-2xl border flex flex-col items-center justify-center gap-1.5 text-[11px] font-bold transition-all active:scale-95 ${draft.modo === m ? "bg-primary/10 border-primary text-primary" : "bg-background border-border/50 text-muted-foreground"}`}>
                        <Icon className="h-5 w-5" />{t}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed rounded-2xl bg-primary/5 px-3.5 py-3 text-foreground/80">{modoAtual?.ajuda}</p>
                </div>

                {draft.modo === "fixo" && (
                  <div className="space-y-1.5">
                    <label className={lbl}>Valor</label>
                    <div className="relative">
                      <Input inputMode="decimal" value={draft.valorTxt} onChange={e => patch({ valorTxt: e.target.value })} placeholder="0,00"
                        className="h-14 rounded-2xl text-2xl font-black pr-10 tabular-nums" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">€</span>
                    </div>
                  </div>
                )}

                {/* Equipa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={lbl}>
                      {draft.modo === "equipa" ? "Equipa e horas" : "Quem esteve na obra"}
                      {draft.modo !== "equipa" && <span className="normal-case font-medium opacity-60"> (opcional)</span>}
                    </label>
                    <button type="button" onClick={abrirPicker}
                      className="flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 active:scale-95">
                      <Users className="h-3.5 w-3.5" />{draft.registos.length ? "Mudar equipa" : "Adicionar equipa"}
                    </button>
                  </div>
                  {draft.registos.length === 0 ? (
                    <button type="button" onClick={abrirPicker}
                      className="w-full text-xs text-muted-foreground text-center py-5 rounded-2xl border-2 border-dashed border-border/60 active:bg-muted/30">
                      {equipa.length === 0 ? "Cria primeiro a tua equipa no separador Equipa."
                        : draft.modo === "equipa" ? "Toca para escolher quem trabalhou" : "Toca para registar quem esteve (opcional)"}
                    </button>
                  ) : draft.registos.map(r => (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card p-2 pl-2.5 shadow-sm">
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">{iniciais(r.membroNome)}</span>
                      <span className="flex-1 min-w-0 text-sm font-semibold truncate">{r.membroNome}</span>
                      <Input inputMode="decimal" value={r.txt} onChange={e => setHoras(r.id, e.target.value)} className="h-9 w-16 rounded-lg text-sm text-center" />
                      <span className="text-[10px] text-muted-foreground w-3">h</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className={lbl}>{draft.modo === "fixo" ? "Descrição do trabalho" : "O que foi feito"} {draft.modo !== "fixo" && <span className="normal-case font-medium opacity-60">(opcional)</span>}</label>
                  <Textarea value={draft.descricao} onChange={e => patch({ descricao: e.target.value })} rows={3}
                    placeholder={draft.modo === "fixo" ? "Ex.: Pintura completa do T2" : "Descreve o trabalho…"} className="rounded-2xl resize-none text-sm" />
                </div>

                {/* Fotos sempre à vista */}
                <ServiceFotos serviceId={`${subUid}_${date}_${draft.id}`} fotos={draft.fotos} onChange={f => patch({ fotos: f })}
                  onUploadingChange={setUploading} userId={subUid} />

                {existeNaLista(draft.id) && (
                  <button type="button" onClick={() => setApagar(true)} className="w-full text-xs font-bold text-destructive py-1 active:opacity-60">Apagar este trabalho</button>
                )}
              </div>

              <div className={barra}>
                <button type="button" onClick={guardarTrabalho} disabled={saving || uploading}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-primary/20">
                  {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}{uploading ? "A enviar fotos…" : "Guardar trabalho"}
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Seletor de equipa */}
      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent side="bottom" className="z-[140] rounded-t-3xl border-0 bg-background max-h-[80dvh] overflow-y-auto p-0 [&>button]:hidden sm:max-w-md sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <div className="flex items-start gap-3">
              <SheetHeader className="flex-1 text-left space-y-0">
                <SheetTitle className="text-lg font-black">Quem trabalhou?</SheetTitle>
                <SheetDescription className="text-xs">Escolhe as pessoas deste trabalho</SheetDescription>
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
                      className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? "border-primary/40 bg-primary/5" : "border-border/40"}`}>
                      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">{iniciais(m.nome)}</span>
                      <span className="flex-1 text-sm font-semibold truncate">{m.nome}</span>
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <button type="button" onClick={aplicarPicker}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98]">
              Confirmar{pickSel.size > 0 ? ` (${pickSel.size})` : ""}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={apagar} onOpenChange={o => !o && !saving && setApagar(false)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este trabalho?</AlertDialogTitle>
            <AlertDialogDescription>Deixa de contar nos totais e no financeiro. Não pode ser desfeito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); apagarTrabalho() }} disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving ? "A apagar…" : "Apagar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
