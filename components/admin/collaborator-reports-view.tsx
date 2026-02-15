// components/admin/collaborator-reports-view.tsx (VERSÃO MELHORADA com PDF)
"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, FileDown, Calendar, Clock } from "lucide-react"

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

export function CollaboratorReportsView({ collaborator }: CollaboratorReportsViewProps) {
  const [period, setPeriod] = useState<Period>("monthly")
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calcular período
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

  // Filtrar entradas
  const filteredEntries = useMemo(() => {
    return collaborator.entries
      .filter((entry) => entry && entry.date && entry.date >= startDate && entry.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [collaborator.entries, startDate, endDate])

  // Calcular totais
  const totals = useMemo(() => {
    let totalNormais = 0
    let totalExtras = 0
    let totalHoras = 0

    filteredEntries.forEach((entry) => {
      totalHoras += entry.totalHoras ?? 0
      totalNormais += entry.normalHoras ?? 0
      totalExtras += entry.extraHoras ?? 0
    })

    const valorTotal = totalHoras * collaborator.currentRate

    return { totalNormais, totalExtras, totalHoras, valorTotal }
  }, [filteredEntries, collaborator.currentRate])

  // Navegação
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

  const formatDateWithWeekday = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    })
  }

  // Exportar PDF
  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const marginLeft = 10
    const marginRight = 16
    const marginTop = 12

    const periodLabel = period === "daily" ? "Diário" : period === "weekly" ? "Semanal" : "Mensal"

    const drawHeader = () => {
      // Logo
      try {
        doc.addImage("/apple-icon.png", "PNG", marginLeft, marginTop - 1, 20, 20)
      } catch (e) {
        console.log("Logo não encontrado, continuando sem logo")
      }

      // Título
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(`Relatório ${periodLabel} - ${collaborator.name}`, pageWidth / 2, marginTop + 5, { align: "center" })

      // Subtítulo
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(rangeLabel, pageWidth / 2, marginTop + 12, { align: "center" })
    }

    const tableBody: string[][] = []

    filteredEntries.forEach((entry) => {
      const totalHoras = entry.totalHoras ?? 0
      const dataComHoras = `${formatDateWithWeekday(entry.date)} – ${totalHoras}h`

      if (entry.services && entry.services.length > 0) {
        entry.services.forEach((s: any, index: number) => {
          const isFirst = index === 0

          let descricaoFormatada = s.descricao || "-"
          if (s.totalHoras !== undefined && s.totalHoras > 0) {
            descricaoFormatada = `(${s.totalHoras}h) - ${descricaoFormatada}`
          }

          tableBody.push([
            isFirst ? dataComHoras : "",
            `${s.obraNome ? s.obraNome + " - " : ""}${descricaoFormatada}`,
            (s.equipa ?? []).length > 0 ? (s.equipa ?? []).join(", ") : "Solo",
            (s.materiais ?? []).length > 0 ? (s.materiais ?? []).join(", ") : "-"
          ])
        })
      } else {
        tableBody.push([
          dataComHoras,
          entry.descricao || "-",
          (entry.equipa ?? []).length > 0 ? (entry.equipa ?? []).join(", ") : "Solo",
          (entry.materiais ?? []).length > 0 ? (entry.materiais ?? []).join(", ") : "-"
        ])
      }
    })

    autoTable(doc, {
      startY: 38,
      head: [["Data", "Obra / Descrição", "Equipa", "Materiais"]],
      body: tableBody,
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
        0: { cellWidth: 50, halign: "left" },
        1: { cellWidth: 110, halign: "left" },
        2: { cellWidth: 55, halign: "left" },
        3: { cellWidth: 60, halign: "left" },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: 38, left: marginLeft, right: marginRight },
      didParseCell: (data: any) => {
        if (
          data.section === "body" &&
          data.column.index === 0 &&
          data.cell.text &&
          data.cell.text[0] !== ""
        ) {
          data.cell.styles.fillColor = [220, 230, 241]
          data.cell.styles.fontStyle = "bold"
        }
      },
      didDrawPage: drawHeader,
    })

    const finalY = (doc as any).lastAutoTable?.finalY + 15 || 110

    // Resumo
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
    doc.text(
      `Taxa Horária: ${collaborator.currentRate.toFixed(2)} €/h   |   Valor Total: ${totals.valorTotal.toFixed(2)} €`,
      marginLeft,
      finalY + 14
    )

    const filename = `relatorio-${collaborator.name.replace(/\s+/g, "-")}-${period}-${startDate}.pdf`
    doc.save(filename)
  }, [filteredEntries, totals, period, rangeLabel, startDate, collaborator])

  const hasEntries = filteredEntries.length > 0

  return (
    <div className="space-y-6">
      {/* Seletor de Período */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="daily" className="text-sm">
            Diário
          </TabsTrigger>
          <TabsTrigger value="weekly" className="text-sm">
            Semanal
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-sm">
            Mensal
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Navegação de Período */}
      <div className="flex items-center justify-between px-4 py-3 border rounded-lg bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-medium text-center flex-1 px-2 capitalize">
          {rangeLabel}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {hasEntries ? (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="h-4 w-4" />
                  Horas Normais
                </div>
                <p className="text-3xl font-bold">{totals.totalNormais}h</p>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardContent className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 text-destructive text-sm mb-1">
                  <Clock className="h-4 w-4" />
                  Horas Extras
                </div>
                <p className="text-3xl font-bold text-destructive">
                  {totals.totalExtras}h
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Valor Total */}
          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="p-6 text-center">
              <p className="text-primary text-sm mb-1">Valor Total do Período</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(totals.valorTotal)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {totals.totalHoras}h × {formatCurrency(collaborator.currentRate)}/h
              </p>
            </CardContent>
          </Card>

          {/* Lista de Entradas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Registos Detalhados ({filteredEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-muted rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {new Date(entry.date).toLocaleDateString("pt-PT", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <Badge className="text-sm">{entry.totalHoras}h</Badge>
                  </div>

                  {entry.services && entry.services.length > 0 ? (
                    <div className="space-y-2">
                      {entry.services.map((s: any, sidx: number) => (
                        <div key={sidx} className="text-sm border-l-2 border-primary/30 pl-3">
                          <p className="font-medium">{s.obraNome}</p>
                          {s.descricao && (
                            <p className="text-muted-foreground text-xs mt-1">
                              {s.descricao}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    entry.descricao && (
                      <p className="text-sm text-muted-foreground">
                        {entry.descricao}
                      </p>
                    )
                  )}

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Normal: {entry.normalHoras || 0}h</span>
                    <span>•</span>
                    <span>Extra: {entry.extraHoras || 0}h</span>
                    <span>•</span>
                    <span className="text-green-600">
                      {formatCurrency(entry.totalHoras * collaborator.currentRate)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Botão Exportar */}
          <Button onClick={exportPDF} className="w-full h-12 text-base" size="lg">
            <FileDown className="h-5 w-5 mr-2" />
            Exportar Relatório PDF
          </Button>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum registo encontrado neste período
          </CardContent>
        </Card>
      )}
    </div>
  )
}