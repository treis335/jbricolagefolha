// components/admin/hours-report-modal.tsx
"use client"

import { useState, useMemo } from "react"
import { X, Download, ChevronLeft, ChevronRight, Search, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Collaborator } from "@/hooks/useCollaborators"
import { resolveEntryTaxa } from "@/lib/utils"

interface Props { open: boolean; onClose: () => void; collaborators?: Collaborator[] }

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function nowMonthStart() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`
}

function nowMonthEnd() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0)
  return toKey(d)
}

const fmtDate = (s: string) => new Date(s+"T00:00:00").toLocaleDateString("pt-PT",{day:"2-digit",month:"short",year:"numeric"})

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n")
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv"}))
  a.download = filename; a.click()
}

export function HoursReportModal({ open, onClose, collaborators = [] }: Props) {
  const [dateFrom, setDateFrom] = useState(nowMonthStart)
  const [dateTo,   setDateTo]   = useState(nowMonthEnd)
  const [search,   setSearch]   = useState("")

  const rows = useMemo(() => {
    const out: { collab: string; date: string; normal: number; extra: number; total: number; obra: string; taxa: number; valor: number }[] = []
    collaborators.filter(c => c.ativo !== false).forEach(c => {
      c.entries.filter(e => e.date >= dateFrom && e.date <= dateTo).forEach(e => {
        const taxa = resolveEntryTaxa(e, c.currentRate)
        out.push({
          collab: c.name, date: e.date,
          normal: e.normalHoras||0, extra: e.extraHoras||0, total: e.totalHoras||0,
          obra: (e.services?.[0]?.obraNome || e.descricao || "").slice(0,40),
          taxa, valor: (e.totalHoras||0)*taxa,
        })
      })
    })
    return out.sort((a,b) => b.date.localeCompare(a.date))
      .filter(r => !search || r.collab.toLowerCase().includes(search.toLowerCase()) || r.obra.toLowerCase().includes(search.toLowerCase()))
  }, [collaborators, dateFrom, dateTo, search])

  const totH = rows.reduce((s,r)=>s+r.total,0)
  const totV = rows.reduce((s,r)=>s+r.valor,0)

  const handleCSV = () => downloadCSV(`horas-${dateFrom}-${dateTo}.csv`,
    ["Colaborador","Data","H.Normais","H.Extra","H.Total","Obra","Taxa €/h","Valor €"],
    rows.map(r=>[r.collab,r.date,r.normal.toFixed(1),r.extra.toFixed(1),r.total.toFixed(1),r.obra,r.taxa.toFixed(2),r.valor.toFixed(2)])
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
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-black flex-1">Relatório de Horas</p>
            <button onClick={handleCSV} disabled={!rows.length}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border/50 text-xs font-semibold text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-all active:scale-95">
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors">
              <X className="h-4 w-4 text-muted-foreground/60" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-border/20 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-1">De</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-1">Até</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/35" />
              <input type="text" placeholder="Filtrar por nome ou obra…" value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/50 bg-muted/20 text-sm placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 divide-x divide-border/25 border-b border-border/20 bg-muted/5">
            <div className="flex flex-col items-center py-3">
              <span className="text-base font-black text-blue-600 dark:text-blue-400">{rows.length}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/35 mt-0.5">Entradas</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{totH.toFixed(1)}h</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/35 mt-0.5">Horas</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <span className="text-base font-black text-violet-600 dark:text-violet-400">{totV.toFixed(0)}€</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/35 mt-0.5">Valor</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
              <Clock className="h-8 w-8 text-muted-foreground/15" />
              <p className="text-sm font-semibold text-muted-foreground/40">Sem entradas neste período</p>
            </div>
          ) : (
            <div className="divide-y divide-border/15">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold">{r.collab}</span>
                      <span className="text-[10px] text-muted-foreground/40">{fmtDate(r.date)}</span>
                    </div>
                    {r.obra && <p className="text-[11px] text-muted-foreground/50 truncate">{r.obra}</p>}
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className={cn("text-xs font-black tabular-nums", r.extra > 0 ? "text-orange-500" : "text-blue-600 dark:text-blue-400")}>{r.total.toFixed(1)}h</p>
                    <p className="text-[10px] text-muted-foreground/40 tabular-nums">{r.valor.toFixed(2)}€</p>
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
