// components/zoomable-image.tsx
// Imagem com zoom: botões +/−, duplo toque/clique, roda do rato, pinça (2 dedos) e arrastar quando ampliada.
"use client"

import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const ESCALA_MAX = 5
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function limitar(p: { x: number; y: number }, escala: number, el: HTMLElement | null) {
  if (!el || escala <= 1) return { x: 0, y: 0 }
  const maxX = (el.clientWidth * (escala - 1)) / 2
  const maxY = (el.clientHeight * (escala - 1)) / 2
  return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) }
}

export function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [escala, setEscala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [aGesto, setAGesto] = useState(false)

  const caixa = useRef<HTMLDivElement>(null)
  const escalaRef = useRef(1)
  const ponteiros = useRef(new Map<number, { x: number; y: number }>())
  const pinca = useRef<{ dist: number; escala: number } | null>(null)
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const movido = useRef(false)
  const ultimoToque = useRef(0)

  const definirEscala = (nova: number) => {
    const e = clamp(nova, 1, ESCALA_MAX)
    escalaRef.current = e
    setEscala(e)
    setPos(p => limitar(p, e, caixa.current))
  }

  // Roda do rato (precisa de listener nativo para poder impedir o scroll da página)
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
    caixa.current?.setPointerCapture(e.pointerId)
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    movido.current = false
    setAGesto(true)
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()]
      pinca.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, escala }
      arrasto.current = null
    } else if (escala > 1) {
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
      setPos(limitar({ x: arrasto.current.px + dx, y: arrasto.current.py + dy }, escala, caixa.current))
    }
  }

  const aoSoltar = (e: React.PointerEvent) => {
    const eraUnico = ponteiros.current.size === 1
    ponteiros.current.delete(e.pointerId)
    if (ponteiros.current.size < 2) pinca.current = null
    if (ponteiros.current.size === 0) { arrasto.current = null; setAGesto(false) }

    // duplo toque / duplo clique: alterna entre 1× e 2,5×
    if (eraUnico && !movido.current) {
      const agora = Date.now()
      if (agora - ultimoToque.current < 300) {
        definirEscala(escala > 1 ? 1 : 2.5)
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

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm p-1">
        <button
          onClick={() => definirEscala(escala / 1.5)}
          disabled={escala <= 1}
          aria-label="Diminuir zoom"
          className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={() => definirEscala(1)}
          aria-label="Repor zoom"
          className="min-w-[44px] text-center text-xs font-semibold text-white tabular-nums"
        >
          {Math.round(escala * 100)}%
        </button>
        <button
          onClick={() => definirEscala(escala * 1.5)}
          disabled={escala >= ESCALA_MAX}
          aria-label="Aumentar zoom"
          className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center disabled:opacity-30"
        >
          <Plus className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  )
}
