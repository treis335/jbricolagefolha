"use client"

import { useState, useMemo } from "react"
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Euro,
  TrendingUp, Zap, Users, Package, Briefcase,
  HardHat, X, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { formatLocalDate } from "@/lib/date-utils"

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

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

// ─── Entry Detail Content ──────────────────────────────────────────────────────
function EntryDetail({
  entry,
  currentRate,
  collaboratorName,
  dateLabel,
  onClose,
}: {
  entry: any
  currentRate: number
  collaboratorName: string
  dateLabel: string
  onClose: () => void
}) {
  const taxa = resolveEntryTaxa(entry, currentRate)
  const totalHoras: number = entry.totalHoras ?? 0
  const normalHoras: number = entry.normalHoras ?? 0
  const extraHoras: number = entry.extraHoras ?? 0
  const custo = totalHoras * taxa

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

  const isAbsence = totalHoras === 0

  return (
    <div className="flex flex-col h-full min-h-0 sm:max-h-[85dvh]">
      {/* ── Hero Header ── */}
      <div className={cn(
        "relative px-6 pt-6 pb-7 overflow-hidden shrink-0",
        isAbsence
          ? "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500"
          : "bg-gradient-to-br from-primary via-primary/90 to-primary/80"
      )}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border-2 border-white/10 pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/20 mb-4">
          <Calendar className="h-3 w-3 text-white/80" />
          <span className="text-xs font-semibold text-white capitalize tracking-wide">{dateLabel}</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest mb-1.5">
              {collaboratorName}
            </p>
            {isAbsence ? (
              <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-sm">
                Ausência<br />registada
              </h3>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white tabular-nums leading-none drop-shadow-sm">
                  {totalHoras}
                </span>
                <span className="text-lg font-medium text-white/60">h</span>
                <span className="text-sm text-white/40 ml-1">trabalhadas</span>
              </div>
            )}
          </div>

          {!isAbsence && (
            <div className="text-right bg-white/15 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
              <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Custo</p>
              <p className="text-2xl font-black text-white tabular-nums leading-tight">{fmt(custo)}</p>
              <p className="text-white/40 text-[10px] mt-0.5">{taxa.toFixed(2)} €/h</p>
            </div>
          )}
        </div>

        {!isAbsence && (
          <div className="flex flex-wrap gap-2 mt-5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/20">
              <Clock className="h-3 w-3 text-white/80" />
              <span className="text-xs font-bold text-white">{normalHoras}h normais</span>
            </div>
            {extraHoras > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 border border-white/20">
                <Zap className="h-3 w-3 text-white/80" />
                <span className="text-xs font-bold text-white">+{extraHoras}h extra</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto bg-slate-50/60">
        {services.length > 0 && (
          <div className="px-5 pt-5 pb-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                {services.length === 1 ? "Serviço" : `${services.length} Serviços`}
              </p>
            </div>

            {services.map((svc: any, idx: number) => (
              <div key={svc.id || idx} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                {svc.obraNome ? (
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <HardHat className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{svc.obraNome}</p>
                      {svc.totalHoras !== undefined && svc.totalHoras > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{svc.totalHoras}h neste serviço</p>
                      )}
                    </div>
                  </div>
                ) : services.length > 1 ? (
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço {idx + 1}</p>
                  </div>
                ) : null}

                <div className="divide-y divide-slate-100">
                  {svc.descricao?.trim() ? (
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                        <span className="w-1 h-3 rounded-full bg-primary/50 inline-block" />
                        Descrição
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">{svc.descricao}</p>
                    </div>
                  ) : null}

                  {Array.isArray(svc.equipa) && svc.equipa.length > 0 && (
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
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
                                "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold",
                                temUid
                                  ? "bg-primary/5 border-primary/20 text-primary"
                                  : "bg-slate-50 border-slate-200 text-slate-600"
                              )}
                            >
                              <span className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black",
                                temUid ? "bg-primary/15 text-primary" : "bg-slate-200 text-slate-500"
                              )}>
                                {initials}
                              </span>
                              {nome}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {Array.isArray(svc.materiais) && svc.materiais.length > 0 && (
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                        <Package className="h-3 w-3" />
                        Materiais · {svc.materiais.length}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {svc.materiais.map((m: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!svc.descricao?.trim() && !svc.equipa?.length && !svc.materiais?.length && (
                    <div className="px-4 py-8 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="h-5 w-5 text-slate-300" />
                      </div>
                      <p className="text-xs text-slate-400">Sem detalhes adicionais registados.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          onClick={onClose}
          className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-bold tracking-wide transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm shadow-primary/20"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CollaboratorCalendarView({
  collaboratorId,
  collaboratorName,
  currentRate,
  entries,
}: CollaboratorCalendarViewProps) {

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const entryMap = useMemo(() => {
    const map = new Map<string, any>()
    entries.forEach(e => { if (e.date) map.set(e.date, e) })
    return map
  }, [entries])

  const handleMonthChange = (dir: "prev" | "next") => {
    setCurrentMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (dir === "next" ? 1 : -1))
      return d
    })
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

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    let totalHours = 0, normalHours = 0, extraHours = 0, daysWorked = 0, totalCost = 0

    entries.forEach(entry => {
      if (!entry.date) return
      const [y, m] = entry.date.split("-").map(Number)
      if (y === year && m - 1 === month) {
        const h = entry.totalHoras || 0
        totalHours += h
        normalHours += entry.normalHoras || 0
        extraHours += entry.extraHours || 0
        daysWorked++
        totalCost += h * resolveEntryTaxa(entry, currentRate)
      }
    })
    return { totalHours, normalHours, extraHours, daysWorked, totalCost }
  }, [entries, currentMonth, currentRate])

  const handleDayClick = (date: Date | null) => {
    if (!date) return
    const dateStr = formatLocalDate(date)
    const entry = entryMap.get(dateStr)
    if (entry) { setSelectedEntry(entry); setModalOpen(true) }
  }

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  const today = formatLocalDate(new Date())
  const monthLabel = currentMonth.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

  const selectedDateLabel = useMemo(() => {
    if (!selectedEntry?.date) return ""
    return new Date(selectedEntry.date + "T12:00:00").toLocaleDateString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    })
  }, [selectedEntry])

  // ── Calendar Grid ──────────────────────────────────────────────────────────
  const CalendarGrid = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("rounded-xl border bg-card overflow-hidden", !compact && "rounded-2xl")}>
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day, i) => (
          <div key={day} className={cn(
            "text-center font-semibold uppercase tracking-wider",
            compact ? "py-1.5 text-[10px]" : "py-2.5 text-[11px]",
            i >= 5 ? "text-muted-foreground/50" : "text-muted-foreground"
          )}>
            {compact ? day.slice(0, 1) : day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((dayObj, index) => {
          if (!dayObj) return (
            <div key={`empty-${index}`} className={cn(
              "border-r border-b last:border-r-0 bg-muted/10",
              compact ? "h-9" : "aspect-square"
            )} />
          )

          const { date } = dayObj
          const dateStr = formatLocalDate(date)
          const entry = entryMap.get(dateStr)
          const hasEntry = !!entry
          const isAbsence = hasEntry && (entry.totalHoras === 0)
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
                hasEntry && !isAbsence && "cursor-pointer hover:bg-primary/5 active:scale-95 bg-primary/[0.04]",
                isAbsence && "cursor-pointer hover:bg-amber-50/60 bg-amber-50/30",
              )}
            >
              {isToday && (
                <span className={cn(
                  "absolute rounded-md ring-1 ring-primary/40 pointer-events-none",
                  compact ? "inset-0.5" : "inset-1"
                )} />
              )}
              {hasEntry && (
                <span className={cn(
                  "absolute rounded-full",
                  compact ? "top-1 right-1 w-1 h-1" : "top-1.5 right-1.5 w-1.5 h-1.5",
                  isAbsence ? "bg-amber-400" : "bg-primary"
                )} />
              )}
              <span className={cn(
                "font-medium",
                compact ? "text-[11px]" : "text-sm",
                isToday && "text-primary font-bold",
                hasEntry && !isToday && !isAbsence && "text-foreground",
                isAbsence && !isToday && "text-amber-700/70",
                !hasEntry && "text-muted-foreground",
              )}>
                {date.getDate()}
              </span>
              {!compact && hasEntry && !isAbsence && entry.totalHoras > 0 && (
                <span className="text-[10px] font-semibold text-primary/80 mt-0.5 leading-none">
                  {entry.totalHoras}h
                </span>
              )}
              {!compact && isAbsence && (
                <span className="text-[10px] font-semibold text-amber-600/60 mt-0.5 leading-none">aus.</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── MOBILE ── */}
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
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Horas</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {monthStats.totalHours.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">h</span>
            </p>
            <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>{monthStats.normalHours.toFixed(1)}h normais</span>
              {monthStats.extraHours > 0 && (
                <span className="text-amber-500 font-medium">+{monthStats.extraHours.toFixed(1)}h extra</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Euro className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Custo</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {monthStats.totalCost.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">€</span>
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">{monthStats.daysWorked} dias trabalhados</p>
          </div>
        </div>

        <CalendarGrid compact={false} />

        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Trabalhado</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Ausência</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-primary/40" />Hoje</span>
        </div>
      </div>

      {/* ── DESKTOP ── */}
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
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Ausência</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 ring-primary/40" />Hoje</span>
          </div>
        </div>

        <div className="w-48 shrink-0 space-y-2.5 pt-7">
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {[
              { label: "Dias",    value: `${monthStats.daysWorked}`,               icon: Calendar,   color: "text-slate-400" },
              { label: "Normais", value: `${monthStats.normalHours.toFixed(1)}h`,  icon: Clock,      color: "text-blue-500" },
              { label: "Extras",  value: `${monthStats.extraHours.toFixed(1)}h`,   icon: Zap,        color: "text-amber-500" },
              { label: "Total",   value: `${monthStats.totalHours.toFixed(1)}h`,   icon: TrendingUp, color: "text-violet-500" },
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

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-medium mb-0.5">Custo</p>
            <p className="text-lg font-bold text-emerald-700 tracking-tight leading-tight">
              {monthStats.totalCost.toFixed(2)} €
            </p>
            <p className="text-[10px] text-emerald-600/60 mt-0.5">{currentRate.toFixed(2)} €/h</p>
          </div>
        </div>
      </div>

      {/* ── Dialog ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={cn(
            "p-0 gap-0 border-0 shadow-2xl overflow-hidden",
            "max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:right-0 max-sm:bottom-0",
            "max-sm:translate-x-0 max-sm:translate-y-0",
            "max-sm:rounded-none max-sm:w-full max-sm:h-full max-sm:max-h-full max-sm:max-w-full",
            "sm:w-[520px] sm:max-w-[90vw] sm:max-h-[85dvh] sm:rounded-3xl",
            "[&>button]:hidden",
          )}
        >
          {/* Título acessível via sr-only */}
          <DialogTitle className="sr-only">
            {selectedEntry
              ? `Detalhe do dia ${selectedDateLabel} — ${collaboratorName}`
              : "Detalhe do dia"}
          </DialogTitle>

          {selectedEntry ? (
            <EntryDetail
              entry={selectedEntry}
              currentRate={currentRate}
              collaboratorName={collaboratorName}
              dateLabel={selectedDateLabel}
              onClose={() => setModalOpen(false)}
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