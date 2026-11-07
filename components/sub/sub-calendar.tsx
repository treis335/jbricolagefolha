// components/sub/sub-calendar.tsx
// Calendário mensal do subempreiteiro: toca num dia para registar equipa + horas. Mostra custos do mês.
"use client"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { type SubDia, type SubObra, type SubMembro, fmtEuro } from "@/lib/subempreiteiros-service"
import { SubDaySheet } from "./sub-day-sheet"

interface Props {
  subUid: string
  empresaNome: string
  obras: SubObra[]
  equipa: SubMembro[]
  dias: SubDia[]
  onChanged: () => void
}

const pad = (n: number) => String(n).padStart(2, "0")
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"]

export function SubCalendar({ subUid, empresaNome, obras, equipa, dias, onChanged }: Props) {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const mapa = useMemo(() => new Map(dias.map(d => [d.date, d])), [dias])
  const hojeKey = key(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  const primeiro = new Date(ano, mes, 1)
  const offset = (primeiro.getDay() + 6) % 7 // segunda = 0
  const nDias = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: nDias }, (_, i) => i + 1)]

  const prefix = `${ano}-${pad(mes + 1)}-`
  const doMes = dias.filter(d => d.date.startsWith(prefix))
  const totH = doMes.reduce((a, d) => a + d.totalHoras, 0)
  const totC = doMes.reduce((a, d) => a + d.totalCusto, 0)
  const porObra = useMemo(() => {
    const m = new Map<string, { nome: string; h: number; c: number }>()
    doMes.forEach(d => d.registos.forEach(r => {
      const x = m.get(r.obraId) ?? { nome: r.obraNome, h: 0, c: 0 }
      m.set(r.obraId, { nome: x.nome, h: x.h + r.horas, c: x.c + r.custo })
    }))
    return Array.from(m.values()).sort((a, b) => b.c - a.c)
  }, [doMes])

  const mover = (delta: number) => {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear()); setMes(d.getMonth())
  }
  const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => mover(-1)} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center" aria-label="Mês anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-base font-black capitalize">{nomeMes}</p>
        <button onClick={() => mover(1)} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center" aria-label="Mês seguinte">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {SEMANA.map((s, i) => (
          <div key={i} className="text-center text-[10px] font-black text-muted-foreground/50 pb-1">{s}</div>
        ))}
        {celulas.map((d, i) => {
          if (d === null) return <div key={i} />
          const k = key(ano, mes, d)
          const dia = mapa.get(k)
          return (
            <button key={i} onClick={() => setDiaSel(k)}
              className={cn(
                "aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all",
                dia ? "bg-primary/10 border-primary/30" : "bg-card border-border/40",
                k === hojeKey && "ring-2 ring-primary/50",
              )}>
              <span className="text-sm font-bold leading-none">{d}</span>
              {dia && <span className="text-[9px] font-bold text-primary leading-none">{dia.totalHoras}h</span>}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{doMes.length} dia(s) · {totH} h no mês</span>
          <span className="text-lg font-black">{fmtEuro(totC)}</span>
        </div>
        {porObra.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            {porObra.map(o => (
              <div key={o.nome} className="flex items-center justify-between text-xs">
                <span className="truncate pr-3">{o.nome}</span>
                <span className="text-muted-foreground shrink-0">{o.h} h · <b className="text-foreground">{fmtEuro(o.c)}</b></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SubDaySheet open={!!diaSel} onClose={() => setDiaSel(null)} onSaved={onChanged}
        date={diaSel ?? key(ano, mes, 1)} dia={diaSel ? mapa.get(diaSel) ?? null : null}
        obras={obras} equipa={equipa} subUid={subUid} empresaNome={empresaNome} />
    </div>
  )
}
