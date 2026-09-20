// components/admin/admin-side-nav.tsx
"use client"

import { useAuth } from "@/lib/AuthProvider"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, FileText, Settings,
  Euro, HardHat, ChevronRight, ArrowLeft, LogOut, ShieldCheck, CalendarDays,
} from "lucide-react"
import type { AdminTabType } from "./admin-bottom-nav"
import Image from "next/image"
import Link from "next/link"

interface AdminSideNavProps {
  activeTab: AdminTabType
  onTabChange: (tab: AdminTabType) => void
}

const navItems: { id: AdminTabType; label: string; icon: React.ElementType; desc: string; accent?: string }[] = [
  { id: "dashboard",     label: "Dashboard",    icon: LayoutDashboard, desc: "KPIs & visão geral",     accent: "text-blue-500" },
  { id: "collaborators", label: "Equipa",        icon: Users,           desc: "Colaboradores & taxas",  accent: "text-purple-500" },
  { id: "obras",         label: "Obras",         icon: HardHat,         desc: "Projetos & localização", accent: "text-amber-500" },
  { id: "escalas",       label: "Escala",        icon: CalendarDays,    desc: "Distribuição diária",    accent: "text-orange-500" },
  { id: "finance",       label: "Financeiro",    icon: Euro,            desc: "Pagamentos globais",     accent: "text-emerald-500" },
  { id: "reports",       label: "Relatórios",    icon: FileText,        desc: "Exportação & análise",   accent: "text-cyan-500" },
  { id: "settings",      label: "Configurações", icon: Settings,        desc: "Sistema & permissões",   accent: "text-slate-500" },
]

const accentBg: Record<string, string> = {
  "text-blue-500":    "bg-blue-100 dark:bg-blue-950/40",
  "text-purple-500":  "bg-purple-100 dark:bg-purple-950/40",
  "text-amber-500":   "bg-amber-100 dark:bg-amber-950/40",
  "text-orange-500":  "bg-orange-100 dark:bg-orange-950/40",
  "text-emerald-500": "bg-emerald-100 dark:bg-emerald-950/40",
  "text-cyan-500":    "bg-cyan-100 dark:bg-cyan-950/40",
  "text-slate-500":   "bg-slate-100 dark:bg-slate-800/60",
}

export function AdminSideNav({ activeTab, onTabChange }: AdminSideNavProps) {
  const { user, logout } = useAuth()

  const userInitials = (user?.displayName ?? user?.email ?? "A")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl"
      style={{ WebkitBackdropFilter: "blur(20px)" }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border/60 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black tracking-tight truncate">Painel Admin</p>
          <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wider uppercase">JBRICOLAGE</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-dot" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Módulos</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const accentColor = item.accent ?? "text-primary"
          const bgColor = accentBg[accentColor] ?? "bg-muted/60"

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150",
                isActive ? "bg-primary/15 text-primary" : cn(bgColor, accentColor)
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
      </nav>

      {/* Back to App */}
      <div className="px-3 pb-2 shrink-0">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 group">
          <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Voltar à App</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Vista colaborador</p>
          </div>
        </Link>
      </div>

      {/* User */}
      <div className="border-t border-border/60 px-3 py-3 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors duration-150 group">
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="avatar" width={32} height={32}
              className="w-8 h-8 rounded-full ring-2 ring-border shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{user?.displayName ?? "Admin"}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Terminar sessão"
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-150 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
