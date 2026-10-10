// components/admin/recibos-modal.tsx
// Admin: recibos dos colaboradores independentes, por mês — quem entregou, quem falta, download (individual ou ZIP).
"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, CheckCircle2, CircleDashed, ExternalLink, Download, Loader2, Receipt } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { Collaborator } from "@/hooks/useCollaborators"
import {
  subscreverRecibosDoMes, descarregarRecibosZip, mesAtualISO, somarMeses, mesPorExtenso, formatarTamanho, type Recibo,
} from "@/lib/recibos-service"

export function RecibosModal({ open, onClose, collaborators }: {
  open: boolean
  onClose: () => void
  collaborators: Collaborator[]
}) {
  const [mes, setMes] = useState(mesAtualISO())
  const [recibos, setRecibos] = useState<Record<string, Recibo>>({})
  const [loading, setLoading] = useState(true)
  const [aDescarregar, setADescarregar] = useState(false)
  const [aviso, setAviso] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const unsub = subscreverRecibosDoMes(
      mes,
      mapa => { setRecibos(mapa); setLoading(false) },
      err => { console.error(err); setLoading(false) },
    )
    return unsub
  }, [open, mes])

  useEffect(() => { setAviso("") }, [mes])

  // independentes (ativos) + qualquer colaborador que já tenha recibo neste mês
  const linhas = useMemo(() => collaborators
    .filter(c => (c.ativo && c.tipoContrato === "independente") || recibos[c.id])
    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT")), [collaborators, recibos])

  const entregues = linhas.filter(c => recibos[c.id])
  const noMesAtual = mes >= mesAtualISO()

  const descarregarTodos = async () => {
    setADescarregar(true); setAviso("")
    try {
      const falhados = await descarregarRecibosZip(entregues.map(c => ({ colaborador: c.name, recibo: recibos[c.id] })), mes)
      if (falhados.length > 0) setAviso(`Não foi possível obter: ${falhados.join(", ")}.`)
    } finally { setADescarregar(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden gap-0 max-h-[90dvh] flex flex-col">
        <DialogTitle className="sr-only">Recibos dos colaboradores</DialogTitle>
        <DialogDescription className="sr-only">Recibos dos colaboradores independentes por mês</DialogDescription>

        <div className="px-5 pt-5 pb-3 border-b border-border/30 shrink-0 space-y-3">
          <div className="flex items-center gap-2.5 pr-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-base font-black tracking-tight leading-tight">Recibos</p>
              <p className="text-[11px] text-muted-foreground">
                {linhas.length === 0 ? "Sem independentes" : `${entregues.length} de ${linhas.length} entregues`}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-1 py-1">
            <button onClick={() => setMes(m => somarMeses(m, -1))} aria-label="Mês anterior"
              className="w-9 h-9 rounded-lg hover:bg-background flex items-center justify-center active:scale-95"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-bold">{mesPorExtenso(mes)}</span>
            <button onClick={() => setMes(m => somarMeses(m, 1))} disabled={noMesAtual} aria-label="Mês seguinte"
              className="w-9 h-9 rounded-lg hover:bg-background flex items-center justify-center active:scale-95 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 px-4">
              Nenhum colaborador está marcado como <b>Independente</b>. Define-o na ficha do colaborador → Editar (Admin) → Tipo de contrato.
            </p>
          ) : linhas.map(c => {
            const r = recibos[c.id]
            return (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20">
                {r ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <CircleDashed className="h-5 w-5 text-amber-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r ? `${r.nomeOriginal} · ${formatarTamanho(r.tamanho)}` : "Em falta"}</p>
                </div>
                {r && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir recibo de ${c.name}`}
                    className="w-9 h-9 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0 active:scale-95">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-border/40 shrink-0 space-y-2">
          {aviso && <p className="text-xs text-red-500 font-medium">{aviso}</p>}
          <button onClick={descarregarTodos} disabled={entregues.length === 0 || aDescarregar}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
            {aDescarregar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descarregar todos ({entregues.length}) em ZIP
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
