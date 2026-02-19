// components/admin/collaborator-overview.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Briefcase } from "lucide-react"
import { CollaboratorRateManager, type RateHistoryEntry } from "./collaborator-rate-manager"

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
    rateHistory?: RateHistoryEntry[]
  }
  onRateUpdated?: (newRate: number, newHistory: RateHistoryEntry[]) => void
}

export function CollaboratorOverview({ collaborator, onRateUpdated }: CollaboratorOverviewProps) {
  const totalDaysWorked = new Set(collaborator.entries.map(e => e.date)).size
  const averageHoursPerDay = totalDaysWorked > 0
    ? collaborator.totalHoursAllTime / totalDaysWorked
    : 0

  const lastWorkDate = collaborator.entries.length > 0
    ? new Date(Math.max(...collaborator.entries.map((e: any) => new Date(e.date).getTime())))
    : null

  // ✅ Custo total usando a taxa histórica de cada entry (fallback para taxa atual)
  const totalCostAllTime = collaborator.entries.reduce((sum: number, e: any) => {
    const taxa = (typeof e.taxaHoraria === "number" && e.taxaHoraria > 0)
      ? e.taxaHoraria
      : collaborator.currentRate
    return sum + (e.totalHoras || 0) * taxa
  }, 0)

  const totalCostThisMonth = (() => {
    const now = new Date()
    return collaborator.entries
      .filter((e: any) => {
        if (!e.date) return false
        const [year, month] = e.date.split("-").map(Number)
        return year === now.getFullYear() && month - 1 === now.getMonth()
      })
      .reduce((sum: number, e: any) => {
        const taxa = (typeof e.taxaHoraria === "number" && e.taxaHoraria > 0)
          ? e.taxaHoraria
          : collaborator.currentRate
        return sum + (e.totalHoras || 0) * taxa
      }, 0)
  })()

  return (
    <div className="space-y-6">

      {/* ── Taxa Horária + Histórico ── */}
      <CollaboratorRateManager
        collaboratorId={collaborator.id}
        collaboratorName={collaborator.name}
        currentRate={collaborator.currentRate}
        rateHistory={collaborator.rateHistory ?? []}
        onRateUpdated={onRateUpdated ?? (() => {})}
      />

      {/* ── Informações Pessoais ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Informação do Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Nome Completo", value: collaborator.name },
            { label: "Username", value: `@${collaborator.username || "—"}` },
            { label: "Email", value: collaborator.email },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center p-3 bg-muted rounded-lg gap-3">
              <span className="text-sm text-muted-foreground shrink-0">{row.label}:</span>
              <span className="font-medium text-sm text-right break-all">{row.value}</span>
            </div>
          ))}
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

      {/* ── Estatísticas de Trabalho ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Estatísticas de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Horas Este Mês", value: `${collaborator.totalHoursThisMonth.toFixed(1)}h`, theme: "blue" },
              { label: "Total Horas",    value: `${collaborator.totalHoursAllTime.toFixed(1)}h`,   theme: "purple" },
              { label: "Dias Trabalhados", value: totalDaysWorked.toString(),                       theme: "green" },
              { label: "Média Horas/Dia", value: `${averageHoursPerDay.toFixed(1)}h`,              theme: "amber" },
            ].map(({ label, value, theme }) => {
              const themes: Record<string, string> = {
                blue:   "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
                purple: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
                green:  "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
                amber:  "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
              }
              return (
                <div key={label} className={`p-4 rounded-lg border ${themes[theme]}`}>
                  <p className="text-xs opacity-80 mb-1">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              )
            })}
          </div>
          {lastWorkDate && (
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Último Dia Trabalhado:</span>
              <span className="font-medium text-sm">
                {lastWorkDate.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Análise Financeira ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Análise Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Custo Este Mês</p>
              <p className="text-xl font-bold">{totalCostThisMonth.toFixed(2)} €</p>
              <p className="text-[10px] text-muted-foreground mt-1">taxa histórica/entrada</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Custo Total</p>
              <p className="text-xl font-bold">{totalCostAllTime.toFixed(2)} €</p>
              <p className="text-[10px] text-muted-foreground mt-1">taxa histórica/entrada</p>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Total de Registos:</span>
            <span className="text-2xl font-bold">{collaborator.entries.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}