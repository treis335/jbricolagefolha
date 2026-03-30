"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar, Clock, Euro, Briefcase, Users, Package, TrendingUp, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatLocalDate } from "@/lib/date-utils"   // ← Adicionado

interface CollaboratorCalendarViewProps {
  collaboratorId: string
  collaboratorName: string
  currentRate: number
  entries: any[]
}

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
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
  entries 
}: CollaboratorCalendarViewProps) {
  
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const entryMap = useMemo(() => {
    const map = new Map<string, any>()
    entries.forEach((e) => { if (e.date) map.set(e.date, e) })
    return map
  }, [entries])

  const handleMonthChange = (dir: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (dir === "next" ? 1 : -1))
      return d
    })
  }

  // ====================== CALENDÁRIO CORRIGIDO ======================
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)

    // Semana começa na Segunda-feira (cálculo estável)
    const startOffset = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1

    const days: Array<{ date: Date; index: number } | null> = []

    for (let i = 0; i < startOffset; i++) days.push(null)

    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        index: startOffset + d - 1
      })
    }

    return days
  }, [currentMonth])

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    let totalHours = 0, normalHours = 0, extraHours = 0, daysWorked = 0, totalCost = 0

    entries.forEach((entry) => {
      if (!entry.date) return
      const [y, m] = entry.date.split("-").map(Number)
      if (y === year && m - 1 === month) {
        const h = entry.totalHoras || 0
        totalHours += h
        normalHours += entry.normalHoras || 0
        extraHours += entry.extraHoras || 0
        daysWorked++
        totalCost += h * resolveEntryTaxa(entry, currentRate)
      }
    })
    return { totalHours, normalHours, extraHours, daysWorked, totalCost }
  }, [entries, currentMonth, currentRate])

  const handleDayClick = (date: Date | null) => {
    if (!date) return
    const dateStr = formatLocalDate(date)        // ← Corrigido aqui
    const entry = entryMap.get(dateStr)
    if (entry) {
      setSelectedEntry(entry)
      setSheetOpen(true)
    }
  }

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  
  // Usando o helper consistente
  const today = formatLocalDate(new Date())

  const monthLabel = currentMonth.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

  const CalendarGrid = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("rounded-xl border bg-card overflow-hidden", compact ? "" : "rounded-2xl")}>
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day, i) => (
          <div 
            key={day} 
            className={cn(
              "text-center font-semibold uppercase tracking-wider",
              compact ? "py-1.5 text-[10px]" : "py-2.5 text-[11px]",
              i >= 5 ? "text-muted-foreground/50" : "text-muted-foreground"
            )}
          >
            {compact ? day.slice(0, 1) : day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((dayObj, index) => {
          if (!dayObj) return (
            <div 
              key={`empty-${index}`} 
              className={cn("border-r border-b last:border-r-0 bg-muted/10", compact ? "h-9" : "aspect-square")} 
            />
          )

          const { date } = dayObj
          const dateStr = formatLocalDate(date)     // ← Corrigido aqui também
          const entry = entryMap.get(dateStr)
          const hasEntry = !!entry
          const isToday = dateStr === today
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const isLastCol = (index % 7) === 6

          return (
            <button
              key={`${dateStr}-${index}`}
              onClick={() => handleDayClick(date)}
              disabled={!hasEntry}
              className={cn(
                "flex flex-col items-center justify-center relative transition-all select-none border-r border-b",
                isLastCol && "border-r-0",
                compact ? "h-9" : "aspect-square",
                !hasEntry && "cursor-default",
                isWeekend && !hasEntry && (compact ? "bg-muted/20" : "bg-muted/30"),
                hasEntry && "cursor-pointer hover:bg-primary/5 active:scale-95 bg-primary/[0.04]",
              )}
            >
              {isToday && (
                <span className={cn("absolute rounded-md ring-1 ring-primary/40 pointer-events-none", 
                  compact ? "inset-0.5" : "inset-1")} 
                />
              )}
              
              {hasEntry && (
                <span className={cn("absolute rounded-full bg-primary", 
                  compact ? "top-1 right-1 w-1 h-1" : "top-1.5 right-1.5 w-1.5 h-1.5")} 
                />
              )}

              <span className={cn(
                "font-medium",
                compact ? "text-[11px]" : "text-sm",
                isToday && "text-primary font-bold",
                hasEntry && !isToday && "text-foreground",
                !hasEntry && "text-muted-foreground",
              )}>
                {date.getDate()}
              </span>

              {!compact && hasEntry && entry.totalHoras && (
                <span className="text-[10px] font-semibold text-primary/80 mt-0.5 leading-none">
                  {entry.totalHoras}h
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* MOBILE */}
      <div className="md:hidden space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => handleMonthChange("prev")} className="w-9 h-9 flex items-center justify-center rounded-xl border bg-card hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold capitalize tracking-tight">{monthLabel}</h2>
          <button onClick={() => handleMonthChange("next")} className="w-9 h-9 flex items-center justify-center rounded-xl border bg-card hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Stats mantidos iguais */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Horas</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{monthStats.totalHours.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">h</span></p>
            <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>{monthStats.normalHours.toFixed(1)}h normais</span>
              {monthStats.extraHours > 0 && <span className="text-amber-500 font-medium">+{monthStats.extraHours.toFixed(1)}h extras</span>}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Euro className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Custo</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{monthStats.totalCost.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">€</span></p>
            <p className="mt-2 text-[11px] text-muted-foreground">{monthStats.daysWorked} dias trabalhados</p>
          </div>
        </div>

        <CalendarGrid compact={false} />

        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Dia trabalhado</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-primary/40" />Hoje</span>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden md:flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
            <div className="flex items-center gap-0.5">
              <button onClick={() => handleMonthChange("prev")} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleMonthChange("next")} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <CalendarGrid compact={true} />

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Trabalhado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 ring-primary/40" />Hoje</span>
          </div>
        </div>

        {/* Stats sidebar mantido igual */}
        <div className="w-48 shrink-0 space-y-2.5 pt-7">
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {[
              { label: "Dias",     value: `${monthStats.daysWorked}`,                icon: Calendar,    color: "text-slate-400" },
              { label: "Normais",  value: `${monthStats.normalHours.toFixed(1)}h`,   icon: Clock,       color: "text-blue-500" },
              { label: "Extras",   value: `${monthStats.extraHours.toFixed(1)}h`,    icon: Zap,         color: "text-amber-500" },
              { label: "Total",    value: `${monthStats.totalHours.toFixed(1)}h`,    icon: TrendingUp,  color: "text-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between px-3 py-2 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`h-3 w-3 shrink-0 ${color}`} />
                  <span className="text-xs text-muted-foreground truncate">{label}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-medium mb-0.5">Custo</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tracking-tight leading-tight">
              {monthStats.totalCost.toFixed(2)} €
            </p>
            <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500 mt-0.5">{currentRate.toFixed(2)} €/h</p>
          </div>
        </div>
      </div>

      {/* Sheet mantido igual */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl px-0 pt-0">
          {/* ... (o resto do Sheet fica igual ao que tinhas) */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <SheetHeader className="px-5 pt-3 pb-4 border-b">
            <SheetTitle className="text-left text-base font-semibold capitalize">
              {selectedEntry
                ? new Date(selectedEntry.date + "T12:00:00").toLocaleDateString("pt-PT", { 
                    weekday: "long", 
                    day: "numeric", 
                    month: "long", 
                    year: "numeric" 
                  })
                : ""}
            </SheetTitle>
          </SheetHeader>

          {/* O conteúdo do sheet permanece igual */}
          {selectedEntry && (
            <div className="overflow-y-auto h-[calc(88vh-110px)] px-5 py-4 space-y-5">
              {/* ... teu código do sheet ... */}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}