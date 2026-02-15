// components/admin/collaborator-overview.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Euro, TrendingUp, Briefcase } from "lucide-react"

interface CollaboratorOverviewProps {
  collaborator: {
    id: string
    name: string
    username: string
    email: string
    currentRate: number
    totalHoursThisMonth: number
    totalHoursAllTime: number
    entries: any[]
    role: string
    createdAt: any
    migrated?: boolean
  }
}

export function CollaboratorOverview({ collaborator }: CollaboratorOverviewProps) {
  // Calcular estatísticas adicionais
  const totalDaysWorked = new Set(collaborator.entries.map(e => e.date)).size
  const averageHoursPerDay = totalDaysWorked > 0 
    ? collaborator.totalHoursAllTime / totalDaysWorked 
    : 0
  
  const totalCostThisMonth = collaborator.totalHoursThisMonth * collaborator.currentRate
  const totalCostAllTime = collaborator.totalHoursAllTime * collaborator.currentRate

  // Encontrar último dia trabalhado
  const lastWorkDate = collaborator.entries.length > 0
    ? new Date(
        Math.max(...collaborator.entries.map((e: any) => new Date(e.date).getTime()))
      )
    : null

  return (
    <div className="space-y-6">
      {/* Informações Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Informação do Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Nome Completo:</span>
            <span className="font-medium">{collaborator.name}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Username:</span>
            <span className="font-medium">@{collaborator.username || "—"}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="font-medium text-sm break-all">{collaborator.email}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <Badge variant="outline">{collaborator.role}</Badge>
          </div>
          {collaborator.migrated && (
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant="secondary">Migrado</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas de Trabalho */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Estatísticas de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-200 mb-1">
                Horas Este Mês
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {collaborator.totalHoursThisMonth.toFixed(1)}h
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-purple-900 dark:text-purple-200 mb-1">
                Total Horas
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {collaborator.totalHoursAllTime.toFixed(1)}h
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-900 dark:text-green-200 mb-1">
                Dias Trabalhados
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalDaysWorked}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-900 dark:text-amber-200 mb-1">
                Média Horas/Dia
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {averageHoursPerDay.toFixed(1)}h
              </p>
            </div>
          </div>

          {lastWorkDate && (
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg mt-3">
              <span className="text-sm text-muted-foreground">Último Dia Trabalhado:</span>
              <span className="font-medium">
                {lastWorkDate.toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Análise Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Taxa Horária Atual</p>
              <p className="text-2xl font-bold text-primary">
                {collaborator.currentRate.toFixed(2)} €/h
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Custo Este Mês</p>
              <p className="text-xl font-bold">{totalCostThisMonth.toFixed(2)} €</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Custo Total</p>
              <p className="text-xl font-bold">{totalCostAllTime.toFixed(2)} €</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Resumo de Registos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total de Registos:</span>
            <span className="text-2xl font-bold">{collaborator.entries.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}