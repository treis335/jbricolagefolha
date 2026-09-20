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

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

const CORES_AVATAR = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
]
function corAvatar(uid: string): string {
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
  return CORES_AVATAR[hash % CORES_AVATAR.length]
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
  const equipa = atual.equipa.colaboradorUids
    .map(uid => ({ uid, nome: uid === user?.uid ? (user?.displayName ?? "Tu") : collaborators.find(c => c.id === uid)?.name }))
    .filter((m): m is { uid: string; nome: string } => Boolean(m.nome))
    .sort((a, b) => (a.uid === user?.uid ? -1 : b.uid === user?.uid ? 1 : a.nome.localeCompare(b.nome)))

  return (
    <>
      <button
        onClick={() => { setIndex(0); setOpen(true) }}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all press-effect",
          "bg-amber-100 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-800/50",
          "text-amber-700 dark:text-amber-400 hover:bg-amber-200/60 dark:hover:bg-amber-900/50"
        )}
        title="Escala do dia"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {escalas.length > 1 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {escalas.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-[28px] p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">Escala do dia</DialogTitle>

          {/* Cabeçalho */}
          <div className="px-7 pt-7 pb-5 bg-gradient-to-b from-amber-50 to-amber-50/40 dark:from-amber-950/25 dark:to-amber-950/5 border-b border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center justify-between">
              {escalas.length > 1 ? (
                <button
                  onClick={() => setIndex(i => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-20 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : <span className="w-8" />}

              <div className="text-center">
                <p className="text-base font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  {formatDiaExtenso(atual.date)}
                </p>
                {escalas.length > 1 && (
                  <p className="text-[10px] text-amber-600/60 dark:text-amber-500/50 font-semibold mt-0.5">
                    {index + 1} de {escalas.length} dias agendados
                  </p>
                )}
              </div>

              {escalas.length > 1 ? (
                <button
                  onClick={() => setIndex(i => Math.min(escalas.length - 1, i + 1))}
                  disabled={index === escalas.length - 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-20 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : <span className="w-8" />}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-7 py-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Para onde vais</p>
                <p className="text-lg font-bold leading-tight">{atual.equipa.obraNome}</p>
                {atual.equipa.obraMorada && (
                  <p className="text-xs text-muted-foreground mt-1">{atual.equipa.obraMorada}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                  Equipa · {equipa.length} {equipa.length === 1 ? "pessoa" : "pessoas"}
                </p>
                <div className="space-y-2">
                  {equipa.map(m => (
                    <div key={m.uid} className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0", corAvatar(m.uid))}>
                        {iniciais(m.nome)}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {m.uid === user?.uid ? "Tu" : m.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
