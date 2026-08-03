// components/admin/monthly-report-modal.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Clock, Euro, CheckCircle2, AlertCircle, Users } from "lucide-react"
import { cn, fmt } from "@/lib/utils"
import { useCollaborators } from "@/hooks/useCollaborators"
import { buildMonthRows, type MonthRow } from "@/lib/report-utils"

function getTodayKey() { return new Date().toISOString().slice(0, 7) }
function fmtLabel(key: string) {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m-1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
}

function exportCSV(rows: MonthRow[], monthKey: string, label: string) {
  const sep = ";", n = (v: number) => String(v).replace(".", ",")
  const esc = (v: string|number) => { const s=String(v); return (s.includes(sep)||s.includes('"'))?`"${s.replace(/"/g,'""')}"`:s }
  const lines = [
    `Relatório Mensal JBricolage${sep}${label}`, "",
    ["Colaborador","Email","Taxa €/h","H. Normais","H. Extra","Total Horas","Custo (€)","Pago (€)","Pendente (€)"].map(esc).join(sep),
    ...rows.map(r=>[esc(r.name),esc(r.email),n(r.rate),n(r.normalHoras),n(r.extraHoras),n(r.totalHoras),n(r.custo),n(r.pago),n(r.pendente)].join(sep)),
    "",
    ["TOTAL","","",n(rows.reduce((s,r)=>s+r.normalHoras,0)),n(rows.reduce((s,r)=>s+r.extraHoras,0)),n(rows.reduce((s,r)=>s+r.totalHoras,0)),n(rows.reduce((s,r)=>s+r.custo,0)),n(rows.reduce((s,r)=>s+r.pago,0)),n(rows.reduce((s,r)=>s+r.pendente,0))].join(sep),
  ]
  const blob = new Blob(["\uFEFF"+lines.join("\r\n")], { type:"text/csv;charset=utf-8;" })
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`relatorio-mensal-${monthKey}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

async function exportPDF(rows: MonthRow[], monthKey: string, label: string) {
  const { default: jsPDF }     = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  doc.setFontSize(18); doc.setFont("helvetica","bold"); doc.text("JBricolage — Relatório Mensal", 14, 18)
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100)
  doc.text(`Período: ${label}`, 14, 26); doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-PT")}`, 14, 31)
  const totH=rows.reduce((s,r)=>s+r.totalHoras,0), totC=rows.reduce((s,r)=>s+r.custo,0), totP=rows.reduce((s,r)=>s+r.pago,0), totPend=rows.reduce((s,r)=>s+r.pendente,0)
  doc.setTextColor(0); doc.setFontSize(9)
  doc.text(`${rows.length} colaboradores · ${(Number(totH)||0).toFixed(1)}h · Custo: ${(Number(totC)||0).toFixed(2)}€ · Pago: ${(Number(totP)||0).toFixed(2)}€ · Pendente: ${(Number(totPend)||0).toFixed(2)}€`, 14, 38)
  autoTable(doc, {
    startY:44,
    head:[["Colaborador","Taxa €/h","H. Norm.","H. Extra","Total H.","Custo","Pago","Pendente"]],
    body:[
      ...rows.map(r=>[r.name,`${(Number(r.rate)||0).toFixed(2)}€`,`${(Number(r.normalHoras)||0).toFixed(1)}h`,`${(Number(r.extraHoras)||0).toFixed(1)}h`,`${(Number(r.totalHoras)||0).toFixed(1)}h`,`${(Number(r.custo)||0).toFixed(2)}€`,`${(Number(r.pago)||0).toFixed(2)}€`,`${(Number(r.pendente)||0).toFixed(2)}€`]),
      [{content:"TOTAL",styles:{fontStyle:"bold"}},"",{content:`${rows.reduce((s,r)=>s+(Number(r.normalHoras)||0),0).toFixed(1)}h`,styles:{fontStyle:"bold"}},{content:`${rows.reduce((s,r)=>s+(Number(r.extraHoras)||0),0).toFixed(1)}h`,styles:{fontStyle:"bold"}},{content:`${totH.toFixed(1)}h`,styles:{fontStyle:"bold"}},{content:`${totC.toFixed(2)}€`,styles:{fontStyle:"bold"}},{content:`${totP.toFixed(2)}€`,styles:{fontStyle:"bold"}},{content:`${totPend.toFixed(2)}€`,styles:{fontStyle:"bold"}}],
    ],
    styles:{fontSize:9,cellPadding:2.5},headStyles:{fillColor:[30,41,59],textColor:255,fontStyle:"bold"},alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{0:{cellWidth:48},1:{halign:"right"},2:{halign:"right"},3:{halign:"right"},4:{halign:"right"},5:{halign:"right"},6:{halign:"right"},7:{halign:"right"}},
    didParseCell:(data)=>{ if(data.column.index===7&&data.section==="body"&&data.row.index<rows.length&&(rows[data.row.index]?.pendente??0)>0) data.cell.styles.textColor=[180,83,9] },
  })
  doc.save(`relatorio-mensal-${monthKey}.pdf`)
}

export function MonthlyReportModal({ open, onClose, collaborators = [] }: { open: boolean; onClose: () => void; collaborators?: import("@/hooks/useCollaborators").Collaborator[] }) {
  const [monthKey, setMonthKey]   = useState(getTodayKey)
  const [exporting, setExporting] = useState<"csv"|"pdf"|null>(null)
  useEffect(()=>{ if(open) setMonthKey(getTodayKey()) },[open])

  const rows  = useMemo(()=>buildMonthRows(collaborators,monthKey),[collaborators,monthKey])
  const label = fmtLabel(monthKey)

  const totals = useMemo(()=>({
    horas:    rows.reduce((s,r)=>s+r.totalHoras,0),
    custo:    rows.reduce((s,r)=>s+r.custo,0),
    pago:     rows.reduce((s,r)=>s+r.pago,0),
    pendente: rows.reduce((s,r)=>s+r.pendente,0),
  }),[rows])

  function nav(dir: 1|-1) {
    const [y,m] = monthKey.split("-").map(Number)
    const d = new Date(y,m-1+dir,1)
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)
  }

  async function doExport(type:"csv"|"pdf") {
    setExporting(type)
    try { if(type==="csv") exportCSV(rows,monthKey,label); else await exportPDF(rows,monthKey,label) }
    finally { setExporting(null) }
  }

  return (
    <Dialog open={open} onOpenChange={v=>!v&&onClose()}>
      <DialogContent className={cn(
        "p-0 gap-0 border-0 shadow-2xl overflow-hidden flex flex-col [&>button]:hidden",
        "max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-full max-sm:max-h-full max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0",
        "sm:w-[820px] sm:max-w-[96vw] sm:max-h-[90dvh] sm:rounded-3xl",
      )}>
        <DialogTitle className="sr-only">Relatório Mensal</DialogTitle>

        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold">Relatório Mensal</p>
              <p className="text-xs text-muted-foreground">Taxa histórica · Pendente real</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20 shrink-0">
          <button onClick={()=>nav(-1)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <p className="text-sm font-bold capitalize">{label}</p>
          <button onClick={()=>nav(1)} disabled={monthKey>=getTodayKey()}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {!false && rows.length>0 && (
          <div className="grid grid-cols-4 divide-x border-b shrink-0">
            {[
              {icon:Users,       label:"Ativos",   value:`${rows.length}`,             color:"text-foreground"},
              {icon:Clock,       label:"Horas",    value:`${(Number(totals.horas)||0).toFixed(1)}h`,color:"text-blue-600 dark:text-blue-400"},
              {icon:Euro,        label:"Custo",    value:fmt(totals.custo),             color:"text-violet-600 dark:text-violet-400"},
              {icon:AlertCircle, label:"Pendente", value:fmt(totals.pendente),          color:totals.pendente>0?"text-amber-600 dark:text-amber-400":"text-emerald-600 dark:text-emerald-400"},
            ].map(({icon:Icon,label,value,color})=>(
              <div key={label} className="px-3 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">{label}</p>
                <p className={cn("text-sm font-bold tabular-nums truncate",color)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {false ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : rows.length===0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Clock className="h-10 w-10 opacity-15" />
              <p className="text-sm font-medium">Sem registos para {label}</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                <tr className="border-b border-border/30">
                  {["Colaborador","Taxa","H. Norm.","H. Extra","Total H.","Custo","Pago","Pendente"].map(h=>(
                    <th key={h} className={cn("text-[11px] font-bold uppercase tracking-wide text-muted-foreground py-2.5 px-3",h==="Colaborador"?"text-left pl-5":"text-right",h==="Pendente"&&"pr-5")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={r.email} className={cn("border-b border-border/15 hover:bg-muted/20",i%2===1&&"bg-muted/10")}>
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-semibold text-sm">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{r.email}</p>
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-muted-foreground tabular-nums">{(Number(r.rate)||0).toFixed(2)}€</td>
                    <td className="py-3 px-3 text-right tabular-nums font-medium">{(Number(r.normalHoras)||0).toFixed(1)}h</td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.extraHoras>0?<span className="text-amber-600 dark:text-amber-400 font-medium">{(Number(r.extraHoras)||0).toFixed(1)}h</span>:<span className="text-muted-foreground/30">—</span>}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">{(Number(r.totalHoras)||0).toFixed(1)}h</td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-violet-600 dark:text-violet-400">{fmt(r.custo)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.pago>0?<span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(r.pago)}</span>:<span className="text-muted-foreground/30">—</span>}</td>
                    <td className="py-3 pl-3 pr-5 text-right tabular-nums">
                      {r.pendente>0
                        ?<span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400"><AlertCircle className="h-3 w-3"/>{fmt(r.pendente)}</span>
                        :<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"><CheckCircle2 className="h-3 w-3"/>Pago</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/40 bg-muted/30">
                  <td className="py-3 pl-5 pr-3 text-xs font-bold uppercase tracking-wide text-muted-foreground" colSpan={2}>Total</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold">{rows.reduce((s,r)=>s+(Number(r.normalHoras)||0),0).toFixed(1)}h</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">{rows.reduce((s,r)=>s+(Number(r.extraHoras)||0),0).toFixed(1)}h</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold">{(Number(totals.horas)||0).toFixed(1)}h</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-violet-600 dark:text-violet-400">{fmt(totals.custo)}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.pago)}</td>
                  <td className="py-3 pl-3 pr-5 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">{fmt(totals.pendente)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {rows.length>0 && (
          <div className="shrink-0 px-5 py-4 border-t bg-background flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground hidden sm:block">{rows.length} colaborador{rows.length!==1?"es":""} · {label}</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={()=>doExport("csv")} disabled={!!exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20">
                <FileSpreadsheet className="h-4 w-4"/>{exporting==="csv"?"A exportar…":"Excel (.csv)"}
              </button>
              <button onClick={()=>doExport("pdf")} disabled={!!exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-blue-600/20">
                <FileText className="h-4 w-4"/>{exporting==="pdf"?"A exportar…":"PDF"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
