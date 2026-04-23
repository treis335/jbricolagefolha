"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock,
  Euro, Zap, Users, Package, Briefcase, HardHat,
  X, CheckCircle2, TrendingUp, Banknote,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useWorkTracker } from "@/lib/work-tracker-context"
import { cn } from "@/lib/utils"
import { formatLocalDate } from "@/lib/date-utils"

interface CalendarViewProps {
  onSelectDate: (date: Date) => void
  onAddToday: () => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

// ── Entry Detail ──────────────────────────────────────────────────────────────
function EntryDetail({
  entry,
  taxa,
  dateLabel,
  isPaid,
  onClose,
  onEdit,
}: {
  entry: any
  taxa: number
  dateLabel: string
  isPaid: boolean
  onClose: () => void
  onEdit: () => void
}) {
  const totalHoras: number = entry.totalHoras ?? 0
  const normalHoras: number = entry.normalHoras ?? 0
  const extraHoras: number = entry.extraHoras ?? 0
  const custo = totalHoras * taxa
  const isAbsence = totalHoras === 0

  // Normalise to multi-service shape (same logic as collaborator-calendar-view)
  const services: any[] = Array.isArray(entry.services) && entry.services.length > 0
    ? entry.services
    : [{
        id: "legacy",
        obraNome: "",
        descricao: entry.descricao || "",
        equipa: Array.isArray(entry.equipa) ? entry.equipa : [],
        materiais: Array.isArray(entry.materiais) ? entry.materiais : [],
        totalHoras: undefined,
      }]

  return (
    <div className="flex flex-col w-full min-h-0 h-full">

      {/* ── Hero ── */}
      <div className={cn(
        "relative px-5 pt-5 pb-6 overflow-hidden shrink-0",
        isAbsence
          ? "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500"
          : isPaid
            ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600"
            : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
      )}>
        {/* Decorative rings */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border-2 border-white/10 pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Date pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/20 mb-4 max-w-full">
          <Calendar className="h-3 w-3 text-white/80 shrink-0" />
          <span className="text-xs font-semibold text-white capitalize tracking-wide truncate">{dateLabel}</span>
        </div>

        {/* Main row */}
        <div className="flex items-end justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                isPaid
                  ? "bg-white/25 border-white/30 text-white"
                  : isAbsence
                    ? "bg-white/25 border-white/30 text-white"
                    : "bg-amber-400/30 border-amber-400/40 text-amber-200"
              )}>
                {isAbsence ? "Ausência" : isPaid ? "✓ Pago" : "Pendente"}
              </span>
            </div>

            {isAbsence ? (
              <h3 className="text-3xl font-black text-white leading-tight drop-shadow-sm">
                Ausência<br />registada
              </h3>
            ) : (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-5xl font-black text-white tabular-nums leading-none drop-shadow-sm">
                  {totalHoras}
                </span>
                <span className="text-xl font-medium text-white/60">h</span>
                <span className="text-sm text-white/40 ml-1">trabalhadas</span>
              </div>
            )}
          </div>

          {!isAbsence && (
            <div className="text-right bg-white/15 border border-white/20 rounded-2xl px-3.5 py-3 backdrop-blur-sm shrink-0">
              <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Ganho</p>
              <p className="text-2xl font-black text-white tabular-nums leading-tight">{fmt(custo)}</p>
              <p className="text-white/40 text-[10px] mt-0.5">{taxa.toFixed(2)} €/h</p>
            </div>
          )}
        </div>

        {/* Pills row */}
        {!isAbsence && (
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/20">
              <Clock className="h-3 w-3 text-white/80 shrink-0" />
              <span className="text-xs font-bold text-white">{normalHoras}h normais</span>
            </div>
            {extraHoras > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/20">
                <Zap className="h-3 w-3 text-white/80 shrink-0" />
                <span className="text-xs font-bold text-white">+{extraHoras}h extra</span>
              </div>
            )}
            {isPaid && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/20">
                <Banknote className="h-3 w-3 text-white/80 shrink-0" />
                <span className="text-xs font-bold text-white">Pago</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50/60 dark:bg-slate-900/40 min-h-0">
        <div className="px-4 pt-5 pb-4 space-y-4">

          {/* Services section header */}
          {services.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {services.length === 1 ? "Serviço" : `${services.length} Serviços`}
              </p>
            </div>
          )}

          {services.map((svc: any, idx: number) => (
            <div key={svc.id || idx} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">

              {/* Obra header */}
              {svc.obraNome ? (
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/80">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <HardHat className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">{svc.obraNome}</p>
                    {svc.totalHoras !== undefined && svc.totalHoras > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">{svc.totalHoras}h neste serviço</p>
                    )}
                  </div>
                </div>
              ) : services.length > 1 ? (
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/80">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço {idx + 1}</p>
                </div>
              ) : null}

              <div className="divide-y divide-slate-100 dark:divide-slate-700/30">

                {/* Descrição */}
                {svc.descricao?.trim() ? (
                  <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-full bg-primary/50 inline-block shrink-0" />
                      Descrição
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                      {svc.descricao}
                    </p>
                  </div>
                ) : null}

                {/* Equipa */}
                {Array.isArray(svc.equipa) && svc.equipa.length > 0 && (
                  <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0" />
                      Equipa · {svc.equipa.length} {svc.equipa.length === 1 ? "pessoa" : "pessoas"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {svc.equipa.map((nome: string, i: number) => {
                        const temUid = svc.equipaUids?.[i]
                        const initials = nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                        return (
                          <div
                            key={`${nome}-${i}`}
                            className={cn(
                              "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold max-w-full",
                              temUid
                                ? "bg-primary/5 border-primary/20 text-primary"
                                : "bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/40 text-slate-600 dark:text-slate-300"
                            )}
                          >
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                              temUid ? "bg-primary/15 text-primary" : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                            )}>
                              {initials}
                            </span>
                            <span className="break-words min-w-0">{nome}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Materiais */}
                {Array.isArray(svc.materiais) && svc.materiais.length > 0 && (
                  <div className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                      <Package className="h-3 w-3 shrink-0" />
                      Materiais · {svc.materiais.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {svc.materiais.map((m: string, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/40 text-slate-600 dark:text-slate-300 break-words max-w-full"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!svc.descricao?.trim() && !svc.equipa?.length && !svc.materiais?.length && (
                  <div className="px-4 py-8 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-5 w-5 text-slate-300 dark:text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-400">Sem detalhes adicionais registados.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="h-2" />
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-3">
        <button
          onClick={onEdit}
          className="flex-1 h-12 rounded-2xl border border-border/50 bg-muted/40 hover:bg-muted text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
        >
          Editar
        </button>
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-2xl bg-primary text-white text-sm font-bold tracking-wide transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm shadow-primary/20"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function CalendarView({ onSelectDate, onAddToday }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const { data, paidDates } = useWorkTracker()

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const entryMap = useMemo(
    () =>
      new Map(
        data.entries
          .filter(e => typeof e.totalHoras === "number" && e.totalHoras >= 0)
          .map(e => [e.date, e])
      ),
    [data.entries]
  )

  // Keep original horasMap for grid display
  const horasMap = useMemo(
    () => new Map(data.entries.filter(e => typeof e.totalHoras === "number" && e.totalHoras >= 0).map(e => [e.date, e.totalHoras])),
    [data.entries]
  )

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
    let totalHoras = 0, diasTrabalhados = 0, diasPagos = 0
    data.entries.forEach(e => {
      if (e.date?.startsWith(prefix)) {
        totalHoras += e.totalHoras ?? 0
        diasTrabalhados++
        if (paidDates.has(e.date)) diasPagos++
      }
    })
    return { totalHoras, diasTrabalhados, diasPagos }
  }, [currentMonth, data.entries, paidDates])

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth(prev =>
      new Date(prev.getFullYear(), prev.getMonth() + (direction === "next" ? 1 : -1), 1)
    )
  }

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)
    const startOffset = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1

    const days: Array<{ date: Date; index: number } | null> = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      days.push({ date: new Date(year, month, d), index: startOffset + d - 1 })
    }
    return days
  }, [currentMonth])

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  const today = formatLocalDate(new Date())

  const isCurrentMonth =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth()

  const allPaid =
    monthStats.diasTrabalhados > 0 &&
    monthStats.diasPagos === monthStats.diasTrabalhados

  // When a day is clicked — show detail if entry exists, otherwise open add form
  const handleDayClick = (date: Date) => {
    const dateStr = formatLocalDate(date)
    const entry = entryMap.get(dateStr)
    if (entry) {
      setSelectedDate(date)
      setModalOpen(true)
    } else {
      onSelectDate(date)
    }
  }

  const selectedDateStr = selectedDate ? formatLocalDate(selectedDate) : null
  const selectedEntry = selectedDateStr ? entryMap.get(selectedDateStr) ?? null : null
  const selectedIsPaid = selectedDateStr ? paidDates.has(selectedDateStr) : false
  const taxa = data.settings?.taxaHoraria ?? 0

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return ""
    return new Date(formatLocalDate(selectedDate) + "T12:00:00").toLocaleDateString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    })
  }, [selectedDate])

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-card shadow-sm">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleMonthChange("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-base font-bold capitalize tracking-tight">{formatMonthYear(currentMonth)}</h2>
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
              <div key={day} className={cn(
                "text-center text-[10px] md:text-xs font-bold py-2 uppercase tracking-widest select-none",
                i >= 5 ? "text-muted-foreground/40" : "text-muted-foreground/60"
              )}>
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {calendarDays.map((dayObj, index) => {
              if (!dayObj) return <div key={`empty-${index}`} className="aspect-square" />

              const { date } = dayObj
              const dateStr = formatLocalDate(date)
              const hasEntry = horasMap.has(dateStr)
              const totalHoras = horasMap.get(dateStr)
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
                  onClick={() => handleDayClick(date)}
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
                  {/* Absence X */}
                  {isZeroHours && (
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 900, color: "rgba(180, 120, 0, 0.30)", lineHeight: 1 }}>
                      ✕
                    </span>
                  )}

                  {/* Missing workday X */}
                  {isMissingWorkday && (
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                      style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 900, color: "rgba(220, 38, 38, 0.20)", lineHeight: 1 }}>
                      ✕
                    </span>
                  )}

                  {/* Day number */}
                  <span className={cn(
                    "relative z-10 text-sm md:text-base leading-none transition-colors",
                    isToday ? "font-bold text-primary"
                      : isZeroHours ? "font-semibold text-amber-800/70 dark:text-amber-400/70"
                      : hasEntry ? "font-semibold text-foreground"
                      : isMissingWorkday ? "font-normal text-foreground/35"
                      : "font-normal text-foreground/50"
                  )}>
                    {date.getDate()}
                  </span>

                  {/* Hours */}
                  {hasEntry && (
                    <span className={cn(
                      "relative z-10 text-[9px] md:text-[10px] leading-none mt-0.5 md:mt-1 font-semibold tabular-nums",
                      isZeroHours ? "text-amber-700/55 dark:text-amber-400/50" : "text-muted-foreground"
                    )}>
                      {totalHoras}h
                    </span>
                  )}

                  {/* Status dot */}
                  {hasEntry && !isZeroHours && (
                    <span className={cn(
                      "absolute top-1.5 left-1.5 md:top-2 md:left-2 rounded-full z-10 w-1.5 h-1.5 md:w-2 md:h-2",
                      "transition-transform duration-150 group-hover:scale-125",
                      isPaid ? "bg-emerald-500" : "bg-amber-400"
                    )} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
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

      {/* ── FAB ── */}
      <Button
        onClick={onAddToday}
        size="lg"
        className="fixed bottom-24 right-4 h-14 px-5 rounded-full shadow-lg shadow-emerald-600/25 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white z-40 gap-2 transition-all duration-150"
      >
        <Plus className="h-5 w-5" />
        <span className="font-semibold tracking-tight">Hoje</span>
      </Button>

      {/* ── Entry Detail Dialog ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className={cn(
          "p-0 gap-0 border-0 shadow-2xl overflow-hidden",
          "max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full",
          "max-sm:max-w-full max-sm:max-h-full",
          "max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0",
          "sm:w-[520px] sm:max-w-[90vw] sm:max-h-[85dvh] sm:rounded-3xl",
          "flex flex-col",
          "[&>button]:hidden",
        )}>
          <DialogTitle className="sr-only">
            {selectedDateLabel ? `Detalhe de ${selectedDateLabel}` : "Detalhe do dia"}
          </DialogTitle>

          {selectedEntry ? (
            <EntryDetail
              entry={selectedEntry}
              taxa={taxa}
              dateLabel={selectedDateLabel}
              isPaid={selectedIsPaid}
              onClose={() => setModalOpen(false)}
              onEdit={() => {
                setModalOpen(false)
                if (selectedDate) onSelectDate(selectedDate)
              }}
            />
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Sem dados para este dia.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── StatCell ──────────────────────────────────────────────────────────────────
function StatCell({ value, label, color }: {
  value: string; label: string; color: "default" | "blue" | "green" | "amber"
}) {
  const colors = {
    default: "text-foreground",
    blue:    "text-blue-600 dark:text-blue-400",
    green:   "text-emerald-600 dark:text-emerald-400",
    amber:   "text-amber-500 dark:text-amber-400",
  }
  return (
    <div className="flex flex-col items-center py-3.5 gap-1">
      <span className={cn("text-xl font-bold leading-none tabular-nums", colors[color])}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">{label}</span>
    </div>
  )
}