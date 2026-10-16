// components/zoomable-image.tsx
// Imagem com zoom: duplo toque/clique, pinça (2 dedos), roda do rato, arrastar quando ampliada
// e deslizar para os lados (com zoom a 1×) para mudar de foto.
// Os botões ficam fora do componente — controla-se por ref (zoomIn/zoomOut/reset).
"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const ESCALA_MAX = 5
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function limitar(p: { x: number; y: number }, escala: number, el: HTMLElement | null) {
  if (!el || escala <= 1) return { x: 0, y: 0 }
  const maxX = (el.clientWidth * (escala - 1)) / 2
  const maxY = (el.clientHeight * (escala - 1)) / 2
  return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) }
}

export interface ZoomHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

interface Props {
  src: string
  alt: string
  className?: string
  onEscalaChange?: (escala: number) => void
  /** +1 = foto seguinte, −1 = foto anterior (só com zoom a 1×) */
  onSwipe?: (direcao: 1 | -1) => void
}

export const ZoomableImage = forwardRef<ZoomHandle, Props>(function ZoomableImage(
  { src, alt, className, onEscalaChange, onSwipe }, ref,
) {
  const [escala, setEscala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [aGesto, setAGesto] = useState(false)

  const caixa = useRef<HTMLDivElement>(null)
  const escalaRef = useRef(1)
  const ponteiros = useRef(new Map<number, { x: number; y: number }>())
  const inicio = useRef<{ x: number; y: number } | null>(null)
  const pinca = useRef<{ dist: number; escala: number } | null>(null)
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const movido = useRef(false)
  const ultimoToque = useRef(0)
  const onSwipeRef = useRef(onSwipe)
  onSwipeRef.current = onSwipe

  const definirEscala = (nova: number) => {
    const e = clamp(nova, 1, ESCALA_MAX)
    escalaRef.current = e
    setEscala(e)
    setPos(p => limitar(p, e, caixa.current))
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => definirEscala(escalaRef.current * 1.5),
    zoomOut: () => definirEscala(escalaRef.current / 1.5),
    reset: () => definirEscala(1),
  }), [])

  useEffect(() => { onEscalaChange?.(escala) }, [escala, onEscalaChange])

  // Roda do rato (listener nativo para poder impedir o scroll da página)
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const aoRodar = (e: WheelEvent) => {
      e.preventDefault()
      definirEscala(escalaRef.current * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
    }
    el.addEventListener("wheel", aoRodar, { passive: false })
    return () => el.removeEventListener("wheel", aoRodar)
  }, [])

  const aoPressionar = (e: React.PointerEvent) => {
    try { caixa.current?.setPointerCapture(e.pointerId) } catch { /* ponteiro já terminou: ignora */ }
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    movido.current = false
    setAGesto(true)
    if (ponteiros.current.size === 1) inicio.current = { x: e.clientX, y: e.clientY }
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()]
      pinca.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, escala: escalaRef.current }
      arrasto.current = null
      movido.current = true
    } else if (escalaRef.current > 1) {
      arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    }
  }

  const aoMover = (e: React.PointerEvent) => {
    if (!ponteiros.current.has(e.pointerId)) return
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ponteiros.current.size === 2 && pinca.current) {
      const [a, b] = [...ponteiros.current.values()]
      definirEscala(pinca.current.escala * (Math.hypot(a.x - b.x, a.y - b.y) / pinca.current.dist))
      movido.current = true
    } else if (arrasto.current) {
      const dx = e.clientX - arrasto.current.x
      const dy = e.clientY - arrasto.current.y
      if (Math.abs(dx) + Math.abs(dy) > 4) movido.current = true
      setPos(limitar({ x: arrasto.current.px + dx, y: arrasto.current.py + dy }, escalaRef.current, caixa.current))
    } else if (inicio.current) {
      if (Math.abs(e.clientX - inicio.current.x) + Math.abs(e.clientY - inicio.current.y) > 8) movido.current = true
    }
  }

  const aoSoltar = (e: React.PointerEvent) => {
    const eraUnico = ponteiros.current.size === 1
    ponteiros.current.delete(e.pointerId)
    if (ponteiros.current.size < 2) pinca.current = null
    if (ponteiros.current.size === 0) { arrasto.current = null; setAGesto(false) }
    if (!eraUnico) return

    // deslizar para os lados (sem zoom) → muda de foto
    if (escalaRef.current <= 1 && inicio.current) {
      const dx = e.clientX - inicio.current.x
      const dy = e.clientY - inicio.current.y
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        onSwipeRef.current?.(dx < 0 ? 1 : -1)
        return
      }
    }

    // duplo toque / duplo clique: alterna entre 1× e 2,5×
    if (!movido.current) {
      const agora = Date.now()
      if (agora - ultimoToque.current < 300) {
        definirEscala(escalaRef.current > 1 ? 1 : 2.5)
        ultimoToque.current = 0
      } else {
        ultimoToque.current = agora
      }
    }
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div
        ref={caixa}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        style={{ touchAction: "none" }}
        className={cn(
          "absolute inset-0 flex items-center justify-center overflow-hidden select-none",
          escala > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-full max-h-full object-contain rounded-xl"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`,
            transition: aGesto ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>
    </div>
  )
})
