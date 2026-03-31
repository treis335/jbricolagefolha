"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { cn } from "@/lib/utils"
import { formatLocalDate } from "@/lib/date-utils"   // ← Importante

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
          .filter((e) => typeof e.totalHoras === "number" && e.totalHoras >= 0)
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
    return new Date(prev.getFullYear(), prev.getMonth() + (direction === "next" ? 1 : -1), 1)
  })
}

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

  // ====================== CALENDÁRIO CORRIGIDO ======================
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)

    // Semana começa na Segunda-feira (cálculo estável)
    const startOffset = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1

    const days: Array<{ date: Date; index: number } | null> = []

    // Dias vazios no início
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    // Dias do mês
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        index: startOffset + d - 1
      })
    }

    return days
  }, [currentMonth])

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

  // Usando o helper consistente
  const today = formatLocalDate(new Date())

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
                  i >= 5 ? "text-muted-foreground/40" : "text-muted-foreground/60"
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
              const dateStr = formatLocalDate(date)        // ← Aqui está a correção principal

              const hasEntry = entryMap.has(dateStr)
              const totalHoras = entryMap.get(dateStr)
              const isZeroHours = hasEntry && totalHoras === 0
              const isPaid = paidDates.has(dateStr)
              const isToday = dateStr === today
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const isPast = dateStr < today
              const isMissingWorkday = isPast && !isToday && !hasEntry && !isWeekend

              const uniqueKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dateStr}-${index}`

              return (
                <button
                  key={uniqueKey}
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-xl md:rounded-2xl",
                    "relative select-none group transition-all duration-150 overflow-hidden",
                    "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    "border",
                    !hasEntry && !isToday && "border-border/50 bg-card hover:bg-muted/60 hover:border-border",
                    !hasEntry && isWeekend && "opacity-40",
                    hasEntry && !isToday && !isZeroHours && "border-border bg-card hover:bg-muted/40 shadow-sm",
                    isZeroHours && !isToday && "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/60 dark:hover:bg-amber-950/30",
                    isToday && "border-primary/50 bg-primary/5 hover:bg-primary/10 ring-2 ring-primary/40 ring-offset-1 ring-offset-background shadow-sm",
                  )}
                >
                  {/* X amarelo - Ausência (0h) */}
                  {isZeroHours && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 900, color: "rgba(180, 120, 0, 0.30)", lineHeight: 1 }}
                    >
                      ✕
                    </span>
                  )}

                  {/* X vermelho - Dia útil sem registo */}
                  {isMissingWorkday && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 900, color: "rgba(220, 38, 38, 0.20)", lineHeight: 1 }}
                    >
                      ✕
                    </span>
                  )}

                  {/* Número do dia */}
                  <span
                    className={cn(
                      "relative z-10 text-sm md:text-base leading-none transition-colors",
                      isToday
                        ? "font-bold text-primary"
                        : isZeroHours
                          ? "font-semibold text-amber-800/70 dark:text-amber-400/70"
                          : hasEntry
                            ? "font-semibold text-foreground"
                            : isMissingWorkday
                              ? "font-normal text-foreground/35"
                              : "font-normal text-foreground/50"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Horas */}
                  {hasEntry && (
                    <span
                      className={cn(
                        "relative z-10 text-[9px] md:text-[10px] leading-none mt-0.5 md:mt-1 font-semibold tabular-nums",
                        isZeroHours ? "text-amber-700/55 dark:text-amber-400/50" : "text-muted-foreground"
                      )}
                    >
                      {totalHoras}h
                    </span>
                  )}

                  {/* Ponto de status */}
                  {hasEntry && !isZeroHours && (
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 md:top-2 md:left-2 rounded-full z-10 w-1.5 h-1.5 md:w-2 md:h-2",
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

      {/* Legenda */}
      <div className="px-5 py-3 border-t bg-card">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" /> Pago
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" /> Não pago
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full ring-2 ring-primary/60 bg-primary/10" /> Hoje
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-black leading-none" style={{ color: "rgba(180,120,0,0.55)", fontSize: "0.85rem" }}>✕</span> Ausência
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-black leading-none" style={{ color: "rgba(220,38,38,0.45)", fontSize: "0.85rem" }}>✕</span> Sem registo
          </span>
        </div>
      </div>

      {/* FAB */}
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

// StatCell (mantido igual)
function StatCell({ value, label, color }: { value: string; label: string; color: "default" | "blue" | "green" | "amber" }) {
  const colors = {
    default: "text-foreground",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-500 dark:text-amber-400",
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