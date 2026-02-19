// components/admin/admin-collaborators-view.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Euro, Edit, History, Search, RefreshCw, Eye, Clock, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useCollaborators } from "@/hooks/useCollaborators"

export function AdminCollaboratorsView() {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  const { collaborators, loading, error, refetch } = useCollaborators()

  const filteredCollaborators = collaborators.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: collaborators.length,
    active: collaborators.filter((c) => c.totalHoursThisMonth > 0).length,
    inactive: collaborators.filter((c) => c.totalHoursThisMonth === 0).length,
    totalHoursThisMonth: collaborators.reduce((sum, c) => sum + c.totalHoursThisMonth, 0),
    // ✅ Usa totalCostThisMonth calculado com taxa histórica por entry
    totalCostThisMonth: collaborators.reduce((sum, c) => sum + c.totalCostThisMonth, 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar colaboradores...</p>
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

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl border border-primary/20">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Colaboradores</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gere taxas horárias e informações da equipa
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
            Atualizar Dados
          </Button>
        </div>

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
              bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
              iconBg: "bg-blue-100 dark:bg-blue-900/50",
              label: "Total",
              value: stats.total,
              sub: `${stats.active} ativos`,
            },
            {
              icon: <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />,
              bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
              iconBg: "bg-green-100 dark:bg-green-900/50",
              label: "Ativos (Mês)",
              value: stats.active,
              sub: `${stats.inactive} inativos`,
            },
            {
              icon: <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
              bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
              iconBg: "bg-purple-100 dark:bg-purple-900/50",
              label: "Horas (Mês)",
              value: `${stats.totalHoursThisMonth.toFixed(1)}h`,
              sub: "este mês",
            },
            {
              icon: <Euro className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
              bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
              iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
              label: "Custo (Mês)",
              // ✅ Usa totalCostThisMonth com taxa histórica
              value: `${stats.totalCostThisMonth.toFixed(0)} €`,
              sub: "taxa histórica",
            },
          ].map((item) => (
            <Card key={item.label} className={`relative overflow-hidden ${item.bg}`}>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${item.iconBg}`}>{item.icon}</div>
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Search Bar ── */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar por nome, email ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="h-11 px-4">
              Limpar
            </Button>
          )}
        </div>

        {/* ── Collaborators ── */}
        {filteredCollaborators.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">
                  {searchTerm ? "Nenhum colaborador encontrado" : "Nenhum colaborador registado"}
                </p>
                {searchTerm && (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                    Limpar Pesquisa
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Desktop: Table Layout ── */}
            <div className="hidden md:block">
              <Card>
                <div className="overflow-hidden rounded-xl">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Colaborador</span>
                    <span>Taxa Atual</span>
                    <span>Horas (Mês)</span>
                    <span>Custo (Mês)</span>
                    <span>Ações</span>
                  </div>

                  <div className="divide-y">
                    {filteredCollaborators.map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{collaborator.name}</p>
                            <Badge
                              variant={collaborator.totalHoursThisMonth > 0 ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {collaborator.totalHoursThisMonth > 0 ? "Ativo" : "Inativo"}
                            </Badge>
                            {collaborator.migrated && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Migrado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{collaborator.email}</p>
                          {collaborator.username && (
                            <p className="text-xs text-muted-foreground/60">@{collaborator.username}</p>
                          )}
                        </div>

                        <div>
                          {collaborator.currentRate > 0 ? (
                            <span className="text-sm font-bold text-primary">
                              {collaborator.currentRate.toFixed(2)} €/h
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Não definida</span>
                          )}
                        </div>

                        <div>
                          <span className="text-sm font-semibold">
                            {collaborator.totalHoursThisMonth.toFixed(1)}h
                          </span>
                        </div>

                        {/* ✅ Usa totalCostThisMonth com taxa histórica */}
                        <div>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {collaborator.totalCostThisMonth.toFixed(2)} €
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => router.push(`/admin/collaborator/${collaborator.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Detalhes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => alert(`Editar taxa de ${collaborator.name}\n\nEm desenvolvimento`)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Taxa
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => alert(`Histórico de ${collaborator.name}\n\nEm desenvolvimento`)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Mobile: Card Layout ── */}
            <div className="md:hidden space-y-4">
              {filteredCollaborators.map((collaborator) => (
                <Card key={collaborator.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          {collaborator.name}
                          <Badge
                            variant={collaborator.totalHoursThisMonth > 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {collaborator.totalHoursThisMonth > 0 ? "Ativo" : "Inativo"}
                          </Badge>
                          {collaborator.migrated && (
                            <Badge variant="outline" className="text-xs">Migrado</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs space-y-0.5">
                          <div>{collaborator.email}</div>
                          {collaborator.username && (
                            <div className="text-muted-foreground/70">@{collaborator.username}</div>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Taxa Atual</span>
                      </div>
                      {collaborator.currentRate > 0 ? (
                        <span className="text-lg font-bold text-primary">
                          {collaborator.currentRate.toFixed(2)} €/h
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Não definida</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Horas (Mês)</p>
                        <p className="text-lg font-bold">{collaborator.totalHoursThisMonth.toFixed(1)}h</p>
                      </div>
                      {/* ✅ Usa totalCostThisMonth com taxa histórica */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Custo (Mês)</p>
                        <p className="text-lg font-bold">
                          {collaborator.totalCostThisMonth.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-auto py-2 flex-col gap-1"
                        onClick={() => router.push(`/admin/collaborator/${collaborator.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs">Ver</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 flex-col gap-1"
                        onClick={() => alert(`Editar taxa de ${collaborator.name}\n\nEm desenvolvimento`)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="text-xs">Taxa</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 flex-col gap-1"
                        onClick={() => alert(`Histórico de ${collaborator.name}\n\nEm desenvolvimento`)}
                      >
                        <History className="h-4 w-4" />
                        <span className="text-xs">Histórico</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Clica em <strong>"Detalhes"</strong> para aceder ao calendário completo e relatórios
            detalhados de cada colaborador.
          </p>
        </div>

      </div>
    </ScrollArea>
  )
}