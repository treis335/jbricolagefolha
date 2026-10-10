// components/side-nav.tsx
"use client"

import { useAuth } from "@/lib/AuthProvider"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { cn } from "@/lib/utils"
import {
  CalendarDays, Wallet, Wrench, Settings,
  Plus, LogOut, ChevronRight, Clock, Euro, Zap,
} from "lucide-react"
import type { TabType } from "./bottom-nav"
import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"

interface SideNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onAddToday: () => void
}

const navItems: { id: TabType; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "calendar",   label: "Calendário",  icon: CalendarDays, desc: "Registar & consultar" },
  { id: "financeiro", label: "Financeiro",  icon: Wallet,       desc: "Pagamentos & saldo"  },
  { id: "ferramentas", label: "Ferramentas", icon: Wrench,      desc: "O que tens atribuído" },
  { id: "settings",   label: "Definições",  icon: Settings,     desc: "Perfil & taxa horária" },
]

export function SideNav({ activeTab, onTabChange, onAddToday }: SideNavProps) {
  const { user, logout, isAdmin } = useAuth()
  const { data, getFaltaReceber } = useWorkTracker()


  const stats = useMemo(() => {
    const entries = data?.entries ?? []
    const now = new Date()
    const monthEntries = entries.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalHoras = monthEntries.reduce((s, e) => s + (e.totalHoras ?? 0), 0)
    const falta = getFaltaReceber()
    return { totalHoras, falta }
  }, [data, getFaltaReceber])

  const userInitials = (user?.displayName ?? user?.email ?? "U")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl"
      style={{ WebkitBackdropFilter: "blur(20px)" }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border/60 shrink-0">
        <div className="relative w-8 h-8 rounded-xl overflow-hidden ring-1 ring-border/50 shrink-0">
          <Image src="/apple-icon.png" alt="JBRICOLAGE" fill className="object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black tracking-tight truncate">JBRICOLAGE</p>
          <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wider uppercase">Gestão de Obras</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
        </div>
      </div>

      {/* Quick Add */}
      <div className="px-4 py-4 shrink-0">
        <button
          onClick={onAddToday}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span>Registar Hoje</span>
          <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left group cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
              )}>
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.2 : 1.9} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold leading-none", isActive && "text-primary")}>{item.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{item.desc}</p>
              </div>
              {isActive ? (
                <div className="ml-auto w-1.5 h-5 rounded-full bg-primary" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
              )}
            </button>
          )
        })}

        {/* Admin link */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-border/50" />
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Admin</p>
            <Link href="/admin"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-amber-500" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none">Painel Admin</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Equipa & Finanças</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-40 group-hover:opacity-70 transition-opacity" />
            </Link>
          </>
        )}
      </nav>

      {/* Stats */}
      <div className="mx-3 mb-3 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden shrink-0">
        <div className="px-4 py-2.5 border-b border-border/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Este Mês</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border/40">
          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-3 w-3 text-blue-500" />
            </div>
            <p className="text-lg font-black tabular-nums text-blue-600 dark:text-blue-400">{stats.totalHoras.toFixed(0)}h</p>
            <p className="text-[10px] text-muted-foreground/60 font-medium">Horas</p>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Euro className="h-3 w-3 text-emerald-500" />
            </div>
            <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.falta.toFixed(0)}€
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-medium">A receber</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="border-t border-border/60 px-3 py-3 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors duration-150 group cursor-default">
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="avatar" width={32} height={32}
              className="w-8 h-8 rounded-full ring-2 ring-border shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
              {userInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{user?.displayName ?? "Utilizador"}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Terminar sessão"
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-150 shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
