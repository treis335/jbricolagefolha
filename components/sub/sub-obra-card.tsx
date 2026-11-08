// components/sub/sub-obra-card.tsx
// Cartão de obra (as mesmas obras dos colaboradores): foto, nome, morada, estado e totais.
"use client"
import { HardHat, MapPin, ChevronRight } from "lucide-react"
import { type Obra, formatMorada } from "@/lib/obras-service"
import { EstadoBadge } from "@/components/admin/obras/estado-badge"
import { fmtEuro } from "@/lib/subempreiteiros-service"

interface Props {
  obra: Obra
  ordens?: string
  stats?: { dias: number; horas: number; custo: number }
  onClick?: () => void
}

export function SubObraCard({ obra, ordens, stats, onClick }: Props) {
  const morada = formatMorada(obra)
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left rounded-2xl border border-border/40 bg-card p-3 flex gap-3 items-start active:scale-[0.99] transition-all">
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: `${obra.cor}22` }}>
        {obra.fotoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={obra.fotoUrl} alt="" className="w-full h-full object-cover" />
          : <HardHat className="h-6 w-6" style={{ color: obra.cor }} />}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm font-black leading-tight truncate">{obra.nome}</p>
          <EstadoBadge estado={obra.estado} size="xs" />
        </div>
        {morada && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{morada}</p>}
        {ordens && <p className="text-xs text-foreground/70 line-clamp-2">{ordens}</p>}
        {stats && <p className="text-[11px] font-semibold text-muted-foreground">{stats.dias} dia(s) · {stats.horas} h · {fmtEuro(stats.custo)}</p>}
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />}
    </button>
  )
}
