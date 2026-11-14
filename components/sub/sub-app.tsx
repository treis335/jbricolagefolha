// components/sub/sub-app.tsx
// Ecrã do empreiteiro: Calendário · Obras · Equipa (rodapé). Ferramentas e Perfil ficam no header global (sempre visíveis).
"use client"
import { useCallback, useEffect, useState } from "react"
import { Building2, CalendarDays, HardHat, Users, Wallet, Wrench, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { useSubData } from "@/hooks/useSubData"
import { cn } from "@/lib/utils"
import { statsObra } from "@/lib/subempreiteiros-service"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { BottomNav, type NavItem } from "@/components/bottom-nav"
import { MinhasFerramentasView } from "@/components/minhas-ferramentas-view"
import { SubObraCard } from "./sub-obra-card"
import { SubObraDetail } from "./sub-obra-detail"
import { SubCalendar } from "./sub-calendar"
import { SubEquipaView } from "./sub-equipa-view"
import { EmpresaForm } from "./empresa-form"
import { SubFinanceiroView } from "./sub-financeiro-view"

type Tab = "calendar" | "obras" | "equipa" | "financeiro"

const ITENS: NavItem[] = [
  { id: "calendar", label: "Calendário", icon: CalendarDays },
  { id: "obras", label: "Obras", icon: HardHat },
  { id: "equipa", label: "Equipa", icon: Users },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
]

export function SubApp() {
  const { user, logout } = useAuth()
  const { obras, dias, pagamentos, equipa, empresa, setEmpresa, loading, erro, reload } = useSubData(user?.uid)
  const [tab, setTab] = useState<Tab>("calendar")
  const [ferramentas, setFerramentas] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [selObraId, setSelObraId] = useState<string | null>(null)

  // O header global (ferramentas + perfil) comunica por eventos — o mesmo mecanismo dos colaboradores
  useEffect(() => {
    const setTabEv = (e: Event) => {
      const d = String((e as CustomEvent).detail ?? "")
      if (d === "ferramentas") setFerramentas(true)
      else { setFerramentas(false); if (ITENS.some(i => i.id === d)) setTab(d as Tab) }
    }
    const perfilEv = () => setPerfil(true)
    window.addEventListener("jb:set-tab", setTabEv)
    window.addEventListener("jb:open-perfil", perfilEv)
    return () => { window.removeEventListener("jb:set-tab", setTabEv); window.removeEventListener("jb:open-perfil", perfilEv) }
  }, [])

  // Informa o header do separador ativo (para destacar o botão das ferramentas)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("jb:tab-changed", { detail: ferramentas ? "ferramentas" : tab }))
  }, [ferramentas, tab])

  const irPara = useCallback((id: string) => { setTab(id as Tab); setFerramentas(false) }, [])

  if (!user) return null
  const nome = empresa.nome || user.displayName || "Empresa"
  const iniciais = (user.displayName ?? user.email ?? "U").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Desktop: barra própria (no telemóvel o header global já tem ferramentas + perfil) */}
      <div className="hidden lg:block sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
            {empresa.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={empresa.logoUrl} alt="" className="w-full h-full object-contain" />
              : <Building2 className="h-4 w-4 text-muted-foreground/50" />}
          </div>
          <p className="text-sm font-black truncate mr-4">{nome}</p>
          <div className="flex-1 flex gap-1">
            {ITENS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => irPara(id)}
                className={cn("h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5",
                  !ferramentas && tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
          <button onClick={() => setFerramentas(f => !f)} title="As minhas ferramentas"
            className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
              ferramentas ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-indigo-100 dark:bg-indigo-950/40 border-indigo-300/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400")}>
            <Wrench className="h-4 w-4" />
          </button>
          <button onClick={() => setPerfil(true)} title="Perfil"
            className="w-9 h-9 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black flex items-center justify-center shrink-0">
            {iniciais}
          </button>
        </div>
      </div>

      <main className="max-w-2xl lg:max-w-3xl mx-auto">
        {erro && (
          <p className="mx-4 mt-3 text-xs rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 p-3">{erro}</p>
        )}

        {ferramentas ? (
          <MinhasFerramentasView />
        ) : loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : tab === "calendar" ? (
          <SubCalendar subUid={user.uid} empresaNome={nome} obras={obras} equipa={equipa} dias={dias} onChanged={reload} fab />
        ) : tab === "obras" ? (
          <div className="px-4 pt-4 space-y-3">
            {obras.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <HardHat className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-semibold">Sem obras atribuídas</p>
                <p className="text-xs text-muted-foreground">Quando te atribuírem uma obra, aparece aqui com a foto, o mapa e as ordens.</p>
              </div>
            ) : obras.map(o => (
              <SubObraCard key={o.id} obra={o} ordens={o.subOrdens?.[user.uid]} stats={statsObra(o.id, dias)} onClick={() => setSelObraId(o.id)} />
            ))}
          </div>
        ) : tab === "financeiro" ? (
          <div className="px-4 pt-4">
            <SubFinanceiroView subUid={user.uid} empresaNome={nome} dias={dias} pagamentos={pagamentos} obras={obras} />
          </div>
        ) : (
          <div className="px-4 pt-4">
            <SubEquipaView uid={user.uid} equipa={equipa} onSaved={reload} />
          </div>
        )}
      </main>

      <BottomNav activeTab={ferramentas ? "" : tab} onTabChange={irPara} items={ITENS} />

      <SubObraDetail open={!!selObraId} onClose={() => setSelObraId(null)} obra={obras.find(o => o.id === selObraId) ?? null} dias={dias} subUid={user.uid} />

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
