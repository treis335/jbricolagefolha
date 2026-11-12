// components/admin/observacoes-button.tsx
// Aviso para admin/patrão: colaboradores que deixaram observações no day form.
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MessageSquareText, Check, CheckCheck, Calendar, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useCollaborators } from "@/hooks/useCollaborators"
import { useAuth } from "@/lib/AuthProvider"
import { subscreverEstadosAlertas, type EstadoAlerta } from "@/lib/alertas-horas-service"
import { detectarObservacoes, observacaoAtiva, marcarObservacaoLida, type ObservacaoItem } from "@/lib/observacoes-service"

const dataExtensa = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number)
  const t = new Date(y, m - 1, dd).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function ObservacoesButton() {
  const { user } = useAuth()
  const { collaborators, loading, refetch } = useCollaborators()
  const [estados, setEstados] = useState<Map<string, EstadoAlerta>>(new Map())
  const [open, setOpen] = useState(false)
  const [aMarcar, setAMarcar] = useState<string | null>(null)
  const ultimaLeitura = useRef(Date.now())

  useEffect(() => subscreverEstadosAlertas(setEstados, () => {}), [])

  // Atualiza as observações ao voltar à app (no máximo de 2 em 2 minutos)
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimaLeitura.current > 120_000) {
        ultimaLeitura.current = Date.now(); refetch()
      }
    }
    document.addEventListener("visibilitychange", aoVoltar)
    return () => document.removeEventListener("visibilitychange", aoVoltar)
  }, [refetch])

  const ativas = useMemo(
    () => detectarObservacoes(collaborators).filter(o => observacaoAtiva(o, estados.get(o.key))),
    [collaborators, estados],
  )

  if (loading && ativas.length === 0) return null
  if (ativas.length === 0) return null

  const marcar = async (o: ObservacaoItem) => {
    if (!user) return
    setAMarcar(o.key)
    try { await marcarObservacaoLida(o, user.uid) } catch (e) { console.error(e) } finally { setAMarcar(null) }
  }
  const marcarTodas = async () => {
    if (!user) return
    setAMarcar("todas")
    try { await Promise.all(ativas.map(o => marcarObservacaoLida(o, user.uid))) } catch (e) { console.error(e) } finally { setAMarcar(null) }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); ultimaLeitura.current = Date.now(); refetch() }}
        title="Observações dos colaboradores"
        aria-label="Observações dos colaboradores"
        className="relative flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all press-effect bg-sky-100 dark:bg-sky-950/40 border border-sky-300/60 dark:border-sky-800/50 text-sky-600 dark:text-sky-400 hover:bg-sky-200/60 dark:hover:bg-sky-900/50"
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {ativas.length}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden gap-0 max-h-[85dvh] flex flex-col">
          <DialogTitle className="sr-only">Observações dos colaboradores</DialogTitle>
          <DialogDescription className="sr-only">Notas deixadas pelos colaboradores no registo diário</DialogDescription>

          <div className="px-6 pt-6 pb-4 bg-sky-50 dark:bg-sky-950/20 border-b border-sky-200/50 dark:border-sky-800/30 shrink-0 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center shrink-0">
              <MessageSquareText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black tracking-tight">Observações</p>
              <p className="text-[11px] text-muted-foreground/70">{ativas.length} por ler</p>
            </div>
            {ativas.length > 1 && (
              <button onClick={marcarTodas} disabled={aMarcar !== null}
                className="h-8 px-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-60 mr-6">
                {aMarcar === "todas" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}Ler todas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ativas.map(o => (
              <div key={o.key} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-foreground truncate">{o.nome}</span>
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground/70 shrink-0">
                    <Calendar className="h-3 w-3" />{dataExtensa(o.date)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap rounded-xl bg-muted/40 px-3 py-2.5">{o.texto}</p>
                <button onClick={() => marcar(o)} disabled={aMarcar !== null}
                  className="w-full h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {aMarcar === o.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Marcar como lida
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
