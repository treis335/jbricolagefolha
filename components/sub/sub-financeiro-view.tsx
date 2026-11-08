// components/sub/sub-financeiro-view.tsx
// Financeiro do empreiteiro. A empresa só consulta; o admin/patrão regista e apaga pagamentos (mesmo critério dos colaboradores).
"use client"
import { useMemo, useState } from "react"
import { Plus, Trash2, Loader2, Banknote, Smartphone, Landmark, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  type SubDia, type SubPagamento, type SubMetodo,
  addPagamento, deletePagamento, resumoFinanceiro, fmtEuro, explainFirebaseError,
} from "@/lib/subempreiteiros-service"

interface Props {
  subUid: string
  empresaNome: string
  dias: SubDia[]
  pagamentos: SubPagamento[]
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

function Stat({ value, label, cls }: { value: string; label: string; cls: string }) {
  return (
    <div className="flex flex-col items-center py-3 gap-0.5">
      <span className={cn("text-base font-black leading-none tabular-nums", cls)}>{value}</span>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">{label}</span>
    </div>
  )
}

export function SubFinanceiroView({ subUid, empresaNome, dias, pagamentos, admin, onChanged }: Props) {
  const r = useMemo(() => resumoFinanceiro(dias, pagamentos), [dias, pagamentos])
  const [form, setForm] = useState(false)
  const [valor, setValor] = useState("")
  const [date, setDate] = useState(hoje())
  const [metodo, setMetodo] = useState<SubMetodo>("Transferência")
  const [nota, setNota] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // Por mês: horas, custo e estado (pago / parcial / por pagar) segundo os dias cobertos
  const meses = useMemo(() => {
    const m = new Map<string, { h: number; c: number; n: number; pagos: number }>()
    dias.forEach(d => {
      const k = d.date.slice(0, 7)
      const x = m.get(k) ?? { h: 0, c: 0, n: 0, pagos: 0 }
      m.set(k, { h: x.h + d.totalHoras, c: x.c + d.totalCusto, n: x.n + 1, pagos: x.pagos + (r.diasPagos.has(d.date) ? 1 : 0) })
    })
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [dias, r.diasPagos])

  const abrirForm = () => { setValor(r.emDivida > 0 ? String(Math.round(r.emDivida * 100) / 100) : ""); setDate(hoje()); setNota(""); setForm(true) }

  const guardar = async () => {
    const v = parseFloat(valor.replace(",", "."))
    if (!isFinite(v) || v <= 0) { alert("Indica um valor válido."); return }
    setSaving(true)
    try {
      await addPagamento({ subUid, empresaNome, date, valor: Math.round(v * 100) / 100, metodo, nota: nota.trim() || undefined })
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
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <Stat value={fmtEuro(r.totalGanho)} label="a receber" cls="text-blue-600 dark:text-blue-400" />
          <Stat value={fmtEuro(r.totalPago)} label="pago" cls="text-emerald-600 dark:text-emerald-400" />
          <Stat value={fmtEuro(r.emDivida)} label="em dívida" cls={r.emDivida > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"} />
        </div>
        {!admin && <p className="text-[10px] text-center text-muted-foreground/60 border-t border-border/40 py-2">Só para consulta — os pagamentos são registados pelo responsável.</p>}
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
          <Input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota / nº da fatura (opcional)" className="h-11 rounded-xl" />
          <button onClick={guardar} disabled={saving}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar pagamento
          </button>
        </div>
      )}

      {/* Pagamentos */}
      <div className="space-y-2">
        <p className={lbl}>Pagamentos</p>
        {pagamentos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5 rounded-xl border border-dashed border-border/60">Ainda sem pagamentos registados.</p>
        ) : pagamentos.map(p => (
          <div key={p.id} className="rounded-xl border border-border/40 bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold tabular-nums">{fmtEuro(p.valor)}</p>
              <p className="text-[11px] text-muted-foreground truncate">{dataCurta(p.date)} · {p.metodo}{p.nota ? ` · ${p.nota}` : ""}</p>
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

      {/* Por mês */}
      <div className="space-y-2">
        <p className={lbl}>Por mês</p>
        {meses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5 rounded-xl border border-dashed border-border/60">Sem dias registados.</p>
        ) : meses.map(([k, m]) => {
          const estado = m.pagos === m.n ? "pago" : m.pagos === 0 ? "por pagar" : "parcial"
          return (
            <div key={k} className="rounded-xl border border-border/40 bg-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold capitalize">{new Date(k + "-01T00:00:00").toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</p>
                <p className="text-[11px] text-muted-foreground">{m.n} dia(s) · {m.h} h</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black tabular-nums">{fmtEuro(m.c)}</p>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  estado === "pago" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : estado === "parcial" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400")}>{estado}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
