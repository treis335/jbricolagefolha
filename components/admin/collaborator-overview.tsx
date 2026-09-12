// components/admin/collaborator-overview.tsx
"use client"

import { useMemo } from "react"
import { Clock, Mail, AtSign, TrendingUp, CalendarDays, ChevronLeft, ChevronRight, Euro, BarChart3, Flame } from "lucide-react"
import { CollaboratorRateManager, type RateHistoryEntry } from "./collaborator-rate-manager"
import { cn } from "@/lib/utils"

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

interface SelectedMonth { year: number; month: number }

interface Props {
  collaborator: {
    id: string; name: string; username: string; email: string
    currentRate: number; totalHoursAllTime: number
    entries: any[]; role: string; createdAt: any
    migrated?: boolean; rateHistory?: RateHistoryEntry[]
  }
  onRateUpdated?: (newRate: number, newHistory: RateHistoryEntry[]) => void
  selectedMonth: SelectedMonth
  onPrevMonth: () => void
  onNextMonth: () => void
  isCurrentMonth: boolean
}

const GRADS = ["from-blue-500 to-indigo-600","from-emerald-500 to-teal-600","from-violet-500 to-purple-600","from-orange-500 to-amber-500","from-pink-500 to-rose-600"]
const grad = (name: string) => GRADS[name.charCodeAt(0) % GRADS.length]
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0,2).map(w => w[0]).join("").toUpperCase()
const fmt2 = (v: number) => v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CollaboratorOverview({ collaborator, onRateUpdated, selectedMonth, onPrevMonth, onNextMonth, isCurrentMonth }: Props) {

  const stats = useMemo(() => {
    const entries = collaborator.entries || []
    const totalDays = new Set(entries.map((e: any) => e.date)).size
    const totalH    = collaborator.totalHoursAllTime || 0
    const avgH      = totalDays > 0 ? totalH / totalDays : 0

    const lastDate  = entries.length > 0
      ? new Date(Math.max(...entries.map((e: any) => new Date(e.date).getTime())))
      : null

    const totalCost = entries.reduce((s: number, e: any) => {
      const taxa = typeof e.taxaHoraria === "number" && e.taxaHoraria > 0 ? e.taxaHoraria : collaborator.currentRate
      return s + (e.totalHoras || 0) * taxa
    }, 0)

    const monthEntries = entries.filter((e: any) => {
      if (!e.date) return false
      const [y, m] = e.date.split("-").map(Number)
      return y === selectedMonth.year && m - 1 === selectedMonth.month
    })

    const monthH    = monthEntries.reduce((s: number, e: any) => s + (e.totalHoras || 0), 0)
    const monthCost = monthEntries.reduce((s: number, e: any) => {
      const taxa = typeof e.taxaHoraria === "number" && e.taxaHoraria > 0 ? e.taxaHoraria : collaborator.currentRate
      return s + (e.totalHoras || 0) * taxa
    }, 0)
    const monthDays  = monthEntries.filter((e: any) => e.totalHoras > 0).length
    const monthExtra = monthEntries.reduce((s: number, e: any) => s + (e.extraHoras || 0), 0)

    // Streak — consecutive days with entries (from today backwards)
    const dateSet = new Set(entries.map((e: any) => e.date))
    let streak = 0
    const d = new Date()
    while (true) {
      const key = d.toISOString().slice(0, 10)
      if (!dateSet.has(key)) break
      streak++
      d.setDate(d.getDate() - 1)
    }

    return { totalDays, totalH, avgH, lastDate, totalCost, monthH, monthCost, monthDays, monthExtra, streak }
  }, [collaborator.entries, collaborator.currentRate, collaborator.totalHoursAllTime, selectedMonth])

  const MonthNav = () => (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onPrevMonth} className="w-7 h-7 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-all active:scale-90">
        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <span className="text-[11px] font-bold text-muted-foreground min-w-[110px] text-center truncate">
        {MONTHS_PT[selectedMonth.month]} {selectedMonth.year}
      </span>
      <button onClick={onNextMonth} disabled={isCurrentMonth}
        className="w-7 h-7 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-all active:scale-90 disabled:opacity-30">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* ── Hero card ── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Gradient top strip */}
        <div className={cn("h-16 bg-gradient-to-r opacity-80", grad(collaborator.name))} />
        <div className="px-5 pb-5">
          {/* Avatar overlapping strip */}
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br text-white text-xl font-black flex items-center justify-center shadow-lg ring-4 ring-background", grad(collaborator.name))}>
              {initials(collaborator.name)}
            </div>
            {stats.streak > 2 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 mb-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-black text-orange-600 dark:text-orange-400">{stats.streak} dias seguidos</span>
              </div>
            )}
          </div>

          <h2 className="text-lg font-black text-foreground leading-tight">{collaborator.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {collaborator.username && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AtSign className="h-3 w-3" />{collaborator.username}
              </span>
            )}
            {collaborator.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <Mail className="h-3 w-3 shrink-0" />{collaborator.email}
              </span>
            )}
          </div>
          {stats.lastDate && (
            <p className="text-[11px] text-muted-foreground/50 mt-1.5 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Último registo: {stats.lastDate.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* ── Taxa Horária ── */}
      <CollaboratorRateManager
        collaboratorId={collaborator.id}
        collaboratorName={collaborator.name}
        currentRate={collaborator.currentRate}
        rateHistory={collaborator.rateHistory ?? []}
        onRateUpdated={onRateUpdated ?? (() => {})}
      />

      {/* ── Stats do mês ── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Este Mês</span>
          </div>
          <MonthNav />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-b border-border/30">
          {[
            { label: "Horas",     value: `${stats.monthH.toFixed(1)}h`,      color: "text-blue-600 dark:text-blue-400"   },
            { label: "Dias",      value: `${stats.monthDays}d`,              color: "text-violet-600 dark:text-violet-400"},
            { label: "Extra",     value: `${stats.monthExtra.toFixed(1)}h`,  color: "text-orange-500 dark:text-orange-400"},
            { label: "Custo",     value: `${fmt2(stats.monthCost)}€`,        color: "text-emerald-600 dark:text-emerald-400"},
          ].map(s => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">{s.label}</p>
              <p className={cn("text-base font-black tabular-nums", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Stats históricas ── */}
        <div className="grid grid-cols-3 divide-x">
          {[
            { icon: Clock,    label: "Total horas",   value: `${stats.totalH.toFixed(0)}h`,       color: "text-blue-600 dark:text-blue-400"    },
            { icon: BarChart3, label: "Média/dia",    value: `${stats.avgH.toFixed(1)}h`,          color: "text-violet-600 dark:text-violet-400" },
            { icon: Euro,     label: "Custo total",   value: `${fmt2(stats.totalCost)}€`,          color: "text-emerald-600 dark:text-emerald-400"},
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="px-3 py-3 flex flex-col items-center text-center gap-1">
              <Icon className={cn("h-3.5 w-3.5 opacity-50", color)} />
              <p className={cn("text-sm font-black tabular-nums", color)}>{value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
