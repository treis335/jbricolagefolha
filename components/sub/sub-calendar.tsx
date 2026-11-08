// components/sub/sub-calendar.tsx
// Calendário do empreiteiro — mesmo estilo do calendário dos colaboradores, focado na equipa dele.
// Tocar num dia abre o registo (obra + quem trabalhou + horas). Mostra dias, horas e custo do mês.
"use client"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type SubDia, type SubMembro, fmtEuro } from "@/lib/subempreiteiros-service"
import type { Obra } from "@/lib/obras-service"
import { SubDaySheet } from "./sub-day-sheet"

interface Props {
  subUid: string
  empresaNome: string
  obras: Obra[]
  equipa: SubMembro[]
  dias: SubDia[]
  onChanged: () => void
  fab?: boolean // botão "Hoje" flutuante (só no ecrã do empreiteiro)
}

const pad = (n: number) => String(n).padStart(2, "0")
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

function StatCell({ value, label, color }: { value: string; label: string; color: "default" | "blue" | "green" }) {
  const colors = { default: "text-foreground", blue: "text-blue-600 dark:text-blue-400", green: "text-emerald-600 dark:text-emerald-400" }
  return (
    <div className="flex flex-col items-center py-3 gap-0.5 select-none">
      <span className={cn("text-lg font-black leading-none tabular-nums", colors[color])}>{value}</span>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">{label}</span>
    </div>
  )
}

export function SubCalendar({ subUid, empresaNome, obras, equipa, dias, onChanged, fab }: Props) {
  const [mes, setMes] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const hojeKey = keyOf(new Date())
  const mapa = useMemo(() => new Map(dias.map(d => [d.date, d])), [dias])

  const celulas = useMemo(() => {
    const offset = (mes.getDay() + 6) % 7 // segunda = 0
    const n = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    return [
      ...Array<Date | null>(offset).fill(null),
      ...Array.from({ length: n }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
    ]
  }, [mes])

  const prefix = `${mes.getFullYear()}-${pad(mes.getMonth() + 1)}-`
  const doMes = useMemo(() => dias.filter(d => d.date.startsWith(prefix)), [dias, prefix])
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

  const isCurrentMonth = keyOf(new Date()).startsWith(prefix)
  const mudarMes = (delta: number) => setMes(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <div className="flex flex-col bg-background animate-fade-in">
      {/* Cabeçalho do mês */}
      <div className="flex items-center justify-between px-3 py-3 border-b bg-card/80 backdrop-blur-xl shadow-sm">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl press-effect" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-base font-bold capitalize tracking-tight">
            {mes.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
          </h2>
          {isCurrentMonth && <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-widest">mês atual</p>}
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl press-effect" onClick={() => mudarMes(1)} aria-label="Mês seguinte">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Totais do mês */}
      <div className="grid grid-cols-3 divide-x divide-border/50 border-b bg-card shadow-sm">
        <StatCell value={String(doMes.length)} label="dias" color="default" />
        <StatCell value={`${totH}h`} label="horas" color="blue" />
        <StatCell value={fmtEuro(totC)} label="custo" color="green" />
      </div>

      {/* Calendário */}
      <div className="bg-muted/10">
        <div className="p-2 sm:p-4 max-w-xl mx-auto w-full">
          <div className="grid grid-cols-7 mb-2">
            {WEEK.map((d, i) => (
              <div key={d} className={cn("text-center text-[10px] font-bold py-2 uppercase tracking-widest select-none",
                i >= 5 ? "text-muted-foreground/40" : "text-muted-foreground/60")}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
            {celulas.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="aspect-square" />
              const k = keyOf(date)
              const dia = mapa.get(k)
              const isToday = k === hojeKey
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              return (
                <button key={k} onClick={() => setDiaSel(k)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-xl relative select-none transition-all duration-150 overflow-hidden",
                    "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 border",
                    !dia && !isToday && "border-border/50 bg-card hover:bg-muted/60",
                    !dia && isWeekend && "opacity-40",
                    dia && !isToday && "border-border bg-card hover:bg-muted/40 shadow-sm",
                    isToday && "border-primary/50 bg-primary/5 hover:bg-primary/10 ring-2 ring-primary/40 ring-offset-1 ring-offset-background shadow-sm",
                  )}>
                  <span className={cn("text-sm leading-none",
                    isToday ? "font-bold text-primary" : dia ? "font-semibold text-foreground" : "font-normal text-foreground/50")}>
                    {date.getDate()}
                  </span>
                  {dia && (
                    <span className="text-[9px] leading-none mt-0.5 font-semibold tabular-nums text-muted-foreground">{dia.totalHoras}h</span>
                  )}
                  {dia && <span className="absolute top-1.5 left-1.5 rounded-full w-1.5 h-1.5 bg-primary" />}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Com registo</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full ring-2 ring-primary/60 bg-primary/10" /> Hoje</span>
          </div>

          {/* Custo por obra no mês */}
          {porObra.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border/40 bg-card p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Por obra este mês</p>
              {porObra.map(o => (
                <div key={o.nome} className="flex items-center justify-between text-xs">
                  <span className="truncate pr-3">{o.nome}</span>
                  <span className="text-muted-foreground shrink-0">{o.h} h · <b className="text-foreground">{fmtEuro(o.c)}</b></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {fab && (
        <Button onClick={() => setDiaSel(hojeKey)} size="lg"
          className="fixed bottom-[88px] right-4 h-[52px] px-5 rounded-2xl shadow-xl shadow-emerald-600/30 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white z-40 gap-2 transition-all duration-200 press-effect">
          <Plus className="h-5 w-5" />
          <span className="font-bold tracking-tight">Hoje</span>
        </Button>
      )}

      <SubDaySheet open={!!diaSel} onClose={() => setDiaSel(null)} onSaved={onChanged}
        date={diaSel ?? hojeKey} dia={diaSel ? mapa.get(diaSel) ?? null : null} dias={dias}
        obras={obras} equipa={equipa} subUid={subUid} empresaNome={empresaNome} />
    </div>
  )
}
