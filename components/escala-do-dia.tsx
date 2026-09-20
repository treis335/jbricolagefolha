// components/escala-do-dia.tsx
"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, MapPin, Users, CalendarDays } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/AuthProvider"
import { formatLocalDate } from "@/lib/date-utils"
import { getMinhasEscalas, type EscalaEquipa } from "@/lib/escalas-service"
import { useCollaborators } from "@/hooks/useCollaborators"
import { cn } from "@/lib/utils"

interface MinhaEscala {
  date: string
  equipa: EscalaEquipa
}

function formatDiaExtenso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const hojeStr = formatLocalDate(new Date())
  const amanhaStr = formatLocalDate(new Date(Date.now() + 86400000))
  if (dateStr === hojeStr) return "Hoje"
  if (dateStr === amanhaStr) return "Amanhã"
  return date.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
}

export function EscalaDoDia() {
  const { user } = useAuth()
  const { collaborators } = useCollaborators()
  const [escalas, setEscalas] = useState<MinhaEscala[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    getMinhasEscalas(user.uid, formatLocalDate(new Date()))
      .then(res => { if (!cancelled) setEscalas(res) })
      .catch(err => console.error("[EscalaDoDia] erro a carregar:", err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  if (loading || escalas.length === 0) return null

  const atual = escalas[index]
  const colegas = atual.equipa.colaboradorUids
    .filter(uid => uid !== user?.uid)
    .map(uid => collaborators.find(c => c.id === uid)?.name)
    .filter((n): n is string => Boolean(n))

  return (
    <>
      <button
        onClick={() => { setIndex(0); setOpen(true) }}
        className={cn(
          "flex items-center gap-2 px-3 h-9 rounded-xl shrink-0 transition-all press-effect",
          "bg-amber-100 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-800/50",
          "text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-200/60 dark:hover:bg-amber-900/50"
        )}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Escala{escalas.length > 1 ? `s (${escalas.length})` : ""}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">Escala do dia</DialogTitle>

          <div className="px-6 pt-6 pb-4 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center justify-between">
              {escalas.length > 1 ? (
                <button
                  onClick={() => setIndex(i => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-20 hover:bg-amber-200/40 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : <span className="w-7" />}

              <p className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                {formatDiaExtenso(atual.date)}
              </p>

              {escalas.length > 1 ? (
                <button
                  onClick={() => setIndex(i => Math.min(escalas.length - 1, i + 1))}
                  disabled={index === escalas.length - 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-20 hover:bg-amber-200/40 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : <span className="w-7" />}
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Para onde vais</p>
                <p className="text-base font-bold leading-tight">{atual.equipa.obraNome}</p>
                {atual.equipa.obraMorada && (
                  <p className="text-xs text-muted-foreground mt-0.5">{atual.equipa.obraMorada}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Equipa</p>
                <p className="text-sm font-medium leading-relaxed">
                  {colegas.length > 0 ? colegas.join(", ") : "Vais sozinho"}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
