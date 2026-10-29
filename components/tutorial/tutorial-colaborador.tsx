// components/tutorial/tutorial-colaborador.tsx
// Tutorial ilustrado para o colaborador: ecrã inteiro, passo a passo, só explicativo (não altera dados).
// Desenha-se diretamente no <body> (portal) para cobrir sempre o ecrã todo.
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/AuthProvider"
import { subscreverTipoContrato } from "@/lib/recibos-service"
import { PASSOS } from "@/components/tutorial/passos"
import { ILUSTRACOES } from "@/components/tutorial/ilustracoes"

// Telemóvel deitado (baixo e largo): desenho à esquerda, texto à direita
const RAIZ = "fixed inset-0 z-[300] bg-background flex flex-col overscroll-contain outline-none"
const CORPO = "flex-1 min-h-0 overflow-y-auto overscroll-contain [@media(orientation:landscape)_and_(max-height:520px)]:overflow-hidden"
const CONTEUDO = "min-h-full w-full max-w-xl mx-auto flex flex-col justify-center gap-5 px-5 py-3 animate-fade-in-up [@media(orientation:landscape)_and_(max-height:520px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:520px)]:flex-row [@media(orientation:landscape)_and_(max-height:520px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)]:gap-8 [@media(orientation:landscape)_and_(max-height:520px)]:h-full"
const PAINEL_DESENHO = "w-full max-w-[340px] mx-auto shrink-0 rounded-3xl border border-border/40 bg-gradient-to-b from-muted/60 to-muted/20 p-4 [@media(orientation:landscape)_and_(max-height:520px)]:flex-1 [@media(orientation:landscape)_and_(max-height:520px)]:max-h-full [@media(orientation:landscape)_and_(max-height:520px)]:overflow-y-auto"
const PAINEL_TEXTO = "text-center space-y-2.5 max-w-md mx-auto [@media(orientation:landscape)_and_(max-height:520px)]:flex-1 [@media(orientation:landscape)_and_(max-height:520px)]:text-left [@media(orientation:landscape)_and_(max-height:520px)]:mx-0"

export function TutorialColaborador({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [independente, setIndependente] = useState(false)
  const [i, setI] = useState(0)
  const raizRef = useRef<HTMLDivElement>(null)
  const toque = useRef<{ x: number; y: number } | null>(null)

  // o passo do recibo só aparece a quem é independente
  useEffect(() => {
    if (!open || !user) return
    return subscreverTipoContrato(user.uid, t => setIndependente(t === "independente"))
  }, [open, user?.uid])

  const passos = useMemo(() => PASSOS.filter(p => !p.soIndependentes || independente), [independente])
  const indice = Math.min(i, passos.length - 1)
  const passo = passos[indice]
  const ultimo = indice === passos.length - 1

  const ir = (d: 1 | -1) => setI(v => Math.min(Math.max(v + d, 0), passos.length - 1))
  const seguinte = () => (ultimo ? onClose() : ir(1))

  // abre sempre no início
  useEffect(() => { if (open) setI(0) }, [open])

  // O fundo não rola enquanto o tutorial está aberto; ao fechar repomos a posição da página
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const body = document.body
    const antes = { html: html.style.overflow, body: body.style.overflow }
    const scrollY = window.scrollY
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    raizRef.current?.focus()
    return () => {
      html.style.overflow = antes.html
      body.style.overflow = antes.body
      window.scrollTo({ top: scrollY, behavior: "instant" })
    }
  }, [open])

  // Teclado (computador): ← → mudam de passo · Esc fecha
  useEffect(() => {
    if (!open) return
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") seguinte()
      else if (e.key === "ArrowLeft") ir(-1)
      else if (e.key === "Escape") onClose()
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", aoTecla)
    return () => window.removeEventListener("keydown", aoTecla)
  }, [open, ultimo, passos.length])

  if (!open || !passo) return null
  const Ilustracao = ILUSTRACOES[passo.id]
  const Icone = passo.icone

  return createPortal(
    <div
      ref={raizRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-titulo"
      className={RAIZ}
      style={{ height: "100dvh" }}
      onClick={e => e.stopPropagation()}
    >
      {/* Topo: progresso + saltar */}
      <div className="shrink-0 flex items-center gap-3 px-4 pb-2" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <span className="text-xs font-bold tabular-nums text-muted-foreground w-10">{indice + 1}/{passos.length}</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={passos.length} aria-valuenow={indice + 1}>
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((indice + 1) / passos.length) * 100}%` }} />
        </div>
        <button onClick={onClose} aria-label="Fechar tutorial" className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all">
          {ultimo ? <X className="h-4 w-4" /> : <>Saltar</>}
        </button>
      </div>

      {/* Corpo: o desenho em grande, e por baixo o texto (deslizar para os lados muda de passo) */}
      <div
        className={CORPO}
        style={{ touchAction: "pan-y" }}
        onPointerDown={e => { toque.current = { x: e.clientX, y: e.clientY } }}
        onPointerCancel={() => { toque.current = null }}
        onPointerUp={e => {
          const t = toque.current; toque.current = null
          if (!t) return
          const dx = e.clientX - t.x, dy = e.clientY - t.y
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? seguinte : () => ir(-1))()
        }}
      >
        <div key={passo.id} className={CONTEUDO}>
          <div className={PAINEL_DESENHO}>{Ilustracao && <Ilustracao />}</div>

          <div className={PAINEL_TEXTO}>
            <span className={cn("inline-flex w-10 h-10 rounded-2xl bg-gradient-to-br items-center justify-center shadow-md", passo.cor)}>
              <Icone className="h-5 w-5 text-white" />
            </span>
            <h2 id="tutorial-titulo" className="text-2xl font-black tracking-tight leading-tight">{passo.titulo}</h2>
            <p className="text-base text-muted-foreground leading-snug">{passo.resumo}</p>
            {passo.dica && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold px-3 py-1.5">
                <Lightbulb className="h-3.5 w-3.5 shrink-0" /> {passo.dica}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé: anterior / seguinte */}
      <div className="shrink-0 w-full max-w-xl mx-auto flex items-center gap-3 px-4 pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => ir(-1)}
          aria-label="Passo anterior"
          className={cn("h-12 px-4 rounded-2xl bg-muted/60 hover:bg-muted font-semibold text-sm flex items-center gap-1 active:scale-95 transition-all", indice === 0 && "invisible")}
        >
          <ChevronLeft className="h-5 w-5" /> Anterior
        </button>
        <button
          onClick={seguinte}
          className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          {ultimo ? "Começar" : <>Seguinte <ChevronRight className="h-5 w-5" /></>}
        </button>
      </div>
    </div>,
    document.body
  )
}
