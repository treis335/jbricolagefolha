//calendar-view.tsx
"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  onSelectDate: (date: Date) => void
  onAddToday: () => void
}

export function CalendarView({ onSelectDate, onAddToday }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const { data, paidDates } = useWorkTracker()

  const entryMap = useMemo(
    () =>
      new Map(
        data.entries
          .filter((e) => typeof e.totalHoras === "number" && e.totalHoras > 0)
          .map((e) => [e.date, e.totalHoras])
      ),
    [data.entries]
  )

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
    let totalHoras = 0, diasTrabalhados = 0, diasPagos = 0
    data.entries.forEach((e) => {
      if (e.date?.startsWith(prefix)) {
        totalHoras += e.totalHoras ?? 0
        diasTrabalhados++
        if (paidDates.has(e.date)) diasPagos++
      }
    })
    return { totalHoras, diasTrabalhados, diasPagos }
  }, [currentMonth, data.entries, paidDates])

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1))
      return d
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
    for (let d = 1; d <= lastDay.getDate(); d++)
      days.push({ date: new Date(year, month, d), index: startDayOfWeek + d - 1 })
    return days
  }, [currentMonth])

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  const today = new Date().toISOString().split("T")[0]
  const isCurrentMonth =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth()

  const allPaid =
    monthStats.diasTrabalhados > 0 &&
    monthStats.diasPagos === monthStats.diasTrabalhados

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-card shadow-sm">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleMonthChange("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center">
          <h2 className="text-base font-bold capitalize tracking-tight">
            {formatMonthYear(currentMonth)}
          </h2>
          {isCurrentMonth && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-widest">mês atual</p>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleMonthChange("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 divide-x divide-border border-b bg-card">
        <StatCell value={monthStats.diasTrabalhados.toString()} label="dias" color="default" />
        <StatCell value={`${monthStats.totalHoras}h`} label="horas" color="blue" />
        <StatCell
          value={`${monthStats.diasPagos}/${monthStats.diasTrabalhados}`}
          label="pagos"
          color={allPaid ? "green" : "amber"}
        />
      </div>

      {/* ── Calendar ── */}
      <div className="flex-1 overflow-auto bg-muted/10">
        <div className="p-3 md:p-8 max-w-xl mx-auto md:max-w-2xl">

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "text-center text-[10px] md:text-xs font-bold py-2 uppercase tracking-widest select-none",
                  i >= 5
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground/60"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {calendarDays.map((dayObj, index) => {
              if (!dayObj) return <div key={`empty-${index}`} className="aspect-square" />

              const { date } = dayObj
              const dateStr = date.toISOString().split("T")[0]
              const hasEntry = entryMap.has(dateStr)
              const totalHoras = entryMap.get(dateStr)
              const isPaid = paidDates.has(dateStr)
              const isToday = dateStr === today
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const uniqueKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dateStr}-${index}`

              return (
                <button
                  key={uniqueKey}
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    // Base shape
                    "aspect-square flex flex-col items-center justify-center rounded-xl md:rounded-2xl",
                    "relative select-none group transition-all duration-150",
                    "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    // Every day has a visible border — this is the key change
                    "border",
                    // Empty days — subtle border, light bg
                    !hasEntry && !isToday && "border-border/50 bg-card hover:bg-muted/60 hover:border-border",
                    // Weekend extra dimming
                    !hasEntry && isWeekend && "opacity-40",
                    // Days WITH entry — stronger border + slightly different bg
                    hasEntry && !isToday && "border-border bg-card hover:bg-muted/40 shadow-sm",
                    // Today — primary ring + colored bg
                    isToday && "border-primary/50 bg-primary/5 hover:bg-primary/10 ring-2 ring-primary/40 ring-offset-1 ring-offset-background shadow-sm",
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "text-sm md:text-base leading-none transition-colors",
                      isToday
                        ? "font-bold text-primary"
                        : hasEntry
                          ? "font-semibold text-foreground"
                          : "font-normal text-foreground/50"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Hours label — always visible */}
                  {hasEntry && (
                    <span className="text-[9px] md:text-[10px] leading-none mt-0.5 md:mt-1 text-muted-foreground font-semibold tabular-nums">
                      {totalHoras}h
                    </span>
                  )}

                  {/* Status dot — top-left corner */}
                  {hasEntry && (
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 md:top-2 md:left-2 rounded-full",
                        "w-1.5 h-1.5 md:w-2 md:h-2",
                        "transition-transform duration-150 group-hover:scale-125",
                        isPaid ? "bg-emerald-500" : "bg-amber-400"
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="px-5 py-3 border-t bg-card">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            Pago
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
            Não pago
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full ring-2 ring-primary/60 bg-primary/10" />
            Hoje
          </span>
        </div>
      </div>

      {/* ── FAB ── */}
      <Button
        onClick={onAddToday}
        size="lg"
        className="fixed bottom-24 right-4 h-14 px-5 rounded-full shadow-lg shadow-emerald-600/25 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white z-40 gap-2 transition-all duration-150"
      >
        <Plus className="h-5 w-5" />
        <span className="font-semibold tracking-tight">Hoje</span>
      </Button>
    </div>
  )
}

// ── Stat Cell ────────────────────────────────────────────────────────────────
function StatCell({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: "default" | "blue" | "green" | "amber"
}) {
  const colors = {
    default: "text-foreground",
    blue:    "text-blue-600 dark:text-blue-400",
    green:   "text-emerald-600 dark:text-emerald-400",
    amber:   "text-amber-500 dark:text-amber-400",
  }

  return (
    <div className="flex flex-col items-center py-3.5 gap-1">
      <span className={cn("text-xl font-bold leading-none tabular-nums", colors[color])}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
        {label}
      </span>
    </div>
  )
}