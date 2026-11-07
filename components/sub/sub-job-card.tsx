// components/sub/sub-job-card.tsx
"use client"
import { HardHat, ChevronRight } from "lucide-react"
import { type SubJob, SUB_STATUS_LABELS, calcEquipa, fmtEuro } from "@/lib/subempreiteiros-service"

const STATUS_CLS: Record<SubJob["status"], string> = {
  atribuido: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  em_curso: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  concluido: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
}

export const fmtDia = (iso: string) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : ""

export function SubJobCard({ job, onClick, showEmpresa }: { job: SubJob; onClick: () => void; showEmpresa?: boolean }) {
  const fotos = job.fotos ?? []
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left rounded-2xl border border-border/40 bg-card p-4 space-y-2.5 active:scale-[0.99] transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight truncate">{job.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
            <HardHat className="h-3 w-3 shrink-0 text-orange-500/70" />{job.obraNome}
            {showEmpresa && job.empresaNome ? <span className="opacity-60">· {job.empresaNome}</span> : null}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{fmtDia(job.date)}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLS[job.status]}`}>
          {SUB_STATUS_LABELS[job.status]}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
      </div>
      {(job.equipa?.length ?? 0) > 0 && (() => {
        const t = calcEquipa(job.equipa)
        return <p className="text-[11px] font-semibold text-muted-foreground">{t.homens} homem(ns) · {t.horasHomem} h · {fmtEuro(t.custo)}</p>
      })()}
      {job.descricao ? <p className="text-xs text-muted-foreground/80 line-clamp-2">{job.descricao}</p> : null}
      {fotos.length > 0 && (
        <div className="flex gap-1.5 overflow-hidden">
          {fotos.slice(0, 5).map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={f.url} alt={f.tipo} className="w-12 h-12 rounded-lg object-cover bg-muted" />
          ))}
          {fotos.length > 5 && (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{fotos.length - 5}</div>
          )}
        </div>
      )}
    </button>
  )
}
