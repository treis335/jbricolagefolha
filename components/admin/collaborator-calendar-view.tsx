// components/admin/collaborator-calendar-view.tsx 
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Clock, Euro } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface CollaboratorCalendarViewProps {
  collaboratorId: string
  collaboratorName: string
  currentRate: number
  entries: any[]
}

// ✅ Helper: resolve a taxa de uma entry com todos os fallbacks
function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0)
    return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
}

export function CollaboratorCalendarView({
  collaboratorId,
  collaboratorName,
  currentRate,
  entries,
}: CollaboratorCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const entryMap = useMemo(() => {
    const map = new Map<string, any>()
    entries.forEach((entry) => {
      if (entry.date) map.set(entry.date, entry)
    })
    return map
  }, [entries])

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const days: Array<{ date: Date; index: number } | null> = []
    for (let i = 0; i < startDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), index: startDayOfWeek + d - 1 })
    }
    return days
  }, [currentMonth])

  // ✅ Calcula custo do mês com taxa histórica por entry
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    let totalHours = 0, normalHours = 0, extraHours = 0, daysWorked = 0, totalCost = 0

    entries.forEach((entry) => {
      if (!entry.date) return
      const [y, m] = entry.date.split("-").map(Number)
      if (y === year && m - 1 === month) {
        const horas = entry.totalHoras || 0
        totalHours += horas
        normalHours += entry.normalHoras || 0
        extraHours += entry.extraHoras || 0
        daysWorked++
        // ✅ Taxa histórica da entry em vez de sempre currentRate
        totalCost += horas * resolveEntryTaxa(entry, currentRate)
      }
    })

    return { totalHours, normalHours, extraHours, daysWorked, totalCost }
  }, [entries, currentMonth, currentRate])

  const handleDayClick = (date: Date | null) => {
    if (!date) return
    const dateStr = date.toISOString().split("T")[0]
    const entry = entryMap.get(dateStr)
    if (entry) { setSelectedEntry(entry); setSheetOpen(true) }
  }

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-4">
      {/* Navegação mês */}
      <div className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-card">
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange("prev")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">{formatMonthYear(currentMonth)}</h2>
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange("next")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats do mês */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-blue-900 dark:text-blue-200 mb-1">Total Horas</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {monthStats.totalHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-green-900 dark:text-green-200 mb-1">Custo Total</p>
            {/* ✅ Custo com taxa histórica */}
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {monthStats.totalCost.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendário */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayObj, index) => {
              if (!dayObj) return <div key={`empty-${index}`} className="aspect-square" />

              const { date } = dayObj
              const dateStr = date.toISOString().split("T")[0]
              const entry = entryMap.get(dateStr)
              const hasEntry = !!entry
              const isToday = dateStr === today
              const uniqueKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dateStr}-${index}`

              return (
                <button
                  key={uniqueKey}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative p-1",
                    isToday && "ring-2 ring-primary",
                    hasEntry
                      ? "bg-primary/10 hover:bg-primary/20 border-2 border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary",
                    hasEntry && "text-primary",
                    !hasEntry && "text-foreground"
                  )}>
                    {date.getDate()}
                  </span>
                  {hasEntry && entry.totalHoras && (
                    <span className="text-[10px] font-semibold text-primary mt-0.5">
                      {entry.totalHoras}h
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumo do mês */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do Mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dias Trabalhados:</span>
            <span className="font-bold">{monthStats.daysWorked}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Horas Normais:</span>
            <span className="font-bold">{monthStats.normalHours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Horas Extras:</span>
            <span className="font-bold text-destructive">{monthStats.extraHours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Taxa Atual:</span>
            <span className="font-bold">{currentRate.toFixed(2)} €/h</span>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground p-4 bg-muted rounded-lg">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary/10 border-2 border-primary/30" />
          Dia trabalhado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded ring-2 ring-primary" />
          Hoje
        </span>
      </div>

      {/* Sheet: detalhe do dia */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left">
              {selectedEntry
                ? new Date(selectedEntry.date).toLocaleDateString("pt-PT", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })
                : ""}
            </SheetTitle>
          </SheetHeader>

          {selectedEntry && (
            <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="font-medium">Total de Horas</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {selectedEntry.totalHoras}h
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex flex-col p-2 bg-background rounded">
                      <span className="text-muted-foreground text-xs">Normais:</span>
                      <span className="font-medium">{selectedEntry.normalHoras || 0}h</span>
                    </div>
                    <div className="flex flex-col p-2 bg-background rounded">
                      <span className="text-muted-foreground text-xs">Extras:</span>
                      <span className="font-medium text-destructive">{selectedEntry.extraHoras || 0}h</span>
                    </div>
                    <div className="flex flex-col p-2 bg-background rounded">
                      <span className="text-muted-foreground text-xs">Custo:</span>
                      {/* ✅ Custo do dia com taxa histórica da entry */}
                      <span className="font-medium text-green-600">
                        {(selectedEntry.totalHoras * resolveEntryTaxa(selectedEntry, currentRate)).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Serviços Realizados
                </h3>
                {selectedEntry.services && selectedEntry.services.length > 0 ? (
                  selectedEntry.services.map((service: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          {service.obraNome || `Serviço ${idx + 1}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {service.descricao && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Descrição:</p>
                            <p className="text-sm whitespace-pre-line">{service.descricao}</p>
                          </div>
                        )}
                        {service.totalHoras && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Horas neste serviço:</p>
                            <Badge variant="secondary" className="text-sm">{service.totalHoras}h</Badge>
                          </div>
                        )}
                        {service.equipa && service.equipa.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Equipa:</p>
                            <div className="flex flex-wrap gap-1">
                              {service.equipa.map((member: string) => (
                                <Badge key={member} variant="outline">{member}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {service.materiais && service.materiais.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Materiais:</p>
                            <div className="flex flex-wrap gap-1">
                              {service.materiais.map((material: string, i: number) => (
                                <Badge key={i} variant="secondary">{material}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Sem detalhes de serviços registados
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}