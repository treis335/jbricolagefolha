// components/admin/performance-report-modal.tsx
"use client"

import { useState, useMemo } from "react"
import { X, Download, TrendingUp, TrendingDown, Minus, FileBarChart } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Collaborator } from "@/hooks/useCollaborators"
import { resolveEntryTaxa } from "@/lib/utils"

interface Props { open: boolean; onClose: () => void; collaborators?: Collaborator[] }

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function mkKey(y: number, m: number) {
  return `${y}-${String(m+1).padStart(2,"0")}`
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers,...rows].map(r=>r.map(c=>`"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n")
  const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv"}))
  a.download=filename; a.click()
}

const GRADS = ["from-blue-500 to-indigo-600","from-emerald-500 to-teal-600","from-violet-500 to-purple-600","from-orange-500 to-amber-500","from-pink-500 to-rose-600","from-cyan-500 to-sky-600"]
function Av({ name }: { name: string }) {
  const i = name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()
  const g = GRADS[name.charCodeAt(0) % GRADS.length]
  return <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm",g)}>{i}</div>
}

export function PerformanceReportModal({ open, onClose, collaborators = [] }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())

  const data = useMemo(() => {
    return collaborators.filter(c => c.ativo !== false).map(c => {
      const months = Array.from({length:12},(_,mi) => {
        const key = mkKey(year, mi)
        const entries = c.entries.filter(e => e.date?.startsWith(key))
        const horas = entries.reduce((s,e)=>s+(e.totalHoras||0),0)
        const custo = entries.reduce((s,e)=>s+(e.totalHoras||0)*resolveEntryTaxa(e,c.currentRate),0)
        return { horas, custo, dias: entries.length }
      })
      const totH = months.reduce((s,m)=>s+m.horas,0)
      const totC = months.reduce((s,m)=>s+m.custo,0)
      const avgH = months.filter(m=>m.horas>0).length > 0
        ? totH / months.filter(m=>m.horas>0).length : 0

      // compare H1 vs H2
      const h1 = months.slice(0,6).reduce((s,m)=>s+m.horas,0)
      const h2 = months.slice(6).reduce((s,m)=>s+m.horas,0)
      const trend = h2 > h1*1.05 ? "up" : h2 < h1*0.95 ? "down" : "flat"

      return { collab: c, months, totH, totC, avgH, trend }
    }).sort((a,b) => b.totH - a.totH)
  }, [collaborators, year])

  const maxH = Math.max(...data.flatMap(d => d.months.map(m=>m.horas)), 1)

  const handleCSV = () => downloadCSV(`performance-${year}.csv`,
    ["Colaborador",...MONTHS.map(m=>`${m} H`),...MONTHS.map(m=>`${m} €`),"Total H","Total €","Méd. H/mês"],
    data.map(d=>[d.collab.name,...d.months.map(m=>m.horas.toFixed(1)),...d.months.map(m=>m.custo.toFixed(2)),d.totH.toFixed(1),d.totC.toFixed(2),d.avgH.toFixed(1)])
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0">
          <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-muted-foreground/20" /></div>
          <div className="flex items-center gap-2 px-4 pt-2 pb-3 sm:pt-4 border-b border-border/30">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
              <FileBarChart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            {/* Year nav */}
            <button onClick={()=>setYear(y=>y-1)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors active:scale-90">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-muted-foreground/60"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-sm font-black">{year}</span>
            <button onClick={()=>setYear(y=>y+1)} disabled={year>=now.getFullYear()} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/70 disabled:opacity-25 transition-colors active:scale-90">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-muted-foreground/60"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <p className="text-sm font-black text-muted-foreground/30 hidden sm:block flex-1">Performance</p>
            <div className="flex-1 sm:flex-none"/>
            <button onClick={handleCSV} disabled={!data.length}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border/50 text-xs font-semibold text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-all active:scale-95">
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors">
              <X className="h-4 w-4 text-muted-foreground/60" />
            </button>
          </div>

          {/* Month labels */}
          <div className="grid grid-cols-12 px-4 py-1.5 border-b border-border/20 bg-muted/5">
            {MONTHS.map(m => (
              <div key={m} className="flex justify-center">
                <span className="text-[9px] font-bold text-muted-foreground/30">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
              <FileBarChart className="h-8 w-8 text-muted-foreground/15" />
              <p className="text-sm font-semibold text-muted-foreground/40">Sem dados para {year}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/15">
              {data.map((d, idx) => (
                <div key={d.collab.id} className="px-4 py-3 hover:bg-muted/8 transition-colors">
                  {/* Collab header */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="text-[11px] font-black text-muted-foreground/25 tabular-nums w-4 text-right shrink-0">#{idx+1}</span>
                    <Av name={d.collab.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate">{d.collab.name}</p>
                      <p className="text-[10px] text-muted-foreground/40 tabular-nums">{d.totH.toFixed(0)}h total · {d.totC.toFixed(0)}€ · {d.avgH.toFixed(1)}h/mês</p>
                    </div>
                    <div className="shrink-0">
                      {d.trend === "up"   && <TrendingUp   className="h-4 w-4 text-emerald-500" />}
                      {d.trend === "down" && <TrendingDown className="h-4 w-4 text-red-400" />}
                      {d.trend === "flat" && <Minus        className="h-4 w-4 text-muted-foreground/25" />}
                    </div>
                  </div>

                  {/* Monthly bars */}
                  <div className="grid grid-cols-12 gap-0.5 ml-9">
                    {d.months.map((m, mi) => {
                      const pct = maxH > 0 ? (m.horas/maxH)*100 : 0
                      return (
                        <div key={mi} className="flex flex-col items-center group" title={`${MONTHS[mi]}: ${m.horas.toFixed(1)}h`}>
                          <div className="w-full flex flex-col justify-end" style={{height:32}}>
                            <div
                              className={cn("w-full rounded-t-sm transition-all",
                                m.horas > 0 ? "bg-rose-400/70 dark:bg-rose-500/50" : "bg-muted/20"
                              )}
                              style={{ height: `${Math.max(m.horas>0?6:0, pct*0.32)}px` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
