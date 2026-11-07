// components/sub/sub-obra-card.tsx
"use client"
import { HardHat, MapPin, ChevronRight } from "lucide-react"
import { type SubObra, fmtEuro } from "@/lib/subempreiteiros-service"

export function SubObraCard({ obra, onClick, stats, compact }: { obra: SubObra; onClick?: () => void; stats?: { dias: number; horas: number; custo: number }; compact?: boolean }) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className="w-full text-left rounded-2xl border border-border/40 bg-card p-4 space-y-2 block active:scale-[0.99] transition-all">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <HardHat className="h-4 w-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">{obra.nome}</p>
          {obra.morada && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{obra.morada}</p>}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${obra.estado === "ativa" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
          {obra.estado === "ativa" ? "Ativa" : "Concluída"}
        </span>
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />}
      </div>
      {stats && (
        <p className="text-[11px] font-semibold text-muted-foreground">{stats.dias} dia(s) · {stats.horas} h · {fmtEuro(stats.custo)}</p>
      )}
      {!compact && obra.ordens && (
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Ordens</p>
          <p className="text-xs whitespace-pre-wrap">{obra.ordens}</p>
        </div>
      )}
    </Tag>
  )
}
