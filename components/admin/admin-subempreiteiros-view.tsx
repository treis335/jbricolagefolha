// components/admin/admin-subempreiteiros-view.tsx
// Backoffice das empresas subempreiteiras: convidar, obras com ordens, calendário/equipa/custos, dados da empresa.
"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, Loader2, Plus, Mail, ChevronRight, Power } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  type SubEmpresa, type SubObra, type SubDia,
  getSubEmpresas, getAllSubObras, getAllDias, inviteSubcontractor,
  getSubcontractorEmails, setSubAtivo, explainFirebaseError, statsObra, fmtEuro,
} from "@/lib/subempreiteiros-service"
import { useSubData } from "@/hooks/useSubData"
import { SubObraCard } from "@/components/sub/sub-obra-card"
import { SubObraSheet } from "@/components/sub/sub-obra-sheet"
import { SubObraDetail } from "@/components/sub/sub-obra-detail"
import { SubCalendar } from "@/components/sub/sub-calendar"
import { SubEquipaView } from "@/components/sub/sub-equipa-view"
import { EmpresaForm } from "@/components/sub/empresa-form"

type PanelTab = "obras" | "calendario" | "equipa" | "empresa"
const PANEL_TABS: [PanelTab, string][] = [["obras", "Obras"], ["calendario", "Calendário"], ["equipa", "Equipa"], ["empresa", "Empresa"]]

const nomeDe = (e: SubEmpresa) => e.empresa.nome || e.name || e.email

// Conteúdo de uma empresa — o admin/patrão pode editar tudo (obras, dias, equipa, dados)
function EmpresaPanel({ empresa, onChanged }: { empresa: SubEmpresa; onChanged: () => void }) {
  const { obras, dias, equipa, empresa: perfil, setEmpresa, loading, erro, reload } = useSubData(empresa.uid)
  const [tab, setTab] = useState<PanelTab>("obras")
  const [obraSheet, setObraSheet] = useState(false)
  const [editingObra, setEditingObra] = useState<SubObra | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const nome = perfil.nome || empresa.name || empresa.email

  const changed = async () => { await reload(); onChanged() }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/50">
        {PANEL_TABS.map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("h-9 rounded-lg text-[11px] font-bold", tab === id ? "bg-background shadow-sm" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {erro && <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : tab === "obras" ? (
        <div className="space-y-2.5">
          <button onClick={() => { setEditingObra(null); setObraSheet(true) }}
            className="w-full h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95">
            <Plus className="h-4 w-4" />Nova obra para esta empresa
          </button>
          {obras.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-6">Sem obras atribuídas. A empresa só regista horas e fotos em obras criadas aqui.</p>
            : obras.map(o => <SubObraCard key={o.id} obra={o} compact stats={statsObra(o.id, dias)} onClick={() => setDetailId(o.id)} />)}
        </div>
      ) : tab === "calendario" ? (
        <SubCalendar subUid={empresa.uid} empresaNome={nome} obras={obras} equipa={equipa} dias={dias} onChanged={changed} />
      ) : tab === "equipa" ? (
        <SubEquipaView uid={empresa.uid} equipa={equipa} onSaved={changed} />
      ) : (
        <div className="space-y-4">
          <EmpresaForm uid={empresa.uid} empresa={perfil} onSaved={e => { setEmpresa(e); onChanged() }} />
          <button onClick={async () => { await setSubAtivo(empresa.uid, !empresa.ativo); onChanged() }}
            className={cn("w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5",
              empresa.ativo ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700")}>
            <Power className="h-3.5 w-3.5" />{empresa.ativo ? "Suspender acesso" : "Reativar acesso"}
          </button>
        </div>
      )}

      <SubObraSheet open={obraSheet} onClose={() => setObraSheet(false)} onSaved={changed}
        obra={editingObra} subUid={empresa.uid} empresaNome={nome} />
      <SubObraDetail open={!!detailId} onClose={() => setDetailId(null)}
        obra={obras.find(o => o.id === detailId) ?? null} dias={dias}
        onEditObra={() => { setEditingObra(obras.find(o => o.id === detailId) ?? null); setObraSheet(true) }} />
    </div>
  )
}

export function AdminSubempreiteirosView() {
  const [empresas, setEmpresas] = useState<SubEmpresa[]>([])
  const [obras, setObras] = useState<SubObra[]>([])
  const [dias, setDias] = useState<SubDia[]>([])
  const [convites, setConvites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [selUid, setSelUid] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await Promise.allSettled([getSubEmpresas(), getSubcontractorEmails(), getAllSubObras(), getAllDias()])
    if (r[0].status === "fulfilled") setEmpresas(r[0].value)
    if (r[1].status === "fulfilled") setConvites(r[1].value)
    if (r[2].status === "fulfilled") setObras(r[2].value)
    if (r[3].status === "fulfilled") setDias(r[3].value)
    const falhas = r.filter(x => x.status === "rejected") as PromiseRejectedResult[]
    setErro(falhas.length ? `Erro a ler dados: ${explainFirebaseError(falhas[0].reason)}` : "")
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const sel = empresas.find(e => e.uid === selUid) ?? null
  const mesAtual = new Date().toISOString().slice(0, 7)

  const resumo = useMemo(() => {
    const m: Record<string, { obras: number; custoMes: number; horasMes: number }> = {}
    empresas.forEach(e => { m[e.uid] = { obras: 0, custoMes: 0, horasMes: 0 } })
    obras.forEach(o => { if (m[o.subUid]) m[o.subUid].obras++ })
    dias.forEach(d => { if (m[d.subUid] && d.date.startsWith(mesAtual)) { m[d.subUid].custoMes += d.totalCusto; m[d.subUid].horasMes += d.totalHoras } })
    return m
  }, [empresas, obras, dias, mesAtual])

  const totalMes = Object.values(resumo).reduce((a, x) => a + x.custoMes, 0)

  const pendentes = useMemo(() => {
    const reg = new Set(empresas.map(e => e.email.toLowerCase()))
    return convites.filter(c => !reg.has(c))
  }, [convites, empresas])

  const convidar = async () => {
    const v = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(v)) return
    setInviting(true)
    try { await inviteSubcontractor(v); setEmail("") }
    catch (err) { alert(`Não foi possível convidar: ${explainFirebaseError(err)}`); setInviting(false); return }
    await load()
    setInviting(false)
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-black">Subempreiteiros</h1>
        <p className="text-xs text-muted-foreground">Empresas externas — obras atribuídas, equipa, horas e custos.</p>
      </div>

      {empresas.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Custo de subempreiteiros neste mês</span>
          <span className="text-lg font-black">{fmtEuro(totalMes)}</span>
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Convidar empresa (email Google)</p>
        <div className="flex gap-2">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="empresa@gmail.com"
            className="h-11 rounded-xl" onKeyDown={e => e.key === "Enter" && convidar()} />
          <button onClick={convidar} disabled={inviting}
            className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 active:scale-95">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Convidar
          </button>
        </div>
        {pendentes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {pendentes.map(p => (
              <span key={p} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Mail className="h-3 w-3" />{p} · a aguardar registo
              </span>
            ))}
          </div>
        )}
      </div>

      {erro && <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : empresas.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Ainda não há empresas registadas.</div>
      ) : (
        <div className="space-y-2.5">
          {empresas.map(e => (
            <button key={e.uid} onClick={() => setSelUid(e.uid)}
              className="w-full text-left rounded-2xl border border-border/40 bg-card p-4 flex items-center gap-3 active:scale-[0.99]">
              <div className="w-11 h-11 rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
                {e.empresa.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={e.empresa.logoUrl} alt="" className="w-full h-full object-contain" />
                  : <Building2 className="h-5 w-5 text-muted-foreground/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">{nomeDe(e)}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {resumo[e.uid]?.obras ?? 0} obra(s) · {resumo[e.uid]?.horasMes ?? 0} h · {fmtEuro(resumo[e.uid]?.custoMes ?? 0)} este mês{!e.ativo ? " · suspensa" : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!sel} onOpenChange={o => !o && setSelUid(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          {sel && (
            <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
              <SheetHeader className="text-left space-y-0">
                <SheetTitle className="text-xl font-black">{nomeDe(sel)}</SheetTitle>
                <SheetDescription className="text-xs">{sel.email}</SheetDescription>
              </SheetHeader>
              <EmpresaPanel key={sel.uid} empresa={sel} onChanged={load} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
