// components/admin/armazem-modal.tsx
"use client"

import { useMemo, useState } from "react"
import {
  X, PackageCheck, PackageOpen, HardHat, Check, AlertTriangle, Loader2,
  ChevronLeft, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/AuthProvider"
import { useCollaborators, type Collaborator } from "@/hooks/useCollaborators"
import { ObraPicker } from "@/components/forms/obra-picker"
import type { Obra } from "@/lib/obras-service"
import { QrScanInput } from "@/components/admin/qr-scan-input"
import { entregarFerramentas, devolverFerramentas } from "@/lib/ferramentas-service"
import { feedbackScan } from "@/lib/scan-feedback"

interface Props {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase()
}
const CORES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
]
function corDe(uid: string) {
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
  return CORES[h % CORES.length]
}

function Avatar({ c, size = "w-12 h-12" }: { c: Collaborator; size?: string }) {
  return (
    <div className={cn(size, "rounded-2xl overflow-hidden shrink-0 flex items-center justify-center")}>
      {c.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.fotoUrl} alt={c.name} className="w-full h-full object-cover" />
      ) : (
        <div className={cn("w-full h-full flex items-center justify-center text-xs font-bold", corDe(c.id))}>
          {iniciais(c.name)}
        </div>
      )}
    </div>
  )
}

type Modo = "entregar" | "devolver"
type Passo = 0 | 1 | 2   // só para o modo "entregar": colaborador → obra → scan
type ItemFila = { code: string; nome?: string; estado: "ok" | "aviso" | "erro"; mensagem?: string }

export function ArmazemModal({ open, onClose, onChanged }: Props) {
  const { user } = useAuth()
  const { collaborators } = useCollaborators()
  const ativos = useMemo(() => collaborators.filter(c => c.ativo).sort((a, b) => a.name.localeCompare(b.name)), [collaborators])

  const [modo, setModo] = useState<Modo>("entregar")
  const [passo, setPasso] = useState<Passo>(0)
  const [colaborador, setColaborador] = useState<Collaborator | null>(null)
  const [obraNome, setObraNome] = useState("")
  const [pickerAberto, setPickerAberto] = useState(false)
  const [fila, setFila] = useState<ItemFila[]>([])
  const [processando, setProcessando] = useState(false)
  const [houveMudanca, setHouveMudanca] = useState(false)

  const resetTudo = () => {
    setColaborador(null); setObraNome(""); setFila([]); setModo("entregar"); setPasso(0)
  }

  const handleClose = () => {
    if (houveMudanca) onChanged()
    resetTudo(); setHouveMudanca(false)
    onClose()
  }

  const mudarModo = (m: Modo) => {
    setModo(m); setFila([]); setColaborador(null); setObraNome(""); setPasso(0)
  }

  const jaNaFila = (code: string) => fila.some(i => i.code === code)

  // ── Entregar ────────────────────────────────────────────────────────────
  const escolherColaborador = (c: Collaborator) => {
    setColaborador(c)
    setPasso(1)
  }

  const continuarParaScan = () => {
    if (!obraNome.trim()) return
    setPasso(2)
  }

  const handleScanEntregar = (code: string) => {
    if (jaNaFila(code)) { feedbackScan("aviso"); return }
    feedbackScan("sucesso")
    setFila(prev => [{ code, estado: "ok", mensagem: "Pronta a entregar" }, ...prev])
  }

  const removerDaFila = (code: string) => setFila(prev => prev.filter(i => i.code !== code))

  const confirmarEntrega = async () => {
    if (!colaborador || !obraNome.trim() || fila.length === 0 || !user) return
    setProcessando(true)
    try {
      const codes = fila.filter(i => i.estado === "ok").map(i => i.code)
      const res = await entregarFerramentas(codes, colaborador.id, colaborador.name, obraNome.trim(), user.uid)
      setHouveMudanca(true)

      setFila(prev => prev.map(item => {
        const entregue = res.entregues.find(e => e.id === item.code)
        if (entregue) return { ...item, nome: entregue.nome, estado: "ok", mensagem: "Entregue ✓" }
        const emUso = res.jaEmUso.find(e => e.id === item.code)
        if (emUso) return { ...item, nome: emUso.nome, estado: "aviso", mensagem: `Já está com ${emUso.comQuem.colaboradorNome}` }
        if (res.inexistentes.includes(item.code)) return { ...item, estado: "erro", mensagem: "Código desconhecido" }
        return item
      }))

      if (res.entregues.length > 0 && res.jaEmUso.length === 0 && res.inexistentes.length === 0) {
        feedbackScan("sucesso")
        setTimeout(() => { setFila([]); setColaborador(null); setObraNome(""); setPasso(0) }, 1300)
      } else if (res.jaEmUso.length > 0 || res.inexistentes.length > 0) {
        feedbackScan("aviso")
      }
    } catch (err) {
      console.error(err)
      feedbackScan("erro")
    } finally {
      setProcessando(false)
    }
  }

  // ── Devolver ────────────────────────────────────────────────────────────
  const handleScanDevolver = async (code: string) => {
    if (jaNaFila(code)) return
    setFila(prev => [{ code, estado: "ok", mensagem: "A processar…" }, ...prev])
    try {
      const res = await devolverFerramentas([code], user?.uid ?? "")
      if (res.devolvidas.length > 0) {
        const d = res.devolvidas[0]
        feedbackScan("sucesso")
        setHouveMudanca(true)
        setFila(prev => prev.map(i => i.code === code ? { ...i, nome: d.nome, estado: "ok", mensagem: `Devolvida — estava com ${d.colaboradorNome}` } : i))
      } else if (res.naoEstavamEntregues.length > 0) {
        feedbackScan("aviso")
        setFila(prev => prev.map(i => i.code === code ? { ...i, estado: "aviso", mensagem: "Já estava em stock" } : i))
      } else {
        feedbackScan("erro")
        setFila(prev => prev.map(i => i.code === code ? { ...i, estado: "erro", mensagem: "Código não corresponde a nenhuma ferramenta" } : i))
      }
    } catch (err) {
      console.error(err)
      feedbackScan("erro")
      setFila(prev => prev.map(i => i.code === code ? { ...i, estado: "erro", mensagem: "Erro ao processar" } : i))
    }
  }

  if (!open) return null

  const totalPassosEntrega = 3
  const filaOk = fila.filter(i => i.estado === "ok")

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md max-h-[94dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/40 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            {modo === "entregar" && passo > 0 ? (
              <button onClick={() => setPasso(p => (p - 1) as Passo)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : <span className="w-8 shrink-0" />}
            <p className="text-base font-black tracking-tight flex-1 text-center">Armazém</p>
            <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-2xl border border-border/60 bg-muted/30">
            <button
              onClick={() => mudarModo("entregar")}
              className={cn("flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all", modo === "entregar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <PackageOpen className="h-4 w-4" /> Entregar
            </button>
            <button
              onClick={() => mudarModo("devolver")}
              className={cn("flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all", modo === "devolver" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground")}
            >
              <PackageCheck className="h-4 w-4" /> Devolver
            </button>
          </div>

          {modo === "entregar" && (
            <div className="flex items-center gap-1.5 px-1">
              {Array.from({ length: totalPassosEntrega }).map((_, i) => (
                <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= passo ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {modo === "entregar" ? (
            <>
              {passo === 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-center text-muted-foreground">Quem vai levar as ferramentas?</p>
                  <div className="grid grid-cols-4 gap-3">
                    {ativos.map(c => (
                      <button key={c.id} onClick={() => escolherColaborador(c)} className="flex flex-col items-center gap-1.5 group">
                        <div className="group-active:scale-90 transition-transform">
                          <Avatar c={c} />
                        </div>
                        <span className="text-[10px] font-medium truncate w-full text-center">{c.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {passo === 1 && colaborador && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-primary/8 border border-primary/20">
                    <Avatar c={colaborador} size="w-9 h-9" />
                    <span className="text-sm font-bold text-primary truncate">{colaborador.name}</span>
                  </div>

                  <p className="text-sm font-bold text-center text-muted-foreground">Para onde vai?</p>

                  <button
                    onClick={() => setPickerAberto(true)}
                    className="w-full h-12 rounded-2xl bg-primary/8 border border-primary/20 hover:bg-primary/12 text-primary text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <HardHat className="h-4 w-4" /> Escolher obra existente
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] text-muted-foreground/50 font-semibold uppercase">ou</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  <input
                    type="text"
                    value={obraNome}
                    onChange={e => setObraNome(e.target.value)}
                    placeholder="Escreve o nome da obra…"
                    className="w-full h-12 px-4 rounded-2xl border border-border/40 bg-background text-sm font-medium text-center"
                  />

                  <button
                    onClick={continuarParaScan}
                    disabled={!obraNome.trim()}
                    className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-30"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {passo === 2 && colaborador && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-primary/8 border border-primary/20">
                    <Avatar c={colaborador} size="w-8 h-8" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary truncate leading-tight">{colaborador.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1"><HardHat className="h-3 w-3" /> {obraNome}</p>
                    </div>
                    <button onClick={() => setPasso(1)} className="w-7 h-7 rounded-lg hover:bg-primary/10 flex items-center justify-center shrink-0">
                      <Pencil className="h-3.5 w-3.5 text-primary/70" />
                    </button>
                  </div>

                  <QrScanInput onScan={handleScanEntregar} autoFocusPistola={open} placeholder="Pica as ferramentas…" />

                  {fila.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {filaOk.length} ferramenta{filaOk.length !== 1 ? "s" : ""} na lista
                      </p>
                      {fila.map(item => <FilaRow key={item.code} item={item} onRemover={() => removerDaFila(item.code)} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-bold text-center text-muted-foreground">Pica as ferramentas que chegaram</p>
              <QrScanInput onScan={handleScanDevolver} autoFocusPistola={open} placeholder="Pica as ferramentas devolvidas…" />
              {fila.length > 0 && (
                <div className="space-y-1.5">
                  {fila.map(item => <FilaRow key={item.code} item={item} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {modo === "entregar" && passo === 2 && (
          <div className="p-4 border-t border-border/40 shrink-0">
            <button
              onClick={confirmarEntrega}
              disabled={filaOk.length === 0 || processando}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageOpen className="h-4 w-4" />}
              Confirmar entrega {filaOk.length > 0 && `(${filaOk.length})`}
            </button>
          </div>
        )}
      </div>

      {pickerAberto && (
        <ObraPicker
          open
          onClose={() => setPickerAberto(false)}
          onSelect={(obra: Obra) => { setObraNome(obra.nome); setPickerAberto(false) }}
        />
      )}
    </div>
  )
}

function FilaRow({ item, onRemover }: { item: ItemFila; onRemover?: () => void }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm animate-scale-in",
        item.estado === "ok" && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40",
        item.estado === "aviso" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40",
        item.estado === "erro" && "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40"
      )}
    >
      {item.estado === "ok" ? (
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle className={cn("h-4 w-4 shrink-0", item.estado === "aviso" ? "text-amber-600 dark:text-amber-400" : "text-red-500")} />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{item.nome ?? item.code}</p>
        {item.mensagem && <p className="text-[11px] text-muted-foreground truncate">{item.mensagem}</p>}
      </div>
      {onRemover && (
        <button onClick={onRemover} className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
