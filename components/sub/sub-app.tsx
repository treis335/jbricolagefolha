// components/sub/sub-app.tsx
// Ecrã do subempreiteiro: Calendário · Obras · Equipa (rodapé). Ferramentas e Perfil no topo.
"use client"
import { useState } from "react"
import { Building2, CalendarDays, HardHat, Users, Wrench, User, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { useSubData } from "@/hooks/useSubData"
import { cn } from "@/lib/utils"
import { statsObra } from "@/lib/subempreiteiros-service"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { MinhasFerramentasView } from "@/components/minhas-ferramentas-view"
import { SubObraCard } from "./sub-obra-card"
import { SubObraDetail } from "./sub-obra-detail"
import { SubCalendar } from "./sub-calendar"
import { SubEquipaView } from "./sub-equipa-view"
import { EmpresaForm } from "./empresa-form"

type Tab = "calendar" | "obras" | "equipa"

export function SubApp() {
  const { user, logout } = useAuth()
  const { obras, dias, equipa, empresa, setEmpresa, loading, erro, reload } = useSubData(user?.uid)
  const [tab, setTab] = useState<Tab>("calendar")
  const [ferramentas, setFerramentas] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [selObraId, setSelObraId] = useState<string | null>(null)

  if (!user) return null
  const nome = empresa.nome || user.displayName || "Empresa"

  const tabs = [
    { id: "calendar", label: "Calendário", Icon: CalendarDays },
    { id: "obras", label: "Obras", Icon: HardHat },
    { id: "equipa", label: "Equipa", Icon: Users },
  ] as const

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
            {empresa.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={empresa.logoUrl} alt="" className="w-full h-full object-contain" />
              : <Building2 className="h-4 w-4 text-muted-foreground/50" />}
          </div>
          <p className="flex-1 text-sm font-black truncate">{nome}</p>

          <button onClick={() => setFerramentas(f => !f)} title="As minhas ferramentas" aria-label="As minhas ferramentas"
            className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all active:scale-95",
              ferramentas
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-indigo-100 dark:bg-indigo-950/40 border-indigo-300/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400")}>
            <Wrench className="h-4 w-4" />
          </button>
          <button onClick={() => setPerfil(true)} title="Perfil" aria-label="Perfil"
            className="w-9 h-9 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-center shrink-0 active:scale-95">
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {erro && (
          <p className="text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>
        )}

        {ferramentas ? (
          <MinhasFerramentasView />
        ) : loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : tab === "calendar" ? (
          <SubCalendar subUid={user.uid} empresaNome={nome} obras={obras} equipa={equipa} dias={dias} onChanged={reload} />
        ) : tab === "obras" ? (
          obras.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <HardHat className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-semibold">Sem obras atribuídas</p>
              <p className="text-xs text-muted-foreground">Quando te atribuírem uma obra, aparece aqui com as ordens.</p>
            </div>
          ) : obras.map(o => (
            <SubObraCard key={o.id} obra={o} compact stats={statsObra(o.id, dias)} onClick={() => setSelObraId(o.id)} />
          ))
        ) : (
          <SubEquipaView uid={user.uid} equipa={equipa} onSaved={reload} />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto grid grid-cols-3 h-16">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => { setTab(id); setFerramentas(false) }}
              className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
                !ferramentas && tab === id ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />{label}
            </button>
          ))}
        </div>
      </nav>

      <SubObraDetail open={!!selObraId} onClose={() => setSelObraId(null)} obra={obras.find(o => o.id === selObraId) ?? null}
        dias={dias} />

      {/* Perfil: dados da empresa + sair */}
      <Sheet open={perfil} onOpenChange={setPerfil}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-background max-h-[94dvh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-2xl">
          <div className="px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            <SheetHeader className="text-left space-y-0">
              <SheetTitle className="text-xl font-black">Perfil</SheetTitle>
              <SheetDescription className="text-xs">{user.email} · dados da empresa (tudo opcional)</SheetDescription>
            </SheetHeader>
            <EmpresaForm uid={user.uid} empresa={empresa} onSaved={e => { setEmpresa(e); reload() }} />
            <button onClick={() => logout()}
              className="w-full h-11 rounded-xl bg-destructive/10 text-destructive text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
              <LogOut className="h-4 w-4" />Terminar sessão
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
