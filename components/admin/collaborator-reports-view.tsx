// components/admin/collaborator-reports-view.tsx
"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, ChevronRight, FileDown, Calendar,
  Clock, TrendingUp, Zap, Euro, Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { formatLocalDate } from "@/lib/date-utils"

interface CollaboratorReportsViewProps {
  collaborator: {
    id: string
    name: string
    email: string
    currentRate: number
    entries: any[]
  }
}

type Period = "daily" | "weekly" | "monthly"

function resolveEntryTaxa(entry: any, currentRate: number): number {
  if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) return entry.taxaHoraria
  if (Array.isArray(entry.services) && entry.services.length > 0) {
    const s0Taxa = entry.services[0]?.taxaHoraria
    if (typeof s0Taxa === "number" && s0Taxa > 0) return s0Taxa
  }
  return currentRate
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value)

const formatDateWithWeekday = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" })

export function CollaboratorReportsView({ collaborator }: CollaboratorReportsViewProps) {
  const [period, setPeriod] = useState<Period>("monthly")
  const [currentDate, setCurrentDate] = useState(new Date())

  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const today = new Date(currentDate)
    let start: Date, end: Date, label: string
    switch (period) {
      case "daily":
        start = end = new Date(today)
        label = today.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        break
      case "weekly": {
        const diff = today.getDay() === 0 ? -6 : 1 - today.getDay()
        start = new Date(today); start.setDate(today.getDate() + diff)
        end = new Date(start); end.setDate(start.getDate() + 6)
        label = `${start.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}`
        break
      }
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        label = today.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
    }
   return { startDate: formatLocalDate(start), endDate: formatLocalDate(end), rangeLabel: label }

  }, [period, currentDate])

  const filteredEntries = useMemo(() =>
    collaborator.entries
      .filter(e => e?.date && e.date >= startDate && e.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [collaborator.entries, startDate, endDate]
  )

  const totals = useMemo(() => {
    let totalNormais = 0, totalExtras = 0, totalHoras = 0, valorTotal = 0
    filteredEntries.forEach(e => {
      const h = e.totalHoras ?? 0
      totalHoras += h
      totalNormais += e.normalHoras ?? 0
      totalExtras += e.extraHoras ?? 0
      valorTotal += h * resolveEntryTaxa(e, collaborator.currentRate)
    })
    return { totalNormais, totalExtras, totalHoras, valorTotal }
  }, [filteredEntries, collaborator.currentRate])

 const navigate = (dir: "prev" | "next") => {
  setCurrentDate(prev => {
    const delta = dir === "next" ? 1 : -1
    if (period === "daily") {
      const d = new Date(prev); d.setDate(d.getDate() + delta); return d
    }
    if (period === "weekly") {
      const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d
    }
    // monthly — ancorar no dia 1
    return new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
  })
}

  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const periodLabel = period === "daily" ? "Diário" : period === "weekly" ? "Semanal" : "Mensal"

    const drawHeader = () => {
      try { doc.addImage("/apple-icon.png", "PNG", 10, 11, 20, 20) } catch {}
      doc.setFontSize(14); doc.setFont("helvetica", "bold")
      doc.text(`Relatório ${periodLabel} - ${collaborator.name}`, pageWidth / 2, 17, { align: "center" })
      doc.setFontSize(9); doc.setFont("helvetica", "normal")
      doc.text(rangeLabel, pageWidth / 2, 24, { align: "center" })
    }

    const tableBody: string[][] = []
    filteredEntries.forEach(entry => {
      const h = entry.totalHoras ?? 0
      const taxa = resolveEntryTaxa(entry, collaborator.currentRate)
      const custo = (h * taxa).toFixed(2) + " €"
      const dataLabel = `${formatDateWithWeekday(entry.date)} – ${h}h`
      if (entry.services?.length > 0) {
        entry.services.forEach((s: any, i: number) => {
          const desc = s.totalHoras ? `(${s.totalHoras}h) - ${s.descricao || "-"}` : s.descricao || "-"
          tableBody.push([i === 0 ? dataLabel : "", `${s.obraNome ? s.obraNome + " - " : ""}${desc}`,
            (s.equipa ?? []).join(", ") || "Solo", (s.materiais ?? []).join(", ") || "-", i === 0 ? custo : ""])
        })
      } else {
        tableBody.push([dataLabel, entry.descricao || "-",
          (entry.equipa ?? []).join(", ") || "Solo", (entry.materiais ?? []).join(", ") || "-", custo])
      }
    })

    autoTable(doc, {
      startY: 38,
      head: [["Data", "Obra / Descrição", "Equipa", "Materiais", "Custo"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 4, lineWidth: 0.1, overflow: "linebreak" },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 100 }, 2: { cellWidth: 50 }, 3: { cellWidth: 55 }, 4: { cellWidth: 25, halign: "right" } },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: 38, left: 10, right: 16 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 0 && data.cell.text?.[0] !== "") {
          data.cell.styles.fillColor = [220, 230, 241]; data.cell.styles.fontStyle = "bold"
        }
      },
      didDrawPage: drawHeader,
    })

    const finalY = (doc as any).lastAutoTable?.finalY + 15 || 110
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("RESUMO DO PERÍODO", 10, finalY)
    doc.setFontSize(9.5); doc.setFont("helvetica", "normal")
    doc.text(`Horas Normais: ${totals.totalNormais}h   |   Horas Extras: ${totals.totalExtras}h   |   Total: ${totals.totalHoras}h`, 10, finalY + 8)
    doc.text(`Taxa Atual: ${collaborator.currentRate.toFixed(2)} €/h   |   Valor Total: ${totals.valorTotal.toFixed(2)} €`, 10, finalY + 14)
    doc.save(`relatorio-${collaborator.name.replace(/\s+/g, "-")}-${period}-${startDate}.pdf`)
  }, [filteredEntries, totals, period, rangeLabel, startDate, collaborator])

  const PERIODS: { value: Period; label: string }[] = [
    { value: "daily", label: "Diário" },
    { value: "weekly", label: "Semanal" },
    { value: "monthly", label: "Mensal" },
  ]

  return (
    <div className="space-y-4">

      {/* ── Period selector + nav + export ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period tabs */}
        <div className="flex items-center rounded-xl bg-muted/60 p-1 gap-0.5">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                period === p.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("prev")}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">{rangeLabel}</span>
          <button
            onClick={() => navigate("next")}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Export */}
        {filteredEntries.length > 0 && (
          <button
            onClick={exportPDF}
            className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-lg border bg-card text-xs font-medium hover:bg-muted transition-colors text-foreground shrink-0"
          >
            <FileDown className="h-3.5 w-3.5" />
            Exportar PDF
          </button>
        )}
      </div>

      {filteredEntries.length > 0 ? (
        <>
          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Normais",  value: `${totals.totalNormais}`,  unit: "h", icon: Clock,     color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/20" },
              { label: "Extras",   value: `${totals.totalExtras}`,   unit: "h", icon: Zap,       color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/20" },
              { label: "Total",    value: `${totals.totalHoras}`,    unit: "h", icon: TrendingUp, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/20" },
              { label: "Custo",    value: formatCurrency(totals.valorTotal), unit: "", icon: Euro, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
            ].map(({ label, value, unit, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-xl border-0 p-4 ${bg}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
                <p className={`text-xl font-bold tracking-tight ${color}`}>
                  {value}{unit && <span className="text-sm font-normal ml-0.5 opacity-70">{unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* ── Entries list ── */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Registos
              </h3>
              <Badge variant="secondary" className="text-xs ml-auto">{filteredEntries.length}</Badge>
            </div>

            <div className="divide-y">
              {filteredEntries.map((entry, idx) => {
                const taxa = resolveEntryTaxa(entry, collaborator.currentRate)
                const custo = entry.totalHoras * taxa
                const showTaxa = taxa !== collaborator.currentRate

                return (
                  <div key={idx} className="px-4 py-3.5 hover:bg-muted/30 transition-colors">
                    {/* Entry header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize">
                          {new Date(entry.date + "T12:00:00").toLocaleDateString("pt-PT", {
                            weekday: "long", day: "numeric", month: "short",
                          })}
                        </span>
                        <Badge variant="secondary" className="text-xs">{entry.totalHoras}h</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(custo)}
                        </span>
                        {showTaxa && (
                          <span className="text-[10px] text-muted-foreground">{taxa.toFixed(2)} €/h</span>
                        )}
                      </div>
                    </div>

                    {/* Hours breakdown */}
                    <div className="flex items-center gap-3 mb-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{entry.normalHoras || 0}h normais
                      </span>
                      {(entry.extraHoras || 0) > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Zap className="h-3 w-3" />{entry.extraHoras}h extras
                        </span>
                      )}
                    </div>

                    {/* Services */}
                    {entry.services?.length > 0 ? (
                      <div className="space-y-1.5">
                        {entry.services.map((s: any, si: number) => (
                          <div key={si} className="flex items-start gap-2 pl-2 border-l-2 border-primary/20">
                            <Building2 className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-medium">{s.obraNome || `Serviço ${si + 1}`}</span>
                              {s.totalHoras && (
                                <span className="text-[10px] text-muted-foreground ml-1.5">({s.totalHoras}h)</span>
                              )}
                              {s.descricao && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{s.descricao}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : entry.descricao ? (
                      <p className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">{entry.descricao}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

        </>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sem registos neste período</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Tenta navegar para outro período</p>
        </div>
      )}
    </div>
  )
}