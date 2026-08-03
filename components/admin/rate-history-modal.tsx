// components/admin/rate-history-modal.tsx
"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X, FileText, History, TrendingUp, TrendingDown, Minus, Search } from "lucide-react"
import { cn, fmt } from "@/lib/utils"
import { useCollaborators } from "@/hooks/useCollaborators"

interface HistoryRow {
  collaborator: string
  taxa: number
  taxaAnterior: number | null
  data: string
  alteradoPor: string
  motivo?: string
  delta: number
}

function buildRows(collaborators: any[]): HistoryRow[] {
  const rows: HistoryRow[] = []
  collaborators.forEach(c => {
    const hist: any[] = c.rateHistory || []
    hist.forEach(h => {
      rows.push({
        collaborator: c.name,
        taxa:         h.taxa,
        taxaAnterior: h.taxaAnterior ?? null,
        data:         h.data || "",
        alteradoPor:  h.alteradoPor || "—",
        motivo:       h.motivo || "",
        delta:        h.taxaAnterior != null ? h.taxa - h.taxaAnterior : 0,
      })
    })
  })
  return rows.sort((a,b) => b.data.localeCompare(a.data))
}

async function exportPDF(rows: HistoryRow[], collaborators: any[]) {
  const { default: jsPDF }     = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })

  doc.setFontSize(18); doc.setFont("helvetica","bold")
  doc.text("JBricolage — Histórico de Taxas Horárias", 14, 18)
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-PT")} · ${rows.length} alterações registadas`, 14, 26)

  autoTable(doc, {
    startY: 32,
    head: [["Data","Colaborador","Taxa Anterior","Nova Taxa","Variação","Alterado Por","Motivo"]],
    body: rows.map(r => [
      r.data ? new Date(r.data).toLocaleDateString("pt-PT") : "—",
      r.collaborator,
      r.taxaAnterior != null ? `${(Number(r.taxaAnterior)||0).toFixed(2)}€/h` : "—",
      `${(Number(r.taxa)||0).toFixed(2)}€/h`,
      r.taxaAnterior != null ? (r.delta>=0?"+":"")+(Number(r.delta)||0).toFixed(2)+"€" : "Inicial",
      r.alteradoPor,
      r.motivo || "—",
    ]),
    styles:{ fontSize:8.5, cellPadding:2.5 },
    headStyles:{ fillColor:[30,41,59], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[248,250,252] },
    columnStyles:{
      0:{cellWidth:24},1:{cellWidth:40},2:{halign:"right",cellWidth:28},
      3:{halign:"right",cellWidth:24},4:{halign:"right",cellWidth:22},
      5:{cellWidth:34},6:{cellWidth:"auto" as any},
    },
    didParseCell:(data)=>{
      if(data.column.index===4&&data.section==="body") {
        const v=data.cell.text[0]
        if(v.startsWith("+")) data.cell.styles.textColor=[22,163,74]
        else if(v.startsWith("-")) data.cell.styles.textColor=[220,38,38]
      }
    },
  })

  // Summary per collaborator
  const finalY = (doc as any).lastAutoTable.finalY + 10
  if (finalY < 190) {
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(0)
    doc.text("Taxa Atual por Colaborador", 14, finalY)

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Colaborador","Taxa Atual","Nº Alterações"]],
      body: collaborators.filter(c=>c.ativo!==false&&c.currentRate>0).sort((a,b)=>b.currentRate-a.currentRate).map(c=>[
        c.name, `${(Number(c.currentRate)||0).toFixed(2)}€/h`, (c.rateHistory||[]).length,
      ]),
      styles:{ fontSize:9, cellPadding:2.5 },
      headStyles:{ fillColor:[15,23,42], textColor:255, fontStyle:"bold" },
      alternateRowStyles:{ fillColor:[248,250,252] },
      columnStyles:{ 1:{halign:"right"}, 2:{halign:"center"} },
    })
  }
  doc.save("historico-taxas.pdf")
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RateHistoryModal({ open, onClose, collaborators = [] }: { open: boolean; onClose: () => void; collaborators?: import("@/hooks/useCollaborators").Collaborator[] }) {
  const [search, setSearch]   = useState("")
  const [exporting, setExp]   = useState(false)

  const allRows = useMemo(() => buildRows(collaborators), [collaborators])

  const rows = useMemo(() => {
    if (!search.trim()) return allRows
    const q = search.toLowerCase()
    return allRows.filter(r =>
      r.collaborator.toLowerCase().includes(q) ||
      r.alteradoPor.toLowerCase().includes(q)  ||
      (r.motivo||"").toLowerCase().includes(q)
    )
  }, [allRows, search])

  async function doExport() {
    setExp(true)
    try { await exportPDF(allRows, collaborators) }
    finally { setExp(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v=>!v&&onClose()}>
      <DialogContent className={cn(
        "p-0 gap-0 border-0 shadow-2xl overflow-hidden flex flex-col [&>button]:hidden",
        "max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-full max-sm:max-h-full max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0",
        "sm:w-[780px] sm:max-w-[96vw] sm:max-h-[90dvh] sm:rounded-3xl",
      )}>
        <DialogTitle className="sr-only">Histórico de Taxas</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <History className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold">Histórico de Taxas</p>
              <p className="text-xs text-muted-foreground">{allRows.length} alterações registadas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Filtrar por colaborador, motivo…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/50 bg-muted/30 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {false ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : rows.length===0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <History className="h-10 w-10 opacity-15" />
              <p className="text-sm font-medium">{search ? "Sem resultados" : "Sem histórico de taxas"}</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                <tr className="border-b border-border/30">
                  {["Data","Colaborador","Anterior","Nova Taxa","Δ","Alterado Por","Motivo"].map(h=>(
                    <th key={h} className={cn(
                      "text-[11px] font-bold uppercase tracking-wide text-muted-foreground py-2.5 px-3",
                      h==="Data"||h==="Colaborador"||h==="Alterado Por"||h==="Motivo" ? "text-left" : "text-right",
                      h==="Data"&&"pl-5", h==="Motivo"&&"pr-5"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} className={cn("border-b border-border/15 hover:bg-muted/20",i%2===1&&"bg-muted/10")}>
                    <td className="py-2.5 pl-5 pr-3 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                      {r.data ? new Date(r.data).toLocaleDateString("pt-PT") : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{r.collaborator}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground text-[11px]">
                      {r.taxaAnterior != null ? `${(Number(r.taxaAnterior)||0).toFixed(2)}€/h` : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold">{(Number(r.taxa)||0).toFixed(2)}€/h</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {r.taxaAnterior == null ? (
                        <span className="text-[10px] text-muted-foreground/50">Inicial</span>
                      ) : r.delta > 0 ? (
                        <span className="flex items-center justify-end gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <TrendingUp className="h-3 w-3"/>+{(Number(r.delta)||0).toFixed(2)}€
                        </span>
                      ) : r.delta < 0 ? (
                        <span className="flex items-center justify-end gap-0.5 text-red-500 font-semibold text-[11px]">
                          <TrendingDown className="h-3 w-3"/>{(Number(r.delta)||0).toFixed(2)}€
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-0.5 text-muted-foreground/40 text-[11px]">
                          <Minus className="h-3 w-3"/>0€
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-muted-foreground">{r.alteradoPor}</td>
                    <td className="py-2.5 pl-3 pr-5 text-[11px] text-muted-foreground/60 max-w-[140px] truncate">{r.motivo||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t bg-background flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {rows.length} {search?"resultado":"alteração"}{rows.length!==1?"s":""}
          </p>
          <button onClick={doExport} disabled={exporting||allRows.length===0}
            className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-amber-600/20">
            <FileText className="h-4 w-4"/>
            {exporting ? "A exportar…" : "Exportar PDF"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
