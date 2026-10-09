// components/admin/alerta-horas-button.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Loader2, Check, MessageSquare, Users, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCollaborators } from "@/hooks/useCollaborators"
import { useAuth } from "@/lib/AuthProvider"
import { cn } from "@/lib/utils"
import {
  detectarDivergencias, subscreverEstadosAlertas, grupoAtivo, marcarVerificado, salvarComentario,
  type DivergenciaGrupo, type EstadoAlerta,
} from "@/lib/alertas-horas-service"

function formatDataExtensa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
}

export function AlertaHorasButton() {
  const { user } = useAuth()
  const { collaborators, loading: loadingCol } = useCollaborators()
  const [estados, setEstados] = useState<Map<string, EstadoAlerta>>(new Map())
  const [loadingEstados, setLoadingEstados] = useState(true)
  const [open, setOpen] = useState(false)
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [verificando, setVerificando] = useState<string | null>(null)

  // Tempo real: qualquer admin que verifique/comente atualiza todos os outros
  useEffect(() => {
    const unsub = subscreverEstadosAlertas(
      novos => { setEstados(novos); setLoadingEstados(false) },
      err => { console.error(err); setLoadingEstados(false) },
    )
    return unsub
  }, [])

  const todosGrupos = useMemo(() => detectarDivergencias(collaborators), [collaborators])
  const ativos = useMemo(
    () => todosGrupos.filter(g => grupoAtivo(g, estados.get(g.groupId))),
    [todosGrupos, estados]
  )

  // Sincroniza os comentários com o Firestore, sem pisar o que este admin está a escrever:
  // só atualiza o campo se o texto local ainda for igual ao último valor remoto conhecido.
  const comentariosRemotos = useRef<Record<string, string>>({})
  useEffect(() => {
    const remotos: Record<string, string> = {}
    ativos.forEach(g => { remotos[g.groupId] = estados.get(g.groupId)?.comentario ?? "" })
    const anteriores = comentariosRemotos.current
    setComentarios(prev => {
      const next = { ...prev }
      for (const [id, remoto] of Object.entries(remotos)) {
        const anterior = anteriores[id]
        if (!(id in prev) || prev[id] === (anterior ?? "")) next[id] = remoto
      }
      return next
    })
    comentariosRemotos.current = remotos
  }, [ativos, estados])

  const loading = loadingCol || loadingEstados
  if (!loading && ativos.length === 0) return null

  const handleVerificar = async (grupo: DivergenciaGrupo) => {
    if (!user) return
    setVerificando(grupo.groupId)
    try {
      await marcarVerificado(grupo, user.uid)
    } catch (err) {
      console.error(err)
    } finally {
      setVerificando(null)
    }
  }

  const handleComentarioBlur = async (groupId: string) => {
    if (!user) return
    const texto = comentarios[groupId] ?? ""
    if (texto === (estados.get(groupId)?.comentario ?? "")) return
    try {
      await salvarComentario(groupId, texto, user.uid)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all press-effect",
          "bg-red-100 dark:bg-red-950/40 border border-red-300/60 dark:border-red-800/50",
          "text-red-600 dark:text-red-400 hover:bg-red-200/60 dark:hover:bg-red-900/50"
        )}
        title="Divergências de horas"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {!loading && ativos.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {ativos.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden gap-0 max-h-[85dvh] flex flex-col">
          <DialogTitle className="sr-only">Divergências de horas</DialogTitle>
          <DialogDescription className="sr-only">Colaboradores que trabalharam juntos mas apontaram horas muito diferentes</DialogDescription>

          <div className="px-6 pt-6 pb-4 bg-red-50 dark:bg-red-950/20 border-b border-red-200/50 dark:border-red-800/30 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-base font-black tracking-tight">Divergências de horas</p>
                <p className="text-[11px] text-muted-foreground/70">Colaboradores que trabalharam juntos, horas diferentes</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ativos.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Sem divergências por confirmar 🎉</div>
            ) : (
              ativos.map(grupo => (
                <div key={grupo.groupId} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/70">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="capitalize">{formatDataExtensa(grupo.date)}</span>
                    <span className="ml-auto text-red-600 dark:text-red-400 font-bold">
                      diferença de {grupo.diff}h
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {grupo.membros.map((m, i) => (
                      <div key={m.uid} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-muted-foreground/40" /> {m.nome}
                        </span>
                        <span className={cn("text-sm font-bold", i === 0 ? "text-foreground" : "text-red-600 dark:text-red-400")}>
                          {m.horas}h
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Comentário interno
                    </p>
                    <Textarea
                      placeholder="Ex: falei com o João, confirmou 9h…"
                      value={comentarios[grupo.groupId] ?? ""}
                      onChange={e => setComentarios(prev => ({ ...prev, [grupo.groupId]: e.target.value }))}
                      onBlur={() => handleComentarioBlur(grupo.groupId)}
                      className="text-sm min-h-[60px] resize-none"
                    />
                  </div>

                  <button
                    onClick={() => handleVerificar(grupo)}
                    disabled={verificando === grupo.groupId}
                    className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {verificando === grupo.groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Marcar como verificado
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
