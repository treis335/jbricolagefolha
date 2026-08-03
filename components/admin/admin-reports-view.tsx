// components/admin/admin-reports-view.tsx
"use client"

import { useState } from "react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Calendar, BarChart3, History, Clock, FileBarChart, Download, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { MonthlyReportModal }     from "@/components/admin/monthly-report-modal"
import { AnnualReportModal }      from "@/components/admin/annual-report-modal"
import { RateHistoryModal }       from "@/components/admin/rate-history-modal"
import { HoursReportModal }       from "@/components/admin/hours-report-modal"
import { PerformanceReportModal } from "@/components/admin/performance-report-modal"

// ── Report definitions ────────────────────────────────────────────────────────
const REPORTS = [
  {
    id: "monthly",
    icon: Calendar,
    title: "Relatório Mensal",
    description: "Horas, custos e pagamentos por colaborador. Taxa histórica correta, pendente real.",
    gradient: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/20",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    tags: ["Horas", "Custos", "Pendente"],
    formats: ["Excel", "PDF"],
    ready: true,
  },
  {
    id: "annual",
    icon: BarChart3,
    title: "Relatório Anual",
    description: "Análise do ano completo com tendências mensais e ranking de colaboradores.",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    tags: ["Anual", "Tendências", "KPIs"],
    formats: ["Excel", "PDF"],
    ready: true,
  },
  {
    id: "rates",
    icon: History,
    title: "Histórico de Taxas",
    description: "Registo completo de todas as alterações de taxas horárias com auditoria.",
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/20",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    tags: ["Taxas", "Histórico", "Auditoria"],
    formats: ["PDF"],
    ready: true,
  },
  {
    id: "hours",
    icon: Clock,
    title: "Relatório de Horas",
    description: "Detalhe de todas as entradas de horas com filtros avançados por período e colaborador.",
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    tags: ["Horas", "Detalhado", "Filtros"],
    formats: ["CSV"],
    ready: true,
  },
  {
    id: "performance",
    icon: FileBarChart,
    title: "Análise de Performance",
    description: "Métricas de performance da equipa com comparação entre períodos e evolução.",
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    tags: ["Performance", "Comparação", "KPIs"],
    formats: ["CSV"],
    ready: true,
  },
]

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ report, onClick }: { report: typeof REPORTS[0]; onClick?: () => void }) {
  const Icon = report.icon
  return (
    <div className={cn(
      "group relative rounded-3xl border bg-card overflow-hidden transition-all duration-200",
      report.ready
        ? "border-border/60 hover:border-border hover:shadow-lg cursor-pointer active:scale-[0.99]"
        : "border-border/30 opacity-60"
    )}
      onClick={report.ready ? onClick : undefined}
    >
      {/* Top gradient bar */}
      <div className={cn("h-1 w-full bg-gradient-to-r", report.gradient)} />

      <div className="p-5 space-y-4">
        {/* Icon + title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
              report.gradient, report.glow
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{report.title}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {report.formats.map(f => (
                  <span key={f} className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                    report.badge
                  )}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          {report.ready ? (
            <div className="w-8 h-8 rounded-xl bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors shrink-0">
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          ) : (
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-muted text-muted-foreground/50 shrink-0 whitespace-nowrap">Em breve</span>
          )}
        </div>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed">{report.description}</p>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {report.tags.map(tag => (
            <span key={tag} className="text-[11px] text-muted-foreground/50 bg-muted/40 px-2 py-0.5 rounded-lg font-medium">
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        {report.ready && (
          <div className={cn(
            "flex items-center gap-2 pt-1 text-sm font-semibold transition-colors",
            "text-muted-foreground group-hover:text-foreground"
          )}>
            <Download className="h-4 w-4" />
            Gerar relatório
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AdminReportsView() {
  const [open, setOpen] = useState<string|null>(null)
  const { collaborators } = useCollaborators()

  return (
    <>
      <MonthlyReportModal     open={open==="monthly"}     onClose={()=>setOpen(null)} collaborators={collaborators} />
      <AnnualReportModal      open={open==="annual"}       onClose={()=>setOpen(null)} collaborators={collaborators} />
      <RateHistoryModal       open={open==="rates"}        onClose={()=>setOpen(null)} collaborators={collaborators} />
      <HoursReportModal       open={open==="hours"}        onClose={()=>setOpen(null)} collaborators={collaborators} />
      <PerformanceReportModal open={open==="performance"}  onClose={()=>setOpen(null)} collaborators={collaborators} />

      <div className="h-full w-full overflow-y-auto overflow-x-hidden">
        <div className="px-4 sm:px-6 py-6 pb-28 md:py-10 md:pb-12 max-w-5xl mx-auto w-full space-y-8">

          {/* ── Hero header ── */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                    </div>
                    <span className="text-muted-foreground/50 text-[11px] font-bold uppercase tracking-widest">Centro de Relatórios</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Relatórios</h1>
                  <p className="text-muted-foreground/70 text-sm mt-1.5 max-w-md leading-relaxed">
                    Exporta, analisa e audita todos os dados da empresa em múltiplos formatos.
                  </p>
                </div>
                <div className="shrink-0 hidden sm:flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">5 disponíveis</span>
                  </div>
                </div>
              </div>

              {/* Quick access */}
              <div className="grid grid-cols-3 gap-2.5 mt-5">
                {[
                  { label: "Mensal", desc: "Horas & custos",    color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",       id: "monthly" },
                  { label: "Anual",  desc: "Tendências & KPIs", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50", id: "annual" },
                  { label: "Taxas",  desc: "Auditoria",         color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50",   id: "rates" },
                ].map(s => (
                  <button key={s.id} onClick={() => setOpen(s.id)}
                    className={cn("rounded-xl border px-3 py-3 text-left hover:shadow-sm active:scale-95 transition-all", s.bg)}>
                    <p className={cn("text-xs font-black", s.color)}>{s.label}</p>
                    <p className="text-muted-foreground/50 text-[10px] mt-0.5 truncate">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Available reports ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Disponíveis · {REPORTS.filter(r=>r.ready).length}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTS.filter(r => r.ready).map(r => (
                <ReportCard key={r.id} report={r} onClick={() => setOpen(r.id)} />
              ))}
            </div>
          </div>

          {/* ── Coming soon — only if any ── */}
          {REPORTS.some(r => !r.ready) && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Em breve</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORTS.filter(r => !r.ready).map(r => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
