// components/recibo-mensal-card.tsx
// Colaboradores independentes: anexar o PDF do recibo ao mês (navegável). Os funcionários não veem nada.
"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, FileText, Upload, Trash2, ExternalLink, Loader2, RefreshCw, Receipt } from "lucide-react"
import { useAuth } from "@/lib/AuthProvider"
import { cn } from "@/lib/utils"
import {
  subscreverTipoContrato, subscreverRecibosDoColaborador, enviarRecibo, removerRecibo,
  mesAtualISO, somarMeses, mesPorExtenso, formatarTamanho,
  type Recibo, type TipoContrato,
} from "@/lib/recibos-service"

export function ReciboMensalCard() {
  const { user } = useAuth()
  const uid = user?.uid
  const [tipo, setTipo] = useState<TipoContrato | null>(null)
  const [recibos, setRecibos] = useState<Record<string, Recibo>>({})
  const [mes, setMes] = useState(mesAtualISO())
  const [progresso, setProgresso] = useState<number | null>(null)
  const [erro, setErro] = useState("")
  const [aConfirmar, setAConfirmar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!uid) return
    return subscreverTipoContrato(uid, setTipo)
  }, [uid])

  useEffect(() => {
    if (!uid || tipo !== "independente") return
    return subscreverRecibosDoColaborador(uid, setRecibos, err => console.error(err))
  }, [uid, tipo])

  // ao mudar de mês, limpa avisos
  useEffect(() => { setErro(""); setAConfirmar(false) }, [mes])

  if (!uid || tipo !== "independente") return null

  const recibo = recibos[mes]
  const aEnviar = progresso !== null
  const noMesAtual = mes >= mesAtualISO()

  const aoEscolherFicheiro = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setErro("")
    setProgresso(0)
    try {
      await enviarRecibo(file, uid, mes, uid, setProgresso)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o recibo.")
    } finally {
      setProgresso(null)
    }
  }

  const aoRemover = async () => {
    try { await removerRecibo(uid, mes) } catch { setErro("Não foi possível remover o recibo.") }
    setAConfirmar(false)
  }

  const dataEnvio = recibo?.enviadoEm?.toDate?.()

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
          <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight">Recibo do mês</p>
          <p className="text-[11px] text-muted-foreground">Anexa o PDF do recibo que passaste à firma</p>
        </div>
      </div>

      {/* Navegação de meses */}
      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-1 py-1">
        <button onClick={() => setMes(m => somarMeses(m, -1))} aria-label="Mês anterior"
          className="w-9 h-9 rounded-lg hover:bg-background flex items-center justify-center active:scale-95 transition-all">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold">{mesPorExtenso(mes)}</span>
        <button onClick={() => setMes(m => somarMeses(m, 1))} disabled={noMesAtual} aria-label="Mês seguinte"
          className="w-9 h-9 rounded-lg hover:bg-background flex items-center justify-center active:scale-95 transition-all disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={aoEscolherFicheiro} />

      {aEnviar ? (
        <div className="rounded-xl border border-border/50 p-4 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> A enviar… {progresso}%</p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      ) : recibo ? (
        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{recibo.nomeOriginal}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatarTamanho(recibo.tamanho)} · enviado {dataEnvio ? dataEnvio.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }) : "agora"}
              </p>
            </div>
          </div>
          {aConfirmar ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold flex-1">Remover este recibo?</span>
              <button onClick={aoRemover} className="h-9 px-3 rounded-lg bg-red-500 text-white text-xs font-bold">Remover</button>
              <button onClick={() => setAConfirmar(false)} className="h-9 px-3 rounded-lg bg-muted text-xs font-semibold">Cancelar</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <a href={recibo.url} target="_blank" rel="noopener noreferrer"
                className="h-9 rounded-lg bg-background border border-border/60 text-xs font-semibold flex items-center justify-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </a>
              <button onClick={() => inputRef.current?.click()}
                className="h-9 rounded-lg bg-background border border-border/60 text-xs font-semibold flex items-center justify-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Substituir
              </button>
              <button onClick={() => setAConfirmar(true)}
                className="h-9 rounded-lg bg-background border border-border/60 text-xs font-semibold flex items-center justify-center gap-1.5 text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className={cn("w-full rounded-xl border-2 border-dashed border-border/60 hover:border-indigo-400/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10",
            "py-6 flex flex-col items-center gap-1.5 transition-all active:scale-[0.99]")}>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Anexar recibo (PDF)</span>
          <span className="text-[11px] text-muted-foreground">Para {mesPorExtenso(mes)} · máx. 5 MB</span>
        </button>
      )}

      {erro && <p className="text-xs text-red-500 font-medium">{erro}</p>}
    </div>
  )
}
