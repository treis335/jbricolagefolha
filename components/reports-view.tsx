"use client"

import { useState, useMemo, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, ChevronLeft, ChevronRight, FileDown } from "lucide-react"
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
    const entries = Array.isArray(data.entries) ? data.entries : []
    return entries
      .filter((entry) => entry && entry.date && entry.date >= startDate && entry.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data.entries, startDate, endDate])

  const totals = useMemo(() => {
    let totalNormais = 0
    let totalExtras = 0
    let totalHoras = 0

    filteredEntries.forEach((entry) => {
      totalHoras += entry.totalHoras ?? 0
      totalNormais += entry.normalHoras ?? 0
      totalExtras += entry.extraHoras ?? 0
    })

    const valorTotal = totalHoras * (data.settings.taxaHoraria ?? 0)

    return { totalNormais, totalExtras, totalHoras, valorTotal }
  }, [filteredEntries, data.settings.taxaHoraria])

  const horasPorColaborador = useMemo(() => {
    const nomesOficiais = new Set(getNomesColaboradores())
    const horas: Record<string, number> = {}

    filteredEntries.forEach((entry) => {
      const nomesUnicosDoDia = new Set<string>()

      const equipaDia = entry.equipa ?? []
      equipaDia.forEach((nome) => {
        if (nome && typeof nome === "string") {
          nomesUnicosDoDia.add(nome.trim())
        }
      })

      const servicesDia = entry.services ?? []
      servicesDia.forEach((s) => {
        const equipaServico = s.equipa ?? []
        equipaServico.forEach((nome) => {
          if (nome && typeof nome === "string") {
            nomesUnicosDoDia.add(nome.trim())
          }
        })
      })

      const horasDia = entry.totalHoras ?? 0
      nomesUnicosDoDia.forEach((nomeLimpo) => {
        if (nomesOficiais.has(nomeLimpo)) {
          horas[nomeLimpo] = (horas[nomeLimpo] || 0) + horasDia
        }
      })
    })

    return Object.entries(horas)
      .filter(([, h]) => h > 0)
      .map(([nome, horas]) => ({ nome, horas }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [filteredEntries])

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
  const marginLeft = 10
  const marginRight = 16
  const marginTop = 12

  const periodLabel = period === "daily" ? "Diário" : period === "weekly" ? "Semanal" : "Mensal"
  const reportType = `Relatório ${periodLabel}`

  const drawHeader = () => {
    doc.addImage("/apple-icon.png", "PNG", marginLeft, marginTop - 1, 20, 20)

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(reportType, pageWidth / 2, marginTop + 5, { align: "center" })

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(rangeLabel, pageWidth / 2, marginTop + 12, { align: "center" })
  }

  const tableBody: string[][] = []

  filteredEntries.forEach((entry) => {
    const totalHoras = entry.totalHoras ?? 0
    const dataComHoras = `${formatDateWithWeekday(entry.date, true)} – ${totalHoras}h`

    if (entry.services && entry.services.length === 1) {
      // Apenas 1 serviço → usa só os dados do serviço único (sem duplicar linha principal)
      const s = entry.services[0]
      tableBody.push([
        dataComHoras,
        `${s.obraNome ? s.obraNome + " - " : ""}${s.descricao || "-"}`,
        (s.equipa ?? []).length > 0 ? (s.equipa ?? []).join(", ") : "Nenhum",
        (s.materiais ?? []).length > 0 ? (s.materiais ?? []).join(", ") : "-",
        `${totalHoras}h`
      ])
    } else {
      // 0 serviços (dados antigos) ou múltiplos serviços → linha principal do dia
      tableBody.push([
        dataComHoras,
        entry.descricao || "-",
        (entry.equipa ?? []).length > 0 ? (entry.equipa ?? []).join(", ") : "Nenhum",
        (entry.materiais ?? []).length > 0 ? (entry.materiais ?? []).join(", ") : "-",
        `${totalHoras}h`
      ])

      // Se houver múltiplos serviços, adiciona sublinhas
      if (entry.services && entry.services.length > 0) {
        entry.services.forEach((s) => {
          tableBody.push([
            "",
            `${s.obraNome ? s.obraNome + " - " : ""}${s.descricao || "-"}`,
            (s.equipa ?? []).length > 0 ? (s.equipa ?? []).join(", ") : "Nenhum",
            (s.materiais ?? []).length > 0 ? (s.materiais ?? []).join(", ") : "-",
            "-"
          ])
        })
      }
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
      1: { cellWidth: 100, halign: "left" },
      2: { cellWidth: 55, halign: "left" },
      3: { cellWidth: 60, halign: "left" },
      4: { cellWidth: 35, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { top: 38, left: marginLeft, right: marginRight },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0 && data.cell.text && data.cell.text[0] !== "") {
        data.cell.styles.fillColor = [220, 230, 241] // azul bebé em todas as células da linha
        data.cell.styles.fontStyle = "bold" // negrito na data + horas
      }
    },
    didDrawPage: drawHeader,
  })

  const finalY = (doc as any).lastAutoTable?.finalY + 15 || 110

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

  if (horasPorColaborador.length > 0) {
    doc.addPage()
    drawHeader()

    autoTable(doc, {
      startY: 38,
      head: [["Colaborador", "Total de Horas"]],
      body: horasPorColaborador.map(({ nome, horas }) => [nome, `${horas}h`]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", halign: "left" },
      columnStyles: {
        0: { cellWidth: 120, halign: "left" },
        1: { cellWidth: 60, halign: "center" },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: 38, left: marginLeft, right: marginRight },
    })
  }

  const totalPages = (doc as any).internal.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawHeader()
  }

  const filename = `relatorio-${period}-${startDate}.pdf`
  doc.save(filename)
}, [filteredEntries, totals, period, rangeLabel, startDate, horasPorColaborador])
  const hasEntries = filteredEntries.length > 0

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-4 pt-4 pb-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="w-full grid grid-cols-3 h-10 rounded-md">
              <TabsTrigger value="daily" className="text-sm">Diário</TabsTrigger>
              <TabsTrigger value="weekly" className="text-sm">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-sm">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-base font-medium text-center flex-1 px-2">
            {rangeLabel}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 pb-32 md:pb-12">
          {period === "daily" && hasEntries && (
            <div className="mx-auto max-w-3xl space-y-6">
              {filteredEntries.map((entry) => (
                <Card key={entry.date} className="overflow-hidden shadow-md">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-2xl font-bold">{formatDateWithWeekday(entry.date, false)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.totalHoras ?? 0}h trabalhadas
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-lg px-5 py-2">
                        {formatCurrency((entry.totalHoras ?? 0) * data.settings.taxaHoraria)}
                      </Badge>
                    </div>

                    {entry.services && entry.services.length > 0 ? (
                      <div className="space-y-6">
                        {entry.services.map((s, idx) => (
                          <div key={s.id || idx} className="border-t pt-5 first:border-t-0 first:pt-0">
                            <p className="text-lg font-semibold mb-2">
                              {s.obraNome || `Serviço ${idx + 1}`}
                            </p>
                            {s.descricao && (
                              <p className="text-sm whitespace-pre-line mb-3">{s.descricao}</p>
                            )}
                            <div className="flex flex-wrap gap-6 text-sm">
                              <div>
                                <span className="text-muted-foreground">Equipa: </span>
                                {(s.equipa ?? []).join(", ") || "Nenhum"}
                              </div>
                              {(s.materiais ?? []).length > 0 && (
                                <div>
                                  <span className="text-muted-foreground">Materiais: </span>
                                  {(s.materiais ?? []).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {entry.descricao && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Descrição</p>
                            <p className="text-sm whitespace-pre-line">{entry.descricao}</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground">Equipa</p>
                          <p className="text-sm">
                            {(entry.equipa ?? []).join(", ") || "Nenhum"}
                          </p>
                        </div>

                        {(entry.materiais ?? []).length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground">Materiais</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(entry.materiais ?? []).map((m, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(period === "weekly" || period === "monthly") && hasEntries && (
            <div className="mx-auto max-w-3xl space-y-6">
              {filteredEntries.map((entry) => (
                <Card key={entry.date} className="overflow-hidden shadow-md">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xl font-bold">{formatDateWithWeekday(entry.date, false)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.totalHoras ?? 0}h trabalhadas
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-lg px-5 py-2">
                        {formatCurrency((entry.totalHoras ?? 0) * data.settings.taxaHoraria)}
                      </Badge>
                    </div>

                    {entry.services && entry.services.length > 0 ? (
                      <div className="space-y-5">
                        {entry.services.map((s, idx) => (
                          <div key={s.id || idx} className="border-t pt-4 first:border-t-0 first:pt-0">
                            <p className="text-base font-semibold mb-2">
                              {s.obraNome || `Serviço ${idx + 1}`}
                            </p>
                            {s.descricao && (
                              <p className="text-sm whitespace-pre-line mb-3">{s.descricao}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground font-medium">Equipa: </span>
                                {(s.equipa ?? []).join(", ") || "Nenhum"}
                              </div>
                              {(s.materiais ?? []).length > 0 && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Materiais: </span>
                                  {(s.materiais ?? []).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {entry.descricao && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Descrição</p>
                            <p className="text-sm whitespace-pre-line">{entry.descricao}</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground">Equipa</p>
                          <p className="text-sm">
                            {(entry.equipa ?? []).join(", ") || "Nenhum"}
                          </p>
                        </div>

                        {(entry.materiais ?? []).length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-muted-foreground">Materiais</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(entry.materiais ?? []).map((m, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="mt-5 pt-4 border-t text-sm font-medium">
                      Total do dia: {entry.totalHoras ?? 0}h
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {hasEntries && (
            <div className="space-y-6 mx-auto max-w-3xl">
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
                    <p className="text-3xl font-bold text-destructive">{totals.totalExtras}h</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <Card className="w-full max-w-md bg-primary/5 border-primary/30">
                  <CardContent className="p-6 text-center">
                    <p className="text-primary text-sm mb-1">Valor Total do Período</p>
                    <p className="text-4xl font-bold text-primary">
                      {formatCurrency(totals.valorTotal)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {totals.totalHoras}h × {formatCurrency(data.settings.taxaHoraria)}/h
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center mt-8">
                <Button
                  onClick={exportPDF}
                  className="w-full max-w-md h-12 text-base"
                  size="lg"
                >
                  <FileDown className="h-5 w-5 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          )}

          {!hasEntries && (
            <div className="mx-auto max-w-md">
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum registo encontrado neste período
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}