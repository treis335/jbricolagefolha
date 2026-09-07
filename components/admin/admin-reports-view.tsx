// components/admin/admin-reports-view.tsx
"use client"

import { useState, Suspense, Component, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Calendar, BarChart3, History, Clock, FileBarChart, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Lazy load every modal — if any fails, only that modal crashes ─────────────
const MonthlyReportModal     = dynamic(() => import("./monthly-report-modal").then(m => ({ default: m.MonthlyReportModal })),     { ssr: false })
const AnnualReportModal      = dynamic(() => import("./annual-report-modal").then(m => ({ default: m.AnnualReportModal })),      { ssr: false })
const RateHistoryModal       = dynamic(() => import("./rate-history-modal").then(m => ({ default: m.RateHistoryModal })),        { ssr: false })
const HoursReportModal       = dynamic(() => import("./hours-report-modal").then(m => ({ default: m.HoursReportModal })),       { ssr: false })
const PerformanceReportModal = dynamic(() => import("./performance-report-modal").then(m => ({ default: m.PerformanceReportModal })), { ssr: false })

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ReportsBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() {
    if (this.state.err) return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-red-500">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold">Erro ao carregar relatórios</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs opacity-70">{this.state.err}</p>
        </div>
        <button onClick={() => this.setState({ err: null })}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Tentar novamente
        </button>
      </div>
    )
    return this.props.children
  }
}

// ── Report cards config ────────────────────────────────────────────────────────
const REPORTS = [
  {
    id: "monthly",
    icon: Calendar,
    title: "Relatório Mensal",
    description: "Horas, custos e pendentes por colaborador com taxa histórica correcta.",
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40",
    tags: ["Horas", "Custos", "Pendente"],
  },
  {
    id: "annual",
    icon: BarChart3,
    title: "Relatório Anual",
    description: "Análise do ano fiscal com tendências mensais e ranking de colaboradores.",
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40",
    tags: ["Anual", "Tendências", "KPIs"],
  },
  {
    id: "rates",
    icon: History,
    title: "Histórico de Taxas",
    description: "Registo de todas as alterações de taxas horárias por colaborador.",
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
    tags: ["Taxas", "Histórico", "Auditoria"],
  },
  {
    id: "hours",
    icon: Clock,
    title: "Relatório de Horas",
    description: "Detalhe de todas as entradas com filtros por colaborador, data e tipo.",
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
    tags: ["Horas", "Detalhado", "Filtros"],
  },
  {
    id: "performance",
    icon: FileBarChart,
    title: "Análise de Performance",
    description: "Ranking da equipa com sparklines e evolução mensal comparativa.",
    accent: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40",
    tags: ["Performance", "Ranking", "Evolução"],
  },
] as const

// ── Main ───────────────────────────────────────────────────────────────────────
export function AdminReportsView() {
  const [open, setOpen] = useState<string | null>(null)
  const { collaborators } = useCollaborators()

  return (
    <ReportsBoundary>
      <div className="p-4 sm:p-5 pb-24 space-y-4 max-w-2xl mx-auto">

        {/* Header */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary/70" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Relatórios</h1>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Exporta e analisa os dados da equipa</p>
            </div>
            <div className="ml-auto shrink-0">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {REPORTS.length} disponíveis
              </span>
            </div>
          </div>

          {/* Quick access */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "monthly", label: "Mensal",  color: "bg-blue-50   dark:bg-blue-950/30   border-blue-100   dark:border-blue-900/50   text-blue-600   dark:text-blue-400"   },
              { id: "annual",  label: "Anual",   color: "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50 text-violet-600 dark:text-violet-400" },
              { id: "rates",   label: "Taxas",   color: "bg-amber-50  dark:bg-amber-950/30  border-amber-100  dark:border-amber-900/50  text-amber-600  dark:text-amber-400"  },
            ].map(s => (
              <button key={s.id} onClick={() => setOpen(s.id)}
                className={cn("rounded-xl border px-3 py-2.5 text-left hover:shadow-sm active:scale-95 transition-all", s.color)}>
                <p className="text-xs font-black">{s.label}</p>
                <p className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">abrir</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report cards */}
        <div className="space-y-2.5">
          {REPORTS.map(r => {
            const Icon = r.icon
            return (
              <button
                key={r.id}
                onClick={() => setOpen(r.id)}
                className={cn(
                  "w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all",
                  "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
                  r.bg
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0", r.accent)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">{r.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-white/5 border border-border/30 text-muted-foreground/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Modals — lazy loaded, isolated crashes */}
      <Suspense fallback={null}>
        {open === "monthly"     && <MonthlyReportModal     open onClose={() => setOpen(null)} collaborators={collaborators} />}
        {open === "annual"      && <AnnualReportModal      open onClose={() => setOpen(null)} collaborators={collaborators} />}
        {open === "rates"       && <RateHistoryModal       open onClose={() => setOpen(null)} collaborators={collaborators} />}
        {open === "hours"       && <HoursReportModal       open onClose={() => setOpen(null)} collaborators={collaborators} />}
        {open === "performance" && <PerformanceReportModal open onClose={() => setOpen(null)} collaborators={collaborators} />}
      </Suspense>
    </ReportsBoundary>
  )
}
