//reports-view.tsx
"use client"

import { useState, useMemo, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Clock, ChevronLeft, ChevronRight, FileDown,
  TrendingUp, Users, Package, CalendarDays,
  Hammer, Euro, BarChart3,
} from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import type { DayEntry } from "@/lib/types"
import { getNomesColaboradores } from "@/lib/colaboradores"

type Period = "daily" | "weekly" | "monthly"

export function ReportsView() {
  const { data } = useWorkTracker()
  const [period, setPeriod] = useState<Period>("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())

  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const today = new Date(currentDate)
    let start: Date, end: Date, label: string

    switch (period) {
      case "daily":
        start = new Date(today); end = new Date(today)
        label = today.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        break
      case "weekly": {
        const dow = today.getDay()
        const diff = dow === 0 ? -6 : 1 - dow
        start = new Date(today); start.setDate(today.getDate() + diff)
        end = new Date(start); end.setDate(start.getDate() + 6)
        label = `${start.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}`
        break
      }
      case "monthly":
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        label = today.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        break
    }

    return {
      startDate: start!.toISOString().split("T")[0],
      endDate: end!.toISOString().split("T")[0],
      rangeLabel: label!,
    }
  }, [period, currentDate])

  const filteredEntries = useMemo(() => {
    const entries = Array.isArray(data.entries) ? data.entries : []
    return entries
      .filter((e) => e?.date && e.date >= startDate && e.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data.entries, startDate, endDate])

  const totals = useMemo(() => {
    let totalNormais = 0, totalExtras = 0, totalHoras = 0, valorTotal = 0
    filteredEntries.forEach((e) => {
      const horas = e.totalHoras ?? 0
      // ✅ Usa a taxa gravada na entry; fallback para a taxa atual dos settings
      const taxa = e.taxaHoraria ?? data.settings.taxaHoraria ?? 0
      totalHoras += horas
      totalNormais += e.normalHoras ?? 0
      totalExtras += e.extraHoras ?? 0
      valorTotal += horas * taxa
    })
    return { totalNormais, totalExtras, totalHoras, valorTotal }
  }, [filteredEntries, data.settings.taxaHoraria])

  const horasPorColaborador = useMemo(() => {
    const nomesOficiais = new Set(getNomesColaboradores())
    const horas: Record<string, number> = {}
    filteredEntries.forEach((entry) => {
      const nomesUnicos = new Set<string>()
      ;(entry.equipa ?? []).forEach((n) => typeof n === "string" && nomesUnicos.add(n.trim()))
      ;(entry.services ?? []).forEach((s) =>
        (s.equipa ?? []).forEach((n) => typeof n === "string" && nomesUnicos.add(n.trim()))
      )
      const h = entry.totalHoras ?? 0
      nomesUnicos.forEach((nome) => {
        if (nomesOficiais.has(nome)) horas[nome] = (horas[nome] || 0) + h
      })
    })
    return Object.entries(horas)
      .filter(([, h]) => h > 0)
      .map(([nome, horas]) => ({ nome, horas }))
      .sort((a, b) => b.horas - a.horas)
  }, [filteredEntries])

  const navigate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      const delta = direction === "next" ? 1 : -1
      if (period === "daily") d.setDate(d.getDate() + delta)
      else if (period === "weekly") d.setDate(d.getDate() + delta * 7)
      else d.setMonth(d.getMonth() + delta)
      return d
    })
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v)

  const formatDate = (dateStr: string, short = true) => {
    const date = new Date(dateStr)
    if (short) return date.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" })
    return date.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const ml = 10, mr = 16

    const drawHeader = () => {
      try { doc.addImage("/apple-icon.png", "PNG", ml, 11, 20, 20) } catch (_) {}
      doc.setFontSize(14); doc.setFont("helvetica", "bold")
      doc.text(`Relatório ${period === "daily" ? "Diário" : period === "weekly" ? "Semanal" : "Mensal"}`, pageWidth / 2, 17, { align: "center" })
      doc.setFontSize(9); doc.setFont("helvetica", "normal")
      doc.text(rangeLabel, pageWidth / 2, 24, { align: "center" })
    }

    const tableBody: string[][] = []
    filteredEntries.forEach((entry) => {
      const totalH = entry.totalHoras ?? 0
      const taxa = entry.taxaHoraria ?? data.settings.taxaHoraria ?? 0
      const valorDia = (totalH * taxa).toFixed(2)
      const dataLabel = `${formatDate(entry.date, true)} – ${totalH}h (${valorDia}€)`
      if (entry.services && entry.services.length > 0) {
        entry.services.forEach((s, i) => {
          let desc = s.descricao || "-"
          if (s.totalHoras && s.totalHoras > 0) desc = `(${s.totalHoras}h) ${desc}`
          tableBody.push([
            i === 0 ? dataLabel : "",
            `${s.obraNome ? s.obraNome + " — " : ""}${desc}`,
            (s.equipa ?? []).join(", ") || "Nenhum",
            (s.materiais ?? []).join(", ") || "-",
          ])
        })
      } else {
        tableBody.push([
          dataLabel, entry.descricao || "-",
          (entry.equipa ?? []).join(", ") || "Nenhum",
          (entry.materiais ?? []).join(", ") || "-",
        ])
      }
    })

    autoTable(doc, {
      startY: 38,
      head: [["Data / Valor", "Obra / Descrição", "Equipa", "Materiais"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 105 }, 2: { cellWidth: 55 }, 3: { cellWidth: 60 } },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: 38, left: ml, right: mr },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 0 && d.cell.text?.[0] !== "") {
          d.cell.styles.fillColor = [220, 230, 241]
          d.cell.styles.fontStyle = "bold"
        }
      },
      didDrawPage: drawHeader,
    })

    const finalY = (doc as any).lastAutoTable?.finalY + 12 || 110
    doc.setFontSize(11); doc.setFont("helvetica", "bold")
    doc.text("RESUMO DO PERÍODO", ml, finalY)
    doc.setFontSize(9.5); doc.setFont("helvetica", "normal")
    doc.text(
      `Horas Normais: ${totals.totalNormais}h   |   Horas Extras: ${totals.totalExtras}h   |   Total: ${totals.totalHoras}h   |   Valor: ${formatCurrency(totals.valorTotal)}`,
      ml, finalY + 8
    )

    if (horasPorColaborador.length > 0) {
      doc.addPage(); drawHeader()
      autoTable(doc, {
        startY: 38,
        head: [["Colaborador", "Total de Horas"]],
        body: horasPorColaborador.map(({ nome, horas }) => [nome, `${horas}h`]),
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60, halign: "center" } },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { top: 38, left: ml, right: mr },
      })
    }

    const pages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pages; i++) { doc.setPage(i); drawHeader() }
    doc.save(`relatorio-${period}-${startDate}.pdf`)
  }, [filteredEntries, totals, period, rangeLabel, startDate, horasPorColaborador, data.settings.taxaHoraria])

  const hasEntries = filteredEntries.length > 0

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="px-4 pt-3 pb-2 md:px-8">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="w-full grid grid-cols-3 h-9 md:w-auto md:inline-grid">
              <TabsTrigger value="daily" className="text-sm">Diário</TabsTrigger>
              <TabsTrigger value="weekly" className="text-sm">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-sm">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between px-3 py-2 md:px-7">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-sm font-semibold text-center capitalize flex-1 px-3 truncate">{rangeLabel}</p>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => navigate("next")}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {hasEntries && (
          <div className="grid grid-cols-4 divide-x divide-border border-t bg-muted/20">
            {[
              { value: filteredEntries.length.toString(), label: "dias", color: "text-foreground" },
              { value: `${totals.totalHoras}h`, label: "total", color: "text-blue-600 dark:text-blue-400" },
              { value: `${totals.totalExtras}h`, label: "extras", color: "text-red-500 dark:text-red-400" },
              { value: `${totals.valorTotal.toFixed(0)}€`, label: "valor", color: "text-emerald-600 dark:text-emerald-400" },
            ].map((kpi) => (
              <div key={kpi.label} className="flex flex-col items-center py-2.5">
                <span className={`text-base font-bold leading-none tabular-nums ${kpi.color}`}>{kpi.value}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mt-0.5">{kpi.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-8 space-y-4 pb-32 md:pb-20 max-w-4xl mx-auto">

          {!hasEntries && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5 shadow-inner">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="font-bold text-lg text-foreground">Sem registos</p>
              <p className="text-sm text-muted-foreground mt-1.5">Nenhum registo encontrado neste período</p>
            </div>
          )}

          {hasEntries && filteredEntries.map((entry) => (
            <EntryCard
              key={entry.date}
              entry={entry}
              defaultTaxaHoraria={data.settings.taxaHoraria}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))}

          {hasEntries && (
            <div className="space-y-4 pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Resumo do período
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide">Normais</span>
                    </div>
                    <p className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">{totals.totalNormais}h</p>
                  </CardContent>
                </Card>

                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide">Extras</span>
                    </div>
                    <p className="text-3xl md:text-4xl font-bold text-red-500 dark:text-red-400">{totals.totalExtras}h</p>
                  </CardContent>
                </Card>

                <Card className="col-span-2 md:col-span-1 border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                        <Euro className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide">Total</span>
                    </div>
                    <p className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totals.valorTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {totals.totalHoras}h · taxa por entrada
                    </p>
                  </CardContent>
                </Card>
              </div>

              {horasPorColaborador.length > 0 && (
                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-bold">Horas por Colaborador</span>
                    </div>
                    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-3 md:space-y-0">
                      {horasPorColaborador.map(({ nome, horas }) => {
                        const pct = totals.totalHoras > 0 ? (horas / totals.totalHoras) * 100 : 0
                        return (
                          <div key={nome} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate pr-2">{nome}</span>
                              <span className="text-sm font-bold tabular-nums shrink-0">{horas}h</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={exportPDF}
                className="w-full h-12 md:h-14 text-base font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-md"
                size="lg"
              >
                <FileDown className="h-5 w-5 mr-2" />
                Exportar PDF
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({
  entry,
  defaultTaxaHoraria,
  formatDate,
  formatCurrency,
}: {
  entry: DayEntry
  defaultTaxaHoraria: number
  formatDate: (d: string, short?: boolean) => string
  formatCurrency: (v: number) => string
}) {
  const hasServices = Array.isArray(entry.services) && entry.services.length > 0
  const totalHoras = entry.totalHoras ?? 0
  // ✅ Usa a taxa gravada na entry; fallback para a taxa atual
  const taxa = entry.taxaHoraria ?? defaultTaxaHoraria
  const valor = totalHoras * taxa

  return (
    <Card className="overflow-hidden border border-border/70 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-3.5 bg-muted/30 border-b border-border/50">
        <p className="text-sm md:text-base font-semibold capitalize">{formatDate(entry.date, false)}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/40 border-0 text-xs">
            {totalHoras}h
          </Badge>
          {/* ✅ Mostra a taxa se for diferente da atual */}
          {entry.taxaHoraria && entry.taxaHoraria !== defaultTaxaHoraria && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
              {entry.taxaHoraria}€/h
            </Badge>
          )}
          <Badge variant="secondary" className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border-0 text-xs">
            {formatCurrency(valor)}
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {hasServices ? (
          entry.services!.map((s, idx) => (
            <div key={s.id || idx} className="px-4 md:px-5 py-3 md:py-3.5 space-y-1.5">
              {s.obraNome && (
                <div className="flex items-center gap-2">
                  <Hammer className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span className="text-sm font-semibold truncate">{s.obraNome}</span>
                  {s.totalHoras != null && s.totalHoras > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs shrink-0 font-medium">{s.totalHoras}h</Badge>
                  )}
                </div>
              )}
              {s.descricao && <p className="text-sm text-muted-foreground leading-relaxed pl-5">{s.descricao}</p>}
              <div className="pl-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {(s.equipa ?? []).length > 0 && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3 shrink-0" />{(s.equipa ?? []).join(", ")}</span>
                )}
                {(s.materiais ?? []).length > 0 && (
                  <span className="flex items-center gap-1"><Package className="h-3 w-3 shrink-0" />{(s.materiais ?? []).join(", ")}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 md:px-5 py-3 md:py-3.5 space-y-1.5">
            {entry.descricao && <p className="text-sm text-muted-foreground leading-relaxed">{entry.descricao}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(entry.equipa ?? []).length > 0 && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3 shrink-0" />{(entry.equipa ?? []).join(", ")}</span>
              )}
              {(entry.materiais ?? []).length > 0 && (
                <span className="flex items-center gap-1"><Package className="h-3 w-3 shrink-0" />{(entry.materiais ?? []).join(", ")}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}