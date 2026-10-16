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

// Telemóvel deitado (baixo e largo): foto à esquerda, painel à direita
const V_RAIZ = "fixed inset-0 z-[200] bg-black flex flex-col [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[minmax(0,1fr)_320px] [@media(orientation:landscape)_and_(max-height:520px)]:grid-rows-[auto_minmax(0,1fr)]"
const V_TOPO = "shrink-0 flex items-center justify-between gap-2 px-3 pb-2 [@media(orientation:landscape)_and_(max-height:520px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:bg-neutral-900/95"
const V_FOTO = "flex-1 min-h-0 relative [@media(orientation:landscape)_and_(max-height:520px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:row-span-2"
const V_PAINEL = "shrink-0 w-full max-w-2xl mx-auto bg-neutral-900/95 border-t border-white/10 rounded-t-3xl pt-3 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)]:rounded-none [@media(orientation:landscape)_and_(max-height:520px)]:border-t-0 [@media(orientation:landscape)_and_(max-height:520px)]:border-l [@media(orientation:landscape)_and_(max-height:520px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:overflow-y-auto [@media(orientation:landscape)_and_(max-height:520px)]:pt-1"
const V_MINIATURAS = "flex gap-1.5 overflow-x-auto px-3 pt-1 [@media(orientation:landscape)_and_(max-height:520px)]:flex-wrap [@media(orientation:landscape)_and_(max-height:520px)]:overflow-x-visible"
const BTN_ICONE = "w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:active:scale-100"

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
  const [dica, setDica] = useState(false)

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

  // dica de gestos: aparece ao abrir e desaparece sozinha
  useEffect(() => {
    if (indexAmpliada === null) return
    setDica(true)
    const t = setTimeout(() => setDica(false), 4000)
    return () => clearTimeout(t)
  }, [indexAmpliada === null])

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

      {/* Vista ampliada — galeria completa */}
      {ampliada && indexAmpliada !== null && (
        <div className={V_RAIZ} style={{ height: "100dvh" }} onClick={e => e.stopPropagation()}>
          {/* Topo */}
          <div className={V_TOPO} style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold tabular-nums">
                {indexAmpliada + 1} / {filtradas.length}
              </span>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full text-white",
                ampliada.tipo === "antes" ? "bg-amber-500/90" : "bg-emerald-500/90"
              )}>
                {ampliada.tipo}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => descarregarFoto(ampliada)} aria-label="Descarregar foto" title="Descarregar" className={BTN_ICONE}>
                <Download className="h-5 w-5 text-white" />
              </button>
              <button onClick={() => setIndexAmpliada(null)} aria-label="Fechar" title="Fechar" className={BTN_ICONE}>
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Foto */}
          <div className={V_FOTO}>
            <ZoomableImage
              key={ampliada.url}
              ref={zoomRef}
              src={ampliada.url}
              alt={ampliada.obraNome}
              className="absolute inset-y-0 left-2 right-2 w-auto"
              onEscalaChange={setEscalaAtual}
              onSwipe={mudarFoto}
            />
            <div
              className={cn(
                "absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-3 py-1.5 rounded-full bg-black/70 text-white/80 text-[11px] whitespace-nowrap transition-opacity duration-500",
                dica ? "opacity-100" : "opacity-0"
              )}
            >
              Toque duplo para ampliar · deslize para mudar de foto
            </div>
          </div>

          {/* Painel: comandos, informação e miniaturas */}
          <div className={V_PAINEL}>
            <div className="flex items-center justify-center gap-2 px-3 pb-2">
              <button onClick={() => mudarFoto(-1)} disabled={indexAmpliada === 0} aria-label="Foto anterior" className={BTN_ICONE}>
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <div className="flex items-center rounded-full bg-white/10 mx-1">
                <button
                  onClick={() => zoomRef.current?.zoomOut()}
                  disabled={escalaAtual <= 1}
                  aria-label="Diminuir zoom"
                  className="w-11 h-11 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center disabled:opacity-30"
                >
                  <Minus className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => zoomRef.current?.reset()}
                  aria-label="Ajustar à largura do ecrã"
                  className="min-w-[56px] h-11 text-center text-xs font-semibold text-white tabular-nums"
                >
                  {Math.round(escalaAtual * 100)}%
                </button>
                <button
                  onClick={() => zoomRef.current?.zoomIn()}
                  disabled={escalaAtual >= 5}
                  aria-label="Aumentar zoom"
                  className="w-11 h-11 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center disabled:opacity-30"
                >
                  <Plus className="h-5 w-5 text-white" />
                </button>
              </div>
              <button onClick={() => mudarFoto(1)} disabled={indexAmpliada >= filtradas.length - 1} aria-label="Foto seguinte" className={BTN_ICONE}>
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="px-4 pb-2.5 space-y-0.5">
              <p className="text-white font-bold text-[15px] leading-snug flex items-center gap-1.5 min-w-0">
                <HardHat className="h-4 w-4 text-white/50 shrink-0" />
                <span className="truncate">{ampliada.obraNome}</span>
              </p>
              {ampliada.descricao && (
                <p className="text-white/65 text-xs leading-snug line-clamp-2 [@media(max-height:700px)]:line-clamp-1">{ampliada.descricao}</p>
              )}
              <p className="flex items-center gap-1.5 text-white/55 text-xs min-w-0">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{ampliada.colaboradorNome}</span>
                <span className="text-white/25">·</span>
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="shrink-0">{formatData(ampliada.date)}</span>
              </p>
            </div>

            <div className={V_MINIATURAS} style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              {filtradas.map((f, i) => (
                <button
                  key={`${f.url}-${i}`}
                  ref={el => { miniaturasRef.current[i] = el }}
                  onClick={() => setIndexAmpliada(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={cn(
                    "relative w-12 h-12 [@media(max-height:700px)]:w-11 [@media(max-height:700px)]:h-11 rounded-lg overflow-hidden shrink-0 transition-all",
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
        </div>
      )}
    </div>
  )
}
