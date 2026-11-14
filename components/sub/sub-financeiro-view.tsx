// components/sub/sub-financeiro-view.tsx
// Financeiro do empreiteiro. A empresa só consulta; o admin/patrão regista e apaga pagamentos (mesmo critério dos colaboradores).
"use client"
import { useMemo, useState } from "react"
import { Plus, Trash2, Loader2, Banknote, Smartphone, Landmark, X, ChevronDown, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  type SubDia, type SubPagamento, type SubMetodo,
  addPagamento, deletePagamento, resumoFinanceiro, resumoPorObra, fmtEuro, explainFirebaseError, cap1,
} from "@/lib/subempreiteiros-service"
import type { Obra } from "@/lib/obras-service"

interface Props {
  subUid: string
  empresaNome: string
  dias: SubDia[]
  pagamentos: SubPagamento[]
  obras: Obra[]            // obras atribuídas à empresa
  admin?: boolean
  onChanged?: () => void
}

const METODOS: { id: SubMetodo; Icon: typeof Banknote }[] = [
  { id: "Transferência", Icon: Landmark },
  { id: "MBWay", Icon: Smartphone },
  { id: "Dinheiro", Icon: Banknote },
]
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
const dataCurta = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })

export function SubFinanceiroView({ subUid, empresaNome, dias, pagamentos, obras, admin, onChanged }: Props) {
  const r = useMemo(() => resumoFinanceiro(dias, pagamentos), [dias, pagamentos])
  const po = useMemo(() => resumoPorObra(dias, pagamentos), [dias, pagamentos])
  const [vista, setVista] = useState<"mes" | "obra">(() => (obras.length > 1 ? "obra" : "mes"))
  const [obraSel, setObraSel] = useState("")
  const [form, setForm] = useState(false)
  const [valor, setValor] = useState("")
  const [date, setDate] = useState(hoje())
  const [metodo, setMetodo] = useState<SubMetodo>("Transferência")
  const [nota, setNota] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const [aberto, setAberto] = useState<string | null>(null)
  const pct = r.totalGanho > 0 ? Math.min(100, (r.totalPago / r.totalGanho) * 100) : 0
  const tudoPago = r.totalGanho > 0 && r.saldo <= 0.005

  const abrirForm = () => {
    // se só uma obra tem valor por pagar, já vem escolhida (o admin pode mudar)
    const comFalta = po.obras.filter(o => o.falta > 0.005)
    const unica = comFalta.length === 1 ? comFalta[0] : null
    setObraSel(unica?.obraId ?? "")
    setValor(unica ? String(unica.falta) : r.emDivida > 0 ? String(r.emDivida) : "")
    setDate(hoje()); setNota(""); setForm(true)
  }

  const guardar = async () => {
    const v = parseFloat(valor.replace(",", "."))
    if (!isFinite(v) || v <= 0) { alert("Indica um valor válido."); return }
    setSaving(true)
    try {
      const ob = po.obras.find(o => o.obraId === obraSel) ?? obras.find(o => o.id === obraSel)
      const obraNome = ob ? ("obraNome" in ob ? ob.obraNome : (ob as Obra).nome) : undefined
      await addPagamento({ subUid, empresaNome, date, valor: Math.round(v * 100) / 100, metodo, nota: nota.trim() || undefined,
        ...(obraSel ? { obraId: obraSel, obraNome } : {}) })
      setForm(false); onChanged?.()
    } catch (err) { alert(`Não foi possível registar: ${explainFirebaseError(err)}`) }
    finally { setSaving(false) }
  }

  const apagar = async (id: string) => {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setConfirmDel(null)
    try { await deletePagamento(id); onChanged?.() }
    catch (err) { alert(`Não foi possível apagar: ${explainFirebaseError(err)}`) }
  }

  return (
    <div className="space-y-4">
      {/* Resumo: um número principal + barra */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
        <p className={lbl}>{r.saldo < -0.005 ? "Pago a mais" : admin ? "Falta pagar" : "Falta receber"}</p>
        <div className="flex items-center gap-2">
          <p className={cn("text-3xl font-black tabular-nums leading-none",
            tudoPago ? "text-emerald-600 dark:text-emerald-400" : r.saldo < -0.005 ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400")}>
            {fmtEuro(Math.abs(r.saldo))}
          </p>
          {tudoPago && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" />Tudo pago</span>}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pago <b className="text-foreground">{fmtEuro(r.totalPago)}</b></span>
          <span>Total <b className="text-foreground">{fmtEuro(r.totalGanho)}</b></span>
        </div>
        {!admin && <p className="text-[10px] text-muted-foreground/60 pt-1">Só para consulta — os pagamentos são registados pelo responsável.</p>}
      </div>

      {admin && !form && (
        <button onClick={abrirForm}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98]">
          <Plus className="h-4 w-4" />Registar pagamento
        </button>
      )}

      {admin && form && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black">Novo pagamento</p>
            <button onClick={() => setForm(false)} aria-label="Fechar" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={lbl}>Valor (€)</label>
              <Input inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className={lbl}>Data</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {METODOS.map(({ id, Icon }) => (
              <button key={id} type="button" onClick={() => setMetodo(id)}
                className={cn("h-10 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors",
                  metodo === id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/50 text-muted-foreground")}>
                <Icon className="h-3.5 w-3.5" />{id}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className={lbl}>Obra</label>
            <select value={obraSel} onChange={e => setObraSel(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="">Geral (sem obra específica)</option>
              {obras.map(o => {
                const f = po.obras.find(x => x.obraId === o.id)
                return <option key={o.id} value={o.id}>{o.nome}{f && f.falta > 0.005 ? ` — falta ${fmtEuro(f.falta)}` : ""}</option>
              })}
            </select>
          </div>
          <Input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota / nº da fatura (opcional)" className="h-11 rounded-xl" />
          <button onClick={guardar} disabled={saving}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar pagamento
          </button>
        </div>
      )}

      {/* Ver por mês ou por obra */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50">
        {([["obra", "Por obra"], ["mes", "Por mês"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setVista(v)}
            className={cn("h-9 rounded-lg text-xs font-bold transition-colors", vista === v ? "bg-background shadow-sm" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {vista === "obra" ? (
        <>
      {/* Por obra */}
      <div className="space-y-2">
        <p className={lbl}>Por obra</p>
        {po.obras.length === 0 && po.gerais === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5 rounded-xl border border-dashed border-border/60">Sem dias registados.</p>
        ) : po.obras.map(o => {
          const estado = o.falta <= 0.005 ? "pago" : o.pago <= 0.005 ? "por pagar" : "parcial"
          const open = aberto === `o:${o.obraId}`
          const pags = pagamentos.filter(p => p.obraId === o.obraId)
          return (
            <div key={o.obraId} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <button type="button" onClick={() => setAberto(open ? null : `o:${o.obraId}`)} className="w-full text-left p-3.5 space-y-2.5 active:bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate">{o.obraNome}</p>
                    <p className="text-[11px] text-muted-foreground">{o.dias} dia(s){o.horas > 0 ? ` · ${o.horas} h` : ""}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                    estado === "pago" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : estado === "parcial" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400")}>{cap1(estado)}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground/50 transition-transform", open && "rotate-180")} />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${o.custo > 0 ? Math.min(100, (o.pago / o.custo) * 100) : 0}%` }} />
                </div>
                <div className="grid grid-cols-3 text-center">
                  {[["Total", o.custo, ""], ["Pago", o.pago, "text-emerald-600 dark:text-emerald-400"], ["Falta", o.falta, o.falta > 0.005 ? "text-amber-600 dark:text-amber-400" : ""]].map(([l, v, c]) => (
                    <div key={l as string}>
                      <p className={cn("text-sm font-black tabular-nums", c as string)}>{fmtEuro(v as number)}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">{l as string}</p>
                    </div>
                  ))}
                </div>
              </button>
              {open && (
                <div className="border-t border-border/40 divide-y divide-border/40">
                  {pags.length === 0
                    ? <p className="px-3.5 py-2.5 text-xs text-muted-foreground">Ainda sem pagamentos desta obra.</p>
                    : pags.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                        <span className="text-muted-foreground">{dataCurta(p.date)} · {p.metodo}</span>
                        <b className="tabular-nums">{fmtEuro(p.valor)}</b>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        })}
        {po.gerais > 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Pagamentos gerais</p>
              <p className="text-[11px] text-muted-foreground">Sem obra específica — descontam no total</p>
            </div>
            <b className="text-sm tabular-nums">{fmtEuro(po.gerais)}</b>
          </div>
        )}
      </div>

        </>
      ) : (
        <>
      {/* Por mês */}
      <div className="space-y-2">
        <p className={lbl}>Por mês</p>
        {r.porMes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5 rounded-xl border border-dashed border-border/60">Sem dias registados.</p>
        ) : r.porMes.map(m => {
          const estado = m.falta <= 0.005 ? "pago" : m.pago <= 0.005 ? "por pagar" : "parcial"
          const open = aberto === m.mes
          return (
            <div key={m.mes} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <button type="button" onClick={() => setAberto(open ? null : m.mes)} className="w-full text-left p-3.5 space-y-2.5 active:bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">{cap1(new Date(m.mes + "-01T00:00:00").toLocaleDateString("pt-PT", { month: "long", year: "numeric" }))}</p>
                    <p className="text-[11px] text-muted-foreground">{m.dias.length} dia(s){m.horas > 0 ? ` · ${m.horas} h` : ""}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                    estado === "pago" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : estado === "parcial" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400")}>{cap1(estado)}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground/50 transition-transform", open && "rotate-180")} />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.custo > 0 ? Math.min(100, (m.pago / m.custo) * 100) : 0}%` }} />
                </div>
                <div className="grid grid-cols-3 text-center">
                  {[["Total", m.custo, ""], ["Pago", m.pago, "text-emerald-600 dark:text-emerald-400"], ["Falta", m.falta, m.falta > 0.005 ? "text-amber-600 dark:text-amber-400" : ""]].map(([l, v, c]) => (
                    <div key={l as string}>
                      <p className={cn("text-sm font-black tabular-nums", c as string)}>{fmtEuro(v as number)}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">{l as string}</p>
                    </div>
                  ))}
                </div>
              </button>
              {open && (
                <div className="border-t border-border/40 divide-y divide-border/40">
                  {m.dias.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                      <span className="text-muted-foreground">{cap1(new Date(d.date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" }))}{d.totalHoras > 0 ? ` · ${d.totalHoras} h` : " · valor fixo"}</span>
                      <b className="tabular-nums">{fmtEuro(d.totalCusto)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

        </>
      )}

      {/* Pagamentos */}
      <div className="space-y-2">
        <p className={lbl}>{admin ? "Pagamentos feitos" : "Pagamentos recebidos"}</p>
        {pagamentos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5 rounded-xl border border-dashed border-border/60">Ainda sem pagamentos registados.</p>
        ) : pagamentos.map(p => (
          <div key={p.id} className="rounded-xl border border-border/40 bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold tabular-nums">{fmtEuro(p.valor)}</p>
              <p className="text-[11px] text-muted-foreground truncate">{dataCurta(p.date)} · {p.metodo}{p.nota ? ` · ${p.nota}` : ""}</p>
              <p className="text-[10px] font-semibold text-primary/80 truncate">{p.obraNome ? p.obraNome : "Geral"}</p>
            </div>
            {admin && (
              <button onClick={() => apagar(p.id)} aria-label="Apagar"
                className={cn("h-9 px-2.5 rounded-lg flex items-center gap-1 text-xs font-bold shrink-0", confirmDel === p.id ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive")}>
                <Trash2 className="h-4 w-4" />{confirmDel === p.id ? "Sim" : ""}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
