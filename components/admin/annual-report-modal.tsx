// components/admin/annual-report-modal.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, TrendingUp, Clock, Euro, Users } from "lucide-react"
import { cn, fmt } from "@/lib/utils"
import { useCollaborators } from "@/hooks/useCollaborators"
import { buildCollabMonthData, resolveEntryTaxaFull } from "@/lib/report-utils"

function currentYear() { return new Date().getFullYear() }

interface MonthSummary { month: string; label: string; horas: number; custo: number; pago: number; pendente: number; nAtivos: number }
interface CollabAnnual { name: string; totalH: number; totalCusto: number; totalPago: number; totalPend: number; meses: number }

function buildAnnualData(collaborators: any[], year: number) {
  const months: MonthSummary[] = Array.from({length:12},(_,i)=>{
    const m = String(i+1).padStart(2,"0")
    const key = `${year}-${m}`
    const label = new Date(year,i,1).toLocaleDateString("pt-PT",{month:"short"})
    return { month:key, label, horas:0, custo:0, pago:0, pendente:0, nAtivos:0 }
  })

  const collabs: CollabAnnual[] = []

  collaborators.filter(c=>c.ativo!==false).forEach(collab=>{
    const monthData = buildCollabMonthData(collab)
    let totalH=0, totalC=0, totalP=0, totalPend=0, mesesAtivos=0

    months.forEach(ms=>{
      const md = monthData.find(m=>m.periodo===ms.month)
      if (!md) return
      ms.horas    += md.hours
      ms.custo    += md.cost
      ms.pago     += md.paid
      ms.pendente += md.pending
      if (md.hours>0) { ms.nAtivos++; mesesAtivos++ }
      totalH    += md.hours
      totalC    += md.cost
      totalP    += md.paid
      totalPend += md.pending
    })

    if (totalH>0||totalP>0) collabs.push({ name:collab.name, totalH, totalCusto:totalC, totalPago:totalP, totalPend, meses:mesesAtivos })
  })

  collabs.sort((a,b)=>b.totalH-a.totalH)
  return { months, collabs }
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(months: MonthSummary[], collabs: CollabAnnual[], year: number) {
  const sep=";", n=(v:number)=>String(v).replace(".",",")
  const lines=[
    `Relatório Anual JBricolage${sep}${year}`,
    "",
    "RESUMO MENSAL",
    ["Mês","Horas","Custo (€)","Pago (€)","Pendente (€)","Colaboradores Ativos"].join(sep),
    ...months.filter(m=>m.horas>0||m.pago>0).map(m=>[m.label,n(m.horas),n(m.custo),n(m.pago),n(m.pendente),m.nAtivos].join(sep)),
    ["TOTAL","",n(months.reduce((s,m)=>s+m.horas,0)),n(months.reduce((s,m)=>s+m.custo,0)),n(months.reduce((s,m)=>s+m.pago,0)),n(months.reduce((s,m)=>s+m.pendente,0)),""].join(sep),
    "",
    "RANKING COLABORADORES",
    ["Colaborador","Total Horas","Custo Total (€)","Pago (€)","Pendente (€)","Meses Ativos"].join(sep),
    ...collabs.map(c=>[c.name,n(c.totalH),n(c.totalCusto),n(c.totalPago),n(c.totalPend),c.meses].join(sep)),
  ]
  const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8;"})
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob)
  a.download=`relatorio-anual-${year}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

// ── Export PDF ────────────────────────────────────────────────────────────────
async function exportPDF(months: MonthSummary[], collabs: CollabAnnual[], year: number) {
  const {default:jsPDF}=await import("jspdf")
  const {default:autoTable}=await import("jspdf-autotable")
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"})

  doc.setFontSize(18); doc.setFont("helvetica","bold")
  doc.text(`JBricolage — Relatório Anual ${year}`,14,18)
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-PT")}`,14,25)

  const activeMonths=months.filter(m=>m.horas>0||m.pago>0)
  autoTable(doc,{
    startY:30,
    head:[["Mês","Horas","Custo","Pago","Pendente","Ativos"]],
    body:[
      ...activeMonths.map(m=>[m.label,`${(Number(m.horas)||0).toFixed(1)}h`,`${(Number(m.custo)||0).toFixed(2)}€`,`${(Number(m.pago)||0).toFixed(2)}€`,`${(Number(m.pendente)||0).toFixed(2)}€`,m.nAtivos]),
      [{content:"TOTAL",styles:{fontStyle:"bold"}},"",
        {content:`${months.reduce((s,m)=>s+(Number(m.custo)||0),0).toFixed(2)}€`,styles:{fontStyle:"bold"}},
        {content:`${months.reduce((s,m)=>s+(Number(m.pago)||0),0).toFixed(2)}€`,styles:{fontStyle:"bold"}},
        {content:`${months.reduce((s,m)=>s+(Number(m.pendente)||0),0).toFixed(2)}€`,styles:{fontStyle:"bold"}},
        "",
      ],
    ],
    styles:{fontSize:9,cellPadding:2.5},
    headStyles:{fillColor:[30,41,59],textColor:255,fontStyle:"bold"},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"},4:{halign:"right"},5:{halign:"center"}},
  })

  const y2 = (doc as any).lastAutoTable.finalY+10
  doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(0)
  doc.text("Ranking de Colaboradores",14,y2)

  autoTable(doc,{
    startY:y2+5,
    head:[["Colaborador","Total Horas","Custo Total","Pago","Pendente","Meses Ativos"]],
    body:collabs.map(c=>[c.name,`${(Number(c.totalH)||0).toFixed(1)}h`,`${(Number(c.totalCusto)||0).toFixed(2)}€`,`${(Number(c.totalPago)||0).toFixed(2)}€`,`${(Number(c.totalPend)||0).toFixed(2)}€`,c.meses]),
    styles:{fontSize:9,cellPadding:2.5},
    headStyles:{fillColor:[15,23,42],textColor:255,fontStyle:"bold"},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"},4:{halign:"right"},5:{halign:"center"}},
  })
  doc.save(`relatorio-anual-${year}.pdf`)
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnnualReportModal({ open, onClose, collaborators = [] }: { open: boolean; onClose: () => void; collaborators?: import("@/hooks/useCollaborators").Collaborator[] }) {
  const [year, setYear]     = useState(currentYear)
  const [tab,  setTab]      = useState<"mensal"|"colaboradores">("mensal")
  const [exporting, setExp] = useState<"csv"|"pdf"|null>(null)
  useEffect(()=>{ if(open) setYear(currentYear()) },[open])

  const { months, collabs } = useMemo(()=>buildAnnualData(collaborators,year),[collaborators,year])

  const totals = useMemo(()=>({
    horas:    months.reduce((s,m)=>s+m.horas,0),
    custo:    months.reduce((s,m)=>s+m.custo,0),
    pago:     months.reduce((s,m)=>s+m.pago,0),
    pendente: months.reduce((s,m)=>s+m.pendente,0),
  }),[months])

  async function doExport(type:"csv"|"pdf") {
    setExp(type)
    try {
      if(type==="csv") exportCSV(months,collabs,year)
      else await exportPDF(months,collabs,year)
    } finally { setExp(null) }
  }

  const hasData = totals.horas>0||totals.pago>0

  return (
    <Dialog open={open} onOpenChange={v=>!v&&onClose()}>
      <DialogContent className={cn(
        "p-0 gap-0 border-0 shadow-2xl overflow-hidden flex flex-col [&>button]:hidden",
        "max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-full max-sm:max-h-full max-sm:rounded-none max-sm:translate-x-0 max-sm:translate-y-0",
        "sm:w-[860px] sm:max-w-[96vw] sm:max-h-[90dvh] sm:rounded-3xl",
      )}>
        <DialogTitle className="sr-only">Relatório Anual</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold">Relatório Anual</p>
              <p className="text-xs text-muted-foreground">Tendências e KPIs por mês</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Year nav */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20 shrink-0">
          <button onClick={()=>setYear(y=>y-1)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <p className="text-sm font-bold">{year}</p>
          <button onClick={()=>setYear(y=>y+1)} disabled={year>=currentYear()}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* KPIs */}
        {!false && hasData && (
          <div className="grid grid-cols-4 divide-x border-b shrink-0">
            {[
              {icon:Users,       label:"Colaboradores", value:`${collabs.length}`,          color:"text-foreground"},
              {icon:Clock,       label:"Horas Anuais",  value:`${(Number(totals.horas)||0).toFixed(1)}h`,color:"text-blue-600 dark:text-blue-400"},
              {icon:Euro,        label:"Custo Total",   value:fmt(totals.custo),             color:"text-violet-600 dark:text-violet-400"},
              {icon:TrendingUp,  label:"Pendente",      value:fmt(totals.pendente),          color:totals.pendente>0?"text-amber-600 dark:text-amber-400":"text-emerald-600 dark:text-emerald-400"},
            ].map(({icon:Icon,label,value,color})=>(
              <div key={label} className="px-3 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">{label}</p>
                <p className={cn("text-sm font-bold tabular-nums truncate",color)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b shrink-0 px-5">
          {(["mensal","colaboradores"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={cn("py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors capitalize",
                t===tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t==="mensal" ? "Por Mês" : "Por Colaborador"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {false ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <TrendingUp className="h-10 w-10 opacity-15" />
              <p className="text-sm font-medium">Sem dados para {year}</p>
            </div>
          ) : tab==="mensal" ? (
            <table className="w-full text-sm min-w-[500px]">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                <tr className="border-b border-border/30">
                  {["Mês","Horas","Custo","Pago","Pendente","Ativos"].map(h=>(
                    <th key={h} className={cn("text-[11px] font-bold uppercase tracking-wide text-muted-foreground py-2.5 px-3",
                      h==="Mês"?"text-left pl-5":"text-right",h==="Ativos"&&"pr-5")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m,i)=>(
                  <tr key={m.month} className={cn("border-b border-border/15 hover:bg-muted/20",
                    i%2===1&&"bg-muted/10", m.horas===0&&m.pago===0&&"opacity-30")}>
                    <td className="py-2.5 pl-5 pr-3 font-semibold capitalize">{m.label}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{m.horas>0?`${(Number(m.horas)||0).toFixed(1)}h`:"—"}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-violet-600 dark:text-violet-400">{m.custo>0?fmt(m.custo):"—"}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{m.pago>0?fmt(m.pago):"—"}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {m.pendente>0
                        ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{fmt(m.pendente)}</span>
                        : m.custo>0 ? <span className="text-emerald-500 text-xs">✓ Pago</span> : "—"}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right tabular-nums text-muted-foreground">{m.nAtivos>0?m.nAtivos:"—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/40 bg-muted/30">
                  <td className="py-3 pl-5 pr-3 text-xs font-bold uppercase text-muted-foreground">Total</td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums">{(Number(totals.horas)||0).toFixed(1)}h</td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums text-violet-600 dark:text-violet-400">{fmt(totals.custo)}</td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(totals.pago)}</td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmt(totals.pendente)}</td>
                  <td className="py-3 pl-3 pr-5 text-right font-bold tabular-nums text-muted-foreground">{collabs.length}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[500px]">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                <tr className="border-b border-border/30">
                  {["#","Colaborador","Total Horas","Custo Total","Pago","Pendente","Meses Ativos"].map(h=>(
                    <th key={h} className={cn("text-[11px] font-bold uppercase tracking-wide text-muted-foreground py-2.5 px-3",
                      h==="Colaborador"||h==="#"?"text-left":h==="Meses Ativos"?"text-right pr-5":"text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collabs.map((c,i)=>(
                  <tr key={c.name} className={cn("border-b border-border/15 hover:bg-muted/20",i%2===1&&"bg-muted/10")}>
                    <td className="py-2.5 pl-5 pr-2 text-muted-foreground/40 text-xs font-bold tabular-nums">{i+1}</td>
                    <td className="py-2.5 pr-3 font-semibold">{c.name}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">{(Number(c.totalH)||0).toFixed(1)}h</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-violet-600 dark:text-violet-400">{fmt(c.totalCusto)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(c.totalPago)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {c.totalPend>0
                        ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{fmt(c.totalPend)}</span>
                        : <span className="text-emerald-500 text-xs">✓</span>}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right tabular-nums text-muted-foreground">{c.meses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {hasData && (
          <div className="shrink-0 px-5 py-4 border-t bg-background flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground hidden sm:block">{year} · {collabs.length} colaboradores</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={()=>doExport("csv")} disabled={!!exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20">
                <FileSpreadsheet className="h-4 w-4"/>
                {exporting==="csv"?"A exportar…":"Excel (.csv)"}
              </button>
              <button onClick={()=>doExport("pdf")} disabled={!!exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-blue-600/20">
                <FileText className="h-4 w-4"/>
                {exporting==="pdf"?"A exportar…":"PDF"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
