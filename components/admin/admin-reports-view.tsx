// components/admin/admin-reports-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText, Download, Calendar, BarChart3,
  TrendingUp, Clock, FileSpreadsheet, FileBarChart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const reports = [
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Relatório Mensal",
    description: "Resumo de horas e custos por colaborador no mês atual.",
    color: "blue",
    tags: ["Horas", "Custos", "Colaboradores"],
    format: "Excel / PDF",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Relatório Anual",
    description: "Análise completa do ano fiscal com tendências e comparações mensais.",
    color: "purple",
    tags: ["Anual", "Tendências", "KPIs"],
    format: "Excel / PDF",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Histórico de Taxas",
    description: "Registo de todas as alterações de taxas horárias por colaborador.",
    color: "orange",
    tags: ["Taxas", "Histórico", "Auditoria"],
    format: "PDF",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Relatório de Horas",
    description: "Detalhe de todas as entradas de horas com filtros por período.",
    color: "green",
    tags: ["Horas", "Detalhado", "Filtros"],
    format: "Excel",
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "Exportação de Dados",
    description: "Exportação completa dos dados para integração com sistemas externos.",
    color: "slate",
    tags: ["Raw Data", "CSV", "Integração"],
    format: "CSV / JSON",
  },
  {
    icon: <FileBarChart className="h-5 w-5" />,
    title: "Análise de Performance",
    description: "Métricas de performance da equipa com comparação entre períodos.",
    color: "rose",
    tags: ["Performance", "Comparação", "KPIs"],
    format: "PDF",
  },
]

const colorMap: Record<string, { card: string; icon: string; badge: string }> = {
  blue:   { card: "border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700",   icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",   badge: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700" },
  purple: { card: "border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700", icon: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400", badge: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700" },
  orange: { card: "border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700", icon: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400", badge: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700" },
  green:  { card: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700", icon: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700" },
  slate:  { card: "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",  icon: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",  badge: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  rose:   { card: "border-rose-200 dark:border-rose-800 hover:border-rose-300 dark:hover:border-rose-700",   icon: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",   badge: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700" },
}

export function AdminReportsView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl border border-primary/20">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Análises, exportações e relatórios da empresa
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="self-start md:self-auto py-1.5 px-3">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Funcionalidades em desenvolvimento
          </Badge>
        </div>

        {/* ── Reports Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {reports.map((report) => {
            const colors = colorMap[report.color]
            return (
              <Card
                key={report.title}
                className={`group relative overflow-hidden transition-all duration-200 ${colors.card}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${colors.icon}`}>
                      {report.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-snug">{report.title}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {report.tags.map(tag => (
                          <span
                            key={tag}
                            className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${colors.badge}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {report.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      Formato: <span className="font-medium text-foreground">{report.format}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="h-8 gap-1.5 opacity-60 cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Em breve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Info Banner ── */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <span className="text-lg shrink-0">💡</span>
          <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1">
            <p><strong>Em desenvolvimento:</strong> As funcionalidades de exportação e análise avançada estarão disponíveis em breve.</p>
            <p className="text-blue-700/70 dark:text-blue-300/70 text-xs">
              Poderá exportar dados em múltiplos formatos e configurar relatórios automáticos periódicos.
            </p>
          </div>
        </div>

      </div>
    </ScrollArea>
  )
}