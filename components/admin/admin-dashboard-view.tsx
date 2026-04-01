// components/admin/admin-dashboard-view.tsx
"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users, Clock, Euro, TrendingUp, ChevronLeft, ChevronRight,
  RefreshCw, AlertTriangle, CheckCircle2, ArrowUpRight, Zap,
  Activity, LayoutDashboard, Wallet, ShieldAlert,
} from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AdminTabType } from "@/components/admin/admin-bottom-nav"

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const t = entry.services[0]?.taxaHoraria
    if (typeof t === "number" && t > 0) return t
  }
  return currentRate
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ values, color = "#3b82f6" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const w = 80, h = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - (v / max) * h
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={w} height={h} className="shrink-0 opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div
            className={cn("w-full rounded-t-md transition-all duration-500", d.color ?? "bg-primary/70 group-hover:bg-primary")}
            style={{ height: `${Math.max((d.value / max) * 56, 3)}px` }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Month Navigator ──────────────────────────────────────────────────────────
function MonthNavigator({ month, year, onChange }: {
  month: number; year: number
  onChange: (month: number, year: number) => void
}) {
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()
  const go = (dir: -1 | 1) => {
    let m = month + dir, y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    onChange(m, y)
  }
  const label = new Date(year, month, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => go(-1)} className="w-8 h-8 rounded-xl border border-border/50 bg-background hover:bg-muted flex items-center justify-center transition-colors">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 px-3 h-8 rounded-xl border border-border/50 bg-background min-w-[160px] justify-center">
        <span className="text-sm font-semibold capitalize">{label}</span>
        {isCurrentMonth && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">hoje</span>}
      </div>
      <button onClick={() => go(1)} disabled={isCurrentMonth} className="w-8 h-8 rounded-xl border border-border/50 bg-background hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const ACCENTS = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",             iconBg: "bg-blue-100 dark:bg-blue-900/50",    text: "text-blue-700 dark:text-blue-300",    spark: "#3b82f6" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",     iconBg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-700 dark:text-purple-300", spark: "#a855f7" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300", spark: "#10b981" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",     iconBg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-300",  spark: "#f97316" },
} as const
type AccentKey = keyof typeof ACCENTS

function KpiCard({ icon, label, value, sub, sparkValues, accent, onClick }: {
  icon: React.ReactNode; label: string; value: string; sub: string
  sparkValues?: number[]; accent: AccentKey; onClick?: () => void
}) {
  const a = ACCENTS[accent]
  return (
    <div
      onClick={onClick}
      className={cn("relative overflow-hidden rounded-2xl border p-5 transition-all duration-200", a.bg, onClick && "cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]")}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-xl", a.iconBg)}>
          <span className={a.text}>{icon}</span>
        </div>
        {sparkValues && sparkValues.length > 1 && <Sparkline values={sparkValues} color={a.spark} />}
      </div>
      <p className={cn("text-2xl md:text-3xl font-bold tracking-tight", a.text)}>{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mt-2">{sub}</p>
    </div>
  )
}

// ─── Finance Summary Card ─────────────────────────────────────────────────────
function FinanceSummaryCard({
  totalPending, overdue, collabsWithOverdue, onClick,
}: {
  totalPending: number; overdue: number; collabsWithOverdue: number; onClick: () => void
}) {
  const hasOverdue = overdue > 0
  const allClear = totalPending === 0

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all",
      hasOverdue
        ? "border-red-200 dark:border-red-800"
        : allClear
          ? "border-emerald-200 dark:border-emerald-800"
          : "border-amber-200 dark:border-amber-800"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-3 border-b",
        hasOverdue
          ? "bg-red-50/60 dark:bg-red-950/10 border-red-200 dark:border-red-800"
          : allClear
            ? "bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50/60 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800"
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "p-1.5 rounded-lg",
            hasOverdue ? "bg-red-100 dark:bg-red-900/40"
              : allClear ? "bg-emerald-100 dark:bg-emerald-900/40"
              : "bg-amber-100 dark:bg-amber-900/40"
          )}>
            {hasOverdue
              ? <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              : allClear
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                : <Wallet className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            }
          </div>
          <p className="text-sm font-bold">Resumo Financeiro</p>
          {hasOverdue && (
            <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 tracking-wide">
              {collabsWithOverdue} EM ATRASO
            </span>
          )}
          {allClear && (
            <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 tracking-wide">
              TUDO EM DIA
            </span>
          )}
        </div>
        <Button
          variant="ghost" size="sm"
          className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
          onClick={onClick}
        >
          Ver financeiro <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 divide-x divide-border/40">
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Total Pendente</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            totalPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {fmt(totalPending)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">todos os meses</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Em Atraso</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            overdue > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {fmt(overdue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {overdue > 0
              ? `${collabsWithOverdue} colaborador${collabsWithOverdue !== 1 ? "es" : ""} afetado${collabsWithOverdue !== 1 ? "s" : ""}`
              : "nenhum em atraso ✓"
            }
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Collaborator row ─────────────────────────────────────────────────────────
function CollabRow({ collab, rank, maxHours, onClick }: {
  collab: any; rank: number; maxHours: number; onClick: () => void
}) {
  const pct = maxHours > 0 ? (collab._monthHours / maxHours) * 100 : 0
  const rankColors = [
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  ]
  const barColors = ["bg-yellow-400", "bg-slate-400", "bg-orange-400"]
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left group">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", rankColors[rank] ?? "bg-muted text-muted-foreground")}>
        {rank + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-semibold text-sm truncate">{collab.name}</p>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="text-sm font-bold tabular-nums">{collab._monthHours.toFixed(1)}h</span>
            <span className="text-xs text-muted-foreground hidden md:block tabular-nums">{collab._monthCost.toFixed(0)} €</span>
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", barColors[rank] ?? "bg-primary/50")} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn("flex items-center justify-between px-3.5 py-2.5 rounded-xl border", color)}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AdminDashboardView({ onTabChange }: { onTabChange?: (tab: AdminTabType) => void }) {
  const { collaborators, loading, error, refetch } = useCollaborators()
  const router = useRouter()
  const go = (tab: AdminTabType) => onTabChange?.(tab)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
  const monthLabel = new Date(selectedYear, selectedMonth, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  const NOW_KEY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const stats = useMemo(() => {
    if (!collaborators.length) return null

    const withMonthData = collaborators.map(c => {
      let monthHours = 0, monthCost = 0
      c.entries.forEach((e: any) => {
        if ((e.date || "").startsWith(monthKey)) {
          const h = e.totalHoras || 0
          monthHours += h
          monthCost += h * resolveEntryTaxa(e, c.currentRate)
        }
      })
      return { ...c, _monthHours: monthHours, _monthCost: monthCost }
    })

    const active   = withMonthData.filter(c => c._monthHours > 0)
    const inactive = withMonthData.filter(c => c._monthHours === 0)
    const totalHours = withMonthData.reduce((s, c) => s + c._monthHours, 0)
    const totalCost  = withMonthData.reduce((s, c) => s + c._monthCost, 0)
    const totalHoursAllTime = collaborators.reduce((s, c) => s + c.totalHoursAllTime, 0)
    const avgRate = collaborators.length > 0
      ? collaborators.reduce((s, c) => s + c.currentRate, 0) / collaborators.length : 0
    const noRate = collaborators.filter(c => !c.currentRate || c.currentRate === 0)

    // Sparkline: últimos 6 meses
    const sparkHours: number[] = [], sparkCost: number[] = []
    for (let i = 5; i >= 0; i--) {
      let m = selectedMonth - i, y = selectedYear
      while (m < 0) { m += 12; y-- }
      const k = `${y}-${String(m + 1).padStart(2, "0")}`
      let h = 0, cost = 0
      collaborators.forEach(c => {
        c.entries.forEach((e: any) => {
          if ((e.date || "").startsWith(k)) {
            const eh = e.totalHoras || 0
            h += eh; cost += eh * resolveEntryTaxa(e, c.currentRate)
          }
        })
      })
      sparkHours.push(h); sparkCost.push(cost)
    }

    const topCollabs = [...withMonthData].sort((a, b) => b._monthHours - a._monthHours).slice(0, 6)
    const barData = topCollabs.filter(c => c._monthHours > 0).map((c, i) => ({
      label: c.name.split(" ")[0],
      value: c._monthHours,
      color: i === 0 ? "bg-yellow-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-400" : undefined,
    }))

    // ── Resumo financeiro global (algoritmo FIFO igual ao AdminFinanceView) ──
    let totalPendingAll = 0, overdueAll = 0
    let collabsWithOverdue = 0

    collaborators.forEach(c => {
      const rate = c.currentRate || 0
      const payments = [...(c.payments || [])].sort(
        (a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
      )

      // Agrupa custo por mês
      const monthMap = new Map<string, number>()
      c.entries.forEach((e: any) => {
        const p = (e.date || "").slice(0, 7)
        if (!p) return
        monthMap.set(p, (monthMap.get(p) || 0) + (e.totalHoras || 0) * resolveEntryTaxa(e, rate))
      })

      const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      let pi = 0, rem = 0
      let collabOverdue = 0

      for (const [key, cost] of months) {
        let left = cost
        while (left > 0 && (pi < payments.length || rem > 0)) {
          if (rem <= 0 && pi < payments.length) { rem = (payments[pi] as any).valor || 0 }
          if (rem > 0) {
            const apply = Math.min(left, rem)
            left -= apply; rem -= apply
            if (rem <= 0) { pi++; rem = 0 }
          } else break
        }
        const pending = Math.max(0, left)
        totalPendingAll += pending
        if (key < NOW_KEY) collabOverdue += pending
      }

      overdueAll += collabOverdue
      if (collabOverdue > 0) collabsWithOverdue++
    })

    return {
      total: collaborators.length,
      active: active.length,
      inactive: inactive.length,
      totalHours, totalCost, totalHoursAllTime, avgRate,
      sparkHours, sparkCost,
      topCollabs, barData, noRate, withMonthData,
      financeGlobal: { totalPendingAll, overdueAll, collabsWithOverdue },
    }
  }, [collaborators, monthKey, selectedMonth, selectedYear, NOW_KEY])

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">A carregar dashboard...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <p className="font-semibold text-destructive">{error}</p>
        <Button onClick={refetch} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente</Button>
      </div>
    </div>
  )

  if (!stats) return null

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-6 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl border border-primary/20">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel de Administração</h1>
              <p className="text-sm text-muted-foreground mt-0.5 capitalize">Visão geral · {monthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MonthNavigator
              month={selectedMonth} year={selectedYear}
              onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
            />
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* ── Alert: sem taxa ── */}
        {stats.noRate.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {stats.noRate.length} colaborador{stats.noRate.length > 1 ? "es" : ""} sem taxa horária definida
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                {stats.noRate.map(c => c.name.split(" ")[0]).join(", ")}
              </p>
            </div>
            <Button size="sm" variant="outline"
              className="shrink-0 border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 h-8 text-xs"
              onClick={() => go("collaborators")}
            >
              Gerir
            </Button>
          </div>
        )}

        {/* ── Resumo Financeiro Global ── */}
        <FinanceSummaryCard
          totalPending={stats.financeGlobal.totalPendingAll}
          overdue={stats.financeGlobal.overdueAll}
          collabsWithOverdue={stats.financeGlobal.collabsWithOverdue}
          onClick={() => go("finance")}
        />

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <KpiCard accent="purple" icon={<Clock className="h-4 w-4" />}
            label="Horas (Mês)" value={`${stats.totalHours.toFixed(1)}h`}
            sub={`${stats.active} colaborador${stats.active !== 1 ? "es" : ""} ativo${stats.active !== 1 ? "s" : ""}`}
            sparkValues={stats.sparkHours}
          />
          <KpiCard accent="emerald" icon={<Euro className="h-4 w-4" />}
            label="Custo (Mês)" value={`${stats.totalCost.toFixed(0)} €`}
            sub="Taxa histórica por entrada"
            sparkValues={stats.sparkCost}
            onClick={() => go("finance")}
          />
          <KpiCard accent="blue" icon={<Users className="h-4 w-4" />}
            label="Colaboradores" value={String(stats.total)}
            sub={`${stats.inactive} inativo${stats.inactive !== 1 ? "s" : ""} este mês`}
            onClick={() => go("collaborators")}
          />
          <KpiCard accent="orange" icon={<TrendingUp className="h-4 w-4" />}
            label="Taxa Média" value={`${stats.avgRate.toFixed(2)} €/h`}
            sub={`${stats.totalHoursAllTime.toFixed(0)}h histórico total`}
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Top colaboradores */}
          <div className="md:col-span-2 rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Colaboradores — {monthLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Ordenados por horas trabalhadas</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
                onClick={() => go("collaborators")}
              >
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-4 space-y-1">
              {stats.topCollabs.filter(c => c._monthHours > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum registo em {monthLabel}</p>
                </div>
              ) : stats.topCollabs.filter(c => c._monthHours > 0).map((collab, i) => (
                <CollabRow key={collab.id} collab={collab} rank={i}
                  maxHours={stats.topCollabs[0]?._monthHours ?? 1}
                  onClick={() => router.push(`/admin/collaborator/${collab.id}`)}
                />
              ))}
            </div>
          </div>

          {/* Coluna direita */}
          <div className="space-y-4">

            {/* Distribuição */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Distribuição de Horas
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Top 6 por horas este mês</p>
              </div>
              <div className="px-5 py-4">
                {stats.barData.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                  : <MiniBarChart data={stats.barData} />
                }
              </div>
            </div>

            {/* Estado da equipa */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Estado da Equipa
                </p>
              </div>
              <div className="p-4 space-y-2">
                <StatusPill label="Ativos este mês" count={stats.active}
                  color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" />
                <StatusPill label="Inativos este mês" count={stats.inactive}
                  color="bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400" />
                {stats.noRate.length > 0 && (
                  <StatusPill label="Sem taxa definida" count={stats.noRate.length}
                    color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400" />
                )}
              </div>
            </div>

            {/* Resumo global */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <p className="font-bold text-sm">Resumo Global</p>
              </div>
              <div className="divide-y">
                {[
                  { label: "Total horas histórico", value: `${stats.totalHoursAllTime.toFixed(0)}h` },
                  { label: "Taxa média / hora",     value: `${stats.avgRate.toFixed(2)} €/h` },
                  { label: "Custo médio / ativo",   value: stats.active > 0 ? `${(stats.totalCost / stats.active).toFixed(0)} €` : "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-bold tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Acesso Rápido ── */}
        {collaborators.length > 0 && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Acesso Rápido — Colaboradores
              </p>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8 gap-1"
                onClick={() => go("collaborators")}
              >
                Ver lista completa <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {stats.withMonthData.map((c: any) => {
                const initials = c.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
                const isActive = c._monthHours > 0
                return (
                  <button key={c.id} onClick={() => router.push(`/admin/collaborator/${c.id}`)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/60 transition-all active:scale-95 group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold border-2 transition-all",
                      isActive ? "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/15" : "bg-muted text-muted-foreground border-transparent"
                    )}>
                      {initials}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold truncate w-full">{c.name.split(" ")[0]}</p>
                      <p className={cn("text-[10px] tabular-nums", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {isActive ? `${c._monthHours.toFixed(0)}h` : "inativo"}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Dados em tempo real.</strong> Todos os valores refletem o mês selecionado ({monthLabel}) e são calculados com a taxa histórica de cada entrada.
          </p>
        </div>

      </div>
    </ScrollArea>
  )
}