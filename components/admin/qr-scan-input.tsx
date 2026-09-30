// components/admin/qr-scan-input.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"

interface QrScanInputProps {
  onScan: (code: string) => void
  placeholder?: string
  autoFocusPistola?: boolean   // false quando o modal não está visível/ativo
}

/**
 * Um único campo que serve duas fontes de leitura:
 * 1. Pistola USB de picar QR — funciona como um teclado (escreve o código
 *    depressa e termina com Enter), por isso basta manter este input focado.
 * 2. Câmara do telemóvel — botão que abre leitura contínua via html5-qrcode.
 */
export function QrScanInput({ onScan, placeholder = "Pica ou escreve o código…", autoFocusPistola = true }: QrScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)

  useEffect(() => {
    if (!autoFocusPistola || cameraOpen) return
    inputRef.current?.focus()
    const interval = setInterval(() => {
      const ativo = document.activeElement as HTMLElement | null
      const éOutroCampo = ativo && ativo !== inputRef.current && (
        ativo.tagName === "INPUT" || ativo.tagName === "TEXTAREA" || ativo.isContentEditable
      )
      if (ativo !== inputRef.current && !éOutroCampo) inputRef.current?.focus()
    }, 800)
    return () => clearInterval(interval)
  }, [autoFocusPistola, cameraOpen])

  const submit = (code: string) => {
    const trimmed = code.trim()
    if (trimmed) onScan(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      submit(value)
      setValue("")
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-12 pl-9 pr-3 rounded-2xl border-2 border-primary/30 bg-primary/5 text-sm font-mono focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => setCameraOpen(v => !v)}
          className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
            cameraOpen ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"
          )}
          title={cameraOpen ? "Fechar câmara" : "Usar câmara"}
        >
          {cameraOpen ? <X className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
        </button>
      </div>

      {cameraOpen && <CameraScanner onDetected={submit} />}
    </div>
  )
}

function CameraScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const regionId = useRef(`qr-region-${Math.random().toString(36).slice(2)}`).current
  const scannerRef = useRef<any>(null)
  const [erro, setErro] = useState("")
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 })

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        if (cancelled) return
        const scanner = new Html5Qrcode(regionId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (decodedText: string) => {
            // evita disparar dezenas de vezes por segundo enquanto o mesmo código está em frame
            const now = Date.now()
            if (decodedText === lastScanRef.current.code && now - lastScanRef.current.at < 2500) return
            lastScanRef.current = { code: decodedText, at: now }
            onDetected(decodedText)
          },
          () => { /* frame sem QR — ignorar silenciosamente */ }
        )
      } catch (err) {
        console.error("[QrScanInput] erro a iniciar câmara:", err)
        setErro("Não foi possível aceder à câmara. Verifica as permissões.")
      }
    })()

    return () => {
      cancelled = true
      const s = scannerRef.current
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId])

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-black relative">
      <div id={regionId} className="w-full aspect-square [&_video]:object-cover" />
      {erro && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80">
          <p className="text-xs text-white text-center">{erro}</p>
        </div>
      )}
    </div>
  )
}
