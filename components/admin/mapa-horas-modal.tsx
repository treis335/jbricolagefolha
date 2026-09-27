// components/admin/mapa-horas-modal.tsx
"use client"

import { useMemo, useState } from "react"
import { X, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn, fmt, resolveEntryTaxa } from "@/lib/utils"
import type { Collaborator } from "@/hooks/useCollaborators"

interface Props {
  open: boolean
  onClose: () => void
  collaborators?: Collaborator[]
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay()
  return dow === 0 || dow === 6
}

export function MapaHorasModal({ open, onClose, collaborators = [] }: Props) {
  const hoje = new Date()
  const [year, setYear] = useState(hoje.getFullYear())
  const [month, setMonth] = useState(hoje.getMonth()) // 0-indexado
  const [exportando, setExportando] = useState(false)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dias = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

  const dadosPorColaborador = useMemo(() => {
    return collaborators
      .filter(c => c.ativo !== false)
      .map(c => {
        const horasPorDia = new Map<number, number>()
        let totalHoras = 0
        let totalReceber = 0
        ;(c.entries || []).forEach((e: any) => {
          if (!e?.date) return
          const [y, m, d] = e.date.split("-").map(Number)
          if (y === year && m - 1 === month) {
            const h = e.totalHoras || 0
            horasPorDia.set(d, (horasPorDia.get(d) || 0) + h)
            totalHoras += h
            totalReceber += h * resolveEntryTaxa(e, c.currentRate)
          }
        })
        return { id: c.id, nome: c.name, taxa: c.currentRate, horasPorDia, totalHoras, totalReceber }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [collaborators, year, month])

  const totaisGerais = dadosPorColaborador.reduce(
    (acc, c) => ({ horas: acc.horas + c.totalHoras, receber: acc.receber + c.totalReceber }),
    { horas: 0, receber: 0 }
  )

  function mudarMes(delta: number) {
    let m = month + delta, y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  async function handleExportExcel() {
    setExportando(true)
    try {
      const XLSX = await import("xlsx")
      const titulo = `JBRICOLAGE | FOLHA MENSAL DE HORAS — ${monthLabel(year, month).toUpperCase()}`
      const header = ["TRABALHADOR", "€/H", ...dias.map(String), "TOTAL HORAS", "A RECEBER"]
      const rows = dadosPorColaborador.map(c => [
        c.nome,
        c.taxa,
        ...dias.map(d => c.horasPorDia.get(d) ?? ""),
        Number(c.totalHoras.toFixed(1)),
        Number(c.totalReceber.toFixed(2)),
      ])
      const totaisRow = ["TOTAIS", "", ...dias.map(() => ""), Number(totaisGerais.horas.toFixed(1)), Number(totaisGerais.receber.toFixed(2))]

      const ws = XLSX.utils.aoa_to_sheet([[titulo], [], header, ...rows, [], totaisRow])
      ws["!cols"] = [{ wch: 22 }, { wch: 7 }, ...dias.map(() => ({ wch: 4 })), { wch: 13 }, { wch: 13 }]
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, monthLabel(year, month).replace(/[^\w\s]/g, "").slice(0, 28))
      XLSX.writeFile(wb, `folha-horas-${year}-${String(month + 1).padStart(2, "0")}.xlsx`)
    } catch (err) {
      console.error("[MapaHoras] erro ao exportar:", err)
    } finally {
      setExportando(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-[96vw] max-h-[92dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => mudarMes(-1)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-black capitalize w-36 sm:w-44 text-center truncate">{monthLabel(year, month)}</p>
            <button onClick={() => mudarMes(1)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={exportando}
              className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Excel
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grelha */}
        <div className="flex-1 overflow-auto">
          {dadosPorColaborador.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Sem colaboradores ativos com registos este mês.</div>
          ) : (
            <table className="border-collapse text-xs w-max min-w-full">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-800 dark:bg-slate-900 text-white">
                  <th className="sticky left-0 z-30 bg-slate-800 dark:bg-slate-900 px-3 py-2.5 text-left font-bold min-w-[130px] whitespace-nowrap">
                    Trabalhador
                  </th>
                  <th className="px-2 py-2.5 font-bold whitespace-nowrap">€/H</th>
                  {dias.map(d => (
                    <th key={d} className={cn("px-1.5 py-2.5 font-semibold w-8 text-center", isWeekend(year, month, d) && "bg-slate-700 dark:bg-slate-800")}>
                      {d}
                    </th>
                  ))}
                  <th className="px-2.5 py-2.5 font-bold whitespace-nowrap">Total Horas</th>
                  <th className="px-2.5 py-2.5 font-bold whitespace-nowrap">A Receber</th>
                </tr>
              </thead>
              <tbody>
                {dadosPorColaborador.map((c, i) => (
                  <tr key={c.id} className={cn(i % 2 === 1 && "bg-muted/30")}>
                    <td className={cn("sticky left-0 z-10 px-3 py-1.5 font-semibold whitespace-nowrap border-r border-border/40", i % 2 === 1 ? "bg-muted/30" : "bg-card")}>
                      {c.nome}
                    </td>
                    <td className="px-2 py-1.5 text-center text-muted-foreground whitespace-nowrap">{c.taxa}€</td>
                    {dias.map(d => {
                      const h = c.horasPorDia.get(d)
                      return (
                        <td
                          key={d}
                          className={cn(
                            "px-1 py-1.5 text-center tabular-nums",
                            isWeekend(year, month, d) && "bg-muted/40",
                            !h && "text-muted-foreground/25"
                          )}
                        >
                          {h ? h : "–"}
                        </td>
                      )
                    })}
                    <td className="px-2.5 py-1.5 text-center font-bold tabular-nums">{c.totalHoras.toFixed(1)}</td>
                    <td className="px-2.5 py-1.5 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      {fmt(c.totalReceber)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-black bg-muted/60">
                  <td className="sticky left-0 z-10 bg-muted/60 px-3 py-2.5 whitespace-nowrap">TOTAIS</td>
                  <td />
                  {dias.map(d => <td key={d} />)}
                  <td className="px-2.5 py-2.5 text-center tabular-nums">{totaisGerais.horas.toFixed(1)}</td>
                  <td className="px-2.5 py-2.5 text-center text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                    {fmt(totaisGerais.receber)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
