// components/admin/collaborator-overview.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Briefcase, Mail, AtSign, User, TrendingUp, BarChart2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { CollaboratorRateManager, type RateHistoryEntry } from "./collaborator-rate-manager"

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

interface SelectedMonth {
  year: number
  month: number // 0-indexed
}

interface CollaboratorOverviewProps {
  collaborator: {
    id: string
    name: string
    username: string
    email: string
    currentRate: number
    totalHoursAllTime: number
    entries: any[]
    role: string
    createdAt: any
    migrated?: boolean
    rateHistory?: RateHistoryEntry[]
  }
  onRateUpdated?: (newRate: number, newHistory: RateHistoryEntry[]) => void
  selectedMonth: SelectedMonth
  onPrevMonth: () => void
  onNextMonth: () => void
  isCurrentMonth: boolean
}

export function CollaboratorOverview({
  collaborator,
  onRateUpdated,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  isCurrentMonth,
}: CollaboratorOverviewProps) {
  const totalDaysWorked = new Set(collaborator.entries.map(e => e.date)).size
  const averageHoursPerDay = totalDaysWorked > 0
    ? collaborator.totalHoursAllTime / totalDaysWorked
    : 0

  const lastWorkDate = collaborator.entries.length > 0
    ? new Date(Math.max(...collaborator.entries.map((e: any) => new Date(e.date).getTime())))
    : null

  const totalCostAllTime = collaborator.entries.reduce((sum: number, e: any) => {
    const taxa = (typeof e.taxaHoraria === "number" && e.taxaHoraria > 0) ? e.taxaHoraria : collaborator.currentRate
    return sum + (e.totalHoras || 0) * taxa
  }, 0)

  // Filter by selectedMonth (from parent — same month nav state)
  const monthEntries = collaborator.entries.filter((e: any) => {
    if (!e.date) return false
    const [year, month] = e.date.split("-").map(Number)
    return year === selectedMonth.year && month - 1 === selectedMonth.month
  })

  const totalHoursThisMonth = monthEntries.reduce((sum: number, e: any) => sum + (e.totalHoras || 0), 0)

  const totalCostThisMonth = monthEntries.reduce((sum: number, e: any) => {
    const taxa = (typeof e.taxaHoraria === "number" && e.taxaHoraria > 0) ? e.taxaHoraria : collaborator.currentRate
    return sum + (e.totalHoras || 0) * taxa
  }, 0)

  // ── Month Navigator (shared state from parent) ──
  const MonthNavigator = () => (
    <div className="flex items-center gap-1">
      <button
        onClick={onPrevMonth}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-90"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] font-semibold text-muted-foreground min-w-[100px] text-center">
        {MONTH_NAMES_PT[selectedMonth.month]} {selectedMonth.year}
      </span>
      <button
        onClick={onNextMonth}
        disabled={isCurrentMonth}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Taxa Horária ── */}
      <CollaboratorRateManager
        collaboratorId={collaborator.id}
        collaboratorName={collaborator.name}
        currentRate={collaborator.currentRate}
        rateHistory={collaborator.rateHistory ?? []}
        onRateUpdated={onRateUpdated ?? (() => {})}
      />

      {/* ── Desktop: 2 col grid / Mobile: stack ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Informação Pessoal ── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colaborador</h3>
          </div>
          <div className="divide-y">
            {[
              { icon: User,   label: "Nome",     value: collaborator.name },
              { icon: AtSign, label: "Username", value: collaborator.username ? `@${collaborator.username}` : "—" },
              { icon: Mail,   label: "Email",    value: collaborator.email || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                <span className="text-xs font-medium text-foreground truncate flex-1 text-right">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16 shrink-0">Tipo</span>
              <div className="flex-1 flex justify-end gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {collaborator.role === "admin" ? "Administrador" : "Colaborador"}
                </Badge>
                {collaborator.migrated && <Badge variant="secondary" className="text-xs">Migrado</Badge>}
              </div>
            </div>
            {lastWorkDate && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-16 shrink-0">Última vez</span>
                <span className="text-xs font-medium text-foreground text-right flex-1">
                  {lastWorkDate.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Estatísticas de Trabalho ── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trabalho</h3>
            <div className="ml-auto">
              <MonthNavigator />
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y">
            {[
              { label: "Horas este mês",   value: `${totalHoursThisMonth.toFixed(1)}`,   unit: "h", color: "text-blue-600 dark:text-blue-400" },
              { label: "Total horas",      value: `${collaborator.totalHoursAllTime.toFixed(1)}`, unit: "h", color: "text-violet-600 dark:text-violet-400" },
              { label: "Dias trabalhados", value: `${totalDaysWorked}`,                  unit: "d", color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Média por dia",    value: `${averageHoursPerDay.toFixed(1)}`,    unit: "h", color: "text-amber-600 dark:text-amber-400" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="px-4 py-3.5 flex flex-col gap-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={`text-xl font-bold tracking-tight ${color}`}>
                  {value}<span className="text-sm font-normal ml-0.5 opacity-70">{unit}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="border-t px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total de registos</span>
            </div>
            <span className="text-xs font-semibold">{collaborator.entries.length}</span>
          </div>
        </div>
      </div>

      {/* ── Análise Financeira ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análise Financeira</h3>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">taxa histórica por entrada</span>
            <MonthNavigator />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="px-5 py-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Custo este mês</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {totalCostThisMonth.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">€</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {MONTH_NAMES_PT[selectedMonth.month]} {selectedMonth.year}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Custo total</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {totalCostAllTime.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">€</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">acumulado histórico</p>
          </div>
        </div>
      </div>

    </div>
  )
}