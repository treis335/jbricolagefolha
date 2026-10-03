// components/admin/fotos-modal.tsx
"use client"

import { useMemo, useState } from "react"
import { X, Camera, ChevronLeft, ChevronRight, User, HardHat, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Collaborator } from "@/hooks/useCollaborators"

interface Props {
  open: boolean
  onClose: () => void
  collaborators?: Collaborator[]
}

interface FotoFlat {
  url: string
  tipo: "antes" | "depois"
  uploadedAt: string
  colaboradorId: string
  colaboradorNome: string
  date: string
  obraNome: string
  descricao: string
}

function formatData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })
}

export function FotosModal({ open, onClose, collaborators = [] }: Props) {
  const [colaboradorId, setColaboradorId] = useState<string>("todos")
  const [tipo, setTipo] = useState<"todas" | "antes" | "depois">("todas")
  const [busca, setBusca] = useState("")
  const [indexAmpliada, setIndexAmpliada] = useState<number | null>(null)

  const todasFotos = useMemo<FotoFlat[]>(() => {
    const lista: FotoFlat[] = []
    collaborators.forEach(c => {
      ;(c.entries || []).forEach((entry: any) => {
        ;(entry.services || []).forEach((s: any) => {
          ;(s.fotos || []).forEach((f: any) => {
            lista.push({
              url: f.url,
              tipo: f.tipo,
              uploadedAt: f.uploadedAt,
              colaboradorId: c.id,
              colaboradorNome: c.name,
              date: entry.date,
              obraNome: s.obraNome || "Sem obra",
              descricao: s.descricao || "",
            })
          })
        })
      })
    })
    return lista.sort((a, b) => (b.uploadedAt || b.date).localeCompare(a.uploadedAt || a.date))
  }, [collaborators])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return todasFotos.filter(f =>
      (colaboradorId === "todos" || f.colaboradorId === colaboradorId) &&
      (tipo === "todas" || f.tipo === tipo) &&
      (!q || f.obraNome.toLowerCase().includes(q) || f.descricao.toLowerCase().includes(q))
    )
  }, [todasFotos, colaboradorId, tipo, busca])

  const colaboradoresComFotos = useMemo(
    () => collaborators.filter(c => todasFotos.some(f => f.colaboradorId === c.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [collaborators, todasFotos]
  )

  const ampliada = indexAmpliada !== null ? filtradas[indexAmpliada] : null

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-3xl max-h-[92dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/40 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-black tracking-tight flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Fotos ({filtradas.length})
            </p>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={colaboradorId}
              onChange={e => setColaboradorId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/50 bg-background text-xs font-medium"
            >
              <option value="todos">Todos os colaboradores</option>
              {colaboradoresComFotos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex p-0.5 rounded-xl border border-border/50 bg-muted/30">
              {(["todas", "antes", "depois"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn("h-8 px-3 rounded-lg text-xs font-semibold capitalize transition-colors", tipo === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar por obra…"
              className="h-9 px-3 rounded-xl border border-border/50 bg-background text-xs flex-1 min-w-[140px]"
            />
          </div>
        </div>

        {/* Grelha */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtradas.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {todasFotos.length === 0 ? "Ainda não há fotos carregadas por ninguém." : "Nenhuma foto encontrada com estes filtros."}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {filtradas.map((f, i) => (
                <button
                  key={`${f.url}-${i}`}
                  onClick={() => setIndexAmpliada(i)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-muted/40 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.obraNome} className="w-full h-full object-cover group-active:scale-95 transition-transform" loading="lazy" />
                  <span className={cn(
                    "absolute top-1 left-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white",
                    f.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
                  )}>
                    {f.tipo}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vista ampliada */}
      {ampliada && indexAmpliada !== null && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 shrink-0">
            <span className={cn(
              "text-[10px] font-bold uppercase px-2 py-1 rounded-full text-white",
              ampliada.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
            )}>
              {ampliada.tipo}
            </span>
            <button onClick={() => setIndexAmpliada(null)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative px-2 min-h-0">
            {indexAmpliada > 0 && (
              <button
                onClick={() => setIndexAmpliada(i => (i ?? 0) - 1)}
                className="absolute left-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 z-10"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ampliada.url} alt={ampliada.obraNome} className="max-w-full max-h-full object-contain rounded-xl" />
            {indexAmpliada < filtradas.length - 1 && (
              <button
                onClick={() => setIndexAmpliada(i => (i ?? 0) + 1)}
                className="absolute right-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 z-10"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          <div className="p-4 pb-6 shrink-0 space-y-1.5">
            <p className="text-white font-bold text-sm flex items-center gap-1.5">
              <HardHat className="h-3.5 w-3.5 text-white/60" /> {ampliada.obraNome}
            </p>
            {ampliada.descricao && <p className="text-white/70 text-xs">{ampliada.descricao}</p>}
            <div className="flex items-center gap-3 text-white/60 text-xs pt-1">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ampliada.colaboradorNome}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatData(ampliada.date)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
