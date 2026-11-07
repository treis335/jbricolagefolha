// components/admin/admin-subempreiteiros-view.tsx
// Backoffice das empresas subempreiteiras: convidar, ver trabalhos/fotos, editar dados e trabalhos. Sem horas nem €.
"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, Loader2, Plus, Mail, ChevronRight, Power } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  type SubEmpresa, type SubJob, getSubEmpresas, getAllJobs, inviteSubcontractor,
  getSubcontractorEmails, setSubAtivo,
} from "@/lib/subempreiteiros-service"
import { SubJobCard } from "@/components/sub/sub-job-card"
import { SubJobSheet } from "@/components/sub/sub-job-sheet"
import { EmpresaForm } from "@/components/sub/empresa-form"

export function AdminSubempreiteirosView() {
  const [empresas, setEmpresas] = useState<SubEmpresa[]>([])
  const [jobs, setJobs] = useState<SubJob[]>([])
  const [convites, setConvites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [sel, setSel] = useState<SubEmpresa | null>(null)
  const [tab, setTab] = useState<"jobs" | "dados">("jobs")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SubJob | null>(null)

  const load = useCallback(async () => {
    // allSettled: se uma leitura falhar (ex.: regras Firestore ainda sem subJobs) as outras continuam a funcionar
    const [e, j, c] = await Promise.allSettled([getSubEmpresas(), getAllJobs(), getSubcontractorEmails()])
    if (e.status === "fulfilled") {
      setEmpresas(e.value)
      setSel(prev => prev ? e.value.find(x => x.uid === prev.uid) ?? null : null)
    }
    if (j.status === "fulfilled") setJobs(j.value)
    if (c.status === "fulfilled") setConvites(c.value)
    const falhas = [e, j, c].filter(r => r.status === "rejected") as PromiseRejectedResult[]
    setErro(falhas.length ? `Sem permissão/erro a ler dados: ${falhas.map(f => f.reason?.code || f.reason?.message).join(", ")}` : "")
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const jobsDe = useMemo(() => {
    const m: Record<string, SubJob[]> = {}
    jobs.forEach(j => { (m[j.subUid] ||= []).push(j) })
    return m
  }, [jobs])

  const pendentes = useMemo(() => {
    const reg = new Set(empresas.map(e => e.email.toLowerCase()))
    return convites.filter(c => !reg.has(c))
  }, [convites, empresas])

  const convidar = async () => {
    const v = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(v)) return
    setInviting(true)
    try { await inviteSubcontractor(v); setEmail("") }
    catch (err) {
      const e = err as { code?: string; message?: string }
      alert(`Não foi possível convidar: ${e.code || e.message || "erro desconhecido"}`)
      setInviting(false); return
    }
    await load()
    setInviting(false)
  }

  const nomeDe = (e: SubEmpresa) => e.empresa.nome || e.name || e.email

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-black">Subempreiteiros</h1>
        <p className="text-xs text-muted-foreground">Empresas externas — só obra, título, descrição e fotos. Sem horas nem €.</p>
      </div>

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
            <button key={e.uid} onClick={() => { setSel(e); setTab("jobs") }}
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
                  {(jobsDe[e.uid]?.length ?? 0)} trabalho(s){e.empresa.nif ? ` · NIF ${e.empresa.nif}` : ""}{!e.ativo ? " · suspensa" : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!sel} onOpenChange={o => !o && setSel(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          {sel && (
            <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
              <SheetHeader className="text-left space-y-0">
                <SheetTitle className="text-xl font-black">{nomeDe(sel)}</SheetTitle>
                <SheetDescription className="text-xs">{sel.email}</SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50">
                {([["jobs", "Trabalhos"], ["dados", "Dados da empresa"]] as const).map(([id, l]) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={cn("h-9 rounded-lg text-xs font-bold", tab === id ? "bg-background shadow-sm" : "text-muted-foreground")}>{l}</button>
                ))}
              </div>

              {tab === "jobs" ? (
                <div className="space-y-2.5">
                  <button onClick={() => { setEditing(null); setSheetOpen(true) }}
                    className="w-full h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95">
                    <Plus className="h-4 w-4" />Atribuir / adicionar trabalho
                  </button>
                  {(jobsDe[sel.uid] ?? []).length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-6">Sem trabalhos.</p>
                    : (jobsDe[sel.uid] ?? []).map(j => (
                        <SubJobCard key={j.id} job={j} onClick={() => { setEditing(j); setSheetOpen(true) }} />
                      ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <EmpresaForm uid={sel.uid} empresa={sel.empresa} onSaved={load} />
                  <button onClick={async () => { await setSubAtivo(sel.uid, !sel.ativo); load() }}
                    className={cn("w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5",
                      sel.ativo ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700")}>
                    <Power className="h-3.5 w-3.5" />{sel.ativo ? "Suspender acesso" : "Reativar acesso"}
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {sel && (
        <SubJobSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={load}
          job={editing} subUid={sel.uid} empresaNome={nomeDe(sel)} createdBy="admin" />
      )}
    </div>
  )
}
