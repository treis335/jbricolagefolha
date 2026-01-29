"use client"

import { useState, useMemo, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
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
import { Clock, ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { useWorkTracker } from "@/lib/work-tracker-context"
import type { DayEntry } from "@/lib/types"

type Period = "daily" | "weekly" | "monthly"

export function ReportsView() {
  const { data } = useWorkTracker()
  const [period, setPeriod] = useState<Period>("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())

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
          year: "numeric",
        })
        break
      case "weekly": {
        const dayOfWeek = today.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(today)
        start.setDate(today.getDate() + diffToMonday)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        label = `${start.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })} - ${end.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}`
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

  const filteredEntries = useMemo(() => {
    return data.entries
      .filter((entry) => entry.date >= startDate && entry.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data.entries, startDate, endDate])

  const totals = useMemo(() => {
    const totalNormais = filteredEntries.reduce((sum, e) => sum + e.normalHoras, 0)
    const totalExtras = filteredEntries.reduce((sum, e) => sum + e.extraHoras, 0)
    const totalHoras = filteredEntries.reduce((sum, e) => sum + e.totalHoras, 0)
    const valorTotal = totalHoras * data.settings.taxaHoraria

    return { totalNormais, totalExtras, totalHoras, valorTotal }
  }, [filteredEntries, data.settings.taxaHoraria])

  const navigate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (period === "daily") {
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
      } else if (period === "weekly") {
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
      } else {
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
      }
      return newDate
    })
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value)

  const formatDateWithWeekday = (dateStr: string, short: boolean = true) => {
    const date = new Date(dateStr)
    if (short) {
      return date.toLocaleDateString("pt-PT", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }
    return date.toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginLeft = 10
    const marginRight = 16
    const marginTop = 12

    const periodLabel = period === "daily" ? "Diário" : period === "weekly" ? "Semanal" : "Mensal"
    const reportType = `Relatório ${periodLabel}`

    const placeholder = "{totalPages}"

    const drawHeader = () => {
      doc.addImage("/icon-192.png", "PNG", marginLeft, marginTop - 1, 20, 20)

      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(reportType, pageWidth / 2, marginTop + 5, { align: "center" })

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(rangeLabel, pageWidth / 2, marginTop + 12, { align: "center" })
    }


    // Desenha a tabela (com placeholder no rodapé)
    autoTable(doc, {
      startY: 38,
      head: [["Data", "Descrição", "Equipa", "Materiais", "Total Horas"]],
      body: filteredEntries.map((entry) => [
        formatDateWithWeekday(entry.date, true),
        entry.descricao || "-",
        entry.equipa || "-",
        entry.materiais.length > 0 ? entry.materiais.join(", ") : "-",
        `${entry.totalHoras}h`,
      ]),
      theme: "grid",
      styles: {
        fontSize: 9.5,
        cellPadding: 4,
        lineWidth: 0.1,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 38, halign: "left" },
        1: { cellWidth: 85, halign: "left" },
        2: { cellWidth: 45, halign: "left" },
        3: { cellWidth: 60, halign: "left" },
        4: { cellWidth: 40, halign: "center" },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: 38, left: marginLeft, right: marginRight },

      didDrawPage: () => {
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
        drawHeader()
      
      },
    })

    // Adiciona o resumo (apenas na última página)
    const finalY = (doc as any).lastAutoTable?.finalY + 10 || 110

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("RESUMO DO PERÍODO", marginLeft, finalY)

    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Horas Normais: ${totals.totalNormais}h   |   Horas Extras: ${totals.totalExtras}h   |   Total de Horas: ${totals.totalHoras}h`,
      marginLeft,
      finalY + 8
    )

    // Atualiza o rodapé em TODAS as páginas com o total real
    const totalPages = (doc as any).internal.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      drawHeader()
     
    }

    const filename = `relatorio-${period}-${startDate}.pdf`
    doc.save(filename)
  }, [filteredEntries, totals, period, rangeLabel, startDate])

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="px-4 pt-4">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="w-full">
            <TabsTrigger value="daily" className="flex-1">Diário</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-medium capitalize text-center">{rangeLabel}</h3>
        <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {period === "daily" && filteredEntries.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-4">
                {filteredEntries.map((entry) => (
                  <div key={entry.date} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xl font-semibold">{formatDateWithWeekday(entry.date, false)}</p>
                        <p className="text-sm text-muted-foreground">{entry.totalHoras}h trabalhadas</p>
                      </div>
                      <Badge className="text-base px-4 py-1">
                        {formatCurrency(entry.totalHoras * data.settings.taxaHoraria)}
                      </Badge>
                    </div>

                    {entry.descricao && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Descrição</p>
                        <p className="text-sm">{entry.descricao}</p>
                      </div>
                    )}

                    {entry.equipa && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Equipa</p>
                        <p className="text-sm">{entry.equipa}</p>
                      </div>
                    )}

                    {entry.materiais.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Materiais</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.materiais.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-sm">
                      <p className="text-muted-foreground">Total de Horas</p>
                      <p className="font-medium">{entry.totalHoras}h</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(period === "weekly" || period === "monthly") && filteredEntries.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Equipa</TableHead>
                      <TableHead>Materiais</TableHead>
                      <TableHead className="text-right">Total Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.date}>
                        <TableCell className="font-medium">
                          {formatDateWithWeekday(entry.date, true)}
                        </TableCell>
                        <TableCell>{entry.descricao || "-"}</TableCell>
                        <TableCell>{entry.equipa || "-"}</TableCell>
                        <TableCell>{entry.materiais.length > 0 ? entry.materiais.join(", ") : "-"}</TableCell>
                        <TableCell className="text-right font-medium">{entry.totalHoras}h</TableCell>
                      </TableRow>
                    ))}

                    <TableRow className="bg-muted/60 font-semibold">
                      <TableCell colSpan={4} className="text-right">TOTAL</TableCell>
                      <TableCell className="text-right">{totals.totalHoras}h</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {filteredEntries.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum registo encontrado neste período
              </CardContent>
            </Card>
          )}

          {filteredEntries.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Horas Normais
                    </div>
                    <p className="text-3xl font-bold">{totals.totalNormais}h</p>
                  </CardContent>
                </Card>
                <Card className="border-destructive/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Horas Extras
                    </div>
                    <p className="text-3xl font-bold text-destructive">{totals.totalExtras}h</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-primary/5 border-primary/30">
                <CardContent className="p-5">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-primary text-sm mb-1">Valor Total do Período</p>
                      <p className="text-4xl font-bold text-primary">
                        {formatCurrency(totals.valorTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totals.totalHoras}h × {formatCurrency(data.settings.taxaHoraria)}/h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={exportPDF} className="w-full h-12 text-base" size="lg">
                <FileDown className="h-5 w-5 mr-3" />
                Exportar PDF Completo (Paisagem)
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}