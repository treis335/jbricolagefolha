// components/admin/admin-dashboard-view.tsx
"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users, Clock, Euro, TrendingUp, LayoutDashboard,
  Activity, RefreshCw, ArrowUpRight, AlertTriangle,
  CheckCircle2, ChevronRight, Zap,
} from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── tiny bar-chart — no external dep ───────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div
            className={cn(
              "w-full rounded-t-md transition-all duration-500",
              d.color ?? "bg-primary/70 group-hover:bg-primary"
            )}
            style={{ height: `${Math.max((d.value / max) * 56, 3)}px` }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-none">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── sparkline svg ───────────────────────────────────────────────────────────
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
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, trend, sparkValues, accent,
  onClick,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string
  trend?: { value: number; positive?: boolean }
  sparkValues?: number[]; accent: string; onClick?: () => void
}) {
  const accents: Record<string, { bg: string; iconBg: string; text: string; spark: string }> = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",       iconBg: "bg-blue-100 dark:bg-blue-900/50",    text: "text-blue-700 dark:text-blue-300",    spark: "#3b82f6" },
    purple:  { bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800", iconBg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-700 dark:text-purple-300", spark: "#a855f7" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300", spark: "#10b981" },
    orange:  { bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800", iconBg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-300", spark: "#f97316" },
  }
  const a = accents[accent] ?? accents.blue

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-all duration-200",
        a.bg,
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-xl", a.iconBg)}>
          <span className={a.text}>{icon}</span>
        </div>
        {sparkValues && sparkValues.length > 1 && (
          <Sparkline values={sparkValues} color={a.spark} />
        )}
      </div>
      <p className={cn("text-2xl md:text-3xl font-bold tracking-tight", a.text)}>{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">{sub}</p>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
            trend.positive !== false
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          )}>
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
    </div>
  )
}

// ─── collaborator row ─────────────────────────────────────────────────────────
function CollabRow({
  collab, rank, maxHours, onClick,
}: {
  collab: any; rank: number; maxHours: number; onClick: () => void
}) {
  const pct = maxHours > 0 ? (collab.totalHoursThisMonth / maxHours) * 100 : 0
  const rankColors = [
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  ]
  const barColors = ["bg-yellow-400", "bg-slate-400", "bg-orange-400"]

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left group"
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        rankColors[rank] ?? "bg-muted text-muted-foreground"
      )}>
        {rank + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-semibold text-sm truncate">{collab.name}</p>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="text-sm font-bold tabular-nums">{collab.totalHoursThisMonth.toFixed(1)}h</span>
            <span className="text-xs text-muted-foreground hidden md:block tabular-nums">
              {collab.totalCostThisMonth.toFixed(0)} €
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", barColors[rank] ?? "bg-primary/50")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  )
}

// ─── status pill ──────────────────────────────────────────────────────────────
function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn("flex items-center justify-between px-3.5 py-2.5 rounded-xl border", color)}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export function AdminDashboardView() {
  const { collaborators, loading, error, refetch } = useCollaborators()
  const router = useRouter()
  const now = new Date()

  // ── derived stats ──
  const stats = useMemo(() => {
    const active = collaborators.filter(c => c.totalHoursThisMonth > 0)
    const inactive = collaborators.filter(c => c.totalHoursThisMonth === 0)
    const totalHoursThisMonth = collaborators.reduce((s, c) => s + c.totalHoursThisMonth, 0)
    const totalCostThisMonth = collaborators.reduce((s, c) => s + c.totalCostThisMonth, 0)
    const totalHoursAllTime = collaborators.reduce((s, c) => s + c.totalHoursAllTime, 0)
    const avgRate = collaborators.length > 0
      ? collaborators.reduce((s, c) => s + c.currentRate, 0) / collaborators.length
      : 0

    // hours distribution across collaborators (for bar chart)
    const topCollabs = [...collaborators]
      .sort((a, b) => b.totalHoursThisMonth - a.totalHoursThisMonth)
      .slice(0, 6)

    // month-over-month sparkline from entries
    const monthMap = new Map<string, number>()
    collaborators.forEach(c => {
      c.entries.forEach((e: any) => {
        const m = (e.date || "").slice(0, 7)
        if (m) monthMap.set(m, (monthMap.get(m) ?? 0) + (e.totalHoras || 0))
      })
    })
    const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
    const sparkHours = sortedMonths.map(([, v]) => v)

    const costMonthMap = new Map<string, number>()
    collaborators.forEach(c => {
      c.entries.forEach((e: any) => {
        const m = (e.date || "").slice(0, 7)
        if (m) {
          const taxa = typeof e.taxaHoraria === "number" && e.taxaHoraria > 0
            ? e.taxaHoraria : c.currentRate
          costMonthMap.set(m, (costMonthMap.get(m) ?? 0) + (e.totalHoras || 0) * taxa)
        }
      })
    })
    const sortedCostMonths = Array.from(costMonthMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
    const sparkCost = sortedCostMonths.map(([, v]) => v)

    // bar chart data: top collab hours
    const barData = topCollabs.map(c => ({
      label: c.name.split(" ")[0],
      value: c.totalHoursThisMonth,
    }))

    // collaborators with no rate set
    const noRate = collaborators.filter(c => !c.currentRate || c.currentRate === 0)

    return {
      total: collaborators.length,
      active: active.length,
      inactive: inactive.length,
      totalHoursThisMonth,
      totalCostThisMonth,
      totalHoursAllTime,
      avgRate,
      topCollabs,
      sparkHours,
      sparkCost,
      barData,
      noRate,
    }
  }, [collaborators])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <p className="font-semibold text-destructive">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const monthLabel = now.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

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
              <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                Visão geral · {monthLabel}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="self-start sm:self-auto">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* ── Alerts ── */}
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
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 h-8 text-xs"
              onClick={() => router.push("/admin?tab=collaborators")}
            >
              Gerir
            </Button>
          </div>
        )}

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            accent="blue"
            icon={<Users className="h-4 w-4" />}
            label="Colaboradores"
            value={String(stats.total)}
            sub={`${stats.active} ativos este mês`}
            sparkValues={[stats.total, stats.total, stats.active, stats.active]}
            onClick={() => router.push("/admin?tab=collaborators")}
          />
          <KpiCard
            accent="purple"
            icon={<Clock className="h-4 w-4" />}
            label="Horas (Mês)"
            value={`${stats.totalHoursThisMonth.toFixed(1)}h`}
            sub={`${stats.totalHoursAllTime.toFixed(0)}h histórico total`}
            sparkValues={stats.sparkHours}
          />
          <KpiCard
            accent="emerald"
            icon={<Euro className="h-4 w-4" />}
            label="Custo (Mês)"
            value={`${stats.totalCostThisMonth.toFixed(0)} €`}
            sub="Taxa histórica por entrada"
            sparkValues={stats.sparkCost}
            onClick={() => router.push("/admin?tab=finance")}
          />
          <KpiCard
            accent="orange"
            icon={<TrendingUp className="h-4 w-4" />}
            label="Taxa Média"
            value={`${stats.avgRate.toFixed(2)} €/h`}
            sub={`${stats.inactive} inativos este mês`}
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Top collaborators */}
          <div className="md:col-span-2 rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Colaboradores — {monthLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Ordenados por horas trabalhadas</p>
              </div>
              <Button
                variant="ghost" size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
                onClick={() => router.push("/admin?tab=collaborators")}
              >
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-4 space-y-1">
              {stats.topCollabs.filter(c => c.totalHoursThisMonth > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum colaborador trabalhou este mês</p>
                </div>
              ) : (
                stats.topCollabs
                  .filter(c => c.totalHoursThisMonth > 0)
                  .map((collab, i) => (
                    <CollabRow
                      key={collab.id}
                      collab={collab}
                      rank={i}
                      maxHours={stats.topCollabs[0]?.totalHoursThisMonth ?? 1}
                      onClick={() => router.push(`/admin/collaborator/${collab.id}`)}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Right column */}
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
                {stats.barData.every(d => d.value === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <MiniBarChart
                    data={stats.barData.map((d, i) => ({
                      ...d,
                      color: i === 0 ? "bg-yellow-400" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-400" : undefined,
                    }))}
                  />
                )}
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
                <StatusPill
                  label="Ativos este mês"
                  count={stats.active}
                  color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                />
                <StatusPill
                  label="Inativos este mês"
                  count={stats.inactive}
                  color="bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                />
                {stats.noRate.length > 0 && (
                  <StatusPill
                    label="Sem taxa definida"
                    count={stats.noRate.length}
                    color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                  />
                )}
              </div>
            </div>

            {/* Stats rápidos */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <p className="font-bold text-sm">Resumo Global</p>
              </div>
              <div className="divide-y">
                {[
                  { label: "Total horas histórico", value: `${stats.totalHoursAllTime.toFixed(0)}h` },
                  { label: "Taxa média / hora",     value: `${stats.avgRate.toFixed(2)} €/h` },
                  { label: "Custo médio / collab",  value: stats.active > 0 ? `${(stats.totalCostThisMonth / stats.active).toFixed(0)} €` : "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-bold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick access: all collaborators ── */}
        {collaborators.length > 0 && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Acesso Rápido — Colaboradores
              </p>
              <Button
                variant="ghost" size="sm"
                className="text-xs text-muted-foreground h-8 gap-1"
                onClick={() => router.push("/admin?tab=collaborators")}
              >
                Ver lista completa <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {collaborators.map(c => {
                const initials = c.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
                const isActive = c.totalHoursThisMonth > 0
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/admin/collaborator/${c.id}`)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/60 transition-all active:scale-95 group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold border-2 transition-all",
                      isActive
                        ? "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/15"
                        : "bg-muted text-muted-foreground border-transparent"
                    )}>
                      {initials}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold truncate w-full">{c.name.split(" ")[0]}</p>
                      <p className={cn(
                        "text-[10px]",
                        isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}>
                        {isActive ? `${c.totalHoursThisMonth.toFixed(0)}h` : "inativo"}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Info banner ── */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Dados em tempo real.</strong> Todos os valores refletem o mês atual ({monthLabel}) e são calculados com a taxa histórica de cada entrada.
          </p>
        </div>

      </div>
    </ScrollArea>
  )
}