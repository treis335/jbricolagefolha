// components/admin/admin-subempreiteiros-view.tsx
// Empreiteiros (admin/patrão): lista clara de quem deve o quê → página da empresa com uma ação principal
// (Registar pagamento) e 4 separadores: Financeiro · Obras · Calendário · Mais.
"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Building2, Loader2, Plus, Mail, ChevronRight, ChevronLeft, Check, Wallet, HardHat, CalendarDays, MoreHorizontal,
  Users, IdCard, ShieldCheck, ChevronDown, Banknote, UserPlus,
} from "lucide-react"
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
import { SubPagamentoDialog } from "@/components/sub/sub-pagamento-dialog"
import { EmpresaForm } from "@/components/sub/empresa-form"

type PanelTab = "financeiro" | "obras" | "calendario" | "mais"
const PANEL_TABS: { id: PanelTab; label: string; Icon: typeof Wallet }[] = [
  { id: "financeiro", label: "Financeiro", Icon: Wallet },
  { id: "obras", label: "Obras", Icon: HardHat },
  { id: "calendario", label: "Calendário", Icon: CalendarDays },
  { id: "mais", label: "Mais", Icon: MoreHorizontal },
]
const lbl = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
const nomeDe = (e: SubEmpresa) => e.empresa.nome || e.name || e.email
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"

function Logo({ url, nome, size = "w-12 h-12", text = "text-sm" }: { url?: string; nome: string; size?: string; text?: string }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden flex items-center justify-center shrink-0 bg-primary/10 text-primary font-black", size, text)}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="w-full h-full object-contain bg-card" />
        : iniciais(nome)}
    </div>
  )
}

// Linha expansível (secção "Mais")
function Secao({ Icon, titulo, sub, children }: { Icon: typeof Users; titulo: string; sub: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/30">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black">{titulo}</p>
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground/40 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border/40">{children}</div>}
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
  const [pagar, setPagar] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const nome = perfil.nome || empresa.name || empresa.email
  const changed = async () => { await reload(); onChanged() }

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-muted-foreground active:scale-95 -ml-1">
        <ChevronLeft className="h-4 w-4" />Empreiteiros
      </button>

      {/* Cabeçalho: quem é + a ação principal */}
      <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <Logo url={perfil.logoUrl} nome={nome} size="w-14 h-14" text="text-base" />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black tracking-tight truncate">{nome}</p>
            <p className="text-[11px] text-muted-foreground truncate">{empresa.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{obras.length} obra(s)</span>
              {!empresa.ativo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Suspensa</span>}
            </div>
          </div>
        </div>
        <button onClick={() => setPagar(true)}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-primary/20">
          <Banknote className="h-4 w-4" />Registar pagamento
        </button>
      </div>

      {/* Separadores */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-muted/60">
        {PANEL_TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all",
              tab === id ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {erro && <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : tab === "financeiro" ? (
        <SubFinanceiroView subUid={empresa.uid} empresaNome={nome} dias={dias} pagamentos={pagamentos} obras={obras}
          admin onChanged={changed} onRegistar={() => setPagar(true)} />
      ) : tab === "obras" ? (
        <div className="space-y-2.5 animate-fade-in">
          <button onClick={() => setAtribuir(true)}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] hover:bg-primary/5">
            <Plus className="h-4 w-4" />Atribuir obra
          </button>
          {obras.length === 0
            ? (
              <div className="py-8 text-center space-y-1.5">
                <HardHat className="h-9 w-9 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-semibold">Sem obras atribuídas</p>
                <p className="text-xs text-muted-foreground">A empresa só regista trabalho nas obras que lhe atribuíres.</p>
              </div>
            )
            : obras.map(o => <SubObraCard key={o.id} obra={o} ordens={o.subOrdens?.[empresa.uid]} stats={statsObra(o.id, dias)} onClick={() => setDetailId(o.id)} />)}
        </div>
      ) : tab === "calendario" ? (
        <SubCalendar subUid={empresa.uid} empresaNome={nome} obras={obras} equipa={equipa} dias={dias} onChanged={changed} />
      ) : (
        <div className="space-y-2.5 animate-fade-in">
          <Secao Icon={Users} titulo="Equipa" sub={`${equipa.length} pessoa(s) · valor/hora`}>
            <SubEquipaView uid={empresa.uid} equipa={equipa} onSaved={changed} />
          </Secao>
          <Secao Icon={IdCard} titulo="Dados da empresa" sub="Logótipo, NIF, contactos">
            <EmpresaForm uid={empresa.uid} empresa={perfil} onSaved={e => { setEmpresa(e); onChanged() }} />
          </Secao>
          <Secao Icon={ShieldCheck} titulo="Acesso" sub={empresa.ativo ? "Ativo" : "Suspenso"}>
            <div className="space-y-2.5 pt-2">
              <p className="text-xs text-muted-foreground">
                {empresa.ativo ? "Se suspenderes, a empresa deixa de conseguir entrar até reativares." : "A empresa está suspensa e não consegue entrar."}
              </p>
              <button onClick={async () => { await setSubAtivo(empresa.uid, !empresa.ativo); onChanged() }}
                className={cn("w-full h-11 rounded-xl text-sm font-bold active:scale-[0.98]",
                  empresa.ativo ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
                {empresa.ativo ? "Suspender acesso" : "Reativar acesso"}
              </button>
            </div>
          </Secao>
        </div>
      )}

      <SubPagamentoDialog open={pagar} onOpenChange={setPagar} subUid={empresa.uid} empresaNome={nome}
        dias={dias} pagamentos={pagamentos} obras={obras} onSaved={changed} />
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
    const m: Record<string, { obras: number; custoMes: number; horasMes: number; divida: number; pct: number }> = {}
    empresas.forEach(e => {
      const f = resumoFinanceiro(dias.filter(d => d.subUid === e.uid), pagamentos.filter(p => p.subUid === e.uid))
      m[e.uid] = { obras: 0, custoMes: 0, horasMes: 0, divida: f.emDivida, pct: f.totalGanho > 0 ? Math.min(100, (f.totalPago / f.totalGanho) * 100) : 0 }
    })
    obras.forEach(o => (o.subUids ?? []).forEach(u => { if (m[u]) m[u].obras++ }))
    dias.forEach(d => { if (m[d.subUid] && d.date.startsWith(mesAtual)) { m[d.subUid].custoMes += d.totalCusto; m[d.subUid].horasMes += d.totalHoras } })
    return m
  }, [empresas, obras, dias, pagamentos, mesAtual])

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

  if (sel) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <EmpresaDetalhe key={sel.uid} empresa={sel} todasObras={obras} onChanged={load} onBack={() => setSelUid(null)}
          onGoObras={() => { setSelUid(null); window.dispatchEvent(new CustomEvent("jb:admin-goto", { detail: "obras" })) }} />
      </div>
    )
  }

  const tudoEmDia = totalDivida <= 0.005

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tight">Empreiteiros</h1>
          <p className="text-xs text-muted-foreground">Quem trabalha para ti e o que lhes deves</p>
        </div>
        <button onClick={() => setConvidar(true)} aria-label="Convidar empreiteiro"
          className="h-11 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 active:scale-95 shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" />Convidar
        </button>
      </div>

      {empresas.length > 0 && (
        <div className={cn("rounded-3xl border p-5 flex items-end justify-between gap-4 shadow-sm",
          tudoEmDia ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card" : "border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card")}>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{tudoEmDia ? "Tudo em dia" : "Por pagar"}</p>
            <p className={cn("mt-1 text-4xl font-black tracking-tight tabular-nums leading-none",
              tudoEmDia ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
              {tudoEmDia ? <span className="flex items-center gap-2"><Check className="h-8 w-8" />0 €</span> : fmtEuro(totalDivida)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black tabular-nums">{fmtEuro(totalMes)}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">este mês</p>
          </div>
        </div>
      )}

      {pendentes.length > 0 && (
        <button onClick={() => setConvidar(true)}
          className="w-full flex items-center gap-2 text-xs rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 px-4 py-3 text-left">
          <Mail className="h-4 w-4 shrink-0" /><span className="flex-1">{pendentes.length} convite(s) a aguardar registo</span><ChevronRight className="h-4 w-4 opacity-50" />
        </button>
      )}

      {erro && <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : empresas.length === 0 ? (
        <div className="py-14 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Building2 className="h-7 w-7" /></div>
          <p className="text-base font-black">Ainda sem empreiteiros</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">Convida uma empresa com o email Google dela. Ao entrar, já fica com o ecrã próprio de empreiteiro.</p>
          <button onClick={() => setConvidar(true)}
            className="h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-1.5 active:scale-95">
            <UserPlus className="h-4 w-4" />Convidar empreiteiro
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenadas.map(e => {
            const r = resumo[e.uid]
            const deve = (r?.divida ?? 0) > 0.005
            return (
              <button key={e.uid} onClick={() => setSelUid(e.uid)}
                className="w-full text-left rounded-3xl border border-border/40 bg-card shadow-sm p-4 space-y-3 active:scale-[0.99] transition-transform">
                <div className="flex items-center gap-3">
                  <Logo url={e.empresa.logoUrl} nome={nomeDe(e)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate">{nomeDe(e)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r?.obras ?? 0} obra(s){(r?.horasMes ?? 0) > 0 ? ` · ${r.horasMes} h este mês` : ""}{!e.ativo ? " · suspensa" : ""}
                    </p>
                  </div>
                  {deve ? (
                    <span className="text-xs font-black tabular-nums px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">Deve {fmtEuro(r.divida)}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0"><Check className="h-3.5 w-3.5" />Em dia</span>
                  )}
                </div>
                {(r?.pct ?? 0) > 0 && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.pct}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Dialog open={convidar} onOpenChange={setConvidar}>
        <DialogContent className="max-w-md rounded-3xl p-5 gap-4">
          <div>
            <DialogTitle className="text-lg font-black">Convidar empreiteiro</DialogTitle>
            <DialogDescription className="text-xs">Indica o email Google da empresa. Ao entrar com esse email, fica logo como empreiteiro.</DialogDescription>
          </div>
          <div className="flex gap-2">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="empresa@gmail.com"
              className="h-12 rounded-2xl" onKeyDown={e => e.key === "Enter" && enviarConvite()} />
            <button onClick={enviarConvite} disabled={inviting}
              className="h-12 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 active:scale-95">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Convidar
            </button>
          </div>
          {pendentes.length > 0 && (
            <div className="space-y-1.5">
              <p className={lbl}>A aguardar registo</p>
              {pendentes.map(p => (
                <p key={p} className="flex items-center gap-2 text-xs rounded-xl bg-muted/50 px-3 py-2.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{p}</p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
