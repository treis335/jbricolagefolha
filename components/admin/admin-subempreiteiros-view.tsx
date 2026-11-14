// components/admin/admin-subempreiteiros-view.tsx
// Backoffice dos empreiteiros: lista simples (quem deve o quê) → página da empresa com 4 separadores
// (Financeiro · Obras · Calendário · Mais). O admin/patrão pode editar tudo.
"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, Loader2, Plus, Mail, ChevronRight, ChevronLeft, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  type SubEmpresa, type SubDia, type SubPagamento,
  getSubEmpresas, getAllDias, getAllPagamentos, resumoFinanceiro,
  inviteSubcontractor, getSubcontractorEmails, setSubAtivo, explainFirebaseError, statsObra, fmtEuro,
} from "@/lib/subempreiteiros-service"
import { useSubData } from "@/hooks/useSubData"
import { type Obra, getObras } from "@/lib/obras-service"
import { SubObraCard } from "@/components/sub/sub-obra-card"
import { SubAtribuirSheet } from "@/components/sub/sub-atribuir-sheet"
import { SubObraDetail } from "@/components/sub/sub-obra-detail"
import { SubCalendar } from "@/components/sub/sub-calendar"
import { SubEquipaView } from "@/components/sub/sub-equipa-view"
import { SubFinanceiroView } from "@/components/sub/sub-financeiro-view"
import { EmpresaForm } from "@/components/sub/empresa-form"

type PanelTab = "financeiro" | "obras" | "calendario" | "mais"
const PANEL_TABS: [PanelTab, string][] = [["financeiro", "Financeiro"], ["obras", "Obras"], ["calendario", "Calendário"], ["mais", "Mais"]]
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"

const nomeDe = (e: SubEmpresa) => e.empresa.nome || e.name || e.email

function Logo({ url, size = "w-11 h-11" }: { url?: string; size?: string }) {
  return (
    <div className={cn("rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center shrink-0", size)}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="w-full h-full object-contain" />
        : <Building2 className="h-5 w-5 text-muted-foreground/40" />}
    </div>
  )
}

// ── Página de uma empresa ────────────────────────────────────────────────────
function EmpresaDetalhe({ empresa, todasObras, onChanged, onBack, onGoObras }: {
  empresa: SubEmpresa; todasObras: Obra[]; onChanged: () => void; onBack: () => void; onGoObras: () => void
}) {
  const { obras, dias, pagamentos, equipa, empresa: perfil, setEmpresa, loading, erro, reload } = useSubData(empresa.uid)
  const [tab, setTab] = useState<PanelTab>("financeiro")
  const [atribuir, setAtribuir] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const nome = perfil.nome || empresa.name || empresa.email
  const changed = async () => { await reload(); onChanged() }

  const fin = useMemo(() => resumoFinanceiro(dias, pagamentos), [dias, pagamentos])
  const mes = new Date().toISOString().slice(0, 7)
  const custoMes = dias.filter(d => d.date.startsWith(mes)).reduce((a, d) => a + d.totalCusto, 0)

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-muted-foreground active:scale-95 -ml-1">
        <ChevronLeft className="h-4 w-4" />Empreiteiros
      </button>

      {/* Cabeçalho */}
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Logo url={perfil.logoUrl} size="w-12 h-12" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-black truncate">{nome}</p>
            <p className="text-[11px] text-muted-foreground truncate">{empresa.email}</p>
          </div>
          {!empresa.ativo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Suspensa</span>}
        </div>
        <div className="grid grid-cols-2 divide-x divide-border/50 rounded-xl bg-muted/40">
          <div className="py-2.5 text-center">
            <p className={cn("text-base font-black tabular-nums", fin.saldo > 0.005 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
              {fin.saldo > 0.005 ? fmtEuro(fin.saldo) : fin.saldo < -0.005 ? `+${fmtEuro(-fin.saldo)}` : "Em dia"}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{fin.saldo < -0.005 ? "pago a mais" : "falta pagar"}</p>
          </div>
          <div className="py-2.5 text-center">
            <p className="text-base font-black tabular-nums">{fmtEuro(custoMes)}</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">este mês</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/50">
        {PANEL_TABS.map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("h-9 rounded-lg text-xs font-bold transition-colors", tab === id ? "bg-background shadow-sm" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {erro && <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : tab === "financeiro" ? (
        <SubFinanceiroView subUid={empresa.uid} empresaNome={nome} dias={dias} pagamentos={pagamentos} obras={obras} admin onChanged={changed} />
      ) : tab === "obras" ? (
        <div className="space-y-2.5">
          <button onClick={() => setAtribuir(true)}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98]">
            <Plus className="h-4 w-4" />Atribuir obra
          </button>
          {obras.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-6">Sem obras atribuídas. A empresa só regista trabalho em obras que lhe atribuíres.</p>
            : obras.map(o => <SubObraCard key={o.id} obra={o} ordens={o.subOrdens?.[empresa.uid]} stats={statsObra(o.id, dias)} onClick={() => setDetailId(o.id)} />)}
        </div>
      ) : tab === "calendario" ? (
        <SubCalendar subUid={empresa.uid} empresaNome={nome} obras={obras} equipa={equipa} dias={dias} onChanged={changed} />
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <p className={lbl}>Equipa da empresa</p>
            <SubEquipaView uid={empresa.uid} equipa={equipa} onSaved={changed} />
          </section>
          <section className="space-y-3">
            <p className={lbl}>Dados da empresa</p>
            <EmpresaForm uid={empresa.uid} empresa={perfil} onSaved={e => { setEmpresa(e); onChanged() }} />
          </section>
          <section className="space-y-2">
            <p className={lbl}>Acesso</p>
            <button onClick={async () => { await setSubAtivo(empresa.uid, !empresa.ativo); onChanged() }}
              className={cn("w-full h-11 rounded-xl text-sm font-bold active:scale-[0.98]",
                empresa.ativo ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400")}>
              {empresa.ativo ? "Suspender acesso" : "Reativar acesso"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              {empresa.ativo ? "A empresa deixa de poder entrar até reativares." : "A empresa está suspensa e não consegue entrar."}
            </p>
          </section>
        </div>
      )}

      <SubAtribuirSheet open={atribuir} onClose={() => setAtribuir(false)} empresaUid={empresa.uid} empresaNome={nome}
        obras={todasObras} onDone={changed} onGoObras={onGoObras} />
      <SubObraDetail open={!!detailId} onClose={() => setDetailId(null)}
        obra={obras.find(o => o.id === detailId) ?? null} dias={dias} subUid={empresa.uid} admin onChanged={changed} />
    </div>
  )
}

// ── Lista ────────────────────────────────────────────────────────────────────
export function AdminSubempreiteirosView() {
  const [empresas, setEmpresas] = useState<SubEmpresa[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [dias, setDias] = useState<SubDia[]>([])
  const [pagamentos, setPagamentos] = useState<SubPagamento[]>([])
  const [convites, setConvites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [selUid, setSelUid] = useState<string | null>(null)
  const [convidar, setConvidar] = useState(false)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    const r = await Promise.allSettled([getSubEmpresas(), getSubcontractorEmails(), getObras(), getAllDias(), getAllPagamentos()])
    if (r[0].status === "fulfilled") setEmpresas(r[0].value)
    if (r[1].status === "fulfilled") setConvites(r[1].value)
    if (r[2].status === "fulfilled") setObras(r[2].value)
    if (r[3].status === "fulfilled") setDias(r[3].value)
    if (r[4].status === "fulfilled") setPagamentos(r[4].value)
    const falhas = r.filter(x => x.status === "rejected") as PromiseRejectedResult[]
    setErro(falhas.length ? `Erro a ler dados: ${explainFirebaseError(falhas[0].reason)}` : "")
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const sel = empresas.find(e => e.uid === selUid) ?? null
  const mesAtual = new Date().toISOString().slice(0, 7)

  const resumo = useMemo(() => {
    const m: Record<string, { obras: number; custoMes: number; horasMes: number; divida: number }> = {}
    empresas.forEach(e => {
      m[e.uid] = { obras: 0, custoMes: 0, horasMes: 0, divida: resumoFinanceiro(dias.filter(d => d.subUid === e.uid), pagamentos.filter(p => p.subUid === e.uid)).emDivida }
    })
    obras.forEach(o => (o.subUids ?? []).forEach(u => { if (m[u]) m[u].obras++ }))
    dias.forEach(d => { if (m[d.subUid] && d.date.startsWith(mesAtual)) { m[d.subUid].custoMes += d.totalCusto; m[d.subUid].horasMes += d.totalHoras } })
    return m
  }, [empresas, obras, dias, pagamentos, mesAtual])

  // quem deve mais aparece primeiro
  const ordenadas = useMemo(
    () => [...empresas].sort((a, b) => (resumo[b.uid]?.divida ?? 0) - (resumo[a.uid]?.divida ?? 0) || nomeDe(a).localeCompare(nomeDe(b))),
    [empresas, resumo],
  )
  const totalMes = Object.values(resumo).reduce((a, x) => a + x.custoMes, 0)
  const totalDivida = Object.values(resumo).reduce((a, x) => a + x.divida, 0)

  const pendentes = useMemo(() => {
    const reg = new Set(empresas.map(e => e.email.toLowerCase()))
    return convites.filter(c => !reg.has(c))
  }, [convites, empresas])

  const enviarConvite = async () => {
    const v = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(v)) { alert("Indica um email válido."); return }
    setInviting(true)
    try { await inviteSubcontractor(v); setEmail(""); await load() }
    catch (err) { alert(`Não foi possível convidar: ${explainFirebaseError(err)}`) }
    finally { setInviting(false) }
  }

  // ── Página da empresa ──
  if (sel) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <EmpresaDetalhe key={sel.uid} empresa={sel} todasObras={obras} onChanged={load} onBack={() => setSelUid(null)}
          onGoObras={() => { setSelUid(null); window.dispatchEvent(new CustomEvent("jb:admin-goto", { detail: "obras" })) }} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-black">Empreiteiros</h1>
          <p className="text-xs text-muted-foreground">Obras, equipa, horas e pagamentos</p>
        </div>
        <button onClick={() => setConvidar(true)}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 active:scale-95">
          <Plus className="h-4 w-4" />Convidar
        </button>
      </div>

      {empresas.length > 0 && (
        <div className="grid grid-cols-2 divide-x divide-border/50 rounded-2xl border border-border/40 bg-card">
          <div className="py-3.5 text-center">
            <p className={cn("text-lg font-black tabular-nums", totalDivida > 0.005 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
              {totalDivida > 0.005 ? fmtEuro(totalDivida) : "Em dia"}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">por pagar</p>
          </div>
          <div className="py-3.5 text-center">
            <p className="text-lg font-black tabular-nums">{fmtEuro(totalMes)}</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">este mês</p>
          </div>
        </div>
      )}

      {pendentes.length > 0 && (
        <button onClick={() => setConvidar(true)}
          className="w-full flex items-center gap-2 text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-2.5 text-left">
          <Mail className="h-3.5 w-3.5 shrink-0" />{pendentes.length} convite(s) a aguardar registo
        </button>
      )}

      {erro && <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : empresas.length === 0 ? (
        <div className="py-14 text-center space-y-2">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-semibold">Ainda sem empreiteiros</p>
          <p className="text-xs text-muted-foreground">Toca em “Convidar” e indica o email Google da empresa.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ordenadas.map(e => {
            const r = resumo[e.uid]
            return (
              <button key={e.uid} onClick={() => setSelUid(e.uid)}
                className="w-full text-left rounded-2xl border border-border/40 bg-card p-3.5 flex items-center gap-3 active:scale-[0.99]">
                <Logo url={e.empresa.logoUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{nomeDe(e)}{!e.ativo && <span className="ml-1.5 text-[10px] font-bold text-destructive">suspensa</span>}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r?.obras ?? 0} obra(s){(r?.horasMes ?? 0) > 0 ? ` · ${r.horasMes} h este mês` : ""}
                  </p>
                </div>
                {(r?.divida ?? 0) > 0.005 ? (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">{fmtEuro(r.divida)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">deve</p>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0"><Check className="h-3.5 w-3.5" />Em dia</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Convidar */}
      <Dialog open={convidar} onOpenChange={setConvidar}>
        <DialogContent className="max-w-md rounded-3xl p-5 gap-4">
          <div>
            <DialogTitle className="text-lg font-black">Convidar empreiteiro</DialogTitle>
            <DialogDescription className="text-xs">Indica o email Google da empresa. Ao entrar com esse email fica logo como empreiteiro.</DialogDescription>
          </div>
          <div className="flex gap-2">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="empresa@gmail.com"
              className="h-11 rounded-xl" onKeyDown={e => e.key === "Enter" && enviarConvite()} />
            <button onClick={enviarConvite} disabled={inviting}
              className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 active:scale-95">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Convidar
            </button>
          </div>
          {pendentes.length > 0 && (
            <div className="space-y-1.5">
              <p className={lbl}>A aguardar registo</p>
              {pendentes.map(p => (
                <p key={p} className="flex items-center gap-2 text-xs rounded-lg bg-muted/50 px-3 py-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{p}</p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
