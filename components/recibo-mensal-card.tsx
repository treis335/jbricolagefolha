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
  const [nome, setNome] = useState("")
  const [recibos, setRecibos] = useState<Record<string, Recibo>>({})
  const [mes, setMes] = useState(mesAtualISO())
  const [progresso, setProgresso] = useState<number | null>(null)
  const [erro, setErro] = useState("")
  const [aConfirmar, setAConfirmar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!uid) return
    return subscreverTipoContrato(uid, (t, n) => { setTipo(t); setNome(n) })
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
      await enviarRecibo(file, uid, nome, mes, uid, setProgresso)
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
    <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 p-3 space-y-2.5">
      {/* Cabeçalho compacto: título + mês navegável */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
          <Receipt className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm font-bold flex-1 min-w-0">Recibo</p>
        <div className="flex items-center rounded-lg bg-white/70 dark:bg-white/5">
          <button onClick={() => setMes(m => somarMeses(m, -1))} aria-label="Mês anterior"
            className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center active:scale-95 transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold px-1 min-w-[88px] text-center">{mesPorExtenso(mes)}</span>
          <button onClick={() => setMes(m => somarMeses(m, 1))} disabled={noMesAtual} aria-label="Mês seguinte"
            className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center active:scale-95 transition-all disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={aoEscolherFicheiro} />

      {aEnviar ? (
        <div className="rounded-lg border border-border/50 px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-semibold flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> A enviar… {progresso}%</p>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      ) : recibo ? (
        aConfirmar ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200/70 dark:border-red-900/50 px-3 py-2">
            <span className="text-xs font-semibold flex-1">Remover este recibo?</span>
            <button onClick={aoRemover} className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-bold">Remover</button>
            <button onClick={() => setAConfirmar(false)} className="h-8 px-3 rounded-lg bg-muted text-xs font-semibold">Não</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 pl-3 pr-1.5 py-1.5">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{recibo.nomeOriginal}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatarTamanho(recibo.tamanho)} · {dataEnvio ? dataEnvio.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }) : "agora"}
              </p>
            </div>
            <a href={recibo.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir recibo"
              className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center shrink-0"><ExternalLink className="h-4 w-4" /></a>
            <button onClick={() => inputRef.current?.click()} aria-label="Substituir recibo"
              className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center shrink-0"><RefreshCw className="h-4 w-4" /></button>
            <button onClick={() => setAConfirmar(true)} aria-label="Remover recibo"
              className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center shrink-0 text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        )
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className={cn("w-full h-10 rounded-lg border border-dashed border-indigo-300/70 dark:border-indigo-800/60 bg-white/50 dark:bg-white/5 hover:border-indigo-400/70 hover:bg-white/80 dark:hover:bg-white/10",
            "flex items-center justify-center gap-2 text-xs font-semibold transition-all active:scale-[0.99]")}>
          <Upload className="h-4 w-4 text-muted-foreground" />
          Anexar recibo (PDF, máx. 5 MB)
        </button>
      )}

      {erro && <p className="text-xs text-red-500 font-medium">{erro}</p>}
    </div>
  )
}
