// components/sub/sub-app.tsx
// Ecrã simplificado da empresa subempreiteira: Trabalhos + Empresa. Sem horas, sem €.
"use client"
import { useCallback, useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { Briefcase, Building2, HardHat, Plus, LogOut, Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/AuthProvider"
import { cn } from "@/lib/utils"
import { type SubJob, type SubObra, type EmpresaPerfil, getJobsBySub, getSubObrasBySub } from "@/lib/subempreiteiros-service"
import { SubObraCard } from "./sub-obra-card"
import { SubJobCard } from "./sub-job-card"
import { SubJobSheet } from "./sub-job-sheet"
import { EmpresaForm } from "./empresa-form"

export function SubApp() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<"obras" | "jobs" | "empresa">("obras")
  const [jobs, setJobs] = useState<SubJob[]>([])
  const [obras, setObras] = useState<SubObra[]>([])
  const [empresa, setEmpresa] = useState<EmpresaPerfil>({})
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SubJob | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [js, us, os] = await Promise.all([getJobsBySub(user.uid), getDoc(doc(db, "users", user.uid)), getSubObrasBySub(user.uid)])
      setJobs(js); setObras(os)
      setEmpresa((us.exists() ? us.data().empresa : {}) ?? {})
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  if (!user) return null
  const nome = empresa.nome || user.displayName || "Empresa"

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
            {empresa.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={empresa.logoUrl} alt="" className="w-full h-full object-contain" />
              : <Building2 className="h-4 w-4 text-muted-foreground/50" />}
          </div>
          <p className="flex-1 text-sm font-black truncate">{nome}</p>
          <button onClick={() => logout()} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center" aria-label="Sair">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {tab === "obras" ? (
          loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : obras.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <HardHat className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-semibold">Sem obras atribuídas</p>
              <p className="text-xs text-muted-foreground">Quando te atribuírem uma obra, aparece aqui com as ordens.</p>
            </div>
          ) : obras.map(o => <SubObraCard key={o.id} obra={o} />)
        ) : tab === "jobs" ? (
          loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-semibold">Ainda sem trabalhos</p>
              <p className="text-xs text-muted-foreground">Toca em “Novo trabalho” para registar o primeiro.</p>
            </div>
          ) : jobs.map(j => (
            <SubJobCard key={j.id} job={j} onClick={() => { setEditing(j); setSheetOpen(true) }} />
          ))
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card p-4">
            <p className="text-xs text-muted-foreground mb-4">Preenche se quiseres — tudo opcional.</p>
            <EmpresaForm uid={user.uid} empresa={empresa} onSaved={setEmpresa} />
          </div>
        )}
      </main>

      {tab === "jobs" && obras.length > 0 && (
        <button onClick={() => { setEditing(null); setSheetOpen(true) }}
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] h-12 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg flex items-center gap-2 active:scale-95 z-40">
          <Plus className="h-4 w-4" />Novo trabalho
        </button>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto grid grid-cols-3 h-16">
          {([["obras", "Obras", HardHat], ["jobs", "Trabalhos", Briefcase], ["empresa", "Empresa", Building2]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold", tab === id ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />{label}
            </button>
          ))}
        </div>
      </nav>

      <SubJobSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSaved={load}
        job={editing} obras={obras} subUid={user.uid} empresaNome={nome} createdBy="empresa" />
    </div>
  )
}
