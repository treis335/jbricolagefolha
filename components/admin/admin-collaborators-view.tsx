// components/admin/admin-collaborators-view.tsx (ATUALIZADO)
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Euro, Edit, History, Search, RefreshCw, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useCollaborators } from "@/hooks/useCollaborators"

export function AdminCollaboratorsView() {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  
  // Hook que busca dados do Firebase
  const { collaborators, loading, error, refetch } = useCollaborators()

  // Filtrar colaboradores baseado no termo de pesquisa
  const filteredCollaborators = collaborators.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular estatísticas globais
  const stats = {
    total: collaborators.length,
    active: collaborators.filter((c) => c.totalHoursThisMonth > 0).length,
    inactive: collaborators.filter((c) => c.totalHoursThisMonth === 0).length,
    totalHoursThisMonth: collaborators.reduce((sum, c) => sum + c.totalHoursThisMonth, 0),
    totalCostThisMonth: collaborators.reduce(
      (sum, c) => sum + c.totalHoursThisMonth * c.currentRate,
      0
    ),
  }

  // Estado de loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">A carregar colaboradores...</p>
        </div>
      </div>
    )
  }

  // Estado de erro
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
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Gere taxas horárias e informações
          </p>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-blue-900 dark:text-blue-200 mb-1 font-medium">
                Total Horas (Mês)
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalHoursThisMonth.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-green-900 dark:text-green-200 mb-1 font-medium">
                Custo Total (Mês)
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalCostThisMonth.toFixed(2)} €
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar por nome, email ou username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
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
            Atualizar Dados
          </Button>
        </div>

        {/* Collaborators List */}
        <div className="space-y-4">
          {filteredCollaborators.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhum colaborador encontrado com esse termo"
                    : "Nenhum colaborador registado no sistema"}
                </p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="mt-4"
                  >
                    Limpar Pesquisa
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredCollaborators.map((collaborator) => (
              <Card key={collaborator.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {collaborator.name}
                        <Badge
                          variant={
                            collaborator.totalHoursThisMonth > 0 ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {collaborator.totalHoursThisMonth > 0 ? "Ativo" : "Inativo"}
                        </Badge>
                        {collaborator.migrated && (
                          <Badge variant="outline" className="text-xs">
                            Migrado
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs space-y-0.5">
                        <div>{collaborator.email}</div>
                        {collaborator.username && (
                          <div className="text-muted-foreground/70">
                            @{collaborator.username}
                          </div>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Current Rate Display */}
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
                      <span className="text-sm text-muted-foreground italic">
                        Não definida
                      </span>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        Horas (Este Mês)
                      </p>
                      <p className="text-lg font-bold">
                        {collaborator.totalHoursThisMonth.toFixed(1)}h
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Custo (Este Mês)</p>
                      <p className="text-lg font-bold">
                        {(
                          collaborator.totalHoursThisMonth * collaborator.currentRate
                        ).toFixed(2)}{" "}
                        €
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - ATUALIZADO */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-auto py-2 flex-col gap-1"
                      onClick={() => router.push(`/admin/collaborator/${collaborator.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">Ver Detalhes</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 flex-col gap-1"
                      onClick={() => {
                        // TODO: Implementar modal para editar taxa
                        alert(
                          `Editar taxa de ${collaborator.name}\n\nFuncionalidade em desenvolvimento`
                        )
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-xs">Editar Taxa</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 flex-col gap-1"
                      onClick={() => {
                        // TODO: Implementar view de histórico
                        alert(
                          `Histórico de ${collaborator.name}\n\nFuncionalidade em desenvolvimento`
                        )
                      }}
                    >
                      <History className="h-4 w-4" />
                      <span className="text-xs">Histórico</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Global Summary Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Colaboradores:</span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ativos este mês:</span>
              <span className="font-bold text-green-600">{stats.active}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Inativos este mês:</span>
              <span className="font-bold text-muted-foreground">{stats.inactive}</span>
            </div>
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Horas (Mês):</span>
                <span className="font-bold text-blue-600">
                  {stats.totalHoursThisMonth.toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo Total (Mês):</span>
                <span className="font-bold text-green-600">
                  {stats.totalCostThisMonth.toFixed(2)} €
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              💡 <strong>Nota:</strong> Clica em "Ver Detalhes" para aceder ao calendário
              completo e relatórios detalhados de cada colaborador.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}