// components/admin/admin-dashboard-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Clock, Euro, TrendingUp, LayoutDashboard, Activity, Calendar, RefreshCw, ArrowUpRight } from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

export function AdminDashboardView() {
  const { collaborators, loading, error, refetch } = useCollaborators()

  const now = new Date()

  const stats = {
    totalCollaborators: collaborators.length,
    totalHoursThisMonth: collaborators.reduce((sum, c) => sum + c.totalHoursThisMonth, 0),
    totalCostThisMonth: collaborators.reduce(
      (sum, c) => sum + c.totalHoursThisMonth * c.currentRate,
      0
    ),
    activeThisMonth: collaborators.filter((c) => c.totalHoursThisMonth > 0).length,
    inactiveThisMonth: collaborators.filter((c) => c.totalHoursThisMonth === 0).length,
    totalHoursAllTime: collaborators.reduce((sum, c) => sum + c.totalHoursAllTime, 0),
    averageRatePerHour:
      collaborators.length > 0
        ? collaborators.reduce((sum, c) => sum + c.currentRate, 0) / collaborators.length
        : 0,
  }

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
      <div className="p-6">
        <Card className="border-destructive/50 max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">{error}</p>
              <Button onClick={refetch} variant="outline" size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 md:p-8 md:pb-12 space-y-8 max-w-7xl mx-auto">

        {/* ── Desktop Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl border border-primary/20">
              <LayoutDashboard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel de Administração</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Visão geral da empresa ·{" "}
                {now.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Colaboradores */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-200/40 dark:bg-blue-700/20" />
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Colaboradores</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-blue-700 dark:text-blue-300">
                {stats.totalCollaborators}
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                {stats.activeThisMonth} ativos este mês
              </p>
            </CardContent>
          </Card>

          {/* Horas do Mês */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-950/30 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-purple-200/40 dark:bg-purple-700/20" />
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Horas (Mês)</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-purple-700 dark:text-purple-300">
                {stats.totalHoursThisMonth.toFixed(1)}
                <span className="text-lg font-medium ml-0.5">h</span>
              </p>
              <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">
                {stats.totalHoursAllTime.toFixed(0)}h no histórico total
              </p>
            </CardContent>
          </Card>

          {/* Custo Mensal */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/30 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-200/40 dark:bg-emerald-700/20" />
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Euro className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Custo (Mês)</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                {stats.totalCostThisMonth.toFixed(0)}
                <span className="text-lg font-medium ml-0.5">€</span>
              </p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                Baseado nas taxas atuais
              </p>
            </CardContent>
          </Card>

          {/* Taxa Média */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100/60 dark:from-orange-950/30 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-200/40 dark:bg-orange-700/20" />
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-xs font-medium text-orange-800 dark:text-orange-300">Taxa Média</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-orange-700 dark:text-orange-300">
                {stats.averageRatePerHour.toFixed(2)}
                <span className="text-lg font-medium ml-0.5">€/h</span>
              </p>
              <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
                {stats.inactiveThisMonth} inativos este mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Content Grid (desktop: 3 cols) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Top Collaborators — 2 cols wide */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Top 5 Colaboradores (Este Mês)
                  </CardTitle>
                  <CardDescription className="mt-0.5">Ordenados por horas trabalhadas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {collaborators.filter(c => c.totalHoursThisMonth > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 bg-muted rounded-full mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum colaborador trabalhou este mês</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {collaborators
                    .filter(c => c.totalHoursThisMonth > 0)
                    .sort((a, b) => b.totalHoursThisMonth - a.totalHoursThisMonth)
                    .slice(0, 5)
                    .map((collab, index) => {
                      const maxHours = collaborators
                        .filter(c => c.totalHoursThisMonth > 0)
                        .sort((a, b) => b.totalHoursThisMonth - a.totalHoursThisMonth)[0]?.totalHoursThisMonth || 1
                      const pct = (collab.totalHoursThisMonth / maxHours) * 100

                      return (
                        <div key={collab.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                          {/* Rank */}
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
                            index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" :
                            index === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" :
                            index === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </div>

                          {/* Name + progress */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="font-medium text-sm truncate">{collab.name}</p>
                              <div className="flex items-center gap-3 shrink-0 ml-2">
                                <span className="text-sm font-bold">{collab.totalHoursThisMonth.toFixed(1)}h</span>
                                <span className="text-xs text-muted-foreground hidden md:inline">
                                  {(collab.totalHoursThisMonth * collab.currentRate).toFixed(2)} €
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  index === 0 ? "bg-yellow-400" :
                                  index === 1 ? "bg-slate-400" :
                                  index === 2 ? "bg-orange-400" :
                                  "bg-primary/50"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas Adicionais — 1 col */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total Horas (Histórico)", value: `${stats.totalHoursAllTime.toFixed(1)}h` },
                  { label: "Taxa Média / Hora", value: `${stats.averageRatePerHour.toFixed(2)} €/h` },
                  { label: "Ativos este mês", value: `${stats.activeThisMonth}` },
                  { label: "Inativos este mês", value: `${stats.inactiveThisMonth}` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-bold">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Gerir Taxas Horárias", desc: "Alterar taxa de colaboradores" },
                  { label: "Histórico de Alterações", desc: "Consultar mudanças de taxas" },
                  { label: "Exportar Relatórios", desc: "Gerar ficheiros Excel/PDF" },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => alert(`Em desenvolvimento: ${action.label}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left group border border-transparent hover:border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Dashboard em Tempo Real:</strong> Todos os dados são atualizados automaticamente
            a partir do Firebase. As estatísticas refletem o mês atual (
            {now.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}).
          </p>
        </div>

      </div>
    </ScrollArea>
  )
}