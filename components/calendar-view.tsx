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
    () => new Map(data.entries.map((e) => [e.date, e.totalHoras])),
    [data.entries]
  )

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  }

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const days: Array<{ date: Date; index: number } | null> = []

    // Add empty slots for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month with unique index
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        index: startDayOfWeek + d - 1, // Unique index for each day
      })
    }

    return days
  }, [currentMonth])

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="flex flex-col h-full">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange("prev")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">{formatMonthYear(currentMonth)}</h2>
        <Button variant="ghost" size="icon" onClick={() => handleMonthChange("next")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayObj, index) => {
            if (!dayObj) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const { date } = dayObj
            const dateStr = date.toISOString().split("T")[0]
            const hasEntry = entryMap.has(dateStr)
            const totalHoras = entryMap.get(dateStr)
            const isPaid = paidDates.has(dateStr)
            const isToday = dateStr === today

            // Use a combination of month, date string, and index for a truly unique key
            const uniqueKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${dateStr}-${index}`

            return (
              <button
                key={uniqueKey}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative p-1",
                  isToday && "ring-2 ring-primary",
                  hasEntry ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary",
                    !hasEntry && "text-foreground"
                  )}
                >
                  {date.getDate()}
                </span>

                {hasEntry && (
                  <>
                    <span className="text-[10px] font-semibold text-primary">{totalHoras}h</span>
                    {/* Paid/Unpaid indicator */}
                    <div
                      className={cn(
                        "absolute top-1 right-1 w-2 h-2 rounded-full",
                        isPaid ? "bg-success" : "border border-destructive"
                      )}
                    />
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            Pago
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-destructive" />
            Não pago
          </span>
        </div>
      </div>

      {/* FAB - Add Today */}
      <Button
        onClick={onAddToday}
        size="lg"
        className="fixed bottom-24 right-4 h-14 px-6 rounded-full shadow-lg bg-success hover:bg-success/90 text-success-foreground z-40"
      >
        <Plus className="h-5 w-5 mr-2" />
        Hoje
      </Button>
    </div>
  )
}
