// components/admin/armazem-modal.tsx
"use client"

import { useMemo, useState } from "react"
import {
  X, PackageCheck, PackageOpen, HardHat, Check, AlertTriangle, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/AuthProvider"
import { useCollaborators, type Collaborator } from "@/hooks/useCollaborators"
import { ObraPicker } from "@/components/forms/obra-picker"
import type { Obra } from "@/lib/obras-service"
import { QrScanInput } from "@/components/admin/qr-scan-input"
import { entregarFerramentas, devolverFerramentas } from "@/lib/ferramentas-service"

interface Props {
  open: boolean
  onClose: () => void
  onChanged: () => void   // avisa o catálogo para recarregar depois de fechar
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

type Modo = "entregar" | "devolver"
type ItemFila = { code: string; nome?: string; estado: "ok" | "aviso" | "erro"; mensagem?: string }

export function ArmazemModal({ open, onClose, onChanged }: Props) {
  const { user } = useAuth()
  const { collaborators } = useCollaborators()
  const ativos = useMemo(() => collaborators.filter(c => c.ativo).sort((a, b) => a.name.localeCompare(b.name)), [collaborators])

  const [modo, setModo] = useState<Modo>("entregar")
  const [colaborador, setColaborador] = useState<Collaborator | null>(null)
  const [obraNome, setObraNome] = useState("")
  const [pickerAberto, setPickerAberto] = useState(false)
  const [fila, setFila] = useState<ItemFila[]>([])
  const [processando, setProcessando] = useState(false)
  const [houveMudanca, setHouveMudanca] = useState(false)

  const reset = () => {
    setColaborador(null); setObraNome(""); setFila([]); setModo("entregar")
  }

  const handleClose = () => {
    if (houveMudanca) onChanged()
    reset(); setHouveMudanca(false)
    onClose()
  }

  const jaNaFila = (code: string) => fila.some(i => i.code === code)

  const handleScanEntregar = (code: string) => {
    if (!colaborador) {
      setFila(prev => [{ code, estado: "erro", mensagem: "Escolhe primeiro o colaborador" }, ...prev])
      return
    }
    if (jaNaFila(code)) return
    setFila(prev => [{ code, estado: "ok", mensagem: "Na lista — confirma para entregar" }, ...prev])
  }

  const handleScanDevolver = async (code: string) => {
    if (jaNaFila(code)) return
    setFila(prev => [{ code, estado: "ok", mensagem: "A processar…" }, ...prev])
    try {
      const res = await devolverFerramentas([code], user?.uid ?? "")
      setFila(prev => prev.map(i => {
        if (i.code !== code) return i
        if (res.devolvidas.length > 0) {
          const d = res.devolvidas[0]
          setHouveMudanca(true)
          return { ...i, nome: d.nome, estado: "ok", mensagem: `Devolvida — estava com ${d.colaboradorNome}` }
        }
        if (res.naoEstavamEntregues.length > 0) return { ...i, estado: "aviso", mensagem: "Já estava em stock" }
        return { ...i, estado: "erro", mensagem: "Código não corresponde a nenhuma ferramenta" }
      }))
    } catch (err) {
      console.error(err)
      setFila(prev => prev.map(i => i.code === code ? { ...i, estado: "erro", mensagem: "Erro ao processar" } : i))
    }
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
        setTimeout(() => { setFila([]); setColaborador(null); setObraNome("") }, 1200)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessando(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[94dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header + toggle de modo */}
        <div className="p-4 border-b border-border/40 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-black tracking-tight">Armazém</p>
            <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 p-1 rounded-2xl border border-border/60 bg-muted/30">
            <button
              onClick={() => { setModo("entregar"); setFila([]) }}
              className={cn("flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all", modo === "entregar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <PackageOpen className="h-4 w-4" /> Entregar
            </button>
            <button
              onClick={() => { setModo("devolver"); setFila([]); setColaborador(null) }}
              className={cn("flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all", modo === "devolver" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground")}
            >
              <PackageCheck className="h-4 w-4" /> Devolver
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {modo === "entregar" && (
            <>
              {/* Colaborador escolhido — ou grelha para escolher */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Quem vai levar</p>
                {colaborador ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-primary/8 border border-primary/20">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                      {colaborador.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={colaborador.fotoUrl} alt={colaborador.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center text-xs font-bold", corDe(colaborador.id))}>
                          {iniciais(colaborador.name)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary flex-1 truncate">{colaborador.name}</span>
                    <button
                      onClick={() => { setColaborador(null); setFila([]) }}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {ativos.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setColaborador(c)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          {c.fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.fotoUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={cn("w-full h-full flex items-center justify-center text-xs font-bold", corDe(c.id))}>
                              {iniciais(c.name)}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium truncate w-full text-center">{c.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Obra */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Para onde</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPickerAberto(true)}
                    className="h-10 px-3 rounded-xl bg-primary/8 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <HardHat className="h-3.5 w-3.5" /> Escolher
                  </button>
                  <input
                    type="text"
                    value={obraNome}
                    onChange={e => setObraNome(e.target.value)}
                    placeholder="Ou escreve o nome da obra…"
                    className="flex-1 h-10 px-3 rounded-xl border border-border/40 bg-background text-sm"
                  />
                </div>
              </div>

              {/* Scanner */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Ferramentas</p>
                <QrScanInput onScan={handleScanEntregar} autoFocusPistola={open} placeholder="Pica as ferramentas a levar…" />
              </div>
            </>
          )}

          {modo === "devolver" && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Pica o que chegou</p>
              <QrScanInput onScan={handleScanDevolver} autoFocusPistola={open} placeholder="Pica as ferramentas devolvidas…" />
            </div>
          )}

          {/* Fila de resultados */}
          {fila.length > 0 && (
            <div className="space-y-1.5">
              {fila.map(item => (
                <div
                  key={item.code}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm",
                    item.estado === "ok" && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40",
                    item.estado === "aviso" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40",
                    item.estado === "erro" && "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40"
                  )}
                >
                  {item.estado === "ok" ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertTriangle className={cn("h-4 w-4 shrink-0", item.estado === "aviso" ? "text-amber-600 dark:text-amber-400" : "text-red-500")} />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{item.nome ?? item.code}</p>
                    {item.mensagem && <p className="text-[11px] text-muted-foreground truncate">{item.mensagem}</p>}
                  </div>
                  {modo === "entregar" && (
                    <button onClick={() => removerDaFila(item.code)} className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {modo === "entregar" && (
          <div className="p-4 border-t border-border/40 shrink-0">
            <button
              onClick={confirmarEntrega}
              disabled={!colaborador || !obraNome.trim() || fila.filter(i => i.estado === "ok").length === 0 || processando}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageOpen className="h-4 w-4" />}
              Confirmar entrega
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
