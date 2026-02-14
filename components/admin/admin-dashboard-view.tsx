// components/admin/admin-dashboard-view.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Clock, Euro, TrendingUp, LayoutDashboard, Activity, Calendar, RefreshCw } from "lucide-react"
import { useCollaborators } from "@/hooks/useCollaborators"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

export function AdminDashboardView() {
  // Buscar dados reais do Firebase usando o hook
  const { collaborators, loading, error, refetch } = useCollaborators()

  // Calcular estatísticas
  const now = new Date()
  const today = now.toISOString().split("T")[0] // YYYY-MM-DD
  
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 pb-24">
        <Card className="border-destructive/50">
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
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Painel de Administração</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da empresa - {now.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Colaboradores */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalCollaborators}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {stats.activeThisMonth} ativos este mês
              </p>
            </CardContent>
          </Card>

          {/* Horas do Mês */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horas (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalHoursThisMonth.toFixed(1)}h
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Este mês
              </p>
            </CardContent>
          </Card>

          {/* Custo Total do Mês */}
          <Card className="col-span-2 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-200 flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Custo Total (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.totalCostThisMonth.toFixed(2)} €
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Baseado nas taxas horárias atuais
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Estatísticas Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Total Horas (Histórico):</span>
              <span className="text-lg font-bold">{stats.totalHoursAllTime.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Taxa Média por Hora:</span>
              <span className="text-lg font-bold">{stats.averageRatePerHour.toFixed(2)} €/h</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Colaboradores Inativos (Mês):</span>
              <span className="text-lg font-bold">{stats.inactiveThisMonth}</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Collaborators This Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top 5 Colaboradores (Este Mês)
            </CardTitle>
            <CardDescription>Ordenados por horas trabalhadas</CardDescription>
          </CardHeader>
          <CardContent>
            {collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum colaborador registado
              </p>
            ) : (
              <div className="space-y-3">
                {collaborators
                  .filter(c => c.totalHoursThisMonth > 0)
                  .sort((a, b) => b.totalHoursThisMonth - a.totalHoursThisMonth)
                  .slice(0, 5)
                  .map((collab, index) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{collab.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {collab.currentRate.toFixed(2)} €/h
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          {collab.totalHoursThisMonth.toFixed(1)}h
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(collab.totalHoursThisMonth * collab.currentRate).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  ))}
                {collaborators.filter(c => c.totalHoursThisMonth > 0).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum colaborador trabalhou este mês
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>Acesso rápido a funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => alert("Em desenvolvimento: Gerir taxas horárias")}
            >
              <div className="text-left">
                <p className="font-medium">Gerir Taxas Horárias</p>
                <p className="text-xs text-muted-foreground">
                  Alterar taxa de colaboradores
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => alert("Em desenvolvimento: Histórico de alterações")}
            >
              <div className="text-left">
                <p className="font-medium">Ver Histórico de Alterações</p>
                <p className="text-xs text-muted-foreground">
                  Consultar mudanças de taxas
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => alert("Em desenvolvimento: Exportar relatórios")}
            >
              <div className="text-left">
                <p className="font-medium">Exportar Relatórios</p>
                <p className="text-xs text-muted-foreground">
                  Gerar ficheiros Excel/PDF
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              💡 <strong>Dashboard em Tempo Real:</strong> Todos os dados apresentados são 
              atualizados automaticamente a partir do Firebase. As estatísticas refletem 
              o mês atual ({now.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}).
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}