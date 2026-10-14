// components/admin/fotos-modal.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Camera, ChevronLeft, ChevronRight, User, HardHat, Calendar, Download, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ZoomableImage, type ZoomHandle } from "@/components/zoomable-image"
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

function slug(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

/** Descarrega a foto com um nome útil: obra-colaborador-data-tipo */
async function descarregarFoto(f: FotoFlat) {
  const nome = [slug(f.obraNome), slug(f.colaboradorNome), f.date, f.tipo].filter(Boolean).join("-") || "foto"
  const clicar = (href: string, ficheiro?: string) => {
    const a = document.createElement("a")
    a.href = href
    if (ficheiro) a.download = ficheiro
    a.rel = "noopener"
    document.body.appendChild(a); a.click(); a.remove()
  }
  // Cloudinary: o próprio servidor força o download (funciona em qualquer telemóvel/browser)
  if (f.url.includes("res.cloudinary.com") && f.url.includes("/upload/")) {
    clicar(f.url.replace("/upload/", `/upload/fl_attachment:${nome}/`))
    return
  }
  try {
    const res = await fetch(f.url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg"
    const url = URL.createObjectURL(blob)
    clicar(url, `${nome}.${ext}`)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch {
    window.open(f.url, "_blank", "noopener")
  }
}

/** Miniatura leve (Cloudinary redimensiona); outros URLs ficam como estão */
function miniatura(url: string, largura = 160): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_fill,w_${largura},h_${largura}/`)
}

const clampIndex = (i: number, total: number) => Math.min(Math.max(i, 0), Math.max(total - 1, 0))

function formatData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })
}

export function FotosModal({ open, onClose, collaborators = [] }: Props) {
  const [colaboradorId, setColaboradorId] = useState<string>("todos")
  const [tipo, setTipo] = useState<"todas" | "antes" | "depois">("todas")
  const [busca, setBusca] = useState("")
  const [indexAmpliada, setIndexAmpliada] = useState<number | null>(null)
  const zoomRef = useRef<ZoomHandle>(null)
  const [escalaAtual, setEscalaAtual] = useState(1)
  const miniaturasRef = useRef<(HTMLButtonElement | null)[]>([])

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

  const mudarFoto = (delta: 1 | -1) =>
    setIndexAmpliada(i => (i === null ? i : clampIndex(i + delta, filtradas.length)))

  // Teclado (computador): ← → mudam de foto · + − zoom · 0 ajusta · Esc fecha
  useEffect(() => {
    if (indexAmpliada === null) return
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") mudarFoto(1)
      else if (e.key === "ArrowLeft") mudarFoto(-1)
      else if (e.key === "+" || e.key === "=") zoomRef.current?.zoomIn()
      else if (e.key === "-") zoomRef.current?.zoomOut()
      else if (e.key === "0") zoomRef.current?.reset()
      else if (e.key === "Escape") setIndexAmpliada(null)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", aoTecla)
    return () => window.removeEventListener("keydown", aoTecla)
  }, [indexAmpliada, filtradas.length])

  // mantém a miniatura da foto atual visível na faixa
  useEffect(() => {
    if (indexAmpliada === null) return
    miniaturasRef.current[indexAmpliada]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [indexAmpliada])

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

      {/* Vista ampliada — galeria completa: topo, foto, comandos, informação e miniaturas */}
      {ampliada && indexAmpliada !== null && (
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col"
          style={{ height: "100dvh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Topo */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}>
            <span className="text-white text-sm font-bold tabular-nums">{indexAmpliada + 1} / {filtradas.length}</span>
            <span className={cn(
              "text-[10px] font-bold uppercase px-2 py-1 rounded-full text-white",
              ampliada.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
            )}>
              {ampliada.tipo}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => descarregarFoto(ampliada)}
              aria-label="Descarregar foto"
              className="h-10 px-3.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center gap-1.5 text-white text-xs font-semibold"
            >
              <Download className="h-4 w-4" /> Descarregar
            </button>
            <button
              onClick={() => setIndexAmpliada(null)}
              aria-label="Fechar"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Foto */}
          <div className="flex-1 min-h-0 relative">
            <ZoomableImage
              key={ampliada.url}
              ref={zoomRef}
              src={ampliada.url}
              alt={ampliada.obraNome}
              className="absolute inset-0"
              onEscalaChange={setEscalaAtual}
              onSwipe={mudarFoto}
            />
          </div>

          {/* Comandos */}
          <div className="shrink-0 flex items-center justify-center gap-2 px-3 py-2">
            <button
              onClick={() => mudarFoto(-1)}
              disabled={indexAmpliada === 0}
              aria-label="Foto anterior"
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <div className="flex items-center rounded-full bg-white/15 mx-1">
              <button
                onClick={() => zoomRef.current?.zoomOut()}
                disabled={escalaAtual <= 1}
                aria-label="Diminuir zoom"
                className="w-12 h-12 rounded-full hover:bg-white/15 active:scale-95 flex items-center justify-center disabled:opacity-30"
              >
                <Minus className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={() => zoomRef.current?.reset()}
                aria-label="Ajustar à largura do ecrã"
                className="min-w-[56px] h-12 text-center text-xs font-semibold text-white tabular-nums"
              >
                {Math.round(escalaAtual * 100)}%
              </button>
              <button
                onClick={() => zoomRef.current?.zoomIn()}
                disabled={escalaAtual >= 5}
                aria-label="Aumentar zoom"
                className="w-12 h-12 rounded-full hover:bg-white/15 active:scale-95 flex items-center justify-center disabled:opacity-30"
              >
                <Plus className="h-5 w-5 text-white" />
              </button>
            </div>
            <button
              onClick={() => mudarFoto(1)}
              disabled={indexAmpliada >= filtradas.length - 1}
              aria-label="Foto seguinte"
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Informação */}
          <div className="shrink-0 px-4 pb-2 space-y-0.5">
            <p className="text-white font-bold text-sm flex items-center gap-1.5">
              <HardHat className="h-3.5 w-3.5 text-white/60 shrink-0" /> <span className="truncate">{ampliada.obraNome}</span>
            </p>
            {ampliada.descricao && <p className="text-white/70 text-xs line-clamp-2">{ampliada.descricao}</p>}
            <div className="flex items-center gap-3 text-white/60 text-xs">
              <span className="flex items-center gap-1 min-w-0"><User className="h-3 w-3 shrink-0" /> <span className="truncate">{ampliada.colaboradorNome}</span></span>
              <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" /> {formatData(ampliada.date)}</span>
            </div>
            <p className="text-white/35 text-[10px] pt-0.5">Toque duplo para ampliar · deslize para mudar de foto</p>
          </div>

          {/* Miniaturas — todas as fotos (com os filtros atuais) */}
          <div
            className="shrink-0 flex gap-1.5 overflow-x-auto px-3 pt-1"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {filtradas.map((f, i) => (
              <button
                key={`${f.url}-${i}`}
                ref={el => { miniaturasRef.current[i] = el }}
                onClick={() => setIndexAmpliada(i)}
                aria-label={`Foto ${i + 1}`}
                className={cn(
                  "relative w-14 h-14 rounded-lg overflow-hidden shrink-0 transition-all",
                  i === indexAmpliada ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-80"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miniatura(f.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                <span className={cn("absolute bottom-0 inset-x-0 h-1", f.tipo === "antes" ? "bg-amber-500" : "bg-emerald-500")} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
