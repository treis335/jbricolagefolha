// components/admin/visualizador-fotos.tsx
// Visualizador de fotos em ecrã inteiro (partilhado): zoom, deslizar, miniaturas, informação e download.
// Desenha-se diretamente no <body> (portal) para cobrir sempre o ecrã todo, mesmo dentro de contentores com animação.
"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, Download, Plus, Minus, ChevronLeft, ChevronRight, HardHat, User, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { ZoomableImage, type ZoomHandle } from "@/components/zoomable-image"

export interface FotoFlat {
  url: string
  tipo: "antes" | "depois"
  uploadedAt: string
  colaboradorId: string
  colaboradorNome: string
  date: string
  obraNome: string
  descricao: string
  /** Identifica o serviço a que a foto pertence (fotos do mesmo serviço partilham a obra) */
  servicoKey: string
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
export function miniatura(url: string, largura = 160): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_fill,w_${largura},h_${largura}/`)
}

// Telemóvel deitado (baixo e largo): foto à esquerda, painel à direita
const V_RAIZ = "fixed inset-0 z-[200] bg-black flex flex-col overscroll-contain [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[minmax(0,1fr)_320px] [@media(orientation:landscape)_and_(max-height:520px)]:grid-rows-[auto_minmax(0,1fr)]"
const V_TOPO = "shrink-0 flex items-center justify-between gap-2 px-3 pb-2 [@media(orientation:landscape)_and_(max-height:520px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:bg-neutral-900/95"
const V_FOTO = "flex-1 min-h-0 relative [@media(orientation:landscape)_and_(max-height:520px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:520px)]:row-span-2"
const V_PAINEL = "shrink-0 w-full max-w-2xl mx-auto bg-neutral-900/95 border-t border-white/10 rounded-t-3xl pt-3 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-none [@media(orientation:landscape)_and_(max-height:520px)]:rounded-none [@media(orientation:landscape)_and_(max-height:520px)]:border-t-0 [@media(orientation:landscape)_and_(max-height:520px)]:border-l [@media(orientation:landscape)_and_(max-height:520px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:520px)]:overflow-y-auto [@media(orientation:landscape)_and_(max-height:520px)]:pt-1"
const V_MINIATURAS = "flex gap-1.5 overflow-x-auto px-3 pt-1 [@media(orientation:landscape)_and_(max-height:520px)]:flex-wrap [@media(orientation:landscape)_and_(max-height:520px)]:overflow-x-visible"
const BTN_ICONE = "w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:active:scale-100"

const clampIndex = (i: number, total: number) => Math.min(Math.max(i, 0), Math.max(total - 1, 0))

export function formatData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })
}


interface Props {
  fotos: FotoFlat[]
  /** Índice da foto aberta; null = fechado */
  indice: number | null
  onMudar: (indice: number | null) => void
}

export function VisualizadorFotos({ fotos, indice, onMudar }: Props) {
  const zoomRef = useRef<ZoomHandle>(null)
  const [escalaAtual, setEscalaAtual] = useState(1)
  const miniaturasRef = useRef<(HTMLButtonElement | null)[]>([])
  const [dica, setDica] = useState(false)

  const ampliada = indice !== null ? fotos[indice] : null
  const aberto = indice !== null

  const mudarFoto = (delta: 1 | -1) => {
    if (indice !== null) onMudar(clampIndex(indice + delta, fotos.length))
  }

  // Teclado (computador): ← → mudam de foto · + − zoom · 0 ajusta · Esc fecha
  useEffect(() => {
    if (!aberto) return
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") mudarFoto(1)
      else if (e.key === "ArrowLeft") mudarFoto(-1)
      else if (e.key === "+" || e.key === "=") zoomRef.current?.zoomIn()
      else if (e.key === "-") zoomRef.current?.zoomOut()
      else if (e.key === "0") zoomRef.current?.reset()
      else if (e.key === "Escape") onMudar(null)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", aoTecla)
    return () => window.removeEventListener("keydown", aoTecla)
  }, [aberto, indice, fotos.length])

  // O fundo não rola enquanto o visualizador está aberto; ao fechar repomos a posição da página
  useEffect(() => {
    if (!aberto) return
    const html = document.documentElement
    const body = document.body
    const antes = { html: html.style.overflow, body: body.style.overflow }
    const scrollY = window.scrollY
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = antes.html
      body.style.overflow = antes.body
      window.scrollTo({ top: scrollY, behavior: "instant" })
    }
  }, [aberto])

  // dica de gestos: aparece ao abrir e desaparece sozinha
  useEffect(() => {
    if (!aberto) return
    setDica(true)
    const t = setTimeout(() => setDica(false), 4000)
    return () => clearTimeout(t)
  }, [aberto])

  // mantém a miniatura da foto atual visível na faixa
  useEffect(() => {
    if (indice === null) return
    miniaturasRef.current[indice]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [indice])

  if (!ampliada || indice === null) return null

  return createPortal(
    <div className={V_RAIZ} style={{ height: "100dvh" }} onClick={e => e.stopPropagation()}>
      {/* Topo */}
      <div className={V_TOPO} style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold tabular-nums">
            {indice + 1} / {fotos.length}
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
          <button onClick={() => onMudar(null)} aria-label="Fechar" title="Fechar" className={BTN_ICONE}>
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
          <button onClick={() => mudarFoto(-1)} disabled={indice === 0} aria-label="Foto anterior" className={BTN_ICONE}>
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
          <button onClick={() => mudarFoto(1)} disabled={indice >= fotos.length - 1} aria-label="Foto seguinte" className={BTN_ICONE}>
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
          {fotos.map((f, i) => (
            <button
              key={`${f.url}-${i}`}
              ref={el => { miniaturasRef.current[i] = el }}
              onClick={() => onMudar(i)}
              aria-label={`Foto ${i + 1}`}
              className={cn(
                "relative w-12 h-12 [@media(max-height:700px)]:w-11 [@media(max-height:700px)]:h-11 rounded-lg overflow-hidden shrink-0 transition-all",
                i === indice ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-80"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={miniatura(f.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
              <span className={cn("absolute bottom-0 inset-x-0 h-1", f.tipo === "antes" ? "bg-amber-500" : "bg-emerald-500")} />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
