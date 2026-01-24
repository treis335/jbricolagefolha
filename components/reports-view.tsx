"use client"

import { useState, useMemo, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Clock, Euro, ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import type { DayEntry } from "@/lib/types"

type Period = "daily" | "weekly" | "monthly"

export function ReportsView() {
  const { data } = useWorkTracker()
  const [period, setPeriod] = useState<Period>("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calculate date range based on period
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const today = new Date(currentDate)
    let start: Date
    let end: Date
    let label: string

    switch (period) {
      case "daily":
        start = new Date(today)
        end = new Date(today)
        label = today.toLocaleDateString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
        break
      case "weekly": {
        const dayOfWeek = today.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(today)
        start.setDate(today.getDate() + diffToMonday)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        label = `${start.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}`
        break
      }
      case "monthly":
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        label = today.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        break
    }

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      rangeLabel: label,
    }
  }, [period, currentDate])

  // Filter entries for current period
  const filteredEntries = useMemo(() => {
    return data.entries
      .filter((entry) => {
        return entry.date >= startDate && entry.date <= endDate
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data.entries, startDate, endDate])

  // Calculate totals with single rate
  const totals = useMemo(() => {
    const totalNormais = filteredEntries.reduce((sum, e) => sum + e.normalHoras, 0)
    const totalExtras = filteredEntries.reduce((sum, e) => sum + e.extraHoras, 0)
    const totalHoras = filteredEntries.reduce((sum, e) => sum + e.totalHoras, 0)
    const valorTotal = totalHoras * data.settings.taxaHoraria

    return {
      totalNormais,
      totalExtras,
      totalHoras,
      valorTotal,
    }
  }, [filteredEntries, data.settings.taxaHoraria])

  const navigate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      switch (period) {
        case "daily":
          newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
          break
        case "weekly":
          newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
          break
        case "monthly":
          newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
          break
      }
      return newDate
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })
  }

  // PDF Export using jsPDF
  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    const periodLabel =
      period === "daily" ? "Diário" : period === "weekly" ? "Semanal" : "Mensal"

    // Title
    doc.setFontSize(18)
    doc.text(`Relatório ${periodLabel}`, 14, 20)

    doc.setFontSize(12)
    doc.text(rangeLabel, 14, 30)

    // Table headers
    const headers = ["Data", "Descrição", "Equipa", "Materiais", "Normal", "Extra", "Total", "Valor"]
    const colWidths = [25, 35, 25, 30, 15, 15, 15, 20]
    let y = 45

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    let x = 14
    headers.forEach((header, i) => {
      doc.text(header, x, y)
      x += colWidths[i]
    })

    // Table rows
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    filteredEntries.forEach((entry) => {
      y += 8
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      x = 14
      const row = [
        new Date(entry.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
        (entry.descricao || "-").substring(0, 20),
        (entry.equipa || "-").substring(0, 15),
        entry.materiais.length > 0 ? entry.materiais.join(", ").substring(0, 18) : "-",
        `${entry.normalHoras}h`,
        `${entry.extraHoras}h`,
        `${entry.totalHoras}h`,
        formatCurrency(entry.totalHoras * data.settings.taxaHoraria),
      ]

      row.forEach((cell, i) => {
        doc.text(cell, x, y)
        x += colWidths[i]
      })
    })

    // Totals
    y += 15
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("TOTAIS:", 14, y)
    y += 8
    doc.setFont("helvetica", "normal")
    doc.text(`Horas Normais: ${totals.totalNormais}h`, 14, y)
    y += 6
    doc.text(`Horas Extras: ${totals.totalExtras}h`, 14, y)
    y += 6
    doc.text(`Total Horas: ${totals.totalHoras}h`, 14, y)
    y += 8
    doc.setFont("helvetica", "bold")
    doc.text(`Valor Total: ${formatCurrency(totals.valorTotal)}`, 14, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`(Taxa: ${formatCurrency(data.settings.taxaHoraria)}/h)`, 14, y)

    // Save PDF
    const filename = `relatorio-${period}-${startDate}.pdf`
    doc.save(filename)
  }, [filteredEntries, totals, period, rangeLabel, startDate, data.settings.taxaHoraria])

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Period Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="w-full">
            <TabsTrigger value="daily" className="flex-1">
              Diário
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">
              Semanal
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1">
              Mensal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Date Range Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-medium capitalize">{rangeLabel}</h3>
        <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Daily View - Detailed Card */}
          {period === "daily" && filteredEntries.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                {filteredEntries.map((entry) => (
                  <div key={entry.date} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">{entry.totalHoras}h trabalhadas</span>
                      <Badge className="bg-primary text-primary-foreground">
                        {formatCurrency(entry.totalHoras * data.settings.taxaHoraria)}
                      </Badge>
                    </div>
                    {entry.descricao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Descrição</p>
                        <p className="text-sm">{entry.descricao}</p>
                      </div>
                    )}
                    {entry.equipa && (
                      <div>
                        <p className="text-sm text-muted-foreground">Equipa</p>
                        <p className="text-sm">{entry.equipa}</p>
                      </div>
                    )}
                    {entry.materiais.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Materiais</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.materiais.map((m, i) => (
                            <Badge key={i} variant="secondary">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-4 pt-2 border-t border-border text-sm">
                      <span>Normal: {entry.normalHoras}h</span>
                      <span className="text-destructive">Extra: {entry.extraHoras}h</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Weekly/Monthly View - Table */}
          {(period === "weekly" || period === "monthly") && filteredEntries.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right w-[50px]">N</TableHead>
                      <TableHead className="text-right w-[50px]">E</TableHead>
                      <TableHead className="text-right w-[60px]">Total</TableHead>
                      <TableHead className="text-right w-[70px]">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.date}>
                        <TableCell className="font-medium text-xs">
                          {new Date(entry.date).toLocaleDateString("pt-PT", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]">
                          {entry.descricao || "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">{entry.normalHoras}</TableCell>
                        <TableCell className="text-right text-xs text-destructive">
                          {entry.extraHoras}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {entry.totalHoras}h
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {formatCurrency(entry.totalHoras * data.settings.taxaHoraria)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right">{totals.totalNormais}</TableCell>
                      <TableCell className="text-right text-destructive">{totals.totalExtras}</TableCell>
                      <TableCell className="text-right">{totals.totalHoras}h</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.valorTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {filteredEntries.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum registo neste período
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          {filteredEntries.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Horas Normais
                    </div>
                    <p className="text-2xl font-bold">{totals.totalNormais}h</p>
                  </CardContent>
                </Card>
                <Card className="border-destructive/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Horas Extras
                    </div>
                    <p className="text-2xl font-bold text-destructive">{totals.totalExtras}h</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 text-primary text-sm mb-1">
                        <Euro className="h-4 w-4" />
                        Valor Total
                      </div>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(totals.valorTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totals.totalHoras}h × {formatCurrency(data.settings.taxaHoraria)}/h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export PDF Button */}
              <Button
                onClick={exportPDF}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
