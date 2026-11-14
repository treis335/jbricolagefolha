// components/sub/sub-financeiro-view.tsx
// Financeiro de um empreiteiro: um número principal, barra de progresso, por obra / por mês e pagamentos.
// A empresa só consulta; o admin/patrão regista (pelo botão do cabeçalho) e apaga pagamentos.
"use client"
import { useMemo, useState } from "react"
import { Trash2, Landmark, Smartphone, Banknote, ChevronDown, Check, Plus, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type SubDia, type SubPagamento,
  deletePagamento, resumoFinanceiro, resumoPorObra, fmtEuro, explainFirebaseError, cap1,
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
  onRegistar?: () => void  // admin: abrir o pop-up de novo pagamento
}

const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
const dataCurta = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })
const ICONE = { "Transferência": Landmark, MBWay: Smartphone, Dinheiro: Banknote } as const

type Estado = "pago" | "parcial" | "por pagar"
const ESTADO_CLS: Record<Estado, string> = {
  pago: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  parcial: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  "por pagar": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
}
const estadoDe = (pago: number, falta: number): Estado => (falta <= 0.005 ? "pago" : pago <= 0.005 ? "por pagar" : "parcial")

// Cartão de um mês ou de uma obra: total / pago / falta
function CartaoValores({ titulo, sub, estado, custo, pago, falta, aberto, onToggle, children }: {
  titulo: string; sub: string; estado: Estado; custo: number; pago: number; falta: number
  aberto: boolean; onToggle: () => void; children?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full text-left p-4 space-y-3 active:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">{titulo}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", ESTADO_CLS[estado])}>{cap1(estado)}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground/40 transition-transform", aberto && "rotate-180")} />
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${custo > 0 ? Math.min(100, (pago / custo) * 100) : 0}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([["Total", custo, ""], ["Pago", pago, "text-emerald-600 dark:text-emerald-400"], ["Falta", falta, falta > 0.005 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"]] as const).map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-muted/40 py-2 text-center">
              <p className={cn("text-sm font-black tabular-nums", c)}>{fmtEuro(v)}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{l}</p>
            </div>
          ))}
        </div>
      </button>
      {aberto && <div className="border-t border-border/40 divide-y divide-border/40 bg-muted/20">{children}</div>}
    </div>
  )
}

export function SubFinanceiroView({ dias, pagamentos, obras, admin, onChanged, onRegistar }: Props) {
  const r = useMemo(() => resumoFinanceiro(dias, pagamentos), [dias, pagamentos])
  const po = useMemo(() => resumoPorObra(dias, pagamentos), [dias, pagamentos])
  const [vista, setVista] = useState<"mes" | "obra">(() => (obras.length > 1 ? "obra" : "mes"))
  const [aberto, setAberto] = useState<string | null>(null)
  const [apagarP, setApagarP] = useState<SubPagamento | null>(null)
  const [apagando, setApagando] = useState(false)

  const pct = r.totalGanho > 0 ? Math.min(100, (r.totalPago / r.totalGanho) * 100) : 0
  const tudoPago = r.totalGanho > 0 && r.saldo <= 0.005
  const aMais = r.saldo < -0.005
  const semDados = r.totalGanho === 0 && pagamentos.length === 0

  const tom = tudoPago ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card"
    : aMais ? "border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-card to-card"
    : "border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card"
  const cor = tudoPago ? "text-emerald-600 dark:text-emerald-400" : aMais ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"

  const confirmarApagar = async () => {
    if (!apagarP) return
    setApagando(true)
    try { await deletePagamento(apagarP.id); setApagarP(null); onChanged?.() }
    catch (err) { alert(`Não foi possível apagar: ${explainFirebaseError(err)}`) }
    finally { setApagando(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Resumo */}
      <div className={cn("rounded-3xl border p-5 space-y-4 shadow-sm", tom)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {aMais ? "Pago a mais" : tudoPago ? "Tudo pago" : admin ? "Falta pagar" : "Falta receber"}
            </p>
            <p className={cn("mt-1 text-4xl font-black tracking-tight tabular-nums leading-none", cor)}>
              {tudoPago ? fmtEuro(0) : fmtEuro(Math.abs(r.saldo))}
            </p>
          </div>
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", tudoPago ? "bg-emerald-500/15" : aMais ? "bg-sky-500/15" : "bg-amber-500/15", cor)}>
            {tudoPago ? <Check className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 rounded-full bg-muted/70 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pago <b className="text-foreground">{fmtEuro(r.totalPago)}</b></span>
            <span>de <b className="text-foreground">{fmtEuro(r.totalGanho)}</b></span>
          </div>
        </div>
        {!admin && <p className="text-[10px] text-muted-foreground/60">Só para consulta — os pagamentos são registados pelo responsável.</p>}
      </div>

      {semDados ? (
        <div className="py-10 text-center space-y-2">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-semibold">Ainda sem movimentos</p>
          <p className="text-xs text-muted-foreground">Quando houver dias registados e pagamentos, aparecem aqui.</p>
        </div>
      ) : (
        <>
          {/* Por obra / Por mês */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted/60">
              {([["obra", "Por obra"], ["mes", "Por mês"]] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => { setVista(v); setAberto(null) }}
                  className={cn("h-9 rounded-xl text-xs font-bold transition-all", vista === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>{l}</button>
              ))}
            </div>

            {vista === "obra" ? (
              <div className="space-y-2.5">
                {po.obras.map(o => {
                  const chave = `o:${o.obraId}`
                  const pags = pagamentos.filter(p => p.obraId === o.obraId)
                  return (
                    <CartaoValores key={o.obraId} titulo={o.obraNome} sub={`${o.dias} dia(s)${o.horas > 0 ? ` · ${o.horas} h` : ""}`}
                      estado={estadoDe(o.pago, o.falta)} custo={o.custo} pago={o.pago} falta={o.falta}
                      aberto={aberto === chave} onToggle={() => setAberto(aberto === chave ? null : chave)}>
                      {pags.length === 0
                        ? <p className="px-4 py-3 text-xs text-muted-foreground">Ainda sem pagamentos desta obra.</p>
                        : pags.map(p => (
                          <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                            <span className="text-muted-foreground">{dataCurta(p.date)} · {p.metodo}</span>
                            <b className="tabular-nums">{fmtEuro(p.valor)}</b>
                          </div>
                        ))}
                    </CartaoValores>
                  )
                })}
                {po.gerais > 0 && (
                  <div className="rounded-2xl border border-dashed border-border/60 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Pagamentos gerais</p>
                      <p className="text-[11px] text-muted-foreground">Sem obra específica — descontam no total</p>
                    </div>
                    <b className="text-sm tabular-nums">{fmtEuro(po.gerais)}</b>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {r.porMes.map(m => {
                  const chave = `m:${m.mes}`
                  return (
                    <CartaoValores key={m.mes} titulo={cap1(new Date(m.mes + "-01T00:00:00").toLocaleDateString("pt-PT", { month: "long", year: "numeric" }))}
                      sub={`${m.dias.length} dia(s)${m.horas > 0 ? ` · ${m.horas} h` : ""}`}
                      estado={estadoDe(m.pago, m.falta)} custo={m.custo} pago={m.pago} falta={m.falta}
                      aberto={aberto === chave} onToggle={() => setAberto(aberto === chave ? null : chave)}>
                      {m.dias.map(d => (
                        <div key={d.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                          <span className="text-muted-foreground">
                            {cap1(new Date(d.date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" }))}
                            {d.totalHoras > 0 ? ` · ${d.totalHoras} h` : " · valor fixo"}
                          </span>
                          <b className="tabular-nums">{fmtEuro(d.totalCusto)}</b>
                        </div>
                      ))}
                    </CartaoValores>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagamentos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className={lbl}>{admin ? "Pagamentos feitos" : "Pagamentos recebidos"}</p>
              {admin && onRegistar && (
                <button onClick={onRegistar} className="flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 active:scale-95">
                  <Plus className="h-3.5 w-3.5" />Registar
                </button>
              )}
            </div>
            {pagamentos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 rounded-2xl border border-dashed border-border/60">Ainda sem pagamentos registados.</p>
            ) : pagamentos.map(p => {
              const Icon = ICONE[p.metodo] ?? Banknote
              return (
                <div key={p.id} className="rounded-2xl border border-border/40 bg-card shadow-sm p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black tabular-nums">{fmtEuro(p.valor)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {dataCurta(p.date)} · {p.obraNome ?? "Geral"}{p.nota ? ` · ${p.nota}` : ""}
                    </p>
                  </div>
                  {admin && (
                    <button onClick={() => setApagarP(p)} aria-label="Apagar pagamento"
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {admin && (
        <AlertDialog open={!!apagarP} onOpenChange={o => { if (!o && !apagando) setApagarP(null) }}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar este pagamento?</AlertDialogTitle>
              <AlertDialogDescription>
                {apagarP && <>{fmtEuro(apagarP.valor)} · {dataCurta(apagarP.date)} · {apagarP.metodo} · {apagarP.obraNome ?? "Geral"}. O valor volta a ficar em dívida e o empreiteiro deixa de o ver como pago. Não pode ser desfeito.</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={apagando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={e => { e.preventDefault(); confirmarApagar() }} disabled={apagando}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {apagando ? "A apagar…" : "Apagar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
